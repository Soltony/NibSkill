import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { securityLog } from '@/lib/logger';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });
    }

    const { currentPassword } = await req.json();
    if (!currentPassword) return NextResponse.json({ success: false, message: 'Current password is required.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user || !user.password) return NextResponse.json({ success: false, message: 'User not found or password not set.' }, { status: 401 });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || null;
    if (!isValid) {
      securityLog('warn', 'reauth_failed', { userId: user.id, ip, userAgent: ua });
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    }

    // Update session.reauthenticatedAt (find by the session cookie binding - refresh_sid)
    // We assume getSession() validated the session and bound session exists
    const cookieStore = cookies();
    const refreshSid = cookieStore.get('refresh_sid')?.value || undefined;
    try {
      if (refreshSid) {
        await prisma.session.update({ where: { id: refreshSid }, data: { reauthenticatedAt: new Date() } });
      } else {
        // As a fallback, update the most recent session for user
        const latest = await prisma.session.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
        if (latest) await prisma.session.update({ where: { id: latest.id }, data: { reauthenticatedAt: new Date() } });
      }
    } catch (e) {}

    securityLog('audit', 'reauth_success', { userId: user.id });
    return NextResponse.json({ success: true, message: 'Re-authentication successful.' }, { status: 200 });
  } catch (error) {
    console.error('[REAUTH_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}