
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ errors: ['Current and new passwords are required.'] }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user || !user.password) {
      return NextResponse.json({ errors: ['User not found or password not set.'] }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ errors: ['Incorrect current password.'] }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ errors: ['New password must be at least 8 characters long.'] }, { status: 400 });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    const newSessionId = crypto.randomUUID();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        activeSessionId: newSessionId, // Invalidate other sessions by creating a new active session ID
        passwordChangeRequired: false,
      },
    });

    const response = NextResponse.json({ success: true, message: 'Password updated successfully. Please log in again.' }, { status: 200 });
    
    // Clear the session cookie
    response.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: -1 });

    return response;

  } catch (error) {
    console.error('[CHANGE_PASSWORD_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
