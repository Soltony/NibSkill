

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';

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
        const params = {
            accountNo,
            paidAmount,
            paidByNumber,
            Key: key,
            token: bodyToken,
            transactionId,
            transactionTime,
            txnRef
        };
        const signatureString = Object.keys(params).sort().map(key => `${key}=${params[key as keyof typeof params]}`).join('&');
        
        const calculatedSignature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

        if (calculatedSignature !== receivedSignature) {
            console.warn("Signature mismatch. Request may be tampered.", { receivedSignature, calculatedSignature });
            return NextResponse.json({ message: "Invalid signature." }, { status: 400 });
        }

    } catch (error) {
         return NextResponse.json({ message: "An error occurred during signature verification." }, { status: 500 });
    }


    // Step 4: Process the successful transaction
    try {
        const pendingTransaction = await prisma.pendingTransaction.findUnique({
            where: { transactionId }
        });

        if (!pendingTransaction) {
            console.error(`Callback received for unknown transactionId: ${transactionId}`);
            return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
        }

        await prisma.userPurchasedCourse.create({
            data: {
                userId: pendingTransaction.userId,
                courseId: pendingTransaction.courseId,
                transactionId: transactionId,
                amount: parseFloat(paidAmount),
            }
        });

        // Optionally, delete the pending transaction after processing
        await prisma.pendingTransaction.delete({
            where: { transactionId }
        });

    } catch (error) {
        console.error(`Error processing transaction ${transactionId}:`, error);
        return NextResponse.json({ message: "Failed to update user purchase record." }, { status: 500 });
    }


    // Step 5: Respond with success
    return NextResponse.json({ message: "Payment confirmed and updated." }, { status: 200 });
}

