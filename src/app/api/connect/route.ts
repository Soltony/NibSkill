
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
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
    if (!token) {
        return NextResponse.json(
        {
          status: 'error',
          message: 'Bearer token is missing.',
        },
        { status: 401 }
      );
    }
    
    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    if (!validationUrl) {
      console.error('VALIDATE_TOKEN_URL environment variable is not set.');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Server configuration error.',
        },
        { status: 500 }
      );
    }
    
    // Validate token with external API
    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader, // Forward the original header
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
        const errorText = await externalResponse.text();
        console.error(`Token validation failed: ${externalResponse.statusText}`, errorText);
        return NextResponse.json(
            {
                status: 'error',
                message: `Token validation failed: ${externalResponse.statusText}`,
                details: errorText,
            },
            { status: externalResponse.status }
        );
    }
    
    // On successful validation, set the token in a secure cookie
    const cookieStore = await cookies();
    cookieStore.set('miniapp-auth-token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect to the root of the mini-app, which will trigger the middleware
    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error processing /api/connect request:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'An unexpected server error occurred.',
      },
      { status: 500 }
    );
  }
}
