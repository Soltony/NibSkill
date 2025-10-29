import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, type JWTPayload, SignJWT } from 'jose'

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
  let sessionCookie = request.cookies.get('session')?.value
  const authHeader = request.headers.get('authorization');
  
  const isPublicPath =
    publicPaths.some((path) => pathname.startsWith(path)) || pathname === '/'

  // Generate nonce for inline scripts
  const scriptNonce = crypto.randomUUID()

  // CSP header
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
  ].join('; ')

  const setSecurityHeaders = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', cspHeader)
    res.headers.set('x-script-nonce', scriptNonce)
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('X-Frame-Options', 'DENY')
    return res
  }

  // If there's an auth header from the mini-app, create a session cookie.
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // Here we'd ideally validate this token against a user service
    // For now, we'll create a session cookie if the token exists.
    // This is a simplified example. In a real app, you would
    // fetch user details based on the token and create a JWT.
    
    // For demonstration, let's assume the token is the user ID and we create a JWT for them.
    // In a real scenario, you'd decode the token or call an API to get user info.
    
    // This part is simplified. If the auth header exists, we let it pass through
    // and assume the client-side will handle it. A better approach would be
    // to convert it to a standard session cookie here if possible.
    if (!sessionCookie) {
        // Since we can't fully verify the token here without more info,
        // we'll let the request proceed. The client side logic might need to handle this.
        // Or if we *could* verify it, we'd create and set a session cookie here.
    }
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

// Apply middleware to all routes, including error pages
export const config = {
  matcher: ['/:path*'],
}
