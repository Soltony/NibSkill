
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[/api/connect] Received request.');
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[/api/connect] Authorization header is missing or invalid.');
    return NextResponse.json({ error: 'Authorization header is missing or invalid.' }, { status: 401 });
  }

  const token = authHeader.substring(7);

  const validationApiUrl = process.env.TOKEN_VALIDATION_API_URL;
  if (!validationApiUrl) {
    console.error("[/api/connect] TOKEN_VALIDATION_API_URL is not set in environment variables.");
    return NextResponse.json({ error: 'Server configuration error: Token validation URL is not configured.' }, { status: 500 });
  }
  console.log('[/api/connect] Validation URL:', validationApiUrl);
  
  try {
    const validationResponse = await fetch(validationApiUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[/api/connect] External validation API response status:', validationResponse.status);
    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error('[/api/connect] Token validation failed with external API.', { status: validationResponse.status, error: errorText });
      return NextResponse.json({ error: 'Token validation failed.' }, { status: validationResponse.status });
    }

    const responseBody = await validationResponse.json();
    console.log('[/api/connect] External validation API response body:', responseBody);
    const phoneNumber = responseBody.phone;

    if (!phoneNumber) {
        console.error('[/api/connect] Phone number not found in validation response.');
        return NextResponse.json({ error: 'Phone number not found in validation response.' }, { status: 404 });
    }
    
    console.log('[/api/connect] Successfully retrieved phone number:', phoneNumber);
    return NextResponse.json({ phoneNumber: phoneNumber, token: token });

  } catch (error) {
    console.error("[/api/connect] Error during token validation:", error);
    const errorMessage = (error instanceof Error && error.message.includes('fetch failed'))
      ? `Could not connect to the token validation server at ${validationApiUrl}. Please check if the TOKEN_VALIDATION_API_URL environment variable is set correctly and the server is reachable.`
      : 'An unexpected error occurred during token validation.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
