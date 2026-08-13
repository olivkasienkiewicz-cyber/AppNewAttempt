import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToAvailabilityWindow } from '@/lib/db-mappers';

export const dynamic = 'force-dynamic';

// Any signed-in user can see all tutors' open windows (needed for the
// student browse page). Only a tutor can create their own window.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const rows = await sql`SELECT * FROM availability_windows ORDER BY date ASC, start_time ASC`;
  return NextResponse.json(rows.map(rowToAvailabilityWindow));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { date, startTime, endTime } = (body ?? {}) as {
    date?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  if (typeof endTime !== 'string' || !/^\d{2}:\d{2}$/.test(endTime)) {
    return NextResponse.json({ error: 'invalid_end_time' }, { status: 400 });
  }
  if (endTime <= startTime) {
    return NextResponse.json({ error: 'end_before_start' }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO availability_windows (tutor_id, date, start_time, end_time)
    VALUES (${session.user.id}, ${date}, ${startTime}, ${endTime})
    RETURNING *
  `;
  return NextResponse.json(rowToAvailabilityWindow(rows[0]));
}
