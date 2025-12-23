
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import prisma from '@/lib/db';

interface GuestJwtPayload extends JWTPayload {
  phoneNumber: string;
  authToken: string;
}

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};


export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  const guestSessionCookie = cookieStore.get('miniapp_guest_session');

  try {
    // Priority 1: Check for guest session, as it contains the most recent token
    if (guestSessionCookie?.value) {
        const { payload } = await jwtVerify<GuestJwtPayload>(guestSessionCookie.value, getJwtSecret());
        if (payload.authToken) {
            return NextResponse.json({ token: payload.authToken });
        }
    }
    
    // Priority 2: Check for full session and get token from login history
    if (sessionCookie?.value) {
        const { payload: sessionPayload } = await jwtVerify(sessionCookie.value, getJwtSecret());
        
        const loginHistory = await prisma.loginHistory.findFirst({
            where: { userId: sessionPayload.userId as string },
            orderBy: { loginTime: 'desc' },
        });

        if (loginHistory?.superAppToken) {
            return NextResponse.json({ token: loginHistory.superAppToken });
        }
    }

    return NextResponse.json({ message: 'Authentication token not found.' }, { status: 404 });

  } catch (error) {
    console.error('[/api/auth/token] Error retrieving token:', error);
    return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 });
  }
}
