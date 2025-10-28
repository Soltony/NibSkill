
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
            role: true,
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

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error in session API route:", error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
