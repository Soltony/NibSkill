
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import prisma from '@/lib/db';
import { randomUUID } from 'crypto';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

export async function GET(request: NextRequest) {
  console.log('[CONNECT] Incoming request:', request.url);

  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'error', message: 'Authorization header is missing or invalid.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring('Bearer '.length);

    if (!token) {
      return NextResponse.json(
        { status: 'error', message: 'Bearer token is missing.' },
        { status: 401 }
      );
    }

    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    if (!validationUrl) {
      console.error('[CONNECT] VALIDATE_TOKEN_URL not set');
      return NextResponse.json(
        { status: 'error', message: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      return NextResponse.json(
        {
          status: 'error',
          message: `Token validation failed: ${externalResponse.statusText}`,
          details: errorText,
        },
        { status: externalResponse.status }
      );
    }

    const validationResult = await externalResponse.json();
    const rawPhone = validationResult.phone || validationResult.phoneNumber || validationResult.msisdn;

    if (!rawPhone) {
      return NextResponse.json(
        { status: 'error', message: 'Phone number not found in validation response.' },
        { status: 400 }
      );
    }

    // Normalize phone and create guest JWT
    const normalizePhone = (p?: string | null) => {
      if (!p) return null;
      const digits = String(p).replace(/[^\d]/g, '');
      return digits || null;
    };

    const normalizedPhone = normalizePhone(rawPhone);

    const guestJwt = await new SignJWT({ phoneNumber: normalizedPhone })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    const cookieStore = await cookies();

    // Store guest session JWT (used for identifying mini-app guest sessions)
    cookieStore.set('miniapp_guest_session', guestJwt, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
    });

    // Also store the raw SuperApp token (used for authenticating with NIB payment API)
    cookieStore.set('superapp_token', token, {
      path: '/',
      httpOnly: true,
      secure: true, // required for SuperApp WebView
      sameSite: 'none', // required for MiniApp in WebView contexts
      maxAge: 60 * 60 * 24,
    });

    // Mirror phone number for client-side access (non-HTTP-only cookie)
    cookieStore.set('phone_number', normalizedPhone || '', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    // Check if the user exists in our DB and, if so, create an internal session and login history
    const user = await prisma.user.findFirst({ where: { phoneNumber: { contains: normalizedPhone || '' } }, include: { roles: { include: { role: true } } } });

    if (user) {
      console.log('[CONNECT] Existing user found for phone:', normalizedPhone, 'userId:', user.id);

      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
      const userAgent = request.headers.get('user-agent');
      const newSessionId = randomUUID();

      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { activeSessionId: newSessionId } }),
        prisma.loginHistory.create({ data: { userId: user.id, ipAddress: typeof ipAddress === 'string' ? ipAddress : null, userAgent } }),
      ]);

      const expirationTime = '24h';
      const primaryRole = user.roles?.[0]?.role?.name ?? undefined;

      const internalToken = await new SignJWT({
        userId: user.id,
        role: primaryRole,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        sessionId: newSessionId,
        trainingProviderId: user.trainingProviderId,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expirationTime)
        .sign(getJwtSecret());

      // Set our app's internal auth token cookie
      cookieStore.set('session', internalToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      const url = new URL(request.url);
      const redirectUrl = `${url.protocol}//${url.host}/dashboard`;
      console.log('[CONNECT] Redirecting to dashboard for registered user:', redirectUrl);
      return NextResponse.redirect(redirectUrl);
    }

    // User not found; mirror phone for registration and redirect to home (client will handle registration)
    cookieStore.set('miniapp_phone', normalizedPhone || '', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/`;
    console.log('[CONNECT] User not registered; redirecting to home:', redirectUrl);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[CONNECT] Unexpected error:', error);
    return NextResponse.json(
      { status: 'error', message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}

