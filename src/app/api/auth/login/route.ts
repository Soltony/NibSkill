'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_SECONDS = parseInt(process.env.LOCKOUT_DURATION_SECONDS || '30', 10);

// In-memory store for login attempts. In a multi-server setup, a persistent store like Redis would be better.
const loginAttempts: Record<string, { count: number; lockoutUntil: number }> = {};

export async function POST(req: NextRequest) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set.');
    }

    const headersList = headers();
    const ip = req.ip ?? headersList.get('x-forwarded-for') ?? '127.0.0.1';

    // --- Rate Limiting Logic ---
    const attempt = loginAttempts[ip] || { count: 0, lockoutUntil: 0 };
    if (attempt.lockoutUntil > Date.now()) {
      const timeLeft = Math.ceil((attempt.lockoutUntil - Date.now()) / 1000);
      return NextResponse.json({ message: `Too many failed attempts. Please try again in ${timeLeft} seconds.` }, { status: 429 });
    }

    const { phoneNumber, password } = await req.json();

    if (!phoneNumber || !password) {
      return NextResponse.json({ message: 'Phone number and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
       include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || !user.password) {
      // Increment attempt count for invalid user
      attempt.count++;
      if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.lockoutUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        attempt.count = 0; // Reset count after lockout
      }
      loginAttempts[ip] = attempt;
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment attempt count for invalid password
      attempt.count++;
      if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.lockoutUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        attempt.count = 0;
      }
      loginAttempts[ip] = attempt;
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // Reset attempts on successful login
    delete loginAttempts[ip];
    
    // Assuming the first role is the one we want for the session
    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) {
        return NextResponse.json({ message: 'User role not configured.' }, { status: 500 });
    }

    // --- Create Access Token ---
    const accessTokenPayload = {
      userId: user.id,
      role: sessionRole,
      tokenVersion: user.tokenVersion,
      type: 'access' as 'access',
    };
    const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
      expiresIn: `${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`,
    });

    // --- Create Refresh Token ---
    const refreshTokenPayload = {
      userId: user.id,
      tokenVersion: user.tokenVersion,
      type: 'refresh' as 'refresh',
    };
    const refreshToken = jwt.sign(refreshTokenPayload, JWT_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`,
    });

    const accessTokenCookie = serialize('auth_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });


    const refreshTokenCookie = serialize('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      message: 'Login successful.',
      user: userWithoutPassword,
    }, { status: 200 });

    response.headers.append('Set-Cookie', accessTokenCookie);
    response.headers.append('Set-Cookie', refreshTokenCookie);

    return response;

  } catch (error: any) {
    console.error('[LOGIN_ERROR]', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
