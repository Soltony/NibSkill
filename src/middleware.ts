
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

async function autoLoginFromMiniApp(request: NextRequest) {
  console.log('[Middleware] Starting mini-app auto-login...');
  const miniAppAuthToken = request.headers.get('authorization');
  
  if (!miniAppAuthToken) {
      console.error('[Middleware] Mini-app auth header is missing.');
      return null;
  }

  try {
    // 1. Call /api/connect to get phone number
    const connectUrl = request.nextUrl.clone();
    connectUrl.pathname = '/api/connect';
    console.log('[Middleware] Calling /api/connect at:', connectUrl.href);

    const connectResponse = await fetch(connectUrl, {
      headers: {
        'Authorization': miniAppAuthToken,
      }
    });

    console.log('[Middleware] /api/connect response status:', connectResponse.status);
    if (!connectResponse.ok) {
        const errorText = await connectResponse.text();
        console.error('[Middleware] /api/connect failed:', errorText);
        return null;
    }
    const connectData = await connectResponse.json();
    const phoneNumber = connectData.data?.phoneNumber;

    if (!phoneNumber) {
        console.error('[Middleware] Phone number not returned from /api/connect');
        return null;
    }
    console.log('[Middleware] Phone number received:', phoneNumber);

    // 2. Call /api/auth/login with phone number
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/api/auth/login';
    console.log('[Middleware] Calling /api/auth/login at:', loginUrl.href);

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-MiniApp-Auth': 'true' // Internal flag for API
      },
      body: JSON.stringify({ phoneNumber })
    });

    console.log('[Middleware] /api/auth/login response status:', loginResponse.status);
    const loginData = await loginResponse.json();

     if (!loginResponse.ok || !loginData.isSuccess) {
        if (loginResponse.status === 404) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('error', 'miniapp_user_not_found');
            console.log('[Middleware] User not found, redirecting to login page with error.');
            return NextResponse.redirect(url);
        }
        console.error('[Middleware] /api/auth/login failed:', loginData);
        return null; // Let it fall through to normal login page
    }
    
    console.log('[Middleware] /api/auth/login successful. Preparing redirect to:', loginData.redirectTo);

    // 3. Create redirect response and set cookies
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginData.redirectTo || '/dashboard';
    const response = NextResponse.redirect(redirectUrl);

    // Set the main session cookie
    response.cookies.set('session', loginData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    console.log('[Middleware] Set session cookie.');

    // Set the mini-app token cookie for payments
    const miniAppTokenValue = miniAppAuthToken.replace('Bearer ', '');
    response.cookies.set('miniapp-auth-token', miniAppTokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
    console.log('[Middleware] Set miniapp-auth-token cookie.');

    return response;

  } catch (error) {
    console.error("[Middleware] Mini-app auto-login error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session')?.value;
  const isMiniAppRequest = !!request.headers.get('authorization')?.startsWith('Bearer ');
  
  console.log(`[Middleware] Path: ${pathname}, HasSession: ${!!sessionCookie}, IsMiniApp: ${isMiniAppRequest}`);

  // Handle Mini-App Auto-Login on first load
  if (isMiniAppRequest && !sessionCookie && !pathname.startsWith('/api/')) {
    const miniAppResponse = await autoLoginFromMiniApp(request);
    if (miniAppResponse) {
      return miniAppResponse;
    }
  }

  const isPublicPath = publicPaths.some(p => pathname === p || (p.endsWith('/') && pathname.startsWith(p)));

  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getJwtSecret());
      if (isPublicPath && !pathname.startsWith('/api')) {
        console.log(`[Middleware] User logged in, redirecting from public path ${pathname} to /dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.next();
    } catch (err) {
      console.log('[Middleware] Invalid session token, clearing cookie and redirecting to login.');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      response.cookies.delete('miniapp-auth-token');
      return response;
    }
  }

  if (!isPublicPath) {
    console.log(`[Middleware] No session, redirecting from protected path ${pathname} to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
