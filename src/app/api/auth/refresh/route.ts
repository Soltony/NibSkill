'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set.');
    return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
  }

  const cookieStore = cookies();
  const refreshTokenFromCookie = cookieStore.get('refresh_token')?.value;

  if (!refreshTokenFromCookie) {
    return NextResponse.json({ message: 'No refresh token provided.' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(refreshTokenFromCookie, JWT_SECRET) as {
      userId: string;
      tokenVersion?: number;
      type: 'access' | 'refresh';
    };

    if (decoded.type !== 'refresh') {
      return NextResponse.json({ message: 'Invalid token type.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
       include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 401 });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      const response = NextResponse.json({ message: 'Session has been invalidated.' }, { status: 401 });
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }
    
    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) {
        return NextResponse.json({ message: 'User role not configured.' }, { status: 500 });
    }

    // --- Issue new access token ---
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        role: sessionRole,
        tokenVersion: user.tokenVersion,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: `${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s` }
    );

    // --- Rotate refresh token ---
    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        tokenVersion: user.tokenVersion,
        type: 'refresh',
      },
      JWT_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s` }
    );

    const response = NextResponse.json({ success: true, message: 'Token refreshed' });

    response.cookies.set('auth_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('[REFRESH_TOKEN_ERROR]', error);

    const response = NextResponse.json({ message: 'Invalid refresh token.' }, { status: 401 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
    return response;
  }
}
