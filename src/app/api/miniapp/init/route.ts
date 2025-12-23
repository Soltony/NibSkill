import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[MINIAPP INIT] Authorization header missing');
      return NextResponse.json({ message: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Store token in an httpOnly secure cookie for subsequent API calls
    cookies().set('superapp_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    console.log('[MINIAPP INIT] SuperApp token stored successfully (masked):', `${token.slice(0,6)}...${token.slice(-6)}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MINIAPP INIT] Unexpected error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
