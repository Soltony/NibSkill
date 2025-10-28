
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, type JWTPayload } from 'jose';

interface CustomJwtPayload extends JWTPayload {
    userId: string;
    // Add other properties from your JWT payload if needed
}

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set.");
    }
    return new TextEncoder().encode(secret);
}

// List of public paths that don't require authentication
const publicPaths = ['/login', '/login/register', '/login/super-admin', '/api/auth/login', '/api/auth/register', '/api/connect', '/api/payment/initiate', '/api/registration-data'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || pathname === '/';

  const sessionCookie = request.cookies.get('session')?.value;

  if (isPublicPath) {
    // If the user is on a public page and has a valid session, redirect them to the appropriate dashboard
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify<CustomJwtPayload>(sessionCookie, getJwtSecret());
        const roleName = (payload as any).role.name.toLowerCase();
        
        let redirectTo = '/dashboard'; // Default staff dashboard
        if (roleName === 'super admin') {
          redirectTo = '/super-admin';
        } else if (roleName !== 'staff') { // Any other admin-like role
          redirectTo = '/admin/analytics';
        }
        
        return NextResponse.redirect(new URL(redirectTo, request.url));
      } catch (err) {
        // Token is invalid, let them stay on the public page
      }
    }
    return NextResponse.next();
  }

  // If it's a protected path, a session must exist
  if (!sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verify the session for protected routes
  try {
    const { payload } = await jwtVerify<CustomJwtPayload>(sessionCookie, getJwtSecret());
    
    // Add logic to check for specific role access if needed
    const roleName = (payload as any).role.name.toLowerCase();
    const isAdminPath = pathname.startsWith('/admin');
    const isSuperAdminPath = pathname.startsWith('/super-admin');

    if (isSuperAdminPath && roleName !== 'super admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    if (isAdminPath && (roleName === 'staff' && !(payload as any).role.permissions.courses.r)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
  } catch (err) {
    // If token verification fails, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next();
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // And any other static assets in /public
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
