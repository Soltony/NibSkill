
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// This function retrieves the NIB Payment Key from environment variables.
const getNibPaymentKey = () => {
    const key = process.env.NIB_PAYMENT_KEY;
    if (!key) {
        console.error("NIB_PAYMENT_KEY is not set in environment variables.");
        throw new Error("Server configuration error: Payment key is missing.");
    }
    return key;
}

// This function validates the token by calling the external validation API.
const validateToken = async (token: string) => {
    const validationApiUrl = process.env.TOKEN_VALIDATION_API_URL;
    if (!validationApiUrl) {
        console.error("TOKEN_VALIDATION_API_URL is not set in environment variables.");
        throw new Error("Server configuration error: Token validation URL is missing.");
    }

    const validationResponse = await fetch(validationApiUrl, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    return validationResponse.ok;
}

export async function POST(request: NextRequest) {
    // Step 1: Validate the Authorization header token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ message: "Authorization header is missing or invalid." }, { status: 401 });
    }
    const token = authHeader.substring(7);

    try {
        const isTokenValid = await validateToken(token);
        if (!isTokenValid) {
            return NextResponse.json({ message: "Invalid authorization token." }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ message: "An error occurred during token validation." }, { status: 500 });
    }

    // Step 2: Process the request body
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        console.error("Callback Error: Invalid JSON in request body.", e);
        return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const {
        paidAmount,
        paidByNumber,
        txnRef,
        transactionId,
        transactionTime,
        accountNo,
        token: bodyToken,
        signature: receivedSignature
    } = requestBody;
    
    // Ensure all required fields are present
    if (!paidAmount || !paidByNumber || !txnRef || !transactionId || !transactionTime || !accountNo || !bodyToken || !receivedSignature) {
        return NextResponse.json({ message: "Missing required fields in callback data." }, { status: 400 });
    }

    // Step 3: Verify the signature for data integrity
    try {
        const key = getNibPaymentKey();
        const signatureString = [
            `accountNo=${accountNo}`,
            `paidAmount=${paidAmount}`,
            `paidByNumber=${paidByNumber}`,
            `Key=${key}`,
            `token=${bodyToken}`,
            `transactionId=${transactionId}`,
            `transactionTime=${transactionTime}`,
            `txnRef=${txnRef}`
        ].join('&');
        
        const calculatedSignature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

        if (calculatedSignature !== receivedSignature) {
            console.warn("Signature mismatch. Request may be tampered.", { receivedSignature, calculatedSignature });
            return NextResponse.json({ message: "Invalid signature." }, { status: 400 });
        }

    } catch (error) {
         return NextResponse.json({ message: "An error occurred during signature verification." }, { status: 500 });
    }


    // Step 4: Process the successful transaction
    // At this point, the request is authenticated and the data integrity is verified.
    // TODO: Add your business logic here.
    // - Find the transaction in your database using `transactionId`.
    // - Mark it as successful.
    // - Grant the user access to the course or feature they purchased.
    console.log(`Successfully processed callback for transactionId: ${transactionId}`);


    // Step 5: Respond with success
    return NextResponse.json({ message: "Payment confirmed and updated." }, { status: 200 });
}
