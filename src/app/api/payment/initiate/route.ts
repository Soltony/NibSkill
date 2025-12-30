
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
    let session = await getSession();
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

    // If no full session, check for guest session from MiniApp
    if (!session) {
      const guestSessionToken = cookieStore.get('miniapp_guest_session')?.value;
      if (!guestSessionToken) {
        return NextResponse.json({ success: false, message: 'User not authenticated.', redirectTo: '/login' }, { status: 403 });
      }

      const { payload: guestPayload } = await jwtVerify<GuestJwtPayload>(guestSessionToken, getJwtSecret());
      superAppToken = guestPayload.authToken;

      // Check if this guest user is already registered as a Staff member
      const staffRole = await prisma.role.findFirst({ where: { name: 'Staff', trainingProviderId: course.trainingProviderId }});
      
      const existingUser = staffRole ? await prisma.user.findFirst({
        where: {
          phoneNumber: guestPayload.phoneNumber,
          trainingProviderId: course.trainingProviderId,
          roles: { some: { roleId: staffRole.id } }
        }
      }) : null;

      if (!existingUser) {
        // User is not registered, instruct client to redirect to sign up
        return NextResponse.json({ success: false, message: 'Please register to purchase this course.', redirectTo: '/login/register' }, { status: 403 });
      }
      
      userId = existingUser.id;

    } else {
        userId = session.id;
        const tokenFromHistory = await prisma.loginHistory.findFirst({
            where: { userId: session.id },
            orderBy: { loginTime: 'desc' },
            select: { superAppToken: true }
        });
        superAppToken = tokenFromHistory?.superAppToken ?? undefined;
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
