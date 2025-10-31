
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
});

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const miniAppToken = cookieStore.get('miniapp-auth-token')?.value;

    let user;

    if (miniAppToken) {
      // Mini-app auto-login flow
      const connectUrl = new URL('/api/connect', request.url);
      const res = await fetch(connectUrl.toString(), {
        headers: { Authorization: `Bearer ${miniAppToken}` },
      });

      if (!res.ok) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid mini-app token.'] }, { status: 401 });
      }
      
      const data = await res.json();
      const phoneNumber = data.phoneNumber;

      if (!phoneNumber) {
        return NextResponse.json({ isSuccess: false, errors: ['Phone number not found in mini-app token.'] }, { status: 400 });
      }

      user = await prisma.user.findFirst({
        where: { phoneNumber },
        include: { role: true },
      });

      if (!user) {
        // This is not an error, it just means the user is not registered yet.
        // Redirect them to the registration page.
        return NextResponse.json({ isSuccess: false, redirectTo: '/login/register' });
      }

    } else {
      // Standard web login flow
      const body = await request.json();
      const validation = loginSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid login data.'] }, { status: 400 });
      }
      const { email, password } = validation.data;
      
      if (!email || !password) {
        return NextResponse.json({ isSuccess: false, errors: ['Email and password are required.'] }, { status: 400 });
      }

      user = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });

      if (!user || !user.password) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
      }
    }
    
    // --- Create session + JWT ---
    const sessionId = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSessionId: sessionId },
    });

    const jwt = await new SignJWT({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionId,
      trainingProviderId: user.trainingProviderId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    const { password: _, ...userWithoutPassword } = user;

    // --- Redirect by role ---
    const roleName = user.role.name.toLowerCase();
    let redirectTo = '/dashboard';
    if (roleName.includes('super')) redirectTo = '/super-admin';
    else if (!roleName.includes('staff')) redirectTo = '/admin/analytics';

    return NextResponse.json({
      isSuccess: true,
      user: userWithoutPassword,
      redirectTo,
      errors: null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ isSuccess: false, errors: ['Unexpected server error.'] }, { status: 500 });
  }
}
