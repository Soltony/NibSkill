
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
        const connectUrl = request.nextUrl.clone();
        connectUrl.pathname = '/api/connect';
        
        const connectResponse = await fetch(connectUrl, {
            headers: { 'authorization': authHeader }
        });

        if (!connectResponse.ok) return null;

        const { phoneNumber } = await connectResponse.json();
        if (!phoneNumber) return null;
        
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/api/auth/login';
        
        const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'authorization': authHeader // Forward the auth header for security
            },
            body: JSON.stringify({ phoneNumber })
        });
        
        if (loginResponse.ok) {
            const { redirectTo } = await loginResponse.json();
            const res = NextResponse.redirect(new URL(redirectTo, request.url));
            
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

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  if (!sessionCookie && request.headers.has('authorization') && !pathname.startsWith('/api/')) {
      const autoLoginResponse = await autoLoginFromMiniApp(request);
      if (autoLoginResponse) {
          return autoLoginResponse;
      }
  }

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify<CustomJwtPayload>(sessionCookie, getJwtSecret())
      
      const isPublicButNotApi = isPublicPath && !pathname.startsWith('/api/');
      
      if (isPublicButNotApi || pathname === '/') {
        const roleName = payload.role.name.toLowerCase()
        let redirectTo = '/dashboard'
        if (roleName === 'super admin') {
            redirectTo = '/super-admin'
        } else if (roleName !== 'staff') {
            redirectTo = '/admin/analytics'
        }
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }

    } catch (err) {
      if (!isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const res = NextResponse.redirect(url)
        res.cookies.delete('session');
        return res
      }
    }
  }

  if (!sessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
