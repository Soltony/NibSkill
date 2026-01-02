
import { NextResponse, type NextRequest } from 'next/server';

// --- Public routes (no auth required) ---
const publicPaths = [
  '/login',
  '/login/register',
  '/login/admin',
  '/login/super-admin',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/connect',
  '/api/registration-data',
];

// --- Middleware ---
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    const loginUrl = new URL('/login', request.url);
    // To prevent redirect loops, check if we are already on a login page
    if (!pathname.startsWith('/login')) {
      return NextResponse.redirect(loginUrl);
    }
  }

  // The client is now fully responsible for handling password change redirects
  // and access token refreshes. Middleware's only job is to protect routes
  // based on the presence of a refresh token.
  return NextResponse.next();
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mock/.*).*)'],
};
