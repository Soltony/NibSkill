
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { getSession } from '@/lib/auth'; 
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    console.log('[/api/payment/initiate] Received payment initiation request.');
    try {
        const session = await getSession();
        if (!session) {
            console.error('[/api/payment/initiate] Authentication required.');
            return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
        }
        console.log('[/api/payment/initiate] Session found for user:', session.email);

        const { amount } = await request.json();
        console.log('[/api/payment/initiate] Requested amount:', amount);

        const user = await prisma.user.findUnique({ where: { id: session.id } });
        if (!user?.phoneNumber) {
             console.error('[/api/payment/initiate] User phone number is required but not found for user:', session.id);
             return NextResponse.json({ success: false, message: 'User phone number is required for payment.' }, { status: 400 });
        }
        const tokenForGateway = user.phoneNumber; 
        console.log('[/api/payment/initiate] Using phone number for gateway token:', tokenForGateway);


        if (!amount || !tokenForGateway) {
            console.error('[/api/payment/initiate] Amount or token is missing.');
            return NextResponse.json({ success: false, message: 'Amount and user token are required.' }, { status: 400 });
        }

        const ACCOUNT_NO = process.env.ACCOUNT_NO;
        const CALLBACK_URL = process.env.CALLBACK_URL;
        const COMPANY_NAME = process.env.COMPANY_NAME;
        const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
        const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;

        if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
            console.error("[/api/payment/initiate] Payment environment variables are not set.");
            return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
        }
        
        const transactionId = crypto.randomUUID();
        const transactionTime = format(new Date(), 'yyyyMMddHHmmss');
        console.log('[/api/payment/initiate] Generated transactionId:', transactionId);

        const signatureString = [
            `accountNo=${ACCOUNT_NO}`,
            `amount=${amount}`,
            `callBackURL=${CALLBACK_URL}`,
            `companyName=${COMPANY_NAME}`,
            `Key=${NIB_PAYMENT_KEY}`,
            `token=${tokenForGateway}`,
            `transactionId=${transactionId}`,
            `transactionTime=${transactionTime}`
        ].join('&');

        const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');
        console.log('[/api/payment/initiate] Generated signature.');

        const payload = {
            accountNo: ACCOUNT_NO,
            amount: String(amount),
            callBackURL: CALLBACK_URL,
            companyName: COMPANY_NAME,
            token: tokenForGateway,
            transactionId: transactionId,
            transactionTime: transactionTime,
            signature: signature
        };
        console.log('[/api/payment/initiate] Payload for NIB Gateway:', payload);


        const paymentResponse = await fetch(NIB_PAYMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        console.log('[/api/payment/initiate] NIB Gateway response status:', paymentResponse.status);
        if (!paymentResponse.ok) {
            const errorBody = await paymentResponse.text();
            console.error("[/api/payment/initiate] NIB Payment Error:", errorBody);
            return NextResponse.json({ success: false, message: 'Payment gateway request failed.' }, { status: paymentResponse.status });
        }

        const responseData = await paymentResponse.json();
        console.log('[/api/payment/initiate] NIB Gateway response data:', responseData);
        const paymentToken = responseData.token;

        if (!paymentToken) {
            console.error('[/api/payment/initiate] Payment token not received from gateway.');
            return NextResponse.json({ success: false, message: 'Payment token not received from gateway.' }, { status: 500 });
        }
        
        // TODO: Store transactionId and associate it with the user/course purchase
        console.log('[/api/payment/initiate] Successfully initiated payment. Returning payment token to client.');
        
        return NextResponse.json({ success: true, paymentToken });

    } catch (error) {
        console.error("[/api/payment/initiate] Error initiating payment:", error);
        return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
    }
}
