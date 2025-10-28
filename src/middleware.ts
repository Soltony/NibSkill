
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

// Publicly accessible paths
const publicPaths = [
  '/login',
  '/login/register',
  '/login/super-admin',
  '/api/auth/login',
  '/api/auth/register',
  '/api/connect',
  '/api/payment/initiate',
  '/api/registration-data',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')?.value
  const isPublicPath =
    publicPaths.some((path) => pathname.startsWith(path)) || pathname === '/'

  // Generate nonces for inline scripts and styles
  const scriptNonce = crypto.randomUUID()
  const styleNonce = crypto.randomUUID()

  // Strict CSP
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${scriptNonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' https://placehold.co https://images.unsplash.com https://picsum.photos;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim()

  const setSecurityHeaders = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', cspHeader)
    res.headers.set('x-script-nonce', scriptNonce)
    res.headers.set('x-style-nonce', styleNonce)
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    res.headers.set('X-Frame-Options', 'DENY')
    return res
  }

  // Public pages
  if (isPublicPath) {
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify<CustomJwtPayload>(
          sessionCookie,
          getJwtSecret()
        )
        const roleName = payload.role.name.toLowerCase()
        let redirectTo = '/dashboard'
        if (roleName === 'super admin') redirectTo = '/super-admin'
        else if (roleName !== 'staff') redirectTo = '/admin/analytics'

        const res = NextResponse.redirect(new URL(redirectTo, request.url))
        return setSecurityHeaders(res)
      } catch {
        // Invalid token: continue to public page
      }
    }
    const res = NextResponse.next()
    return setSecurityHeaders(res)
  }

  // Protected pages
  if (!sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    return setSecurityHeaders(res)
  }

  try {
    const { payload } = await jwtVerify<CustomJwtPayload>(
      sessionCookie,
      getJwtSecret()
    )
    const roleName = payload.role.name.toLowerCase()
    const isAdminPath = pathname.startsWith('/admin')
    const isSuperAdminPath = pathname.startsWith('/super-admin')

    if (isSuperAdminPath && roleName !== 'super admin') {
      const res = NextResponse.redirect(new URL('/dashboard', request.url))
      return setSecurityHeaders(res)
    }

    if (
      isAdminPath &&
      roleName === 'staff' &&
      !(payload.role.permissions?.courses?.r ?? false)
    ) {
      const res = NextResponse.redirect(new URL('/dashboard', request.url))
      return setSecurityHeaders(res)
    }
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    return setSecurityHeaders(res)
  }

  // Default: allow request
  const res = NextResponse.next()
  return setSecurityHeaders(res)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
