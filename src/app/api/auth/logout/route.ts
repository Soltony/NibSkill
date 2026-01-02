'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedToken {
    userId: string;
}

export async function POST(req: NextRequest) {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set.');
      return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
    }
    
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET) as DecodedToken;
            const userId = decoded.userId;

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

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    
    // Clear both cookies
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });

    return response;
}
