// This file is obsolete and will be removed in a future commit.
// Data fetching has been moved to server components.
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: "This API route is deprecated." }, { status: 410 });
}
