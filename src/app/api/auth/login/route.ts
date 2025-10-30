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
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  try {
    let phoneNumber: string | undefined;
    let token: string | undefined;

    // --- 1️⃣ Check for miniapp token from cookie or header ---
    const cookieStore = await cookies();
    const tokenFromCookie = cookieStore.get('miniapp-auth-token')?.value;
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (tokenFromCookie) {
      token = tokenFromCookie;
    }

    // If token exists, validate via /api/connect
    if (token) {
      const connectUrl = new URL('/api/connect', request.url);
      const res = await fetch(connectUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        phoneNumber = data.phoneNumber;
      } else {
        console.warn('Miniapp token invalid');
      }
    }

    // --- 2️⃣ Parse body for web login ---
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success && !phoneNumber) {
      return NextResponse.json({ isSuccess: false, errors: ['Invalid login data.'] }, { status: 400 });
    }

    const { email, password } = validation.success ? validation.data : {};
    let user;

    // --- 3️⃣ Find user ---
    if (phoneNumber) {
      user = await prisma.user.findFirst({
        where: { phoneNumber },
        include: { role: true },
      });
      if (!user) {
        return NextResponse.json({ isSuccess: false, errors: ['User is not registered.'] }, { status: 404 });
      }
    } else if (email && password) {
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

    // --- 4️⃣ Create session + JWT ---
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
      phoneNumber: user.phoneNumber,
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    // --- 5️⃣ Set cookies ---
    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    if (token) {
      cookieStore.set({
        name: 'miniapp-auth-token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    // --- 6️⃣ Redirect by role ---
    const roleName = user.role.name.toLowerCase();
    let redirectTo = '/dashboard';
    if (roleName === 'super admin') redirectTo = '/super-admin';
    else if (roleName !== 'staff') redirectTo = '/admin/analytics';

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
