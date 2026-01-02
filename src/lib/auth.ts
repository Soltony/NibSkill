
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
}

export async function getSession(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.split(' ')[1];
    
    if (!accessToken) {
        return null;
    }

    try {
        const { payload } = await jwtVerify<CustomJwtPayload>(accessToken, getAccessJwtSecret(), {
            algorithms: ['HS256']
        });
        
        return {
            id: payload.userId,
            role: payload.role,
            name: payload.name,
            email: payload.email,
            avatarUrl: payload.avatarUrl,
            trainingProviderId: payload.trainingProviderId,
        };
    } catch (error) {
        return null;
    }
}
