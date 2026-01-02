
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import type { Prisma, User, TrainingProvider, UserRole, Role, JWTPayload as JoseJWTPayload } from '@prisma/client';
import { addSeconds, differenceInSeconds } from 'date-fns';
import crypto from 'crypto';

interface GuestJwtPayload extends JoseJWTPayload {
  phoneNumber: string;
  authToken: string;
}

const ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

const getJwtSecret = (type: 'access' | 'refresh') => {
  const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
  return new TextEncoder().encode(secret);
};

const loginSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().optional(),
  loginAs: z.enum(['admin', 'staff', 'super-admin']).optional(),
});

type UserWithFullRoles = User & { 
  roles: (UserRole & { role: Role })[];
  trainingProvider: TrainingProvider | null 
};

// Helper function to check if a user's roles match the intended login role
const userHasRole = (user: UserWithFullRoles, loginAs: 'admin' | 'staff' | 'super-admin') => {
    return user.roles.some(userRole => {
        const roleName = userRole.role.name.toLowerCase();
        if (loginAs === 'super-admin') {
            return roleName === 'super admin';
        }
        if (loginAs === 'admin') {
            // Any admin-type role that ISN'T super admin or staff
            return roleName !== 'staff' && roleName !== 'super admin';
        }
        if (loginAs === 'staff') {
            return roleName === 'staff';
        }
        return false;
    });
};


export async function POST(request: NextRequest) {
  try {
    const ip = request.ip ?? '127.0.0.1';
    const LOCKOUT_PERIOD_SECONDS = 30;
    const MAX_ATTEMPTS = 5;
    const lockoutUntil = addSeconds(new Date(), LOCKOUT_PERIOD_SECONDS);

    // Check for IP-based lockout
    const recentFailedAttempts = await prisma.failedLoginAttempt.findMany({
      where: {
        ipAddress: ip,
        createdAt: {
          gte: addSeconds(new Date(), -LOCKOUT_PERIOD_SECONDS),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentFailedAttempts.length >= MAX_ATTEMPTS) {
        const oldestAttempt = recentFailedAttempts[MAX_ATTEMPTS - 1];
        const lockoutEndsAt = addSeconds(oldestAttempt.createdAt, LOCKOUT_PERIOD_SECONDS);
        const secondsRemaining = differenceInSeconds(lockoutEndsAt, new Date());
        
        return NextResponse.json({ 
            isSuccess: false, 
            errors: [`Too many failed attempts. Please try again in ${secondsRemaining > 0 ? secondsRemaining : 1} seconds.`],
            lockoutInfo: {
                isLockedOut: true,
                lockoutEndsAt,
                remainingAttempts: 0,
            }
        }, { status: 429 });
    }

    const cookieStore = cookies();
    let user: UserWithFullRoles | null | undefined;
    let selectedRole: Role | undefined;

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ isSuccess: false, errors: ['Invalid login data.'] }, { status: 400 });
    }
    const { phoneNumber, password, loginAs } = validation.data;
    
    if (!phoneNumber || !password || !loginAs) {
      return NextResponse.json({ isSuccess: false, errors: ['Phone number, password, and role are required.'] }, { status: 400 });
    }

    const usersWithPhoneNumber = await prisma.user.findMany({
      where: { phoneNumber },
      include: { roles: { include: { role: true } }, trainingProvider: true },
    });

    if (usersWithPhoneNumber.length === 0) {
      await prisma.failedLoginAttempt.create({ data: { ipAddress: ip } });
      const remaining = MAX_ATTEMPTS - (recentFailedAttempts.length + 1);
      return NextResponse.json({ 
          isSuccess: false, 
          errors: ['Invalid credentials.'],
          lockoutInfo: { remainingAttempts: remaining > 0 ? remaining : 0, isLockedOut: remaining <= 0, lockoutEndsAt: remaining <= 0 ? lockoutUntil : null }
      }, { status: 401 });
    }
    
    let candidateUser: UserWithFullRoles | undefined;
    let passwordMatch = false;
    
    // Find a user that matches the phone number AND the intended role and has a correct password
    for (const u of usersWithPhoneNumber) {
        const isMatch = await bcrypt.compare(password, u.password || '');
        if (isMatch) {
            passwordMatch = true;
            if (userHasRole(u, loginAs)) {
                candidateUser = u;
                break;
            }
        }
    }

    if (!candidateUser) {
        await prisma.failedLoginAttempt.create({ data: { ipAddress: ip } });
        const remaining = MAX_ATTEMPTS - (recentFailedAttempts.length + 1);
        const errorMsg = passwordMatch ? `This user is not configured as a '${loginAs}'.` : 'Invalid credentials.';
        return NextResponse.json({ 
            isSuccess: false, 
            errors: [errorMsg],
            lockoutInfo: { remainingAttempts: remaining > 0 ? remaining : 0, isLockedOut: remaining <= 0, lockoutEndsAt: remaining <= 0 ? lockoutUntil : null }
        }, { status: 401 });
    }

    // Now that we have a valid user for the role, find the specific role to use for the session
    selectedRole = candidateUser.roles.find(userRole => {
        const roleName = userRole.role.name.toLowerCase();
        if (loginAs === 'super-admin') return roleName === 'super admin';
        if (loginAs === 'admin') return roleName !== 'staff' && roleName !== 'super admin';
        if (loginAs === 'staff') return roleName === 'staff';
        return false;
    })?.role;

    if (!selectedRole) {
         return NextResponse.json({ isSuccess: false, errors: ['Could not determine user role for session.'] }, { status: 500 });
    }
    
    user = candidateUser;
    
    await prisma.failedLoginAttempt.deleteMany({ where: { ipAddress: ip } });

    if (user.trainingProvider && !user.trainingProvider.isActive) {
      return NextResponse.json({ isSuccess: false, errors: ["Your organization's account has been deactivated. Please contact support."] }, { status: 403 });
    }

    const accessToken = await new SignJWT({
        userId: user.id,
        role: selectedRole,
        name: user.name,
        email: user.email,
        trainingProviderId: user.trainingProviderId,
        passwordChangeRequired: user.passwordChangeRequired,
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(getJwtSecret('access'));

    const refreshToken = randomUUID();
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            hashedToken: hashedRefreshToken,
        }
    });

    const { password: _, ...userWithoutPassword } = user;
    
    let redirectTo = '/dashboard';
    if (user.passwordChangeRequired) {
        redirectTo = '/change-password';
    } else {
        if (selectedRole.name === 'Super Admin') {
            redirectTo = '/super-admin/dashboard';
        } else if (loginAs === 'admin') {
            redirectTo = '/admin/analytics';
        }
    }

    const response = NextResponse.json({
      isSuccess: true,
      user: userWithoutPassword,
      accessToken,
      redirectTo,
      passwordChangeRequired: user.passwordChangeRequired,
      errors: null,
    });

    response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRATION_DAYS,
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ isSuccess: false, errors: ['Unexpected server error.'] }, { status: 500 });
  }
}
