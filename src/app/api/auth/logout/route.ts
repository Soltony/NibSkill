
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (refreshToken) {
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        await prisma.refreshToken.updateMany({
            where: {
                hashedToken: hashedToken
            },
            data: {
                revoked: true
            }
        });
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete('refresh_token');

    return response;
}
