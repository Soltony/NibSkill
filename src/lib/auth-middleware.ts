
'use server';

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
import type { Role, User, UserRole } from '@prisma/client';
import { securityLog } from './logger';

const JWT_SECRET = process.env.JWT_SECRET;

interface VerifiedUser extends User {
  role: Role;
  isGuest?: boolean;
}

interface DecodedToken {
    userId: string;
    isGuest?: boolean;
    phoneNumber?: string;
    tokenVersion?: number;
    type: 'access' | 'refresh';
}


export async function verifyAuth(req: NextRequest): Promise<VerifiedUser | null> {
  if (!JWT_SECRET) {
    securityLog('error', 'jwt_secret_not_set');
    return null;
  }

  // Get token from HttpOnly cookie
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (decoded.type !== 'access') {
      securityLog('warn', 'auth_verify_invalid_token_type', { type: decoded.type });
      return null;
    }

    if (!decoded.userId) {
      return null;
    }

    // Guest users don't need DB validation, just a valid token.
    if (decoded.isGuest) {
        // This is a placeholder for guest logic, which is not fully implemented in this system
        return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
       include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    // This is the critical token revocation check
    if (user.tokenVersion !== decoded.tokenVersion) {
      securityLog('warn', 'auth_verify_token_revoked', { userId: user.id });
      return null;
    }
    
    // Assuming the first role is the primary role for the session
    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) return null;


    const finalUser: VerifiedUser = {
        ...user,
        role: sessionRole,
    };


    return finalUser;

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      securityLog('info', 'auth_verify_jwt_error', { error: error.message });
    } else {
      securityLog('error', 'auth_verify_exception', { error: error instanceof Error ? error.message : String(error) });
    }
    return null;
  }
}
