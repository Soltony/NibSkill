
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('--- LOGIN ATTEMPT ---');
    console.log('Request Body:', body);

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      console.error('Validation failed:', validation.error.flatten());
      return NextResponse.json({ isSuccess: false, errors: ['Invalid email or password format.'] }, { status: 400 });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    console.log('User found in DB:', user ? { id: user.id, email: user.email, passwordHash: user.password } : null);

    if (!user || !user.password) {
      console.log('Result: User not found or user has no password.');
      return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`Password comparison for "${email}": ${isPasswordValid ? 'SUCCESS' : 'FAILURE'}`);


    if (!isPasswordValid) {
        console.log('Result: Invalid password.');
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
    }

    // Capture login audit information
    const ipAddress = request.ip || request.headers.get('x-forwarded-for');
    const userAgent = request.headers.get('user-agent');

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
        userAgent,
      }
    });

    // In a real app, generate JWT tokens here.
    // The tokens should include user ID, role, and an expiration date.
    const accessToken = 'dummy-access-token';
    const refreshToken = 'dummy-refresh-token';

    const { password: _, ...userWithoutPassword } = user;
    
    console.log('Result: Login successful!');
    console.log('---------------------');


    return NextResponse.json({
      isSuccess: true,
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      errors: null,
    });

  } catch (error) {
    console.error('--- LOGIN ERROR ---');
    console.error('An unexpected server error occurred:', error);
    console.error('-------------------');
    return NextResponse.json({ isSuccess: false, errors: ['An unexpected server error occurred.'] }, { status: 500 });
  }
}
