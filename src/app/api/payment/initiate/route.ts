
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const { amount, token } = await request.json();

        if (!amount || !token) {
            return NextResponse.json({ success: false, message: 'Amount and token are required.' }, { status: 400 });
        }

        const ACCOUNT_NO = process.env.ACCOUNT_NO;
        const CALLBACK_URL = process.env.CALLBACK_URL;
        const COMPANY_NAME = process.env.COMPANY_NAME;
        const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
        const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;

        if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
            console.error("Payment environment variables are not set.");
            return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
        }
        
        const transactionId = crypto.randomUUID();
        const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

        const signatureString = [
            `accountNo=${ACCOUNT_NO}`,
            `amount=${amount}`,
            `callBackURL=${CALLBACK_URL}`,
            `companyName=${COMPANY_NAME}`,
            `Key=${NIB_PAYMENT_KEY}`,
            `token=${token}`,
            `transactionId=${transactionId}`,
            `transactionTime=${transactionTime}`
        ].join('&');

        const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

        const payload = {
            accountNo: ACCOUNT_NO,
            amount: String(amount),
            callBackURL: CALLBACK_URL,
            companyName: COMPANY_NAME,
            token: token,
            transactionId: transactionId,
            transactionTime: transactionTime,
            signature: signature
        };

        const paymentResponse = await fetch(NIB_PAYMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });

        if (!paymentResponse.ok) {
            const errorBody = await paymentResponse.text();
            console.error("NIB Payment Error:", errorBody);
            return NextResponse.json({ success: false, message: 'Payment gateway request failed.' }, { status: paymentResponse.status });
        }

        const responseData = await paymentResponse.json();
        const paymentToken = responseData.token;

        if (!paymentToken) {
            return NextResponse.json({ success: false, message: 'Payment token not received from gateway.' }, { status: 500 });
        }
        
        // TODO: Store transactionId and associate it with the user/course purchase
        
        return NextResponse.json({ success: true, paymentToken });

    } catch (error) {
        console.error("Error initiating payment:", error);
        return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
    }
}
