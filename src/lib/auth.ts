
import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import prisma from './db';
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
    role: Role; // This will be the selected role for the session
    name: string;
    email: string;
    avatarUrl: string;
    sessionId: string;
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
        
        // The middleware now handles session invalidation.
        // We can trust the payload here for fetching user data.
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { 
                activeSessionId: true,
                trainingProviderId: true,
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        // Still, as a final check, ensure the session ID matches.
        if (!user || user.activeSessionId !== payload.sessionId) {
            return null;
        }

        return {
            id: payload.userId,
            role: payload.role,
            name: payload.name,
            email: payload.email,
            avatarUrl: payload.avatarUrl,
            trainingProviderId: payload.trainingProviderId,
            roles: user.roles,
        };
    } catch (error) {
        // Errors like expired tokens will be caught here, but handled by the middleware.
        return null;
    }
}
