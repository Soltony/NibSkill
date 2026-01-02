
import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import prisma from './db';
import type { Role } from '@prisma/client';
import type { NextRequest } from 'next/server';

const getAccessJwtSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET environment variable is not set.");
    }
    return new TextEncoder().encode(secret);
}

interface CustomJwtPayload extends JWTPayload {
    userId: string;
    role: Role; // This will be the selected role for the session
    name: string;
    email: string;
    avatarUrl: string;
    trainingProviderId?: string;
    passwordChangeRequired?: boolean;
}

// This function now reads from the cookies directly
export async function getSession() {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
        return null;
    }

    // Since we are moving to a refresh-token-first strategy for session validation,
    // we should validate it against the database. For now, we will assume if a refresh
    // token exists, the session is likely valid for page loads, and let client-side
    // logic handle refreshing the access token for API calls.
    // A more robust implementation would verify the refresh token here.

    // A temporary workaround to get user info without a valid access token during SSR
    // In a real scenario, you'd decode the refresh token or make a DB call
    // For now, let's try to decode the access token if available, but don't fail if it's not.
    // This part is tricky because the access token isn't available to server components directly.
    // The proper fix is a more involved backend-for-frontend pattern.
    // Let's assume for page loads, just checking the refresh token is enough to Gate access.
    // We will decode the refresh token if we can, but that requires a secret and is not standard.
    // Let's rely on the client to fetch user data after load.
    
    // For now, we cannot get the full session from the server without the access token.
    // The middleware handles gating access based on refresh token.
    // The client-side `useSession` hook will fetch the user data.
    // To make server components work, we will try to get the access token from the headers if possible.
    // This is a workaround because `headers()` is dynamic and might not be available at build time.
    
    try {
        // Attempt to get the access token from the Authorization header if present.
        const headersList = require('next/headers').headers;
        const authHeader = headersList().get('Authorization');
        const accessToken = authHeader?.split(' ')[1];

        if (accessToken) {
            const { payload } = await jwtVerify<CustomJwtPayload>(accessToken, getAccessJwtSecret());
             return {
                id: payload.userId,
                role: payload.role,
                name: payload.name,
                email: payload.email,
                avatarUrl: payload.avatarUrl,
                trainingProviderId: payload.trainingProviderId,
                passwordChangeRequired: payload.passwordChangeRequired,
            };
        }
    } catch (e) {
        // Access token is invalid or expired, which is expected.
        // The client will handle refreshing it.
    }
    
    // As a fallback for SSR where the access token isn't forwarded, we have to look up the user
    // from the refresh token. This is not ideal but necessary for this architecture.
     try {
        const dbToken = await prisma.refreshToken.findFirst({
            where: {
                hashedToken: require('crypto').createHash('sha256').update(refreshToken).digest('hex'),
                revoked: false,
            },
            include: { user: { include: { roles: { include: { role: true } } } } },
        });

        if (dbToken?.user) {
            const user = dbToken.user;
            // This assumes the first role is the active one, which matches our login logic.
            const sessionRole = user.roles[0]?.role; 
            if (!sessionRole) return null;

            return {
                id: user.id,
                role: sessionRole,
                name: user.name,
                email: user.email || '',
                avatarUrl: user.avatarUrl || '',
                trainingProviderId: user.trainingProviderId || undefined,
                passwordChangeRequired: user.passwordChangeRequired,
            };
        }
    } catch (error) {
        console.error("Error looking up user by refresh token in getSession:", error);
    }


    return null;
}
