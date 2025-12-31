
'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';


// We intentionally avoid decoding/verifying SuperApp tokens here (they may be opaque).
// MiniApp must provide phone number and a SuperApp token (cookie or Authorization header).

export async function POST(request: NextRequest) {
  console.log('[/api/payment/initiate] Received payment initiation request.');
  const cookieStore = await cookies();

  try {
    let superAppToken: string | undefined;
    let userId: string | undefined;

    const body = await request.json();
    console.log('[/api/payment/initiate] Received body:', body);

    // Support new MiniApp standard: { total, transactionId } OR legacy { courseId }
    const { total, transactionId: incomingTransactionId, courseId } = body as any;

    let amount: number;
    let course: any = null;
    let accountNo: string | undefined;
    let pendingTx: any = null;

    if (typeof total !== 'undefined' && incomingTransactionId) {
      // New-standard flow: use existing pending transaction record
      amount = Number(total);
      if (!amount || isNaN(amount)) {
        return NextResponse.json({ success: false, message: 'Invalid total amount.' }, { status: 400 });
      }

      pendingTx = await prisma.pendingTransaction.findUnique({
        where: { transactionId: incomingTransactionId },
        include: { course: { include: { trainingProvider: true } } }
      });

      if (!pendingTx) {
        return NextResponse.json({ success: false, message: 'Pending transaction not found.' }, { status: 404 });
      }

      amount = pendingTx.amount ?? amount;
      course = pendingTx.course;
      accountNo = course?.trainingProvider?.accountNumber ?? process.env.ACCOUNT_NO ?? undefined;

      if (!accountNo) {
        console.error('[/api/payment/initiate] Missing account number for pending transaction or server env.');
        return NextResponse.json({ success: false, message: 'Missing configured account for payment.' }, { status: 500 });
      }

      console.log('[/api/payment/initiate] Using pending transaction:', incomingTransactionId, 'amount:', amount);

    } else if (courseId) {
      const found = await prisma.course.findUnique({
        where: { id: courseId },
        select: { price: true, trainingProviderId: true, isPaid: true }
      });

      if (!found || !found.isPaid || found.price === null) {
        return NextResponse.json({ success: false, message: 'Invalid or free course specified.' }, { status: 404 });
      }

      amount = found.price;
      course = found;
      accountNo = process.env.ACCOUNT_NO;

    } else {
      return NextResponse.json({ success: false, message: 'Missing required fields: provide courseId or (total and transactionId).' }, { status: 400 });
    }

    // --- MiniApp authentication ---
    // 1) Phone number must be provided by SuperApp (already verified upstream): header 'x-phone-number' or cookie 'miniapp_phone'.
    const phoneNumber = (request.headers.get('x-phone-number') || cookieStore.get('miniapp_phone')?.value)?.toString();
    if (!phoneNumber) {
      console.error('[/api/payment/initiate] Missing SuperApp phone number (x-phone-number or miniapp_phone cookie).');
      return NextResponse.json({ success: false, message: 'Missing SuperApp phone number' }, { status: 401 });
    }
    console.log('[/api/payment/initiate] Resolved phoneNumber:', phoneNumber);

    // 2) Check registration (Staff) for the course's training provider
    const trainingProviderId = course?.trainingProviderId ?? course?.trainingProvider?.id ?? undefined;
    const staffRole = trainingProviderId ? await prisma.role.findFirst({ where: { name: 'Staff', trainingProviderId } }) : null;
    const existingUser = staffRole
      ? await prisma.user.findFirst({
          where: {
            phoneNumber,
            trainingProviderId,
            roles: { some: { roleId: staffRole.id } }
          }
        })
      : null;

    if (!existingUser) {
      console.log('[/api/payment/initiate] Phone not registered as staff, redirecting to register');
      return NextResponse.json({ success: false, message: 'Please register to purchase this course.', redirectTo: '/login/register' }, { status: 403 });
    }

    userId = existingUser.id;
    console.log('[/api/payment/initiate] Registered staff user id:', userId);

    // 3) Get SuperApp token to forward to NIB: cookie 'superapp_token' preferred, fallback to Authorization header
    const superAppTokenFromCookie = cookieStore.get('superapp_token')?.value;
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    superAppToken = superAppTokenFromCookie ?? (authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : undefined);

    if (!superAppToken) {
      console.error('[/api/payment/initiate] Error: SuperApp token not provided (superapp_token cookie or Authorization header required)');
      return NextResponse.json({ success: false, message: 'SuperApp token missing. Please launch from the SuperApp.' }, { status: 401 });
    }

    console.log('[/api/payment/initiate] SuperApp token present (redacted in logs).');


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
    const transactionId = pendingTx?.transactionId ?? crypto.randomUUID();
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

    // Create a PendingTransaction only if we don't already have one (new standard passes an existing transactionId)
    if (!pendingTx) {
      await prisma.pendingTransaction.create({
        data: {
            transactionId,
            userId: userId!,
            courseId: courseId,
            amount: parseFloat(safeAmount),
        }
      });
    } else {
      console.log('[/api/payment/initiate] Not creating PendingTransaction; using existing pending transaction', pendingTx.transactionId);
    }

    let paymentResponse: Response;
    // Use AbortController to avoid hanging on external network calls
    const timeoutMs = Number(process.env.PAYMENT_FETCH_TIMEOUT_MS ?? 7000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      paymentResponse = await fetch(NIB_PAYMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superAppToken}`
        },
        body: JSON.stringify(paymentPayload),
        signal: controller.signal
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('[/api/payment/initiate] Payment request to NIB timed out after', timeoutMs, 'ms');
        return NextResponse.json({ success: false, message: 'Payment service timed out.' }, { status: 504 });
      }
      console.error('[/api/payment/initiate] Payment request to NIB failed:', err);
      return NextResponse.json({ success: false, message: 'Could not connect to NIB payment service.', details: err?.message ?? String(err) }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
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
