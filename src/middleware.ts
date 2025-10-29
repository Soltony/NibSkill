
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
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

async function handleMiniAppLogin(request: NextRequest) {
  console.log('[Middleware] Starting mini-app auto-login...');
  const connectUrl = request.nextUrl.clone();
  connectUrl.pathname = '/api/connect';
  console.log('[Middleware] Connect URL:', connectUrl.href);

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/api/auth/login';
  console.log('[Middleware] Login URL:', loginUrl.href);

  try {
    // 1. Call /api/connect to get phone number from mini-app token
    const connectResponse = await fetch(connectUrl, {
      headers: {
        'Authorization': request.headers.get('Authorization')!,
        'Content-Type': 'application/json'
      }
    });
    console.log('[Middleware] /api/connect response status:', connectResponse.status);


    if (!connectResponse.ok) {
        const errorText = await connectResponse.text();
        console.error('[Middleware] MiniApp auto-login: /api/connect failed.', errorText);
        return null;
    }
    const connectData = await connectResponse.json();
    console.log('[Middleware] /api/connect response data:', connectData);
    const phoneNumber = connectData.phoneNumber;

    if (!phoneNumber) {
        console.error('[Middleware] MiniApp auto-login: Phone number not returned from /api/connect');
        return null;
    }
     console.log('[Middleware] Phone number received:', phoneNumber);
    
    // 2. Call /api/auth/login with phone number to get session cookie
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-MiniApp-Auth': 'true' // Internal header to signal auto-login
      },
      body: JSON.stringify({ phoneNumber })
    });
     console.log('[Middleware] /api/auth/login response status:', loginResponse.status);
    
    if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        // If user not registered, redirect to login with a message
        if (loginResponse.status === 404) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('error', 'miniapp_user_not_found');
            console.log('[Middleware] User not found, redirecting to login page.');
            return NextResponse.redirect(url);
        }
        console.error('[Middleware] MiniApp auto-login: /api/auth/login failed', errorData);
        return null;
    }
    
    const loginData = await loginResponse.json();
    console.log('[Middleware] /api/auth/login response data:', loginData);

    
    // 3. Create redirect response and set the cookie
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginData.redirectTo || '/dashboard';
    console.log('[Middleware] Redirecting to:', redirectUrl.pathname);
    const response = NextResponse.redirect(redirectUrl);
    
    response.cookies.set('session', loginData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    console.log('[Middleware] Session cookie set. Completing auto-login.');
    return response;

  } catch (error) {
    console.error("[Middleware] Mini-app auto-login error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session')?.value;
  const isMiniApp = request.headers.get('authorization')?.startsWith('Bearer ');
  
  // 1. Handle Mini-App Auto-Login
  if (isMiniApp && !sessionCookie && !pathname.startsWith('/api/')) {
    const miniAppResponse = await handleMiniAppLogin(request);
    if (miniAppResponse) {
      return miniAppResponse;
    }
    // If auto-login fails, fall through to default behavior (redirect to /login)
  }

  const isPublicPath = publicPaths.some(p => pathname === p || (p.endsWith('/') && pathname.startsWith(p)));

  // 2. Handle users with a session cookie
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, getJwtSecret());
      const roleName = (payload as any).role?.name?.toLowerCase();

      // If user is logged in and tries to access a public page, redirect them away
      if (isPublicPath && !pathname.startsWith('/api')) {
        let redirectTo = '/dashboard';
        if (roleName === 'super admin') redirectTo = '/super-admin';
        else if (roleName && roleName !== 'staff') redirectTo = '/admin/analytics';
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      
      // Allow the request to proceed
      return NextResponse.next();

    } catch (err) {
      // Invalid token, clear cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  // 3. Handle users without a session cookie
  if (!isPublicPath) {
    // If it's not a public path and there's no session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow the request for public paths to proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
