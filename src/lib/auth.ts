
import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { User, Role } from '@prisma/client';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set.");
    }
    return new TextEncoder().encode(secret);
}

export async function getSession() {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(sessionCookie, getJwtSecret(), {
            algorithms: ['HS256']
        });
        
        // This is a simplified user object from the token payload
        // You can add more fields to the token if needed
        return {
            id: payload.userId as string,
            role: payload.role as string,
            name: (payload as any).name || '', // Add other fields if they exist in token
            email: (payload as any).email || '',
            avatarUrl: (payload as any).avatarUrl || ''
        };
    } catch (error) {
        console.error("Session validation error:", error);
        return null;
    }
}
