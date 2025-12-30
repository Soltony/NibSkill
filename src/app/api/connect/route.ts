
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[CONNECT] JWT_SECRET is not set');
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
};

export async function GET(request: NextRequest) {
  console.log('[CONNECT] Incoming request:', request.url);

  try {
    const authHeader = request.headers.get('Authorization');
    console.log('[CONNECT] Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[CONNECT] Authorization header missing or invalid');
      return NextResponse.json(
        { status: 'error', message: 'Authorization header is missing or invalid.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring('Bearer '.length);
    console.log('[CONNECT] Extracted Bearer token:', token);

    if (!token) {
      console.warn('[CONNECT] Bearer token is missing');
      return NextResponse.json(
        { status: 'error', message: 'Bearer token is missing.' },
        { status: 401 }
      );
    }

    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    console.log('[CONNECT] Token validation URL:', validationUrl);

    if (!validationUrl) {
      console.error('[CONNECT] VALIDATE_TOKEN_URL not set');
      return NextResponse.json(
        { status: 'error', message: 'Server configuration error.' },
        { status: 500 }
      );
    }

    console.log('[CONNECT] Sending request to token validation service...');
    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    console.log('[CONNECT] External response status:', externalResponse.status);

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error('[CONNECT] Token validation failed:', externalResponse.statusText, errorText);
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
    console.log('[CONNECT] Validation response:', validationResult);

    const phoneNumber = validationResult.phone;
    if (!phoneNumber) {
      console.warn('[CONNECT] Phone number not found in validation response');
      return NextResponse.json(
        { status: 'error', message: 'Phone number not found in validation response.' },
        { status: 400 }
      );
    }
    console.log('[CONNECT] Phone number from validation:', phoneNumber);

    console.log('[CONNECT] Generating JWT for guest session...');
    const guestJwt = await new SignJWT({ phoneNumber, authToken: token })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());
    console.log('[CONNECT] Guest JWT generated');

    const cookieStore = cookies();
    cookieStore.set('miniapp_guest_session', guestJwt, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    console.log('[CONNECT] Cookie set for miniapp_guest_session');

    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/dashboard`;
    console.log('[CONNECT] Redirecting user to:', redirectUrl);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[CONNECT] Unexpected error:', error);
    return NextResponse.json(
      { status: 'error', message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
