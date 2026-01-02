
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { SignJWT } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

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

    // Create a new JWT with the updated passwordChangeRequired status
     const jwt = await new SignJWT({
      userId: user.id,
      role: session.role,
      name: user.name,
      email: user.email,
      sessionId: newSessionId,
      trainingProviderId: user.trainingProviderId,
      passwordChangeRequired: false, // Explicitly set to false
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // Set a new expiration
      .sign(getJwtSecret());

    const response = NextResponse.json({ success: true, message: 'Password updated successfully. Please log in again.' }, { status: 200 });
    
    // Set the new, updated cookie
    response.cookies.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;

  } catch (error) {
    console.error('[CHANGE_PASSWORD_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
