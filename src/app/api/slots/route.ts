import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tutorId = searchParams.get('tutorId');

  const rows = tutorId
    ? await sql`
        SELECT * FROM slots
        WHERE tutor_id = ${tutorId}
        ORDER BY date ASC, start_time ASC
      `
    : await sql`SELECT * FROM slots ORDER BY date ASC, start_time ASC`;

  return NextResponse.json(rows.map(rowToSlot));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const [me] = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
  if (!me || me.role !== 'tutor') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { date, startTime, durationMinutes } = (body ?? {}) as {
    date?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
  };

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  const duration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 60;

  // tutorId always comes from the session now — the client can no longer
  // publish a slot under someone else's name by sending a different id.
  const tutorId = session.user.id;

  const rows = await sql`
    INSERT INTO slots (tutor_id, date, start_time, duration_minutes)
    VALUES (${tutorId}, ${date}, ${startTime}, ${duration})
    RETURNING *
  `;
  return NextResponse.json(rowToSlot(rows[0]), { status: 201 });
}
