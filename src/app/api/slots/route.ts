import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';

export async function GET(req: Request) {
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { tutorId, date, startTime, durationMinutes } = (body ?? {}) as {
    tutorId?: unknown;
    date?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
  };

  if (typeof tutorId !== 'string' || !tutorId) {
    return NextResponse.json({ error: 'invalid_tutor_id' }, { status: 400 });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  const duration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 60;

  const rows = await sql`
    INSERT INTO slots (tutor_id, date, start_time, duration_minutes)
    VALUES (${tutorId}, ${date}, ${startTime}, ${duration})
    RETURNING *
  `;
  return NextResponse.json(rowToSlot(rows[0]), { status: 201 });
}
