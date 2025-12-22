
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';


interface GuestJwtPayload extends JWTPayload {
  phoneNumber: string;
  authToken: string;
}

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};


// This API route gets the current logged-in user from the session cookie.
export async function GET() {
  try {
    const userSession = await getSession();

    if (userSession) {
        // Fetch full user details to ensure data is fresh
        const fullUser = await prisma.user.findUnique({
            where: { id: userSession.id },
            include: { 
                roles: {
                  include: {
                    role: true,
                  }
                },
                notifications: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 50 // Limit to last 50 notifications
                }
            }
        });

        if (!fullUser) {
            return NextResponse.json(null, { status: 200 });
        }

        const { password, ...userWithoutPassword } = fullUser;

        const userForClient = {
            ...userWithoutPassword,
            role: userSession.role, // Attach the active session role
        }
        return NextResponse.json(userForClient);
    }
    
    // If no full session, check for a guest session
    const guestSessionToken = cookies().get('miniapp_guest_session')?.value;
    if (guestSessionToken) {
        try {
            await jwtVerify<GuestJwtPayload>(guestSessionToken, getJwtSecret());
            // It's a valid guest, return a guest object (no personal data)
            return NextResponse.json({ isGuest: true });
        } catch (error) {
             // Invalid guest token
            return NextResponse.json(null, { status: 200 });
        }
    }


    return NextResponse.json(null, { status: 200 });
  } catch (error) {
    console.error("Error in session API route:", error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
