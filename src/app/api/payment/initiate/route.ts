
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';


export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');

  try {
    // Use token stored by the initial mini-app launch (cookie `superapp_token`) — do NOT rely on Authorization header on subsequent requests
    const cookieStore = cookies();
    const token = cookieStore.get('superapp_token')?.value;

console.log({token});

    if (!token) {
      console.error('[/api/payment/initiate] SuperApp session expired. Cookie `superapp_token` missing.');
      return NextResponse.json({ success: false, message: 'SuperApp session expired.' }, { status: 401 });
    }

    console.log('[/api/payment/initiate] Using token from cookie `superapp_token` (masked):', `${token.slice(0,6)}...${token.slice(-6)}`);

    const body = await request.json();
    const amount = body.amount;
    const safeAmount = String(amount);
    const dryRun = body.dryRun ?? false;

    if (amount === undefined || amount === null) {
      return NextResponse.json({ success: false, message: 'Amount is required.' }, { status: 400 });
    }

    const ACCOUNT_NO = process.env.ACCOUNT_NO;
    const CALLBACK_URL = process.env.CALLBACK_URL;
    const COMPANY_NAME = process.env.COMPANY_NAME;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;

    if (!ACCOUNT_NO || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
      console.error('[/api/payment/initiate] Server configuration error: Missing payment gateway environment variables.');
      return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
    }

    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    // The token used in the signature must be the same token sent in the Authorization header
    const signatureString = [
      `accountNo=${ACCOUNT_NO}`,
      `amount=${safeAmount}`,
      `callBackURL=${CALLBACK_URL}`,
      `companyName=${COMPANY_NAME}`,
      `Key=${NIB_PAYMENT_KEY}`,
      `token=${token}`,
      `transactionId=${transactionId}`,
      `transactionTime=${transactionTime}`
    ].join('&');

    console.log('[/api/payment/initiate] Signature string (raw):', signatureString);

    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    const paymentPayload = {
      accountNo: ACCOUNT_NO,
      amount: safeAmount,
      callBackURL: CALLBACK_URL,
      companyName: COMPANY_NAME,
      token: token,
      transactionId: transactionId,
      transactionTime: transactionTime,
      signature: signature
    };
console.log({paymentPayload});
    
    // Decode token payload for dry-run debugging (do not rely on this for security checks)
    let tokenInfo: any = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
        tokenInfo = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
        console.log('[/api/payment/initiate] Decoded token payload:', tokenInfo);
      }
    } catch (e) {
      console.error('[/api/payment/initiate] Could not decode token payload:', e);
    }

    console.log('[/api/payment/initiate] Computed signature:', signature);

    if (dryRun) {
      return NextResponse.json({ success: true, dryRun: true, signatureString, signature, paymentPayload, tokenInfo }, { status: 200 });
    }

    console.log('[/api/payment/initiate] Calling NIB payment API...');
    let paymentResponse: Response;
    try {
      paymentResponse = await fetch(NIB_PAYMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentPayload)
      });
    } catch (err: any) {
      console.error('[/api/payment/initiate] Payment request to NIB failed:', err);
      return NextResponse.json({ success: false, message: 'Could not connect to NIB payment service.', details: err?.message ?? String(err) }, { status: 502 });
    }

    console.log('[/api/payment/initiate] Gateway response status:', paymentResponse.status);

    const responseText = await paymentResponse.text().catch(() => '');
    let responseData: any;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = responseText;
    }
    console.log('[/api/payment/initiate] Gateway response body:', responseData);

    const paymentToken = responseData && typeof responseData === 'object' ? responseData.token : undefined;

    if (!paymentResponse.ok) {
      console.error('[/api/payment/initiate] Payment gateway rejected the request:', paymentResponse.status, responseData);

      if (paymentResponse.status === 401) {
        return NextResponse.json({ success: false, message: 'Payment gateway unauthorized. Verify the token sent in the Authorization header and that the signature is correct.', details: responseData }, { status: 401 });
      }

      return NextResponse.json({ success: false, message: 'Payment gateway rejected the request. Please try again.', details: responseData }, { status: paymentResponse.status });
    }

    if (!paymentToken) {
      console.error('[/api/payment/initiate] Payment gateway returned no token:', responseData);
      return NextResponse.json({ success: false, message: 'Payment gateway did not return a payment token. Please try again later.' }, { status: 502 });
    }
    
    return NextResponse.json({ success: true, paymentToken, transactionId });
    
  } catch (error) {
    console.error('[/api/payment/initiate] Error initiating payment:', error);
    if (error instanceof Error && (error.name === 'JWTExpired' || error.name === 'JOSEError')) {
        return NextResponse.json({ success: false, message: 'Your session has expired. Please re-enter from the Super App.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
