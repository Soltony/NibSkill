
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, type JWTPayload } from 'jose'

interface CustomJwtPayload extends JWTPayload {
  userId: string
  role: {
    name: string
    permissions?: Record<string, any>
  }
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.')
  return new TextEncoder().encode(secret)
}

// Publicly accessible paths that do not require authentication
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
]

async function autoLoginFromMiniApp(request: NextRequest): Promise<NextResponse | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const connectUrl = new URL('/api/connect', request.url);
        const connectResponse = await fetch(connectUrl, {
            headers: { 'authorization': authHeader }
        });

        if (!connectResponse.ok) return null;

        const { phoneNumber } = await connectResponse.json();
        if (!phoneNumber) return null;
        
        const loginUrl = new URL('/api/auth/login', request.url);
        const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        
        if (loginResponse.ok) {
            const { redirectTo } = await loginResponse.json();
            const res = NextResponse.redirect(new URL(redirectTo, request.url));
            
            // Transfer cookies from the API response to the new redirect response
            const setCookie = loginResponse.headers.get('set-cookie');
            if (setCookie) {
                res.headers.set('set-cookie', setCookie);
            }
            return res;
        }

        return null;

    } catch (error) {
        console.error("Mini-app auto-login error:", error);
        return null;
    }
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let sessionCookie = request.cookies.get('session')?.value

  // Generate nonce for inline scripts
  const scriptNonce = crypto.randomUUID()

  const setSecurityHeaders = (res: NextResponse) => {
    const cspHeader = [
        "default-src 'self' https://picsum.photos",
        `script-src 'self' 'nonce-${scriptNonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https://picsum.photos https://images.unsplash.com",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'self' https://www.youtube.com",
        "font-src 'self' https://fonts.gstatic.com",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ].join('; ');
    res.headers.set('Content-Security-Policy', cspHeader)
    res.headers.set('x-script-nonce', scriptNonce)
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('X-Frame-Options', 'DENY')
    return res
  }

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Attempt auto-login if no session cookie and auth header exists
  if (!sessionCookie && request.headers.has('authorization')) {
      const autoLoginResponse = await autoLoginFromMiniApp(request);
      if (autoLoginResponse) {
          return setSecurityHeaders(autoLoginResponse);
      }
  }


  // If the user has a session, handle redirects from public pages
  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getJwtSecret())
      // If token is valid and user is on a public path or root, redirect to dashboard
      if (isPublicPath || pathname === '/') {
        const { payload } = await jwtVerify<CustomJwtPayload>(sessionCookie, getJwtSecret())
        const roleName = payload.role.name.toLowerCase()
        let redirectTo = '/dashboard'
        if (roleName === 'super admin') {
            redirectTo = '/super-admin'
        } else if (roleName !== 'staff') {
            redirectTo = '/admin/analytics'
        }
        const res = NextResponse.redirect(new URL(redirectTo, request.url))
        return setSecurityHeaders(res)
      }
    } catch (err) {
      // Invalid token, treat as unauthenticated
      // If on a protected path, redirect to login
      if (!isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const res = NextResponse.redirect(url)
        res.cookies.delete('session'); // Clear invalid cookie
        return setSecurityHeaders(res)
      }
    }
  }

  // If the user has no session and is trying to access a protected page
  if (!sessionCookie && !isPublicPath && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    return setSecurityHeaders(res)
  }

  // If the user has no session and is on the root page, redirect to login
  if (!sessionCookie && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    return setSecurityHeaders(res)
  }

  // Otherwise, allow the request to proceed
  const res = NextResponse.next()
  return setSecurityHeaders(res)
}

// Apply middleware to all routes, including error pages
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
