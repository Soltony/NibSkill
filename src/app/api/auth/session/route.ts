
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

// This API route gets the current logged-in user from the session cookie.
export async function GET() {
  try {
    const userSession = await getSession();

    if (!userSession) {
        return NextResponse.json(null, { status: 200 });
    }
    
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

    // This is a simplification. The session contains the active role.
    // We send back the full user object with all roles, and the client uses the session role for context.
    const userForClient = {
        ...userWithoutPassword,
        role: userSession.role, // Attach the active session role
    }


    return NextResponse.json(userForClient);
  } catch (error) {
    console.error("Error in session API route:", error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
