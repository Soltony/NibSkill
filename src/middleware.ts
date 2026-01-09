
import { NextResponse, type NextRequest } from 'next/server';

// Helper: decode JWT payload without verifying signature (safe for middleware edge runtime)
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

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
  const accessToken = request.cookies.get('auth_token')?.value;

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

  // Best-effort timeout checks in middleware (edge runtime cannot access DB).
  // Decode the refresh token payload and enforce approximate idle/absolute timeouts
  if (refreshToken) {
    const payload: any = decodeJwtPayload(refreshToken as string);
    // Also decode access token (if present) and ensure session binding matches between tokens
    if (accessToken) {
      const accessPayload: any = decodeJwtPayload(accessToken as string);
      if (payload?.sessionId && accessPayload?.sessionId && payload.sessionId !== accessPayload.sessionId) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        try {
          const { securityLog } = await import('@/lib/logger');
          const ip = request.ip || request.headers.get('x-forwarded-for') || null;
          securityLog('warn', 'middleware_session_mismatch', { path: pathname, ip });
        } catch (e) {}
        return response;
      }
    }
    if (payload && payload.iat) {
      const IDLE_TIMEOUT_SECONDS = Number(process.env.IDLE_TIMEOUT_SECONDS) || 60 * 30;
      const MAX_SESSION_AGE_SECONDS = Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 30;
      const now = Math.floor(Date.now() / 1000);
      const issuedAt = typeof payload.iat === 'number' ? payload.iat : parseInt(payload.iat || '0', 10);

      if (now - issuedAt > MAX_SESSION_AGE_SECONDS || now - issuedAt > IDLE_TIMEOUT_SECONDS) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        try {
          const ip = request.ip || request.headers.get('x-forwarded-for') || null;
          const { securityLog } = await import('@/lib/logger');
          securityLog('warn', 'middleware_token_expire_redirect', { path: pathname, ip });
        } catch (e) {
          // ignore
        }
        return response;
      }
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
