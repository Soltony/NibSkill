
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { jwtVerify, SignJWT } from 'jose';
import { createHash } from 'crypto';

const getJwtSecret = (type: 'access' | 'refresh') => {
    const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
    return new TextEncoder().encode(secret);
};

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const refreshTokenFromCookie = cookieStore.get('refresh_token')?.value;

  if (!refreshTokenFromCookie) {
    return NextResponse.json({ message: 'No refresh token provided.' }, { status: 401 });
  }

  try {
    const { payload: decoded } = await jwtVerify<{
      userId: string;
      tokenVersion?: number;
    }>(refreshTokenFromCookie, getJwtSecret('refresh'));
    // Validate the presented refresh token exists in DB and is not revoked
    const incomingHash = createHash('sha256').update(refreshTokenFromCookie).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { hashedToken: incomingHash } });

    if (!stored || stored.revoked) {
      const response = NextResponse.json({ message: 'Invalid or revoked refresh token.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    // Enforce server-side idle & absolute timeouts
    const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 30; // 30m
    const MAX_SESSION_AGE_SECONDS = Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 30; // 30d
    const now = Date.now();
    const lastActivity = new Date(stored.updatedAt).getTime();
    const createdAt = new Date(stored.createdAt).getTime();

    if ((now - lastActivity) / 1000 > IDLE_TIMEOUT_SECONDS) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      const response = NextResponse.json({ message: 'Session expired due to inactivity.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    if ((now - createdAt) / 1000 > MAX_SESSION_AGE_SECONDS) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      const response = NextResponse.json({ message: 'Session exceeded maximum lifetime.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
       include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 401 });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      const response = NextResponse.json({ message: 'Session has been invalidated.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }
    
    // Find the role associated with the session. This could be more complex
    // if users can switch roles, but for now we take the first.
    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) {
        return NextResponse.json({ message: 'User role not configured.' }, { status: 500 });
    }

    // --- Issue new access token ---
    const newAccessToken = await new SignJWT({
        userId: user.id,
        role: sessionRole,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        trainingProviderId: user.trainingProviderId,
        tokenVersion: user.tokenVersion,
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('access'));

    // --- Rotate refresh token ---
    const newRefreshToken = await new SignJWT({
        userId: user.id,
        tokenVersion: user.tokenVersion,
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('refresh'));
    // mark the presented token revoked and persist the rotated token
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const newHash = createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.refreshToken.create({ data: { hashedToken: newHash, userId: user.id } });

    const response = NextResponse.json({ success: true, message: 'Token refreshed' });
    
    // Access token is a session cookie
    response.cookies.set('auth_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('[REFRESH_TOKEN_ERROR]', error);

    const response = NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    return response;
  }
}
