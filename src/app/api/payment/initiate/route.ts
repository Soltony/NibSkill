
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import prisma from '@/lib/db';

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
    const guestSessionToken = c.get('miniapp_guest_session')?.value;

    if (!guestSessionToken) {
      return NextResponse.json({ success: false, message: 'Guest session not found. Please re-enter from the Super App.' }, { status: 401 });
    }

    // Verify the guest session token
    const { payload: guestPayload } = await jwtVerify<GuestJwtPayload>(guestSessionToken, getJwtSecret());
    const { phoneNumber, authToken } = guestPayload;

    if (!phoneNumber || !authToken) {
      return NextResponse.json({ success: false, message: 'Invalid guest session.' }, { status: 401 });
    }

    // Check if user is registered in our database
    const user = await prisma.user.findFirst({
        where: { phoneNumber }
    });
    
    if (!user) {
        // User is not registered, instruct client to redirect to registration page
        return NextResponse.json({ success: false, message: 'User not registered.', redirectTo: '/login/register' }, { status: 403 });
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
      `token=${authToken}`, // Use the original Super App token
      `transactionId=${transactionId}`,
      `transactionTime=${transactionTime}`
    ].join('&');

    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    const paymentPayload = {
      accountNo: ACCOUNT_NO,
      amount: String(amount),
      callBackURL: CALLBACK_URL,
      companyName: COMPANY_NAME,
      token: authToken,
      transactionId,
      transactionTime,
      signature
    };

    const paymentResponse = await fetch(NIB_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(paymentPayload)
    });

    const responseData = await paymentResponse.json().catch(() => ({}));
    const paymentToken = responseData.token;

    if (!paymentToken) {
      return NextResponse.json({ success: false, message: 'Payment token not received from gateway.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, paymentToken, transactionId });
  } catch (error) {
    console.error('[/api/payment/initiate] Error initiating payment:', error);
    if (error instanceof Error && error.name === 'JWTExpired') {
        return NextResponse.json({ success: false, message: 'Your session has expired. Please re-enter from the Super App.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
