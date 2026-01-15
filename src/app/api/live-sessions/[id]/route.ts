import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const session = await prisma.liveSession.findUnique({
      where: { id },
      include: {
        allowedAttendees: { select: { userId: true } }
      },
      select: {
        id: true,
        status: true,
        title: true,
        recordingUrl: true,
        joinUrl: true,
        dateTime: true,
        isRestricted: true,
        keyTakeaways: true,
      }
    });

    if (!session) return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });

    // If the session is restricted, verify the requesting user is Staff or explicitly allowed
    if (session.isRestricted) {
      try {
        const { getSession } = await import('@/lib/auth');
        const user = await getSession();
        if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const roleName = user.role?.name;
        const allowedIds = (session as any).allowedAttendees?.map((a: any) => a.userId) || [];
        if (roleName !== 'Staff' && !allowedIds.includes(user.id)) {
          return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
      } catch (e) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    // Remove allowedAttendees from response for privacy and return
    const sanitized = { ...session } as any;
    delete sanitized.allowedAttendees;

    return NextResponse.json({ success: true, session: sanitized });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch session.' }, { status: 500 });
  }
}
