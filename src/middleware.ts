
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
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const isChangePasswordPath = pathname === '/change-password';

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

  // At this point, we know a refresh token exists, so the user is "authenticated" for page access.
  // The client will handle refreshing the access token if needed.
  // The main job here is to handle the forced password change redirect.
  
  // We cannot reliably get the access token here because it might be expired.
  // The client is responsible for refreshing it. The middleware should not block
  // page navigation if the access token is expired, only if the refresh token is missing.

  // Since we can't reliably read the access token here, the password change enforcement
  // needs to happen on the client-side after the session is fetched, or on API routes.
  // However, let's keep the redirect logic in middleware as it's more robust.
  // To do this, we need to make the refresh endpoint return the passwordChangeRequired flag.
  // This is a more complex change. Let's simplify and rely on the client for now.
  
  // Let's re-add the access token check but handle expiry gracefully
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
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
        // If access token is expired, do nothing. The client will refresh.
        // A user with an expired access token but valid refresh token should still be able
        // to navigate between pages.
      }
  }


  return NextResponse.next();
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mock/.*).*)'],
};
