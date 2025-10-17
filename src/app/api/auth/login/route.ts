
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set.");
    }
    return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ isSuccess: false, errors: ['Invalid login data format.'] }, { status: 400 });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
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

    const ipAddress = request.ip || request.headers.get('x-forwarded-for');
    const userAgent = request.headers.get('user-agent');

    // Generate a new unique session ID
    const newSessionId = randomUUID();
    
    // Update the user record with the new session ID and log the login event
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: newSessionId }
        }),
        prisma.loginHistory.create({
            data: {
                userId: user.id,
                ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
                userAgent,
            }
        })
    ]);
    
    // Create JWT with the new session ID
    const expirationTime = '24h';
    const token = await new SignJWT({ 
        userId: user.id, 
        role: user.role.name,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        sessionId: newSessionId, // Embed the session ID in the token
     })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(getJwtSecret());
      
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
    
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      isSuccess: true,
      user: userWithoutPassword,
      errors: null,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ isSuccess: false, errors: ['An unexpected server error occurred.'] }, { status: 500 });
  }
}
