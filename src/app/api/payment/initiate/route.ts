
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import prisma from '@/lib/db';



// const getJwtSecret = () => {
//     const secret = process.env.JWT_SECRET;
//     if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
//     return new TextEncoder().encode(secret);
// };


export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[/api/payment/initiate] Authorization header missing or invalid.');
      return NextResponse.json({ success: false, message: 'Authorization header missing.' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('[/api/payment/initiate] Using token from Authorization header (masked):', `${token.slice(0,6)}...${token.slice(-6)}`);

    // Validate token with NIB validate endpoint before proceeding (per integration guide Step 2)
    const VALIDATE_TOKEN_URL = process.env.NIB_VALIDATE_TOKEN_URL ?? 'http://172.24.47.138:90/api/Authenticate/Validate';
    let validateResult: any = null;
    try {
      const validateResp = await fetch(VALIDATE_TOKEN_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        },
        cache: 'no-store'
      });
      const validateText = await validateResp.text().catch(() => '');
      try {
        validateResult = validateText ? JSON.parse(validateText) : {};
      } catch (e) {
        validateResult = validateText;
      }
      console.log('[/api/payment/initiate] Token validation response:', validateResp.status, validateResult);
      if (!validateResp.ok) {
        console.error('[/api/payment/initiate] Token validation failed:', validateResp.status, validateResult);
        return NextResponse.json({ success: false, message: 'Token validation failed with NIB.', details: validateResult }, { status: 401 });
      }
    } catch (err: any) {
      console.error('[/api/payment/initiate] Token validation request failed:', err);
      return NextResponse.json({ success: false, message: 'Could not validate token with NIB.', details: err?.message ?? String(err) }, { status: 502 });
    }


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

    if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
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
    
    console.log('[/api/payment/initiate] Sending payload to payment gateway:', paymentPayload);

    // Follow sample: use Authorization Bearer header (token) and Content-Type only
    const paymentResponse = await fetch(NIB_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentPayload)
    });
    
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
