
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
  const guestSessionCookie = request.cookies.get('miniapp_guest_session')?.value;
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // If there's a guest session, allow access to dashboard/course pages
  if (guestSessionCookie && !sessionCookie) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/courses') || pathname.startsWith('/learning-paths')) {
      return NextResponse.next();
    }
  }
  
  // Handle existing full sessions
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
      response.cookies.delete('miniapp_guest_session');
      return response;
    }
  }

  // Handle unauthenticated users trying to access protected pages
  if (!isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow access to public paths for unauthenticated users
  return NextResponse.next();
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mock/.*).*)'],
};
