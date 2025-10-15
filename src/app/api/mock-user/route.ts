
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

// This API route gets the current logged-in user from the session cookie.
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Fetch full user details
    const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { role: true }
    });

    if (!fullUser) {
        return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    const { password, ...userWithoutPassword } = fullUser;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error in mock-user route:", error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
