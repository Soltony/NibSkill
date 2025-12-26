import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const session = await prisma.liveSession.findUnique({
      where: { id },
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

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch session.' }, { status: 500 });
  }
}
