
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

const getAccessJwtSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set.');
  return new TextEncoder().encode(secret);
};

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
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const isChangePasswordPath = pathname === '/change-password';

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For accessing protected pages (not API routes), we rely on the refresh token's existence.
  // The client-side will handle access token refreshing.
  // We just need to make sure an unauthenticated user can't access protected HTML pages.
  if (accessToken) {
      try {
        const { payload } = await jwtVerify(accessToken, getAccessJwtSecret());
        if (payload.passwordChangeRequired && !isChangePasswordPath) {
            return NextResponse.redirect(new URL('/change-password', request.url));
        }
        if (!payload.passwordChangeRequired && isChangePasswordPath) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        // Access token might be expired, which is fine for page loads.
        // The client will refresh it.
      }
  }


  return NextResponse.next();
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mock/.*).*)'],
};
