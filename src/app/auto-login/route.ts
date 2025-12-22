
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const miniAppToken = cookieStore.get('miniapp-auth-token')?.value;

  if (!miniAppToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("Auto-login error: NEXT_PUBLIC_APP_URL is not set.");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }

  try {
    const loginApiUrl = `${appUrl}/api/auth/login`;

    const loginResponse = await fetch(loginApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `miniapp-auth-token=${miniAppToken}`
      },
      body: JSON.stringify({}) // Empty body for token-based login
    });
    
    if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        console.error(`Failed to call login API during auto-login: ${errorData.message || loginResponse.statusText}`);
        return NextResponse.redirect(new URL('/login?error=auto_login_failed', request.url));
    }
    
    const loginData = await loginResponse.json();

    if (loginData.isSuccess && loginData.redirectTo) {
        const redirectUrl = new URL(loginData.redirectTo, request.url);
        const response = NextResponse.redirect(redirectUrl);

        // Forward the new session cookie to the browser
        const newSessionCookie = loginResponse.headers.get('set-cookie');
        if (newSessionCookie) {
            response.headers.set('set-cookie', newSessionCookie);
        }
        return response;
    } else {
        // If login fails for any reason (e.g., user not found), redirect to login
        return NextResponse.redirect(new URL('/login?error=user_not_found', request.url));
    }

  } catch (error) {
    console.error('Error during auto-login process:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
