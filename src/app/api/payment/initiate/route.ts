import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');

  try {
    // --- Step 1: Get session token from cookie ---
    const c = await cookies();
    const miniAppToken = c.get('miniapp-auth-token')?.value;

    if (!miniAppToken) {
      console.error('[/api/payment/initiate] Mini-app token missing in cookie.');
      return NextResponse.json(
        { success: false, message: 'Mini-app authentication required.' },
        { status: 401 }
      );
    }

    // --- Step 2: Parse request body ---
    const { amount } = await request.json();
    console.log('[/api/payment/initiate] Requested amount:', amount);

    if (!amount) {
      console.error('[/api/payment/initiate] Amount is missing in request.');
      return NextResponse.json(
        { success: false, message: 'Amount is required.' },
        { status: 400 }
      );
    }

    // --- Step 3: Environment variables ---
    const ACCOUNT_NO = process.env.ACCOUNT_NO;
    const CALLBACK_URL = process.env.CALLBACK_URL;
    const COMPANY_NAME = process.env.COMPANY_NAME;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;

    if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
      console.error('[/api/payment/initiate] Payment environment variables not set.');
      return NextResponse.json(
        { success: false, message: 'Server configuration error.' },
        { status: 500 }
      );
    }

    // --- Step 4: Generate transaction info ---
    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');
    console.log('[/api/payment/initiate] Generated transactionId:', transactionId);

    const signatureString = [
      `accountNo=${ACCOUNT_NO}`,
      `amount=${amount}`,
      `callBackURL=${CALLBACK_URL}`,
      `companyName=${COMPANY_NAME}`,
      `Key=${NIB_PAYMENT_KEY}`,
      `token=${miniAppToken}`,
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
      token: miniAppToken,
      transactionId,
      transactionTime,
      signature
    };
    console.log('[/api/payment/initiate] Payload for NIB Gateway:', payload);

    // --- Step 5: Send to NIB Gateway ---
    const paymentResponse = await fetch(NIB_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${miniAppToken}`
      },
      body: JSON.stringify(payload)
    });

    console.log('[/api/payment/initiate] NIB Gateway response status:', paymentResponse.status);
    const responseData = await paymentResponse.json().catch(() => ({}));
    console.log('[/api/payment/initiate] NIB Gateway response data:', responseData);

    const paymentToken = responseData.token;

    if (!paymentToken) {
      console.error('[/api/payment/initiate] Payment token not received from gateway.');
      return NextResponse.json(
        { success: false, message: 'Payment token not received from gateway.' },
        { status: 500 }
      );
    }

    // --- Optional: store transactionId in DB for callback reconciliation ---
    console.log('[/api/payment/initiate] Successfully initiated payment. Returning payment token to client.');

    return NextResponse.json({ success: true, paymentToken, transactionId });
  } catch (error) {
    console.error('[/api/payment/initiate] Error initiating payment:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
