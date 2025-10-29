import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import prisma from '@/lib/db';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

const publicPaths = [
  '/login',
  '/login/register',
  '/login/super-admin',
  '/api/auth/login',
  '/api/auth/register',
  '/api/connect',
  '/api/payment/initiate',
  '/api/payment/callback',
  '/api/registration-data',
];

async function validateMiniAppToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const connectUrl = new URL('/api/connect', request.url);
    const res = await fetch(connectUrl.toString(), {
      headers: { authorization: authHeader },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.phoneNumber || null;
  } catch (e) {
    console.error('MiniApp validation error:', e);
    return null;
  }
}

async function autoLoginFromMiniApp(request: NextRequest, phoneNumber: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { phoneNumber },
      include: { role: true },
    });

    if (!user) {
      // Return a special JSON response for unregistered users
      return NextResponse.json({
        isSuccess: false,
        message: 'User is not registered. Please contact support or sign up.',
      }, { status: 404 });
    }

    const newSessionId = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSessionId: newSessionId },
    });

    const token = await new SignJWT({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      sessionId: newSessionId,
      trainingProviderId: user.trainingProviderId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    const roleName = user.role.name.toLowerCase();
    let redirectTo = '/dashboard';
    if (roleName === 'super admin') redirectTo = '/super-admin';
    else if (roleName !== 'staff') redirectTo = '/admin/analytics';

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (e) {
    console.error('Auto-login error:', e);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const sessionCookie = request.cookies.get('session')?.value;

  // ✅ 1. MiniApp auto-login if no session but has Authorization
 if (!sessionCookie && request.headers.has('authorization') && !pathname.startsWith('/api/')) {
  const phoneNumber = await validateMiniAppToken(request);
  if (phoneNumber) {
    const miniAppLoginResponse = await autoLoginFromMiniApp(request, phoneNumber);
    
    if (miniAppLoginResponse) {
      // If user not registered (JSON response)
      if (miniAppLoginResponse.headers.get('content-type')?.includes('application/json')) {
        return miniAppLoginResponse;
      }
      // Otherwise proceed with redirect (logged in)
      return miniAppLoginResponse;
    }
  }
}

  // ✅ 2. Validate existing session
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, getJwtSecret());
      const roleName = payload.role?.name?.toLowerCase();

      if ((isPublicPath && !pathname.startsWith('/api/')) || pathname === '/') {
        let redirectTo = '/dashboard';
        if (roleName === 'super admin') redirectTo = '/super-admin';
        else if (roleName !== 'staff') redirectTo = '/admin/analytics';
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      return NextResponse.next();
    } catch (e) {
      console.warn('Invalid JWT:', e);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const res = NextResponse.redirect(url);
      res.cookies.delete('session');
      return res;
    }
  }

  // ✅ 3. No session → force login (web users)
  if (!isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
