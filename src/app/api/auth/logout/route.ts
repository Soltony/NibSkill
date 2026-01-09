
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { jwtVerify, type JWTPayload } from 'jose';
import { createHash } from 'crypto';
import { serialize } from 'cookie';
import { securityLog } from '@/lib/logger';

const getJwtRefreshSecret = () => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};

const getJwtAccessSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};

interface DecodedToken extends JWTPayload {
    userId: string;
    sessionId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;

        if (refreshToken) {
            try {
                const { payload } = await jwtVerify<DecodedToken>(refreshToken, getJwtRefreshSecret());
                const userId = payload.userId;
                const sessionId = (payload as any).sessionId;

                if (sessionId) {
                    // Revoke the specific session
                    try {
                        await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
                        await prisma.refreshToken.updateMany({ where: { sessionId }, data: { revoked: true } });
                        securityLog('audit', 'logout_revoke_session', { userId, sessionId });
                    } catch (e) {
                        console.warn('Failed to revoke session on logout:', e);
                        securityLog('error', 'logout_revoke_session_failed', { userId, sessionId, error: String(e) });
                    }
                } else if (userId) {
                    // Fallback: revoke all refresh tokens for user
                    try {
                        const result = await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
                        securityLog('audit', 'logout_revoke_all', { userId, revokedCount: result.count });
                    } catch (e) {
                        console.warn('Failed to revoke refresh tokens on logout:', e);
                        securityLog('error', 'logout_revoke_failed', { userId, error: String(e) });
                    }
                }
            } catch (error) {
                console.warn("Could not decode refresh token on logout:", error);
            }
        }
    } catch (error) {
        securityLog('error', 'logout_invalidation_exception', { error: error instanceof Error ? error.message : String(error) });
        // Do not block the user from logging out, just log the error.
    }

    // Additionally revoke the currently-present access token by adding its jti to the blacklist
    try {
        const cookieStore = cookies();
        const accessToken = cookieStore.get('auth_token')?.value;
        if (accessToken) {
            try {
                const { payload } = await jwtVerify<any>(accessToken, getJwtAccessSecret());
                const jti = (payload as any).jti;
                const exp = (payload as any).exp; // seconds since epoch
                if (jti && exp) {
                    try {
                        await prisma.revokedAccessToken.create({ data: { jti, expiresAt: new Date(exp * 1000) } });
                        securityLog('audit', 'logout_revoke_access_token', { jti, userId: (payload as any).userId });
                    } catch (e) {
                        console.warn('Failed to persist revoked access token jti:', e);
                    }
                }
            } catch (e) {
                // ignore access token verify errors
            }
        }
    } catch (e) {}


    const response = NextResponse.json({ success: true, message: "Logged out successfully" });

    // Explicitly set cookies to expire in the past to ensure they are cleared
    response.cookies.set('auth_token', '', { expires: new Date(0), path: '/' });
    response.cookies.set('refresh_token', '', { expires: new Date(0), path: '/' });
    response.cookies.set('refresh_sid', '', { expires: new Date(0), path: '/' });

    return response;
}
