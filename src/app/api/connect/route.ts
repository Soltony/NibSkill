
import { NextRequest, NextResponse } from 'next/server';

// This is the main function that will handle incoming GET requests to /api/connect
export async function GET(request: NextRequest) {
  // STEP 01: Read the Authorization header from the incoming request.
  const authHeader = request.headers.get('authorization');

  // Check if the header exists and is in the correct "Bearer <token>" format.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization header is missing or invalid.' }, { status: 401 });
  }

  // Extract the token from the header.
  const token = authHeader.substring(7); // "Bearer ".length is 7

  // STEP 02: Validate the API token by sending it to the verification server.
  // IMPORTANT: You must set the TOKEN_VALIDATION_API_URL in your environment variables.
  const validationApiUrl = process.env.TOKEN_VALIDATION_API_URL;
  if (!validationApiUrl) {
    console.error("TOKEN_VALIDATION_API_URL is not set in environment variables.");
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  
  try {
    // Make a GET request to the validation server, passing the token.
    const validationResponse = await fetch(validationApiUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // If the token is invalid or the request fails, return an error.
    if (!validationResponse.ok) {
      return NextResponse.json({ error: 'Token validation failed.' }, { status: validationResponse.status });
    }

    // If the token is valid, parse the JSON response to get the phone number.
    const responseBody = await validationResponse.json();
    const phoneNumber = responseBody.phone;

    if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number not found in validation response.' }, { status: 404 });
    }

    // Return the phone number AND the original token for the next step
    return NextResponse.json({ phoneNumber: phoneNumber, token: token });

  } catch (error) {
    console.error("Error during token validation:", error);
    return NextResponse.json({ error: 'An unexpected error occurred during token validation.' }, { status: 500 });
  }
}
