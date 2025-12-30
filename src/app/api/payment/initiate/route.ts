
'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { jwtVerify, type JWTPayload } from 'jose';


const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};

interface GuestJwtPayload extends JWTPayload {
  phoneNumber: string;
  authToken: string;
}


export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');
  const cookieStore = await cookies();

  try {
    let session: any | null = null;
    let superAppToken: string | undefined;
    let userId: string | undefined;

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ success: false, message: 'Course ID is required.' }, { status: 400 });
    }
    
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true, trainingProviderId: true, isPaid: true }
    });

    if (!course || !course.isPaid || course.price === null) {
      return NextResponse.json({ success: false, message: 'Invalid or free course specified.' }, { status: 404 });
    }

    const amount = course.price;

    // Determine SuperApp token and user from Authorization header (preferred), guest cookie, or existing session.
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');

    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      console.log('[/api/payment/initiate] Authorization header found; verifying SuperApp token.');
      try {
        // Try verifying/decrypting JWT locally to get phone number
        let phoneNumber: string | undefined;
        try {
          const { payload } = await jwtVerify<{ phoneNumber: string }>(token, getJwtSecret());
          phoneNumber = (payload as any).phoneNumber;
        } catch (jwtErr) {
          // Local verification failed — try SuperApp verify endpoint if configured
          const verifyUrl = process.env.SUPERAPP_VERIFY_URL;
          if (verifyUrl) {
            const resp = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });
            if (resp.ok) {
              const data = await resp.json().catch(() => null);
              phoneNumber = data?.phoneNumber ?? data?.phone ?? undefined;
            } else {
              console.error('[/api/payment/initiate] SuperApp verify endpoint returned', resp.status);
            }
          }
        }

        if (!phoneNumber) {
          return NextResponse.json({ success: false, message: 'Invalid SuperApp token.' }, { status: 401 });
        }
        console.log('[/api/payment/initiate] SuperApp phone resolved:', phoneNumber);
        // Check if this phone number is registered as Staff for this training provider
        const staffRole = await prisma.role.findFirst({ where: { name: 'Staff', trainingProviderId: course.trainingProviderId }});
        const existingUser = staffRole ? await prisma.user.findFirst({
          where: {
            phoneNumber,
            trainingProviderId: course.trainingProviderId,
            roles: { some: { roleId: staffRole.id } }
          }
        }) : null;

        if (!existingUser) {
          // Unregistered guest according to phone number — redirect to registration
          return NextResponse.json({ success: false, message: 'Please register to purchase this course.', redirectTo: '/login/register' }, { status: 403 });
        }

        userId = existingUser.id;
        superAppToken = token;

      } catch (err) {
        console.error('[/api/payment/initiate] Error verifying SuperApp token:', err);
        return NextResponse.json({ success: false, message: 'Invalid SuperApp token.' }, { status: 401 });
      }

    } else {
      // No Authorization header — try guest cookie first, then fall back to full session
      const guestSessionToken = cookieStore.get('miniapp_guest_session')?.value;
      if (guestSessionToken) {
        console.log('[/api/payment/initiate] Using guest cookie session');
        const { payload: guestPayload } = await jwtVerify<GuestJwtPayload>(guestSessionToken, getJwtSecret());
        superAppToken = guestPayload.authToken;
        const staffRole = await prisma.role.findFirst({ where: { name: 'Staff', trainingProviderId: course.trainingProviderId }});
        const existingUser = staffRole ? await prisma.user.findFirst({
          where: {
            phoneNumber: guestPayload.phoneNumber,
            trainingProviderId: course.trainingProviderId,
            roles: { some: { roleId: staffRole.id } }
          }
        }) : null;
        if (!existingUser) {
          return NextResponse.json({ success: false, message: 'Please register to purchase this course.', redirectTo: '/login/register' }, { status: 403 });
        }
        userId = existingUser.id;
      } else {
        // No guest cookie — check full session
        session = await getSession();
        if (!session) {
          return NextResponse.json({ success: false, message: 'User not authenticated.', redirectTo: '/login' }, { status: 403 });
        }
        console.log('[/api/payment/initiate] Using full server session for user', session.id);
        userId = session.id;
        const tokenFromHistory = await prisma.loginHistory.findFirst({
          where: { userId: session.id },
          orderBy: { loginTime: 'desc' },
          select: { superAppToken: true }
        });
        superAppToken = tokenFromHistory?.superAppToken ?? undefined;
      }
    }


    if (!superAppToken) {
        console.error('[NIB INITIATE] Error: SuperApp authorization token not found for user.');
        return NextResponse.json({ error: 'User session not found or token missing. Please log in through the SuperApp.' }, { status: 401 });
    }

    const ACCOUNT_NO = process.env.ACCOUNT_NO;
    const CALLBACK_URL = process.env.CALLBACK_URL;
    const COMPANY_NAME = process.env.COMPANY_NAME;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;

    if (!ACCOUNT_NO || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL || !CALLBACK_URL) {
      console.error('[/api/payment/initiate] Server configuration error: Missing payment gateway environment variables.');
      return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
    }
    
    const safeAmount = String(amount);
    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    const signatureString = [
        `accountNo=${ACCOUNT_NO}`,
        `amount=${safeAmount}`,
        `callBackURL=${CALLBACK_URL}`,
        `companyName=${COMPANY_NAME}`,
        `Key=${NIB_PAYMENT_KEY}`,
        `token=${superAppToken}`,
        `transactionId=${transactionId}`,
        `transactionTime=${transactionTime}`
    ].join('&');
    
    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    const paymentPayload = {
      accountNo: ACCOUNT_NO,
      amount: safeAmount,
      callBackURL: CALLBACK_URL,
      companyName: COMPANY_NAME,
      token: superAppToken,
      transactionId: transactionId,
      transactionTime: transactionTime,
      signature: signature
    };

    await prisma.pendingTransaction.create({
        data: {
            transactionId,
            userId: userId!,
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
          'Authorization': `Bearer ${superAppToken}`
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
      if (!responseText) {
        throw new Error("NIB payment response was empty.");
      }
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("[/api/payment/initiate] Failed to parse NIB response:", responseText);
      return NextResponse.json({ error: 'Failed to parse NIB payment response.', raw: responseText }, { status: 502 });
    }
    
    if (!paymentResponse.ok) {
      if (paymentResponse.status === 401) {
        return NextResponse.json({ success: false, message: 'Payment gateway unauthorized. Verify the token and signature.', details: responseData }, { status: 401 });
      }
      return NextResponse.json({ success: false, message: 'Payment gateway rejected the request.', details: responseData }, { status: paymentResponse.status });
    }
    
    const paymentToken = responseData?.token;

    if (!paymentToken) {
      console.error('[/api/payment/initiate] Payment gateway returned no payment token:', responseData);
      return NextResponse.json({ success: false, message: 'Payment gateway did not return a payment token.' }, { status: 502 });
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
