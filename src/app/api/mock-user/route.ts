
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// This is a mock API route to simulate getting the current logged-in user.
// In a real application, this would be handled by your authentication session.
export async function GET() {
  try {
    const user = await prisma.user.findFirst({
        where: { role: { name: 'Staff' } },
    });

    if (!user) {
        return NextResponse.json({ error: 'Staff user not found. Please seed the database.' }, { status: 404 });
    }
    
    // Omit password from the response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
