

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';


export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');

  try {
    const session = await getSession();
    const guestSessionToken = cookies().get('miniapp_guest_session')?.value;
    const body = await request.json();
    const { amount, courseId } = body;

    if (!session && !guestSessionToken) {
       return NextResponse.json({ success: false, message: 'User not authenticated.', redirectTo: '/login' }, { status: 403 });
    }

    if (!session && guestSessionToken) {
        return NextResponse.json({ success: false, message: 'Guest users must register to make a purchase.', redirectTo: '/login/register' }, { status: 403 });
    }
    
    if (!session) {
        // Should not happen if logic above is correct, but as a safeguard.
        return NextResponse.json({ success: false, message: 'Authentication session not found.' }, { status: 401 });
    }

    const latestLogin = await prisma.loginHistory.findFirst({
        where: { userId: session.id },
        orderBy: { loginTime: 'desc' }
    });

    const token = latestLogin?.superAppToken;

    if (!token) {
      console.error(`[/api/payment/initiate] SuperApp token not found for user ${session.id}.`);
      return NextResponse.json({ success: false, message: 'SuperApp authentication token not found. Please re-enter from the main app.' }, { status: 401 });
    }
    
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

    const params = {
        accountNo: ACCOUNT_NO,
        amount: safeAmount,
        callBackURL: CALLBACK_URL,
        companyName: COMPANY_NAME,
        Key: NIB_PAYMENT_KEY,
        token: token,
        transactionId: transactionId,
        transactionTime: transactionTime
    };

    const signatureString = Object.keys(params).sort().map(key => `${key}=${params[key as keyof typeof params]}`).join('&');

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
    
    if (dryRun) {
      return NextResponse.json({ success: true, dryRun: true, signatureString, signature, paymentPayload }, { status: 200 });
    }

    await prisma.pendingTransaction.create({
        data: {
            transactionId,
            userId: session.id,
            courseId: courseId,
            amount: parseFloat(safeAmount),
        }
    });

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

    const responseText = await paymentResponse.text().catch(() => '');
    let responseData: any;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = responseText;
    }

    const paymentToken = responseData && typeof responseData === 'object' ? responseData.token : undefined;

    if (!paymentResponse.ok) {
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
