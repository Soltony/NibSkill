
import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';

// This API route gets the current logged-in user from the session cookie.
export async function GET(request: NextRequest) {
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
            return NextResponse.json(null, { status: 401 });
        }

        const { password, ...userWithoutPassword } = fullUser;

        const userForClient = {
            ...userWithoutPassword,
            role: userSession.role, // Attach the active session role from the access token
        }
        return NextResponse.json(userForClient);
    }
    
    return NextResponse.json(null, { status: 401 });

  } catch (error) {
    console.error("Error in session API route:", error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
