
'use server';

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { jwtVerify, type JWTPayload } from 'jose';
import { createHash } from 'crypto';
import type { Role, User } from '@prisma/client';
import { securityLog } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET;

interface VerifiedUser extends User {
  role: Role;
  isGuest?: boolean;
}

interface DecodedToken extends JWTPayload {
  userId: string;
  isGuest?: boolean;
  phoneNumber?: string;
  tokenVersion?: number;
  type?: 'access' | 'refresh';
  sessionId?: string;
  jti?: string;
}


export async function verifyAuth(req: NextRequest): Promise<VerifiedUser | null> {
  // For normal requests, require only the short-lived access token and validate session state.
  const cookieStore = cookies();
  const accessToken = cookieStore.get('auth_token')?.value;
  if (!accessToken) return null;

  const getJwtSecret = (type: 'access' | 'refresh') => {
    const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
    return new TextEncoder().encode(secret);
  };

  try {
    const { payload: accessPayload } = await jwtVerify<DecodedToken>(accessToken, getJwtSecret('access'));
    if (!accessPayload.userId) return null;

    // Session binding: ensure session exists and is active
    // Check whether this access token was revoked (blacklist)
    if (accessPayload.jti) {
      const revoked = await prisma.revokedAccessToken.findUnique({ where: { jti: accessPayload.jti } });
      if (revoked) return null;
    }
    if (!accessPayload.sessionId) return null;
    const session = await prisma.session.findUnique({ where: { id: accessPayload.sessionId } });
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) return null;

    // Enforce server-side inactivity using session.lastActivity
    const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 15; // 15m default
    const lastActivityMs = new Date(session.lastActivity).getTime();
    if ((Date.now() - lastActivityMs) / 1000 > IDLE_TIMEOUT_SECONDS) {
      // Revoke associated refresh tokens and mark session revoked
      await prisma.refreshToken.updateMany({ where: { sessionId: session.id }, data: { revoked: true } });
      await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'session_idle_expired', { sessionId: session.id, userId: session.userId }); } catch (e) {}
      // Also emit a generic session_expired event (useful for alerting / SIEM)
      try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'session_expired', { sessionId: session.id, userId: session.userId, reason: 'idle_timeout' }); } catch (e) {}
      return null;
    }

    const user = await prisma.user.findUnique({ where: { id: accessPayload.userId }, include: { roles: { include: { role: true } } } });
    if (!user) return null;
    if (user.tokenVersion !== accessPayload.tokenVersion) return null;

    // If the user is required to change their password, only allow password-change related endpoints
    try {
      const pwdRequired = !!user.passwordChangeRequired;
      if (pwdRequired) {
        const allowed = ['/api/auth/change-password', '/api/auth/reauthenticate', '/api/auth/logout'];
        const path = req.nextUrl?.pathname ?? new URL(req.url).pathname;
        if (!allowed.some(p => path.startsWith(p))) {
          try { const { securityLog } = await import('@/lib/logger'); securityLog('warn', 'auth_blocked_password_change_required', { userId: user.id, path }); } catch (e) {}
          return null;
        }
      }
    } catch (e) {
      // ignore
    }

    // update session lastActivity
    try { await prisma.session.update({ where: { id: session.id }, data: { lastActivity: new Date() } }); } catch (e) {}

    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) return null;

    const finalUser: VerifiedUser = { ...user, role: sessionRole };

    // Audit a successful token verification and record access to sensitive endpoints
    try {
      const path = req.nextUrl?.pathname ?? new URL(req.url).pathname;
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const ua = req.headers.get('user-agent') || null;
      try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'auth_token_valid', { userId: user.id, sessionId: session.id, role: sessionRole.name, path, ip, userAgent: ua }); } catch (e) {}

      const sensitivePrefixes = ['/admin', '/super-admin', '/api/admin', '/api/auth/change-password', '/api/auth/reauthenticate', '/api/auth/logout'];
      if (sensitivePrefixes.some(p => path.startsWith(p))) {
        try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'sensitive_endpoint_access', { userId: user.id, role: sessionRole.name, endpoint: path, method: req.method, sessionId: session.id, ip, userAgent: ua }); } catch (e) {}
      }
    } catch (e) {}

    return finalUser;
  } catch (error) {
    try { const { securityLog } = await import('@/lib/logger'); securityLog('warn', 'auth_token_verification_failed', { error: String(error) }); } catch (e) {}

    // Attempt to proactively revoke any stored refresh token and associated session when token verification fails.
    try {
      const cookieStore = cookies();
      const refreshToken = cookieStore.get('refresh_token')?.value;
      if (refreshToken) {
        const hashed = createHash('sha256').update(refreshToken).digest('hex');
        const stored = await prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
        if (stored) {
          try { await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }); } catch (e) {}
          if (stored.sessionId) {
            try { await prisma.session.update({ where: { id: stored.sessionId }, data: { revokedAt: new Date() } }); } catch (e) {}
            try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'auth_verification_revoke', { tokenId: stored.id, userId: stored.userId, sessionId: stored.sessionId }); } catch (e) {}            // Emit a forced logout audit record when we actively revoke a session during verification failure
            try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'forced_logout', { userId: stored.userId, sessionId: stored.sessionId, reason: 'auth_verification_revoke' }); } catch (e) {}          }
        }
      }

      // Try to extract any JTI from the access token payload (best-effort without verification) and blacklist it.
      const accessToken = cookieStore.get('auth_token')?.value;
      if (accessToken) {
        try {
          const parts = accessToken.split('.');
          if (parts.length >= 2) {
            const payloadJson = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);
            const jti = payload?.jti;
            const exp = payload?.exp;
            if (jti) {
              try { await prisma.revokedAccessToken.create({ data: { jti, expiresAt: exp ? new Date(exp * 1000) : new Date(Date.now() + 1000 * 60 * 60) } }); } catch (e) {}
              try { const { securityLog } = await import('@/lib/logger'); securityLog('audit', 'auth_revoke_access_jti', { jti }); } catch (e) {}
            }
          }
        } catch (e) {
          // ignore payload parsing errors here
        }
      }
    } catch (e) {
      try { const { securityLog } = await import('@/lib/logger'); securityLog('error', 'auth_verification_revoke_error', { error: String(e) }); } catch (e) {}
    }

    return null;
  }
}
