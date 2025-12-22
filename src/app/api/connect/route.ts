
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};


export async function GET(request: NextRequest) {
  console.log('[CONNECT] Incoming request:', request.url);

  try {
    const authHeader = request.headers.get('Authorization');
    console.log('[CONNECT] Authorization header:', authHeader);

    if (!authHeader) {
      console.error('[CONNECT] Authorization header missing');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authorization header is missing from the request.',
        },
        { status: 401 }
      );
    }

    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
      console.error('[CONNECT] Authorization header malformed:', authHeader);
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Authorization header is malformed. It must start with "Bearer ".',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(bearerPrefix.length);
    console.log('[CONNECT] Extracted bearer token');

    if (!token) {
      console.error('[CONNECT] Bearer token missing after extraction');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Bearer token is missing.',
        },
        { status: 401 }
      );
    }

    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    console.log('[CONNECT] Validation URL:', validationUrl);

    if (!validationUrl) {
      console.error('[CONNECT] VALIDATE_TOKEN_URL env variable not set');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Server configuration error.',
        },
        { status: 500 }
      );
    }

    console.log('[CONNECT] Validating token with external service...');
    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    console.log(
      '[CONNECT] External validation response:',
      externalResponse.status,
      externalResponse.statusText
    );

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error(
        '[CONNECT] Token validation failed:',
        externalResponse.statusText,
        errorText
      );
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
      return NextResponse.json({ status: 'error', message: 'Phone number not found in validation response.' }, { status: 400 });
    }
    
    console.log('[CONNECT] Token validated successfully');

    const guestJwt = await new SignJWT({ phoneNumber, authToken: token })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    const cookieStore = await cookies();
    console.log('[CONNECT] Setting guest session cookie');
    cookieStore.set('miniapp_guest_session', guestJwt, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/dashboard`;

    console.log('[CONNECT] Redirecting to:', redirectUrl);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[CONNECT] Unexpected error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'An unexpected server error occurred.',
      },
      { status: 500 }
    );
  }
}
