
import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { createHash } from 'crypto';
import { securityLog } from '@/lib/logger';
import prisma from './db';
import type { Role } from '@prisma/client';

const getJwtSecret = (type: 'access' | 'refresh') => {
    const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
    return new TextEncoder().encode(secret);
};


interface CustomJwtPayload extends JWTPayload {
    userId: string;
    role: Role; // This will be the selected role for the session
    name: string;
    email: string;
    avatarUrl: string;
    trainingProviderId?: string;
    passwordChangeRequired?: boolean;
    tokenVersion?: number;
    sessionId?: string;
}

// This function now reads from the cookies directly
export async function getSession() {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('auth_token')?.value;

    // Try validating access token and session first (normal requests)
    if (accessToken) {
        try {
            const { payload } = await jwtVerify<CustomJwtPayload>(accessToken, getJwtSecret('access'));
            const user = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user || user.tokenVersion !== payload.tokenVersion) return null;

            if (!payload.sessionId) return null;
            const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
            if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) return null;

            // Enforce server-side idle timeout on access-token path as well
            try {
                const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 15; // 15m default
                const lastActivityMs = new Date(session.lastActivity).getTime();
                if ((Date.now() - lastActivityMs) / 1000 > IDLE_TIMEOUT_SECONDS) {
                    try { await prisma.refreshToken.updateMany({ where: { sessionId: session.id }, data: { revoked: true } }); } catch (e) {}
                    try { await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }); } catch (e) {}
                    try { securityLog('audit', 'getSession_idle_expired', { sessionId: session.id, userId: session.userId }); } catch (e) {}
                    return null;
                }
            } catch (e) {
                // fail-open in the unlikely event of DB errors
            }

            // update lastActivity
            try { await prisma.session.update({ where: { id: session.id }, data: { lastActivity: new Date() } }); } catch (e) {}

            return {
                id: payload.userId,
                role: payload.role,
                name: payload.name,
                email: payload.email,
                avatarUrl: payload.avatarUrl,
                trainingProviderId: payload.trainingProviderId,
                passwordChangeRequired: user.passwordChangeRequired,
            };
        } catch (e) {
            // Access token invalid/expired — fall back to refresh flow
        }
    }

    // Fallback to refresh token for SSR where access token might be expired.
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (!refreshToken) return null;

    try {
        const { payload: refreshPayload } = await jwtVerify<{ userId: string; tokenVersion: number; sessionId?: string }>(refreshToken, getJwtSecret('refresh'));

        const hashed = createHash('sha256').update(refreshToken).digest('hex');
        const stored = await prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
        if (!stored || stored.revoked) {
            securityLog('warn', 'getSession_refresh_invalid', { hashed: stored ? stored.hashedToken : null });
            return null;
        }

        if (refreshPayload.sessionId && stored.sessionId && refreshPayload.sessionId !== stored.sessionId) {
            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
            securityLog('warn', 'getSession_refresh_session_mismatch', { storedSessionId: stored.sessionId, tokenSessionId: refreshPayload.sessionId });
            return null;
        }

        // Validate session record
        if (!stored.sessionId) return null;
        const session = await prisma.session.findUnique({ where: { id: stored.sessionId } });
        if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
            securityLog('warn', 'getSession_session_invalid', { sessionId: stored.sessionId });
            return null;
        }

        // Idle/age enforcement using refreshToken record
        // Reduced defaults: idle -> 15 minutes, max session age -> 7 days
        const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 15; // 15m default (was 30m)
        const MAX_SESSION_AGE_SECONDS = Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 7; // 7d default (was 30d)
        const now = Date.now();
        const lastActivity = new Date(stored.lastActivityAt ?? stored.updatedAt).getTime();
        const createdAt = new Date(stored.createdAt).getTime();

        if ((now - lastActivity) / 1000 > IDLE_TIMEOUT_SECONDS) {
            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
            securityLog('audit', 'getSession_idle_expired', { tokenId: stored.id, userId: stored.userId });
            return null;
        }

        if ((now - createdAt) / 1000 > MAX_SESSION_AGE_SECONDS) {
            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
            securityLog('audit', 'getSession_age_expired', { tokenId: stored.id, userId: stored.userId });
            return null;
        }

        const user = await prisma.user.findUnique({ where: { id: refreshPayload.userId }, include: { roles: { include: { role: true } } } });
        if (!user || user.tokenVersion !== refreshPayload.tokenVersion) return null;

        const sessionRole = user.roles[0]?.role;
        if (!sessionRole) return null;

        await prisma.refreshToken.update({ where: { id: stored.id }, data: { lastActivityAt: new Date() } });
        try { await prisma.session.update({ where: { id: session.id }, data: { lastActivity: new Date() } }); } catch (e) {}

        return {
            id: user.id,
            role: sessionRole,
            name: user.name,
            email: user.email || '',
            avatarUrl: user.avatarUrl || '',
            trainingProviderId: user.trainingProviderId || undefined,
            passwordChangeRequired: user.passwordChangeRequired,
        };
    } catch (error) {
        console.error('Error verifying refresh token in getSession:', error);
        return null;
    }
}

// Check whether a session has a recent re-authentication timestamp
export async function isSessionRecentlyReauthenticated(sessionId: string, windowSeconds?: number) {
    if (!sessionId) return false;
    const REAUTH_TIMEOUT_SECONDS = Number(process.env.REAUTH_TIMEOUT_SECONDS) || 60 * 5; // default 5 minutes
    const threshold = Number.isFinite(Number(windowSeconds)) ? (windowSeconds as number) : REAUTH_TIMEOUT_SECONDS;
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || !session.reauthenticatedAt) return false;
    const reauthAt = new Date(session.reauthenticatedAt).getTime();
    return (Date.now() - reauthAt) / 1000 <= threshold;
}

// Helper used by routes that must require recent re-auth (returns false if not re-authenticated recently)
export async function requireRecentReauthForSession(sessionId: string, windowSeconds?: number) {
    const ok = await isSessionRecentlyReauthenticated(sessionId, windowSeconds);
    return ok;
}
