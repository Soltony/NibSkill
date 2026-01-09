
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
                // 1. Hash the incoming token to find it in the DB
                const hashedToken = createHash('sha256').update(refreshToken).digest('hex');
                const storedToken = await prisma.refreshToken.findUnique({
                    where: { hashedToken }
                });

                if (storedToken) {
                    // 2. Revoke the specific refresh token
                    await prisma.refreshToken.update({
                        where: { id: storedToken.id },
                        data: { revoked: true }
                    });
                    
                    // 3. Revoke the associated session
                    if (storedToken.sessionId) {
                        await prisma.session.update({
                            where: { id: storedToken.sessionId },
                            data: { revokedAt: new Date() }
                        });
                        securityLog('audit', 'logout_revoke_session', { userId: storedToken.userId, sessionId: storedToken.sessionId });
                    }
                }
            } catch (error) {
                // This catch block handles errors during token verification or DB operations.
                // We log the error but proceed with clearing cookies to ensure logout completes.
                securityLog('error', 'logout_invalidation_error', { error: error instanceof Error ? error.message : String(error) });
            }
        }
        
        // Invalidate access token via JTI blacklist
        const accessToken = cookieStore.get('auth_token')?.value;
        if (accessToken) {
            try {
                const { payload } = await jwtVerify<any>(accessToken, getJwtAccessSecret());
                const jti = (payload as any).jti;
                const exp = (payload as any).exp; // seconds since epoch
                if (jti && exp) {
                    await prisma.revokedAccessToken.create({ data: { jti, expiresAt: new Date(exp * 1000) } });
                    securityLog('audit', 'logout_revoke_access_token', { jti, userId: (payload as any).userId });
                }
            } catch (e) {
                // Ignore errors if access token is invalid/expired already
            }
        }

    } catch (error) {
        securityLog('error', 'logout_global_exception', { error: error instanceof Error ? error.message : String(error) });
        // Do not block the user from logging out, just log the error.
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });

    // Explicitly set cookies to expire in the past to ensure they are cleared
    response.cookies.set('auth_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: new Date(0) });
    response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: new Date(0) });
    response.cookies.set('refresh_sid', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: new Date(0) });

    return response;
}
