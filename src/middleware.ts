
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

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
  const accessToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Allow access to the change-password page and its API
  if (pathname.startsWith('/change-password') || pathname.startsWith('/api/auth/change-password')) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    // To prevent redirect loops, check if we are already on a login page
    if (!pathname.startsWith('/login')) {
      return NextResponse.redirect(loginUrl);
    }
  }

  if (accessToken) {
    const payload: any = decodeJwtPayload(accessToken as string);

    // If the access token indicates the user must change their password, redirect to change-password
    if (payload && payload.passwordChangeRequired) {
      const changeUrl = new URL('/change-password', request.url);
      return NextResponse.redirect(changeUrl);
    }
    
    // Best-effort timeout checks in middleware (edge runtime cannot access DB).
    // Decode the access token payload and enforce approximate idle/absolute timeouts
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;

    if (!payload) {
      // Token is malformed — clear cookies and redirect to login (no fetch, no DB access)
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
      response.cookies.set('refresh_sid', '', { httpOnly: true, path: '/', maxAge: -1 });
      return response;
    }

    // If refresh token is present, ensure sessionId matches as a quick unsigned check
    if (refreshToken && payload && payload.sessionId) {
      const refreshPayload: any = decodeJwtPayload(refreshToken as string);
      if (!refreshPayload) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('refresh_sid', '', { httpOnly: true, path: '/', maxAge: -1 });
        return response;
      }

      if (refreshPayload?.sessionId && refreshPayload.sessionId !== payload.sessionId) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('refresh_sid', '', { httpOnly: true, path: '/', maxAge: -1 });
        return response;
      }
    }


    if (payload && payload.iat) {
      const now = Math.floor(Date.now() / 1000);

      // Respect `exp` claim if present
      if (payload.exp && now >= Number(payload.exp)) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('refresh_sid', '', { httpOnly: true, path: '/', maxAge: -1 });
        return response;
      }

      // Enforce only absolute session age approximation (default 7 days). Do NOT treat as activity-based idle enforcement.
      const MAX_SESSION_AGE_SECONDS = Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 7;
      const issuedAt = typeof payload.iat === 'number' ? payload.iat : parseInt(payload.iat || '0', 10);

      if (now - issuedAt > MAX_SESSION_AGE_SECONDS) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: -1 });
        response.cookies.set('refresh_sid', '', { httpOnly: true, path: '/', maxAge: -1 });
        return response;
      }
    }

    // --- Authorization checks for admin/super-admin pages (best-effort unsigned check) ---
    try {
      const roleName = payload?.role?.name || null;
      const userId = payload?.userId || null;
      const ipAddr = ip || null;

      if (pathname.startsWith('/super-admin')) {
        const requiredRole = 'super_admin';
        if (roleName !== 'Super Admin') {
          try { const { securityLog } = await import('@/lib/logger'); securityLog('warn', 'authorization_denied', { userId, role: roleName, endpoint: pathname, requiredRole, ip: ipAddr }); } catch (e) {}
          const loginUrl = new URL('/', request.url);
          return NextResponse.redirect(loginUrl);
        }
      }

      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        const requiredRole = 'admin';
        if (roleName !== 'Admin' && roleName !== 'Super Admin') {
          try { const { securityLog } = await import('@/lib/logger'); securityLog('warn', 'authorization_denied', { userId, role: roleName, endpoint: pathname, requiredRole, ip: ipAddr }); } catch (e) {}
          const loginUrl = new URL('/', request.url);
          return NextResponse.redirect(loginUrl);
        }
      }
    } catch (e) {
      // don't block requests from failing due to logging
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
