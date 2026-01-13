
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { securityLog } from '@/lib/logger';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

export async function GET(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for');

  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLog('warn', 'connect_missing_header', { ip });
      return NextResponse.json(
        { status: 'error', message: 'Authorization header is missing or invalid.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring('Bearer '.length);

    if (!token) {
       securityLog('warn', 'connect_missing_token', { ip });
      return NextResponse.json(
        { status: 'error', message: 'Bearer token is missing.' },
        { status: 401 }
      );
    }

    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    if (!validationUrl) {
      securityLog('error', 'connect_missing_validation_url', { ip });
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
      securityLog('warn', 'connect_token_validation_failed', { ip, status: externalResponse.status });
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
    const phoneNumber = validationResult.phone;

    if (!phoneNumber) {
       securityLog('error', 'connect_phone_not_found', { ip });
      return NextResponse.json(
        { status: 'error', message: 'Phone number not found in validation response.' },
        { status: 400 }
      );
    }

    const guestJwt = await new SignJWT({ phoneNumber, authToken: token })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    const cookieStore = cookies();
    cookieStore.set('miniapp_guest_session', guestJwt, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Also store the verified phone number for MiniApp flows so downstream APIs (like /api/payment/initiate) can
    // trust the SuperApp-verified phone without needing to decode/verify opaque tokens.
    cookieStore.set('miniapp_phone', phoneNumber, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Persist the original SuperApp token so downstream flows (payment initiation -> NIB) can forward it
    // to the payment gateway. Keep it opaque and don't decode it server-side.
    cookieStore.set('superapp_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/dashboard`;
    
    securityLog('info', 'connect_success', { ip, redirectUrl });
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    securityLog('error', 'connect_unexpected_error', { ip, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { status: 'error', message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
