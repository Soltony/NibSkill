
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
  
  // 1. Auto-login flow for mini-app users without a main session
  // This happens *after* /api/connect has been successfully called.
  if (request.cookies.has('miniapp-auth-token') && !sessionCookie && !isPublicPath) {
    const loginUrl = new URL('/api/auth/login', request.url);
    
    // Pass the cookie to the login API route
    const loginResponse = await fetch(loginUrl.toString(), {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Body is empty for token-based login
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      if (data.isSuccess && data.redirectTo) {
        // Successful auto-login, redirect to the appropriate dashboard
        const redirectResponse = NextResponse.redirect(new URL(data.redirectTo, request.url));
        
        // Forward the 'set-cookie' header from the login API response to the browser
        const newSessionCookie = loginResponse.headers.get('set-cookie');
        if (newSessionCookie) {
          redirectResponse.headers.set('set-cookie', newSessionCookie);
        }
        return redirectResponse;
      } else if (data.redirectTo === '/login/register') {
        // User from mini-app token is not registered in this system
        return NextResponse.redirect(new URL('/login/register', request.url));
      }
    }
    // If login fails, proceed to normal unauthenticated flow
  }

  // 2. Handle existing sessions
  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getJwtSecret());
      
      // Redirect logged-in users away from public pages
      if (isPublicPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      return NextResponse.next();
    } catch (err) {
      // Invalid session, delete cookies and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      response.cookies.delete('miniapp-auth-token');
      return response;
    }
  }

  // 3. Handle unauthenticated users trying to access protected pages
  if (!isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. Allow access to public paths for unauthenticated users
  return NextResponse.next();
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mock/.*).*)'],
};
