

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};


export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');

  try {
    const session = await getSession();
    const cookieStore = await cookies();
    const guestSessionToken = cookieStore.get('miniapp_guest_session')?.value;
    const superAppToken = cookieStore.get('superapp_token')?.value;
    const body = await request.json();
    const { amount, courseId } = body;

    console.log('[/api/payment/initiate] session present:', !!session, 'sessionId:', session?.id);
    console.log('[/api/payment/initiate] guestSessionToken present:', !!guestSessionToken, 'superAppToken present:', !!superAppToken);

    // Small helper to normalize phone numbers for lookup
    const normalizePhone = (p?: string | null) => {
      if (!p) return null;
      return p.replace(/[^\d]/g, '');
    };

    // Extract phone from available tokens (guest JWT, then superApp token either by decode or validate endpoint)
    let phoneFromToken: string | null = null;

    if (guestSessionToken) {
      try {
        const { payload } = await jwtVerify(guestSessionToken, getJwtSecret(), { algorithms: ['HS256'] });
        const rawPhone = (payload as any).phoneNumber || (payload as any).phone || (payload as any).phone_number;
        phoneFromToken = normalizePhone(rawPhone);
        console.log('[/api/payment/initiate] phone extracted from guest token:', phoneFromToken, 'raw:', rawPhone);
      } catch (err) {
        console.log('[/api/payment/initiate] failed to decode guest token:', (err as Error).message);
      }
    }

    // If we still don't have a phone and a SuperApp token exists, try to decode it; if not decodable, call validation endpoint
    if (!phoneFromToken && superAppToken) {
      // Try decode as JWT
      try {
        const { payload } = await jwtVerify(superAppToken, getJwtSecret(), { algorithms: ['HS256'] });
        const rawPhone = (payload as any).phoneNumber || (payload as any).phone || (payload as any).phone_number;
        phoneFromToken = normalizePhone(rawPhone);
        console.log('[/api/payment/initiate] phone extracted from superApp token (decoded):', phoneFromToken, 'raw:', rawPhone);
      } catch (err) {
        // Not a JWT or failed - try external validation endpoint
        const VALIDATE_TOKEN_URL = process.env.NIB_VALIDATE_TOKEN_URL || process.env.VALIDATE_TOKEN_URL || '';
        if (VALIDATE_TOKEN_URL) {
          try {
            const externalResponse = await fetch(VALIDATE_TOKEN_URL, {
              method: 'GET',
              headers: { Authorization: `Bearer ${superAppToken}`, Accept: 'application/json' },
              cache: 'no-store'
            });
            if (externalResponse.ok) {
              const rd = await externalResponse.json();
              const rawPhone = rd.phone || rd.phoneNumber || rd.msisdn;
              phoneFromToken = normalizePhone(rawPhone);
              console.log('[/api/payment/initiate] phone extracted from superApp validate endpoint:', phoneFromToken, 'raw:', rawPhone);
            } else {
              console.log('[/api/payment/initiate] validate endpoint returned', externalResponse.status);
            }
          } catch (err2) {
            console.log('[/api/payment/initiate] error calling validate endpoint:', (err2 as Error).message);
          }
        }
      }
    }

    // Decide authentication/registration using phone-first logic (do not gate purely on getSession())
    let effectiveUserId: string | null = session?.id ?? null;

    // If we don't have a session but we have a phone, try to find a registered user
    if (!effectiveUserId && phoneFromToken) {
      // Try exact match first
      let foundUser = await prisma.user.findFirst({ where: { phoneNumber: phoneFromToken } });

      // Fallback contains match without leading +
      if (!foundUser && phoneFromToken) {
        const containsVal = phoneFromToken.replace(/^\+/, '');
        foundUser = await prisma.user.findFirst({ where: { phoneNumber: { contains: containsVal } } });
      }

      if (foundUser) {
        console.log(`[/api/payment/initiate] Matched phone ${phoneFromToken} to user ${foundUser.id}`);
        effectiveUserId = foundUser.id;
      } else {
        console.log('[/api/payment/initiate] No user found for phone from token:', phoneFromToken);
      }
    }

    // If we don't have a session and we couldn't extract a phone at all, ask to login
    if (!effectiveUserId && !phoneFromToken) {
      console.log('[/api/payment/initiate] No session and no phone info; rejecting with login redirect');
      return NextResponse.json({ success: false, message: 'User not authenticated.', redirectTo: '/login' }, { status: 403 });
    }

    // If after attempting phone lookup we still have no effective user, ask the user to register
    if (!effectiveUserId) {
      console.log('[/api/payment/initiate] User not registered: prompting registration');
      return NextResponse.json({ success: false, message: 'Guest users must register to make a purchase.', redirectTo: '/login/register' }, { status: 403 });
    }

    const latestLogin = await prisma.loginHistory.findFirst({
        where: { userId: effectiveUserId },
        orderBy: { loginTime: 'desc' }
    });

    // Prefer token from login history but fall back to the cookie set by /api/connect
    const token = latestLogin?.superAppToken || cookieStore.get('superapp_token')?.value;

    if (!token) {
      console.error(`[/api/payment/initiate] SuperApp token not found for user ${effectiveUserId}.`);
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
            userId: effectiveUserId,
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
