

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

    console.log('[/api/payment/initiate] Session:', session ? 'PRESENT' : 'NO_SESSION');
    console.log('[/api/payment/initiate] Guest session token:', guestSessionToken ? 'PRESENT' : 'NOT_PRESENT');
    console.log('[/api/payment/initiate] Request body:', body);

    // If no full session and no guest session -> ask to login
    if (!session && !guestSessionToken) {
       return NextResponse.json({ success: false, message: 'User not authenticated.', redirectTo: '/login' }, { status: 403 });
    }

    // Phone-first decision flow (do NOT gate on session alone)
    // 1) Try to extract phone from guest session token
    // 2) If not found, try to extract/validate from superApp token
    // 3) Normalize phone and lookup user in DB (relaxed matching)

    let effectiveUserId = session?.id ?? null;

    const normalizePhone = (p?: string | null) => {
      if (!p) return null;
      // Remove all non-digit characters
      const digits = p.replace(/[^\d]/g, '');
      return digits || null;
    };

    let phoneFromToken: string | null = null;

    // Try guest token first
    if (guestSessionToken) {
      console.log('[/api/payment/initiate] Guest user attempted purchase');
      try {
        const { payload } = await jwtVerify(guestSessionToken, getJwtSecret(), { algorithms: ['HS256'] });
        const rawPhone = (payload as any).phoneNumber || (payload as any).phone || (payload as any).phone_number;
        const normalized = normalizePhone(rawPhone);
        console.log('[/api/payment/initiate] Decoded guest token payload phone:', { rawPhone, normalized });
        phoneFromToken = normalized;
      } catch (err) {
        console.log('[/api/payment/initiate] Failed to decode guest token:', (err as Error).message);
      }
    }

    // If we didn't get phone from guest token, try to validate SuperApp token via the validation endpoint (do NOT decode it)
    if (!phoneFromToken && superAppToken) {
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
            const normalized = normalizePhone(rawPhone);
            console.log('[/api/payment/initiate] Phone from validate endpoint:', { rawPhone, normalized });
            phoneFromToken = normalized;
          } else {
            console.log('[/api/payment/initiate] validate endpoint returned', externalResponse.status);
          }
        } catch (err2) {
          console.log('[/api/payment/initiate] validate endpoint call failed:', (err2 as Error).message);
        }
      } else {
        console.log('[/api/payment/initiate] No VALIDATE_TOKEN_URL configured; cannot validate SuperApp token for phone extraction');
      }
    }

    // If we have a phone and no effective session user, try to find a registered user
    if (!effectiveUserId && phoneFromToken) {
      // Relaxed matching: exact or contains
      let foundUser = await prisma.user.findFirst({ where: { phoneNumber: phoneFromToken } });
      if (!foundUser) {
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

    // If we don't have a session and couldn't extract a phone, ask to login
    if (!effectiveUserId && !phoneFromToken) {
      console.log('[/api/payment/initiate] No session and no phone info; rejecting with login redirect');
      return NextResponse.json({ success: false, message: 'User not authenticated.', redirectTo: '/login' }, { status: 403 });
    }

    // If after phone lookup we still have no matched user, prompt to register
    if (!effectiveUserId) {
      console.log('[/api/payment/initiate] User not registered: prompting registration');
      return NextResponse.json({ success: false, message: 'Guest users must register to make a purchase.', redirectTo: '/login/register' }, { status: 403 });
    }

    const latestLogin = await prisma.loginHistory.findFirst({
        where: { userId: effectiveUserId },
        orderBy: { loginTime: 'desc' }
    });

    // Prefer token from login history but fall back to the cookie set by /api/connect
    const cookieToken = cookieStore.get('superapp_token')?.value;
    const latestLoginToken = latestLogin?.superAppToken;
    const token = latestLoginToken || cookieToken;

    // Diagnostic log to verify we are using the SuperApp token (not the internal guest/session JWT)
    console.log('[INITIATE] Token source:', {
      isGuestSession: !!guestSessionToken,
      hasSession: !!session,
      hasLatestLoginToken: !!latestLoginToken,
      hasCookieToken: !!cookieToken,
      tokenPreview: token ? `${String(token).slice(0, 15)}... (len ${String(token).length})` : null
    });

    // Absolute rule: do not send guest session token (internal JWT) to NIB payment API
    if (token && guestSessionToken && token === guestSessionToken) {
      console.error('[/api/payment/initiate] Abort: token equals guest session token - SuperApp token required.');
      return NextResponse.json({ success: false, message: 'SuperApp authentication token not found. Please re-enter from the main app.' }, { status: 401 });
    }

    // HARD GUARD: If the token looks like a JWT (starts with eyJ), reject - it must be a SuperApp opaque token
    if (token && String(token).startsWith('eyJ')) {
      console.error('[/api/payment/initiate] Rejecting token that looks like a JWT (not a SuperApp token)');
      return NextResponse.json({ success: false, message: 'Invalid SuperApp token. Please open from NIB SuperApp.' }, { status: 401 });
    }

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

    console.log('[INITIATE] CALLBACK_URL:', CALLBACK_URL);

    if (!ACCOUNT_NO || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
      console.error('[/api/payment/initiate] Server configuration error: Missing payment gateway environment variables.');
      return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
    }

    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    // IMPORTANT: NIB requires a *fixed* parameter order when computing the signature.
    const signatureString =
      `accountNo=${ACCOUNT_NO}` +
      `&amount=${safeAmount}` +
      `&callBackURL=${CALLBACK_URL}` +
      `&companyName=${COMPANY_NAME}` +
      `&Key=${NIB_PAYMENT_KEY}` +
      `&token=${token}` +
      `&transactionId=${transactionId}` +
      `&transactionTime=${transactionTime}`;

    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    // Debug: log signature string and signature hash (safe for debugging)
    console.log('[INITIATE] Signature string:', signatureString);
    console.log('[INITIATE] Signature hash:', signature);

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

    // Temporary debug endpoint: return payload + computed signature for comparison.
    // NOTE: Enabled only when not in production to avoid leaking tokens.
    if (body?.debug === true) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[/api/payment/initiate] Debug payload request received in production - denied.');
        return NextResponse.json({ success: false, message: 'Debug endpoint not allowed in production.' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        debug: true,
        tokenUsed: token,
        tokenPreview: token ? `${String(token).slice(0, 15)}... (len ${String(token).length})` : null,
        signatureString,
        signature,
        paymentPayload,
        callbackUrl: CALLBACK_URL
      }, { status: 200 });
    }
    
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
      console.log('[INITIATE] Sending payment request to NIB with token preview:', `${String(token).slice(0,15)}...`);
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
