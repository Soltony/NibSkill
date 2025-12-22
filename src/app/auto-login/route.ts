
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const miniAppToken = cookieStore.get('miniapp-auth-token')?.value;

  if (!miniAppToken) {
    // If the token is missing, the user needs to go through the normal login.
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
        const errorData = await loginResponse.json().catch(() => ({}));
        console.error(`Failed to call login API during auto-login: ${errorData.message || loginResponse.statusText}`);
        return NextResponse.redirect(new URL('/login?error=auto_login_failed', request.url));
    }
    
    const loginData = await loginResponse.json();

    if (loginData.isSuccess && loginData.redirectTo) {
        // Correctly use the redirectTo path from the API response.
        const redirectUrl = new URL(loginData.redirectTo, request.url);
        const response = NextResponse.redirect(redirectUrl);

        // Forward the new session cookie from the API response to the browser.
        const newSessionCookie = loginResponse.headers.get('set-cookie');
        if (newSessionCookie) {
            response.headers.set('set-cookie', newSessionCookie);
        }
        return response;
    } else {
        // If login fails (e.g., user not found, token invalid), redirect to login with an error.
        const errorQuery = loginData.redirectTo === '/login/register' ? 'user_not_found' : 'login_failed';
        return NextResponse.redirect(new URL(`/login?error=${errorQuery}`, request.url));
    }

  } catch (error) {
    console.error('Error during auto-login process:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
