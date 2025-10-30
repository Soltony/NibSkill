import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import prisma from '@/lib/db'
import crypto from 'crypto'

interface CustomJwtPayload extends JWTPayload {
  userId: string
  role: {
    name: string
    permissions?: Record<string, any>
  }
}

// --- Helper: get JWT secret ---
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.')
  return new TextEncoder().encode(secret)
}

// --- Public routes (no auth required) ---
const publicPaths = [
  '/login',
  '/login/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/connect',
]

// --- Auto-login from MiniApp ---
async function autoLoginFromMiniApp(request: NextRequest) {
  // Try to get token from Authorization header or ?token param
  const authHeader = request.headers.get('authorization')
  const queryToken = request.nextUrl.searchParams.get('token')
  let token: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim()
  } else if (queryToken) {
    token = queryToken.trim()
  }

  if (!token) return null

  try {
    // Validate token via /api/connect
    const connectUrl = new URL('/api/connect', request.url)
    const connectRes = await fetch(connectUrl.toString(), {
      headers: { authorization: `Bearer ${token}` },
    })

    if (!connectRes.ok) {
      console.error('MiniApp token validation failed:', connectRes.status)
      return null
    }

    const { phoneNumber } = await connectRes.json()
    if (!phoneNumber) return null

    // Find user by phone number
    const user = await prisma.user.findFirst({
      where: { phoneNumber },
      include: { role: true },
    })

    if (!user) {
      return NextResponse.json(
        { isSuccess: false, message: 'User is not registered.' },
        { status: 404 }
      )
    }

    // Create new session
    const sessionId = crypto.randomUUID()
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSessionId: sessionId },
    })

    // Generate new JWT
    const jwtToken = await new SignJWT({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      sessionId,
      trainingProviderId: user.trainingProviderId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret())

    // Redirect to dashboard and set cookies
    const res = NextResponse.redirect(new URL('/dashboard', request.url))

    // Session cookie (for auth)
    res.cookies.set('session', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    })

    // MiniApp token cookie (for payments, etc.)
    res.cookies.set('miniapp-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return res
  } catch (error) {
    console.error('MiniApp auto-login error:', error)
    return null
  }
}

// --- Middleware ---
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')?.value
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  // 🟢 Auto-login from MiniApp if no session
  if (!sessionCookie && !pathname.startsWith('/api/')) {
    const autoLoginRes = await autoLoginFromMiniApp(request)
    if (autoLoginRes) return autoLoginRes
  }

  // 🔐 JWT verification
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify<CustomJwtPayload>(sessionCookie, getJwtSecret())

      // Redirect logged-in users away from login pages
      const redirectablePaths = ['/', '/login', '/login/register']
      if (redirectablePaths.includes(pathname)) {
        const roleName = payload.role.name.toLowerCase()
        let redirectTo = '/dashboard'
        if (roleName === 'super admin') redirectTo = '/super-admin'
        else if (roleName !== 'staff') redirectTo = '/admin/analytics'
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }

      return NextResponse.next()
    } catch (err) {
      console.error('JWT verification failed:', err)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const res = NextResponse.redirect(url)
      res.cookies.delete('session')
      return res
    }
  }

  // 🚪 Redirect unauthenticated users to login
  if (!sessionCookie && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// --- Config ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
