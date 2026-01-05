
'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { serialize } from 'cookie';
import { headers } from 'next/headers';

const getJwtSecret = (type: 'access' | 'refresh') => {
    const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
    return new TextEncoder().encode(secret);
};

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_SECONDS = parseInt(process.env.LOCKOUT_DURATION_SECONDS || '30', 10);

// In-memory store for login attempts. In a multi-server setup, a persistent store like Redis would be better.
const loginAttempts: Record<string, { count: number; lockoutUntil: number; lockoutEndsAt?: Date }> = {};

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip ?? headers().get('x-forwarded-for') ?? '127.0.0.1';

    // --- Rate Limiting Logic ---
    const attempt = loginAttempts[ip];
    if (attempt && attempt.lockoutUntil > Date.now()) {
      const timeLeft = Math.ceil((attempt.lockoutUntil - Date.now()) / 1000);
      return NextResponse.json({ 
        isSuccess: false, 
        errors: [`Too many failed attempts. Please try again in ${timeLeft} seconds.`],
        lockoutInfo: { isLockedOut: true, lockoutEndsAt: attempt.lockoutEndsAt, remainingAttempts: 0 }
      }, { status: 429 });
    }

    const { phoneNumber, password, loginAs } = await req.json();

    if (!phoneNumber || !password || !loginAs) {
      return NextResponse.json({ isSuccess: false, errors: ['Phone number, password, and role are required.'] }, { status: 400 });
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

    const checkAndHandleFailedAttempt = () => {
        const currentAttempt = loginAttempts[ip] || { count: 0, lockoutUntil: 0 };
        currentAttempt.count++;

        let isLockedOut = false;
        let lockoutEndsAt: Date | undefined = undefined;

        if (currentAttempt.count >= MAX_LOGIN_ATTEMPTS) {
            lockoutEndsAt = new Date(Date.now() + LOCKOUT_DURATION_SECONDS * 1000);
            currentAttempt.lockoutUntil = lockoutEndsAt.getTime();
            currentAttempt.count = 0; // Reset count after lockout is set
            isLockedOut = true;
        }
        loginAttempts[ip] = currentAttempt;

        const remainingAttempts = isLockedOut ? 0 : MAX_LOGIN_ATTEMPTS - currentAttempt.count;
        
        return NextResponse.json({ 
            isSuccess: false, 
            errors: ['Invalid credentials.'],
            lockoutInfo: { isLockedOut, lockoutEndsAt, remainingAttempts }
        }, { status: 401 });
    };

    if (!user || !user.password) {
      return checkAndHandleFailedAttempt();
    }
    
    const userRole = user.roles.find(r => r.role.name.toLowerCase() === loginAs.toLowerCase());

    if (!userRole) {
       return checkAndHandleFailedAttempt();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
       return checkAndHandleFailedAttempt();
    }
    
    // Reset attempts on successful login
    delete loginAttempts[ip];

    // --- Create Access Token ---
    const accessTokenPayload = {
      userId: user.id,
      role: userRole.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      trainingProviderId: user.trainingProviderId,
      tokenVersion: user.tokenVersion,
    };
    const accessToken = await new SignJWT(accessTokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('access'));

    // --- Create Refresh Token ---
    const refreshTokenPayload = {
      userId: user.id,
      tokenVersion: user.tokenVersion,
    };
    const refreshToken = await new SignJWT(refreshTokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('refresh'));

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
    
    let redirectTo = userRole.role.name === 'Admin' || userRole.role.name === 'Super Admin' ? '/admin/analytics' : '/dashboard';
    if (user.passwordChangeRequired) {
      redirectTo = '/change-password';
    }

    const response = NextResponse.json({
      isSuccess: true,
      redirectTo: redirectTo,
      passwordChangeRequired: user.passwordChangeRequired,
    }, { status: 200 });

    response.headers.append('Set-Cookie', accessTokenCookie);
    response.headers.append('Set-Cookie', refreshTokenCookie);

    return response;

  } catch (error: any) {
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json({ isSuccess: false, errors: [error.message || 'Internal Server Error'] }, { status: 500 });
  }
}
