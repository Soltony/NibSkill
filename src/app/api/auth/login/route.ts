import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ isSuccess: false, errors: ['Invalid login data format.'] }, { status: 400 });
    }

    const { email, password, phoneNumber } = validation.data;
    let user;

    // --- 🔹 Case 1: Login via phone (used by mini-app or web phone login)
    if (phoneNumber) {
      user = await prisma.user.findFirst({
        where: { phoneNumber },
        include: { role: true },
      });

      if (!user) {
        return NextResponse.json(
          { isSuccess: false, errors: [`User with phone number ${phoneNumber} not found.`] },
          { status: 404 }
        );
      }
    }

    // --- 🔹 Case 2: Login via email/password (web users)
    else if (email && password) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });

      if (!user || !user.password) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
      }
    }

    // --- ❌ Missing required credentials
    else {
      return NextResponse.json(
        { isSuccess: false, errors: ['Either phone number or email/password must be provided.'] },
        { status: 400 }
      );
    }

    // --- 🔹 Create new session
    const newSessionId = randomUUID();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { activeSessionId: newSessionId },
      }),
      prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: request.ip || request.headers.get('x-forwarded-for'),
          userAgent: request.headers.get('user-agent'),
        },
      }),
    ]);

    // --- 🔹 Generate JWT
    const token = await new SignJWT({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      sessionId: newSessionId,
      trainingProviderId: user.trainingProviderId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    // --- 🔹 Decide dashboard redirect
    const roleName = user.role.name.toLowerCase();
    const permissions = user.role.permissions as any;
    const isSuperAdmin = roleName === 'super admin';
    const canViewAdminDashboard = permissions?.courses?.r === true;

    let redirectTo = '/dashboard';
    if (isSuperAdmin) redirectTo = '/super-admin';
    else if (canViewAdminDashboard && roleName !== 'staff') redirectTo = '/admin/analytics';

    // --- 🔹 If from Mini-App → return JSON only (middleware sets cookie)
    const isFromMiniApp = request.headers.get('x-miniapp-auth') === 'true';
    if (isFromMiniApp) {
      return NextResponse.json({
        isSuccess: true,
        user: { ...user, password: undefined },
        redirectTo,
        token,
      });
    }

    // --- 🔹 For web → set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({
      isSuccess: true,
      user: { ...user, password: undefined },
      redirectTo,
      errors: null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ isSuccess: false, errors: ['An unexpected server error occurred.'] }, { status: 500 });
  }
}
