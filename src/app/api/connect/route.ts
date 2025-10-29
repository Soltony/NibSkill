
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization header is missing or invalid.' }, { status: 401 });
  }

  const token = authHeader.substring(7);

  const validationApiUrl = process.env.TOKEN_VALIDATION_API_URL;
  if (!validationApiUrl) {
    console.error("TOKEN_VALIDATION_API_URL is not set in environment variables.");
    return NextResponse.json({ error: 'Server configuration error: Token validation URL is not configured.' }, { status: 500 });
  }
  
  try {
    const validationResponse = await fetch(validationApiUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!validationResponse.ok) {
      return NextResponse.json({ error: 'Token validation failed.' }, { status: validationResponse.status });
    }

    const responseBody = await validationResponse.json();
    const phoneNumber = responseBody.phone;

    if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number not found in validation response.' }, { status: 404 });
    }

    return NextResponse.json({ phoneNumber: phoneNumber, token: token });

  } catch (error) {
    console.error("Error during token validation:", error);
    const errorMessage = (error instanceof Error && error.message.includes('fetch failed'))
      ? `Could not connect to the token validation server at ${validationApiUrl}. Please check if the TOKEN_VALIDATION_API_URL environment variable is set correctly and the server is reachable.`
      : 'An unexpected error occurred during token validation.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
