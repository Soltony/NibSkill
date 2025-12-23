
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

interface GuestJwtPayload extends JWTPayload {
  phoneNumber: string;
  authToken: string;
}

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};


export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');

  try {
    const c = await cookies();
    const session = await getSession();
    const guestSessionToken = c.get('miniapp_guest_session')?.value;
    
    let authToken: string | undefined;
    let userForRegistrationCheck;
    
    if (session) {
        console.log('[/api/payment/initiate] Full session found.');
        const latestLogin = await prisma.loginHistory.findFirst({
            where: { userId: session.id, superAppToken: { not: null } },
            orderBy: { loginTime: 'desc' }
        });
        authToken = latestLogin?.superAppToken ?? undefined;
    } else if (guestSessionToken) {
        console.log('[/api/payment/initiate] Guest session found.');
        const { payload: guestPayload } = await jwtVerify<GuestJwtPayload>(guestSessionToken, getJwtSecret());
        authToken = guestPayload.authToken;
        if (!authToken) {
            console.error('[/api/payment/initiate] Guest session payload missing authToken:', guestPayload);
            return NextResponse.json({ success: false, message: 'Could not find Super App token in guest session. Please re-enter from the NIBtera app.' }, { status: 401 });
        }
        
        userForRegistrationCheck = await prisma.user.findFirst({ where: { phoneNumber: guestPayload.phoneNumber }});
        if (!userForRegistrationCheck) {
            return NextResponse.json({ success: false, message: 'User not registered.', redirectTo: '/login/register' }, { status: 403 });
        }
    }

    if (!authToken) {
       console.error('[/api/payment/initiate] No valid auth token found for payment.');
       return NextResponse.json({ success: false, message: 'Could not find a valid Super App session. Please re-enter from the NIBtera app.' }, { status: 401 });
    }

    const { amount } = await request.json();
    if (!amount) {
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
    const token = authToken;

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

    console.log('[/api/payment/initiate] Signature string (raw):', signatureString);

    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    const paymentPayload = {
      accountNo: ACCOUNT_NO,
      amount: String(amount),
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
