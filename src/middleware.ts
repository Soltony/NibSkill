
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

interface CustomJwtPayload extends JWTPayload {
  userId: string;
  role: {
    name: string;
    permissions?: Record<string, any>;
  };
}

// --- Helper: get JWT secret ---
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

// --- Public routes (no auth required) ---
const publicPaths = [
  '/login',
  '/login/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/connect',
  '/api/registration-data',
];

// --- Middleware ---
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session')?.value;
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const authHeader = request.headers.get('authorization');
  const miniAppTokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // 1. Handle initial entry from mini-app (set token cookie)
  if (miniAppTokenFromHeader && !request.cookies.has('miniapp-auth-token')) {
    const response = NextResponse.next();
    response.cookies.set('miniapp-auth-token', miniAppTokenFromHeader, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }
  
  // 2. Auto-login flow for mini-app users without a session
  if (request.cookies.has('miniapp-auth-token') && !sessionCookie && !isPublicPath) {
    const loginUrl = new URL('/api/auth/login', request.url);
    const loginResponse = await fetch(loginUrl.toString(), {
      method: 'POST',
      headers: {
        'Cookie': `miniapp-auth-token=${request.cookies.get('miniapp-auth-token')?.value}`
      },
      body: JSON.stringify({})
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      if (data.isSuccess && data.redirectTo) {
        // Successful auto-login, redirect to the appropriate dashboard
        const redirectResponse = NextResponse.redirect(new URL(data.redirectTo, request.url));
        
        // Forward the 'set-cookie' header from the login API response
        const newSessionCookie = loginResponse.headers.get('set-cookie');
        if (newSessionCookie) {
          redirectResponse.headers.set('set-cookie', newSessionCookie);
        }
        return redirectResponse;
      } else if (data.redirectTo === '/login/register') {
        // User is not registered, guide them to the registration page.
         return NextResponse.redirect(new URL('/login/register', request.url));
      }
    }
    // If login fails for any reason, proceed to normal unauthenticated flow
  }

  // 3. Handle existing sessions
  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getJwtSecret());
      
      // Redirect logged-in users away from login/register pages
      if (pathname.startsWith('/login') || pathname === '/') {
        // We can't determine role without parsing the JWT, so a generic redirect is safer.
        // The destination page will handle role-based redirects if necessary.
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      return NextResponse.next();
    } catch (err) {
      // Invalid session, delete cookie and redirect to login
      console.error('Middleware JWT verification failed:', err);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      response.cookies.delete('miniapp-auth-token');
      return response;
    }
  }

  // 4. Handle unauthenticated users
  if (!isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
