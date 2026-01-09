'use server';

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { jwtVerify, type JWTPayload } from 'jose';
import { createHash } from 'crypto';
import type { Role, User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;

interface VerifiedUser extends User {
  role: Role;
  isGuest?: boolean;
}

interface DecodedToken extends JWTPayload {
  userId: string;
  isGuest?: boolean;
  phoneNumber?: string;
  tokenVersion?: number;
  type?: 'access' | 'refresh';
  sessionId?: string;
  jti?: string;
}


export async function verifyAuth(req: NextRequest): Promise<VerifiedUser | null> {
  // For normal requests, require only the short-lived access token and validate session state.
  const cookieStore = cookies();
  const accessToken = cookieStore.get('auth_token')?.value;
  if (!accessToken) return null;

  const getJwtSecret = (type: 'access' | 'refresh') => {
    const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
    return new TextEncoder().encode(secret);
  };

  try {
    const { payload: accessPayload } = await jwtVerify<DecodedToken>(accessToken, getJwtSecret('access'));
    if (!accessPayload.userId) return null;

    // Session binding: ensure session exists and is active
    // Check whether this access token was revoked (blacklist)
    if (accessPayload.jti) {
      try {
        const revoked = await prisma.revokedAccessToken.findUnique({ where: { jti: accessPayload.jti } });
        if (revoked) return null;
      } catch (e) {
        // ignore DB errors and continue (fail-open to avoid locking out users on DB issues)
      }
    }
    if (!accessPayload.sessionId) return null;
    const session = await prisma.session.findUnique({ where: { id: accessPayload.sessionId } });
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) return null;

    const user = await prisma.user.findUnique({ where: { id: accessPayload.userId }, include: { roles: { include: { role: true } } } });
    if (!user) return null;
    if (user.tokenVersion !== accessPayload.tokenVersion) return null;

    // update session lastActivity
    try { await prisma.session.update({ where: { id: session.id }, data: { lastActivity: new Date() } }); } catch (e) {}

    const sessionRole = user.roles[0]?.role;
    if (!sessionRole) return null;

    const finalUser: VerifiedUser = { ...user, role: sessionRole };
    return finalUser;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}
