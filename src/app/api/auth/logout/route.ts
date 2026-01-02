
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};

interface DecodedToken {
    userId: string;
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;

        if (refreshToken) {
            try {
                const { payload } = await jwtVerify<DecodedToken>(refreshToken, getJwtSecret());
                const userId = payload.userId;

                if (userId) {
                    // Increment the tokenVersion to invalidate all existing tokens for this user
                    await prisma.user.update({
                        where: { id: userId },
                        data: { tokenVersion: { increment: 1 } },
                    });
                }
            } catch (error) {
                // If token is invalid, we can't do much server-side, but we still clear the cookies.
                console.warn("Could not decode refresh token on logout:", error);
            }
        }
    } catch (error) {
        console.error("Error during logout token invalidation:", error);
        // Do not block the user from logging out, just log the error.
    }


    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    
    // Clear both cookies
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });

    return response;
}
