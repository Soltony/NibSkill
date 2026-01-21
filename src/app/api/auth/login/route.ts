
'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { serialize } from 'cookie';
import { createHash, randomUUID } from 'crypto';
import { securityLog } from '@/lib/logger';
import { headers } from 'next/headers';

const getJwtSecret = (type: 'access' | 'refresh') => {
  const secret =
    type === 'access'
      ? process.env.JWT_ACCESS_SECRET
      : process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
  return new TextEncoder().encode(secret);
};

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_SESSION_AGE_SECONDS =
  Number(process.env.MAX_SESSION_AGE_SECONDS) || 60 * 60 * 24 * 7; // 7 days

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_SECONDS = parseInt(
  process.env.LOCKOUT_DURATION_SECONDS || '30',
  10
);

const loginAttempts: Record<
  string,
  { count: number; lockoutUntil: number; lockoutEndsAt?: Date }
> = {};

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.ip ?? headers().get('x-forwarded-for') ?? '127.0.0.1';

    if (loginAttempts[ip]?.lockoutUntil > Date.now()) {
      const timeLeft = Math.ceil(
        (loginAttempts[ip].lockoutUntil - Date.now()) / 1000
      );
      securityLog('warn', 'login_locked_out_attempt', {
        ip,
        remainingLockSeconds: timeLeft,
      });
      return NextResponse.json(
        {
          isSuccess: false,
          errors: [
            `Too many failed attempts. Please try again in ${timeLeft} seconds.`,
          ],
          lockoutInfo: {
            isLockedOut: true,
            lockoutEndsAt: loginAttempts[ip].lockoutEndsAt,
          }
        },
        { status: 429 }
      );
    }

    const { phoneNumber, password, loginAs } = await req.json();
    if (!phoneNumber || !password || !loginAs) {
      return NextResponse.json(
        { isSuccess: false, errors: ['Missing credentials.'] },
        { status: 400 }
      );
    }

    try { securityLog('info', 'login_attempt', { phoneNumber, loginAs, ip }); } catch (e) {}

    // Prefer to find the user by phone + requested role to avoid collisions
    // when the same phone number exists across providers.
    const roleLookupNameMap: Record<string, string> = {
      'staff': 'Staff',
      'admin': 'Admin',
      'super-admin': 'Super Admin'
    };

    const desiredRoleName = roleLookupNameMap[loginAs.toLowerCase()];

    let user = null;
    if (desiredRoleName) {
      try {
        user = await prisma.user.findFirst({
          where: {
            phoneNumber,
            roles: { some: { role: { name: { equals: desiredRoleName, mode: 'insensitive' } } } }
          },
          include: { roles: { include: { role: true } } },
        });
      } catch (e) {
        // ignore and fallback
      }
    }

    // Fallback to any user with the phone number (legacy behavior)
    if (!user) {
      user = await prisma.user.findFirst({
        where: { phoneNumber },
        include: { roles: { include: { role: true } } },
      });
    }

    const failLogin = () => {
      const attempt = loginAttempts[ip] || { count: 0, lockoutUntil: 0 };
      attempt.count++;
      let lockoutInfo: any = { isLockedOut: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.count };

      if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.lockoutEndsAt = new Date(
          Date.now() + LOCKOUT_DURATION_SECONDS * 1000
        );
        attempt.lockoutUntil = attempt.lockoutEndsAt.getTime();
        attempt.count = 0; // Reset count after setting lockout
        lockoutInfo = { isLockedOut: true, lockoutEndsAt: attempt.lockoutEndsAt };
      }
      
      loginAttempts[ip] = attempt;
      try { securityLog('warn', 'login_failed', { phoneNumber, loginAs, ip, remainingAttempts: lockoutInfo.remainingAttempts }); } catch (e) {}
      
      return NextResponse.json(
        { isSuccess: false, errors: ['Invalid credentials.'], lockoutInfo },
        { status: 401 }
      );
    };

    if (!user || !user.password) return failLogin();

    const role =
      loginAs === 'super-admin'
        ? user.roles.find((r) => r.role.id === 'super-admin')?.role
        : user.roles.find((r) => {
            const roleName = r.role.name?.toLowerCase();
            const target = loginAs.toLowerCase();
            const roleProviderId = r.role.trainingProviderId;
            const providerMatches = roleProviderId === user.trainingProviderId || roleProviderId == null;
            // Admin login should match Admin role scoped to the provider
            if (target === 'admin') {
              return roleName === 'admin' && providerMatches;
            }
            return roleName === target && providerMatches;
          })?.role;

    // If the requested role wasn't found, attempt a sensible fallback:
    // prefer Super Admin, then Admin, then any available role.
    if (!role) {
      const fallback = user.roles.find(r => r.role.name === 'Super Admin')?.role
        || user.roles.find(r => r.role.name === 'Admin')?.role
        || user.roles[0]?.role;
      if (!fallback) return failLogin();
      // Use fallback role but still verify password
      try { securityLog('info', 'login_role_fallback', { phoneNumber, target: loginAs, fallback: fallback.name, ip }); } catch (e) {}
      // assign fallback for subsequent logic
      (/* mutable */ (role as any)) = fallback;
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) return failLogin();

    delete loginAttempts[ip];

    const sessionId = randomUUID();
    const jti = randomUUID();

    const accessToken = await new SignJWT({
      userId: user.id,
      role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      trainingProviderId: user.trainingProviderId,
      passwordChangeRequired: user.passwordChangeRequired,
      tokenVersion: user.tokenVersion,
      jti,
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('access'));

    const refreshToken = await new SignJWT({
      userId: user.id,
      tokenVersion: user.tokenVersion,
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`)
      .sign(getJwtSecret('refresh'));

    let redirectTo = '/dashboard'; // Default for staff
    if (user.passwordChangeRequired) {
        redirectTo = '/change-password';
    } else if (role.name === 'Super Admin') {
        redirectTo = '/super-admin/dashboard';
    } else if (role.name === 'Admin') {
        redirectTo = '/admin/analytics';
    }

    const response = NextResponse.json(
      {
        isSuccess: true,
        redirectTo: user.passwordChangeRequired ? '/change-password' : (
          role.name === 'Admin'
            ? '/admin/analytics'
            : role.name === 'Super Admin'
            ? '/super-admin/dashboard'
            : '/dashboard'
        ),
        passwordChangeRequired: user.passwordChangeRequired,
      },
      { status: 200 }
    );

    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    response.cookies.set('refresh_sid', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    try {
      const hashed = createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await prisma.$transaction([
        prisma.session.create({
          data: {
            id: sessionId,
            userId: user.id,
            expiresAt: new Date(
              Date.now() + MAX_SESSION_AGE_SECONDS * 1000
            ),
            reauthenticatedAt: new Date(),
          },
        }),
        prisma.refreshToken.create({
          data: { hashedToken: hashed, userId: user.id, sessionId },
        }),
      ]);

      // Audit events for session and token issuance
      try { securityLog('audit', 'session_created', { userId: user.id, sessionId, ip }); } catch (e) {}
      try { securityLog('audit', 'tokens_issued', { userId: user.id, sessionId, jti }); } catch (e) {}
    } catch (e) {
      securityLog('error', 'session_persist_failed', {
        userId: user.id,
        error: String(e),
      });
    }

    try {
      // Record login history for audit purposes (best-effort)
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: ip || null,
          userAgent: req.headers.get('user-agent') || null,
        },
      });
    } catch (e) {
      try { securityLog('warn', 'login_history_write_failed', { userId: user.id, error: String(e) }); } catch (ee) {}
    }

    try { securityLog('audit', 'login_success', { userId: user.id, ip, role: role.name, loginAs }); } catch (e) {}
    return response;
  } catch (error: any) {
    securityLog('error', 'login_exception', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { isSuccess: false, errors: ['An internal server error occurred.'] },
      { status: 500 }
    );
  }
}
