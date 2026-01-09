
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { jwtVerify, SignJWT } from 'jose';
import { createHash, randomUUID } from 'crypto';
import { securityLog } from '@/lib/logger';

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
      sessionId?: string;
    }>(refreshTokenFromCookie, getJwtSecret('refresh'));

    const incomingHash = createHash('sha256').update(refreshTokenFromCookie).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ 
        where: { hashedToken: incomingHash },
        include: { session: true }
    });

    // CRITICAL: Check if token exists, is not revoked, and its session is not revoked
    if (!stored || stored.revoked || stored.session?.revokedAt) {
      securityLog('warn', 'refresh_attempt_revoked_token', { 
        userId: decoded.userId, 
        tokenExists: !!stored, 
        isRevoked: stored?.revoked,
        sessionRevoked: !!stored?.session?.revokedAt
      });
      const response = NextResponse.json({ message: 'Invalid or revoked refresh token.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: -1 });
      return response;
    }

    if (stored.userId !== decoded.userId) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      securityLog('warn', 'refresh_token_user_mismatch', { storedUserId: stored.userId, tokenUserId: decoded.userId });
      return NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
    }
    
    const refreshSidFromCookie = cookieStore.get('refresh_sid')?.value;
    if (!refreshSidFromCookie || refreshSidFromCookie !== stored.sessionId) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      securityLog('warn', 'refresh_sid_mismatch', { storedSessionId: stored.sessionId, cookieSid: refreshSidFromCookie });
      return NextResponse.json({ message: 'Invalid session identifier.' }, { status: 401 });
    }

    if (!stored.session || new Date(stored.session.expiresAt).getTime() < Date.now()) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      securityLog('audit', 'refresh_session_expired', { sessionId: stored.sessionId, userId: stored.userId });
      return NextResponse.json({ message: 'Session has expired.' }, { status: 401 });
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
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      return NextResponse.json({ message: 'Session has been invalidated.' }, { status: 401 });
    }
    
    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) {
        return NextResponse.json({ message: 'User role not configured.' }, { status: 500 });
    }

    // --- Token Rotation: Invalidate old token, create new ones ---
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    
    const newAccessToken = await new SignJWT({
        userId: user.id,
        role: sessionRole,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        trainingProviderId: user.trainingProviderId,
        tokenVersion: user.tokenVersion,
        sessionId: stored.sessionId,
        jti: randomUUID(),
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('access'));

    const newRefreshToken = await new SignJWT({
        userId: user.id,
        tokenVersion: user.tokenVersion,
        sessionId: stored.sessionId,
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('refresh'));

    const newHash = createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.refreshToken.create({ data: { hashedToken: newHash, userId: user.id, sessionId: stored.sessionId } });
    
    try { 
        await prisma.session.update({ where: { id: stored.sessionId! }, data: { lastActivity: new Date() } }); 
    } catch (e) {}

    securityLog('audit', 'refresh_success', { userId: user.id, sessionId: stored.sessionId });

    const response = NextResponse.json({ success: true, message: 'Token refreshed' });
    
    response.cookies.set('auth_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    response.cookies.set('refresh_sid', stored.sessionId!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    return response;
  } catch (error) {
    securityLog('error', 'refresh_token_exception', { error: error instanceof Error ? error.message : String(error) });

    const response = NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    return response;
  }
}
