
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;

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

    if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      return NextResponse.json({ errors: ['Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a special character.'] }, { status: 400 });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        passwordChangeRequired: false,
      },
    });

    const response = NextResponse.json({ success: true, message: 'Password updated successfully. Please log in again.' }, { status: 200 });
    
    // Clear the authentication cookies, forcing a new login
    response.cookies.delete('refresh_token');
    response.cookies.delete('auth_token');

    return response;

  } catch (error) {
    console.error('[CHANGE_PASSWORD_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
