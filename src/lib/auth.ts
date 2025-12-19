
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
        
        // Fetch the user's current active session ID from the database
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

        if (!user || user.activeSessionId !== payload.sessionId) {
            cookies().set('session', '', { expires: new Date(0), path: '/' });
            return null;
        }

        // The role is now directly from the JWT payload, which was set at login
        // This is a significant change: we trust the role set at login for the session's duration
        return {
            id: payload.userId,
            role: payload.role, // Use the role from the JWT payload
            name: payload.name,
            email: payload.email,
            avatarUrl: payload.avatarUrl,
            trainingProviderId: payload.trainingProviderId,
            roles: user.roles, // also return all roles for more complex checks
        };
    } catch (error) {
        console.error("Session validation error:", error);
        return null;
    }
}
