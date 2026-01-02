
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import prisma from '@/lib/db';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { addSeconds, differenceInSeconds } from 'date-fns';

const ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
const LOCKOUT_PERIOD_SECONDS = 30;
const MAX_ATTEMPTS = 5;


const getJwtSecret = (type: 'access' | 'refresh') => {
  const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error(`JWT secret for ${type} token is not set.`);
  return new TextEncoder().encode(secret);
};


export async function POST(request: NextRequest) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const ip = request.ip ?? '127.0.0.1';
    
    // IP-based lockout check
    const recentFailedAttempts = await prisma.failedLoginAttempt.findMany({
      where: {
        ipAddress: ip,
        createdAt: {
          gte: addSeconds(new Date(), -LOCKOUT_PERIOD_SECONDS),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentFailedAttempts.length >= MAX_ATTEMPTS) {
        const oldestAttempt = recentFailedAttempts[MAX_ATTEMPTS - 1];
        const lockoutEndsAt = addSeconds(oldestAttempt.createdAt, LOCKOUT_PERIOD_SECONDS);
        const secondsRemaining = differenceInSeconds(lockoutEndsAt, new Date());
        
        return NextResponse.json({ 
            error: `Too many attempts. Please try again in ${secondsRemaining > 0 ? secondsRemaining : 1} seconds.`
        }, { status: 429 });
    }
    
    if (!refreshToken) {
        return NextResponse.json({ error: 'Refresh token not found.' }, { status: 401 });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        const dbToken = await prisma.refreshToken.findFirst({
            where: {
                hashedToken: hashedToken,
                revoked: false,
            },
            include: {
                user: {
                    include: {
                        roles: {
                            include: {
                                role: true
                            }
                        }
                    }
                }
            }
        });

        if (!dbToken || !dbToken.user) {
            throw new Error("Refresh token not found or revoked.");
        }
        
        await prisma.failedLoginAttempt.deleteMany({ where: { ipAddress: ip } });

        // --- Refresh Token Rotation ---
        await prisma.refreshToken.update({
            where: { id: dbToken.id },
            data: { revoked: true }
        });

        const sessionRole = dbToken.user.roles[0]?.role;
        if (!sessionRole) {
            throw new Error("User has no assigned role.");
        }
        
        const newAccessToken = await new SignJWT({
            userId: dbToken.user.id,
            role: sessionRole,
            name: dbToken.user.name,
            email: dbToken.user.email,
            trainingProviderId: dbToken.user.trainingProviderId,
            passwordChangeRequired: dbToken.user.passwordChangeRequired,
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
        .sign(getJwtSecret('access'));
        
        const newRefreshToken = randomUUID();
        const newHashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

        await prisma.refreshToken.create({
            data: {
                userId: dbToken.user.id,
                hashedToken: newHashedRefreshToken
            }
        });

        const response = NextResponse.json({ accessToken: newAccessToken });
        
        response.cookies.set('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRATION_DAYS,
        });

        return response;

    } catch (error) {
        console.error("Refresh token error:", error);
        
        // Log failed attempt for rate limiting
        await prisma.failedLoginAttempt.create({ data: { ipAddress: ip } });

        const response = NextResponse.json({ error: 'Invalid refresh token.' }, { status: 401 });
        response.cookies.delete('refresh_token');
        return response;
    }
}
