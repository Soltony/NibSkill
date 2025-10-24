
import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { prisma } from './db';
import type { Role } from '@prisma/client';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set.");
    }
    return new TextEncoder().encode(secret);
}

interface CustomJwtPayload extends JWTPayload {
    userId: string;
    role: Role; // Now includes permissions
    name: string;
    email: string;
    avatarUrl: string;
    sessionId: string; // The unique ID for this specific session
    trainingProviderId?: string;
}

export async function getSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
        return null;
    }

    try {
        const { payload } = await jwtVerify<CustomJwtPayload>(sessionCookie, getJwtSecret(), {
            algorithms: ['HS256']
        });
        
        // Fetch the user's current active session ID from the database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { activeSessionId: true, trainingProviderId: true }
        });

        // If the user doesn't exist or the session ID in the token doesn't match the one in DB, the session is invalid.
        if (!user || user.activeSessionId !== payload.sessionId) {
            // Invalidate the cookie by clearing it
            cookies().set('session', '', { expires: new Date(0), path: '/' });
            return null;
        }

        // Session is valid, return the payload including the role with permissions
        return {
            id: payload.userId,
            role: payload.role,
            name: payload.name,
            email: payload.email,
            avatarUrl: payload.avatarUrl,
            trainingProviderId: user.trainingProviderId
        };
    } catch (error) {
        console.error("Session validation error:", error);
        return null;
    }
}
