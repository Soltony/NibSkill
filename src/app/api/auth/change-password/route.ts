
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { validatePasswordBasic, isBreachedPassword, isPasswordInHistory, recordPasswordHistory } from '@/lib/password';
import { securityLog } from '@/lib/logger';

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

    // validate password policy
    const { ok, errors } = validatePasswordBasic(newPassword);
    if (!ok) return NextResponse.json({ errors }, { status: 400 });

    // check breached passwords
    const breached = await isBreachedPassword(newPassword);
    if (breached) return NextResponse.json({ errors: ['This password has appeared in data breaches. Choose a different password.'] }, { status: 400 });

    // check password history
    const inHistory = await isPasswordInHistory(user.id, newPassword);
    if (inHistory) return NextResponse.json({ errors: ['You cannot reuse a recent password. Choose a different password.'] }, { status: 400 });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        passwordChangeRequired: false,
      },
    });

    // Revoke all refresh tokens for this user to terminate other sessions
    try {
      await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
      securityLog('audit', 'password_change_invalidate_sessions', { userId: user.id });
    } catch (e) {
      console.error('Failed to invalidate sessions after password change', e);
    }

    // record password history
    await recordPasswordHistory(user.id, newHashedPassword);

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
