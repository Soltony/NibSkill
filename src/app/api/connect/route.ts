import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const VALIDATE_TOKEN_URL = process.env.VALIDATE_TOKEN_URL!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 400 });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Malformed Authorization header' }, { status: 400 });
    }

    const token = authHeader.substring(7);

    // Validate token with external API
    const externalResponse = await fetch(VALIDATE_TOKEN_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
      const text = await externalResponse.text();
      return NextResponse.json({ error: `Token validation failed: ${text}` }, { status: 401 });
    }

    const data = await externalResponse.json();
    const phoneNumber = data.phone;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'No phone number returned from validation' }, { status: 400 });
    }

    // ✅ Store token securely in cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'miniapp-auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({ success: true, phoneNumber });
  } catch (err) {
    console.error('Connect route error:', err);
    return NextResponse.json({ error: 'Server error during token validation' }, { status: 500 });
  }
}
