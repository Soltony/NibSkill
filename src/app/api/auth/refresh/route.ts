
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
    // Validate the presented refresh token exists in DB and is not revoked
    const incomingHash = createHash('sha256').update(refreshTokenFromCookie).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { hashedToken: incomingHash } });

    if (!stored || stored.revoked) {
      securityLog('warn', 'refresh_attempt_invalid', { hashed: incomingHash });
      const response = NextResponse.json({ message: 'Invalid or revoked refresh token.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    // Ensure the stored token belongs to the same user claimed in the JWT
    if (stored.userId !== decoded.userId) {
      // Revoke the stored token as it's mismatched
      try { await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }); } catch (e) { }
      securityLog('warn', 'refresh_token_user_mismatch', { storedUserId: stored.userId, tokenUserId: decoded.userId });
      const response = NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    // Validate underlying Session state (session record is authoritative)
    if (!stored.sessionId) {
      const response = NextResponse.json({ message: 'Invalid session.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    // Require the refresh_sid cookie to be present and match the stored sessionId
    const refreshSidFromCookie = cookieStore.get('refresh_sid')?.value;
    if (!refreshSidFromCookie || refreshSidFromCookie !== stored.sessionId) {
      try { await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }); } catch (e) {}
      securityLog('warn', 'refresh_sid_mismatch', { storedSessionId: stored.sessionId, cookieSid: refreshSidFromCookie });
      const response = NextResponse.json({ message: 'Invalid session.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('refresh_sid', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    const session = await prisma.session.findUnique({ where: { id: stored.sessionId } });
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
      // revoke stored refresh token defensively
      try { await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }); } catch (e) {}
      securityLog('audit', 'refresh_session_invalid', { sessionId: stored.sessionId, userId: stored.userId });
      const response = NextResponse.json({ message: 'Session invalid or expired.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    // Enforce server-side idle & absolute timeouts
    const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 30; // 30m
    const MAX_SESSION_AGE_SECONDS = Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 30; // 30d
    const now = Date.now();
    const lastActivity = new Date(stored.lastActivityAt ?? stored.updatedAt).getTime();
    const createdAt = new Date(stored.createdAt).getTime();

    // Ensure session binding between presented refresh token and stored sessionId
    if (decoded.sessionId && stored.sessionId && decoded.sessionId !== stored.sessionId) {
      // mismatch - revoke the stored token defensively
      try { await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }); } catch (e) { }
      securityLog('warn', 'refresh_token_session_mismatch', { storedSessionId: stored.sessionId, tokenSessionId: decoded.sessionId });
      const response = NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    if ((now - lastActivity) / 1000 > IDLE_TIMEOUT_SECONDS) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      securityLog('audit', 'session_idle_expired', { tokenId: stored.id, userId: stored.userId });
      const response = NextResponse.json({ message: 'Session expired due to inactivity.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    if ((now - createdAt) / 1000 > MAX_SESSION_AGE_SECONDS) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      securityLog('audit', 'session_age_expired', { tokenId: stored.id, userId: stored.userId });
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

    // --- Issue new access token (bound to same sessionId) ---
    const newJti = randomUUID();
    const newAccessToken = await new SignJWT({
        userId: user.id,
        role: sessionRole,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        trainingProviderId: user.trainingProviderId,
        tokenVersion: user.tokenVersion,
      sessionId: stored.sessionId,
      jti: newJti,
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('access'));

    // --- Rotate refresh token ---
    const newRefreshToken = await new SignJWT({
        userId: user.id,
        tokenVersion: user.tokenVersion,
        sessionId: stored.sessionId,
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('refresh'));
    // mark the presented token revoked and persist the rotated token
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    securityLog('info', 'refresh_rotate', { previousTokenId: stored.id, userId: stored.userId });

    const newHash = createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.refreshToken.create({ data: { hashedToken: newHash, userId: user.id, sessionId: stored.sessionId } });
    // touch session lastActivity
    try { await prisma.session.update({ where: { id: stored.sessionId }, data: { lastActivity: new Date() } }); } catch (e) {}
    securityLog('audit', 'refresh_rotated', { userId: user.id });

    const response = NextResponse.json({ success: true, message: 'Token refreshed' });
    
    // Access token is a session cookie
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

    // Also set the rotated refresh_sid cookie to match the sessionId
    try {
      response.cookies.set('refresh_sid', stored.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      });
    } catch (e) {
      // best-effort: do not fail the refresh if setting this cookie fails
    }

    return response;
  } catch (error) {
    console.error('[REFRESH_TOKEN_ERROR]', error);

    const response = NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    return response;
  }
}
