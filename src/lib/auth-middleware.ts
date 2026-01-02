'use server';

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
import type { Role, User, UserRole } from '@prisma/client';

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
    console.error('JWT_SECRET environment variable is not set.');
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
      console.warn('Attempted to use non-access token for authentication.');
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
      console.warn(`Token revocation check failed for user ${user.id}.`);
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
      console.log('Invalid or expired JWT:', error.message);
    } else {
      console.error('An unexpected error occurred during auth verification:', error);
    }
    return null;
  }
}
