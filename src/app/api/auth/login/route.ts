
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import type { Prisma, User, TrainingProvider, UserRole, Role } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().optional(),
  loginAs: z.enum(['admin', 'staff']).optional(),
});

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return new TextEncoder().encode(secret);
};

type UserWithFullRoles = User & { 
  roles: (UserRole & { role: Role })[];
  trainingProvider: TrainingProvider | null 
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const miniAppToken = cookieStore.get('miniapp-auth-token')?.value;

    let user: UserWithFullRoles | null | undefined;
    let selectedRole: Role | undefined;

    if (miniAppToken) {
      // Mini-app auto-login flow
      const validationUrl = process.env.VALIDATE_TOKEN_URL;
      if (!validationUrl) {
          console.error('VALIDATE_TOKEN_URL environment variable is not set.');
          return NextResponse.json({ isSuccess: false, errors: ['Server configuration error.'] }, { status: 500 });
      }

      const externalResponse = await fetch(validationUrl, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${miniAppToken}`,
              'Accept': 'application/json',
          },
          cache: 'no-store',
      });

      if (!externalResponse.ok) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid mini-app token.'] }, { status: 401 });
      }
      
      const data = await externalResponse.json();
      const phoneNumber = data.phone;

      if (!phoneNumber) {
        return NextResponse.json({ isSuccess: false, errors: ['Phone number not found in mini-app token.'] }, { status: 400 });
      }

      const users = await prisma.user.findMany({
        where: { phoneNumber },
        include: { roles: { include: { role: true } }, trainingProvider: true },
      });

      if (!users || users.length === 0) {
        // User not registered, redirect them to the registration page.
        // The middleware will catch this and handle the actual redirect.
        return NextResponse.json({ isSuccess: false, redirectTo: '/login/register' }, { status: 404 });
      }
      
      // Default to the first user/role found for mini-app flow for simplicity
      user = users[0];
      selectedRole = user.roles[0]?.role;

    } else {
      // Standard web login flow
      const body = await request.json();
      const validation = loginSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid login data.'] }, { status: 400 });
      }
      const { phoneNumber, password, loginAs } = validation.data;
      
      if (!phoneNumber || !password) {
        return NextResponse.json({ isSuccess: false, errors: ['Phone number and password are required.'] }, { status: 400 });
      }

      const usersWithPhoneNumber = await prisma.user.findMany({
        where: { phoneNumber },
        include: { roles: { include: { role: true } }, trainingProvider: true },
      });

      if (usersWithPhoneNumber.length === 0) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
      }
      
      let candidateUser: UserWithFullRoles | undefined;

      if (usersWithPhoneNumber.length > 1 && loginAs) {
          candidateUser = usersWithPhoneNumber.find(u => 
            u.roles.some(userRole => {
                const roleName = userRole.role.name.toLowerCase();
                if (loginAs === 'admin') return ['admin', 'super admin', 'training provider'].includes(roleName);
                if (loginAs === 'staff') return roleName === 'staff';
                return false;
            })
          );
          if (candidateUser) {
            selectedRole = candidateUser.roles.find(userRole => {
                const roleName = userRole.role.name.toLowerCase();
                if (loginAs === 'admin') return ['admin', 'super admin', 'training provider'].includes(roleName);
                if (loginAs === 'staff') return roleName === 'staff';
                return false;
            })?.role;
          }
      } else {
          candidateUser = usersWithPhoneNumber[0];
          selectedRole = candidateUser.roles[0]?.role;
      }
      
      if (!candidateUser || !candidateUser.password || !selectedRole) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials for the selected role.'] }, { status: 401 });
      }
      
      const isValid = await bcrypt.compare(password, candidateUser.password);
      if (!isValid) {
        return NextResponse.json({ isSuccess: false, errors: ['Invalid credentials.'] }, { status: 401 });
      }
      
      user = candidateUser;

      // Role-based access check
      const permissions = selectedRole.permissions as Prisma.JsonObject;
      const hasAdminPermissions = permissions && Object.values(permissions).some((p: any) => p.c || p.r || p.u || p.d);

      if (loginAs === 'admin' && !hasAdminPermissions) {
        return NextResponse.json({ isSuccess: false, errors: ["You do not have permission to access the admin area."] }, { status: 403 });
      }
    }
    
    if (!user || !selectedRole) {
         return NextResponse.json({ isSuccess: false, errors: ['Could not determine user or role.'] }, { status: 401 });
    }

    // --- Check if Training Provider is active ---
    if (user.trainingProvider && !user.trainingProvider.isActive) {
      return NextResponse.json({ isSuccess: false, errors: ["Your organization's account has been deactivated. Please contact support."] }, { status: 403 });
    }

    // --- Create login history record ---
    await prisma.loginHistory.create({
        data: {
            userId: user.id,
            ipAddress: request.ip,
            userAgent: request.headers.get('user-agent'),
        }
    });

    // --- Create session + JWT ---
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

    const { password: _, ...userWithoutPassword } = user;

    // --- Redirect by role ---
    const permissions = selectedRole.permissions as Prisma.JsonObject;
    const hasAdminPermissions = permissions && Object.values(permissions).some((p: any) => p.c || p.r || p.u || p.d);
    
    let redirectTo = '/dashboard'; // Default for staff
    if (selectedRole.name === 'Super Admin') {
      redirectTo = '/super-admin/dashboard';
    } else if (hasAdminPermissions) {
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
