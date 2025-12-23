import { NextResponse } from 'next/server';

// Deprecated: this endpoint moved to `/api/connect` and will be removed.
export async function GET() {
  return NextResponse.json({ message: 'Moved: please use /api/connect' }, { status: 410 });
}
