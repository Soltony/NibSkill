
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import type { Prisma, User, TrainingProvider, UserRole, Role, JWTPayload } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().optional(),
  loginAs: z.enum(['admin', 'staff', 'super-admin']).optional(),
});

interface GuestJwtPayload extends JWTPayload {
  phoneNumber: string;
  authToken: string;
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

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
      return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
    }
    
    let candidateUser: UserWithFullRoles | undefined;

    // Find a user that matches the phone number AND the intended role
    for (const u of usersWithPhoneNumber) {
        const passwordMatch = await bcrypt.compare(password, u.password || '');
        if (passwordMatch && userHasRole(u, loginAs)) {
            candidateUser = u;
            break;
        }
    }

    if (!candidateUser) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
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

    if (user.trainingProvider && !user.trainingProvider.isActive) {
      return NextResponse.json({ isSuccess: false, errors: ["Your organization's account has been deactivated. Please contact support."] }, { status: 403 });
    }

    await prisma.loginHistory.create({
        data: {
            userId: user.id,
            ipAddress: request.ip,
            userAgent: request.headers.get('user-agent'),
        }
    });

    const sessionId = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSessionId: sessionId },
    });

    const jwt = await new SignJWT({
      userId: user.id,
      role: selectedRole,
      name: user.name,
      email: user.email,
      sessionId,
      trainingProviderId: user.trainingProviderId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    
    const guestSessionToken = cookieStore.get('miniapp_guest_session')?.value;
    if (guestSessionToken) {
      cookieStore.delete('miniapp_guest_session');
    }

    const { password: _, ...userWithoutPassword } = user;

    let redirectTo = '/dashboard';
    if (selectedRole.name === 'Super Admin') {
      redirectTo = '/super-admin/dashboard';
    } else if (loginAs === 'admin') {
      redirectTo = '/admin/analytics';
    }


    return NextResponse.json({
      isSuccess: true,
      user: userWithoutPassword,
      redirectTo,
      errors: null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ isSuccess: false, errors: ['Unexpected server error.'] }, { status: 500 });
  }
}
