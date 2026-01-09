
import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { createHash } from 'crypto';
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
}

// This function now reads from the cookies directly
export async function getSession() {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('auth_token')?.value;

    if (accessToken) {
       try {
            const { payload } = await jwtVerify<CustomJwtPayload>(accessToken, getJwtSecret('access'));
            
            const user = await prisma.user.findUnique({ where: { id: payload.userId }});
            if (!user || user.tokenVersion !== payload.tokenVersion) {
                return null; // Token is revoked
            }

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
            // Access token is invalid or expired, which is expected.
            // We will now rely on the refresh token logic if it exists.
        }
    }
    
    // Fallback to refresh token for SSR where access token might be expired.
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (!refreshToken) {
        return null;
    }

     try {
        const { payload } = await jwtVerify<{ userId: string; tokenVersion: number }>(refreshToken, getJwtSecret('refresh'));

        // Server-side refresh token validation: look up token by hashed value
        const hashed = createHash('sha256').update(refreshToken).digest('hex');
        const stored = await prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });

        if (!stored || stored.revoked) {
            return null; // token not found or revoked
        }

        // Idle timeout and absolute session lifetime enforcement
        const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 30; // 30m default
        const MAX_SESSION_AGE_SECONDS = Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 30; // 30d default

        const now = Date.now();
        const lastActivity = new Date(stored.updatedAt).getTime();
        const createdAt = new Date(stored.createdAt).getTime();

        if ((now - lastActivity) / 1000 > IDLE_TIMEOUT_SECONDS) {
            // mark revoked
            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
            return null;
        }

        if ((now - createdAt) / 1000 > MAX_SESSION_AGE_SECONDS) {
            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user || user.tokenVersion !== payload.tokenVersion) {
            return null; // User not found or token revoked
        }

        const sessionRole = user.roles[0]?.role; 
        if (!sessionRole) return null;

        // update last activity timestamp (touch)
        await prisma.refreshToken.update({ where: { id: stored.id }, data: {} });

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
        console.error("Error verifying refresh token in getSession:", error);
        return null;
    }
}
