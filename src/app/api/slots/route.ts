import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';
import { randomUUID } from 'crypto';

// How many weekly occurrences a "repeat weekly" slot creates, including
// the first one the tutor picked a date for.
const RECURRING_WEEKS = 12;

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

function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
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
  const { date, startTime, durationMinutes, repeatWeekly } = (body ?? {}) as {
    date?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
    repeatWeekly?: unknown;
  };

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  const duration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 60;
  const shouldRepeat = repeatWeekly === true;

  // tutorId always comes from the session now — the client can no longer
  // publish a slot under someone else's name by sending a different id.
  const tutorId = session.user.id;

  // Non-repeating path: unchanged single-row insert, no recurrence_id.
  if (!shouldRepeat) {
    const rows = await sql`
      INSERT INTO slots (tutor_id, date, start_time, duration_minutes)
      VALUES (${tutorId}, ${date}, ${startTime}, ${duration})
      RETURNING *
    `;
    return NextResponse.json(rowToSlot(rows[0]), { status: 201 });
  }

  // Repeating path: build the list of candidate dates (same weekday,
  // every 7 days, RECURRING_WEEKS occurrences total), then skip any
  // occurrence that overlaps a slot the tutor already has on that date.
  const candidateDates = Array.from({ length: RECURRING_WEEKS }, (_, i) =>
    addDaysToDateString(date, i * 7)
  );

  const existingRows = await sql`
    SELECT date, start_time, duration_minutes FROM slots
    WHERE tutor_id = ${tutorId} AND date = ANY(${candidateDates})
  `;
  const existingByDate = new Map<string, { start: number; end: number }[]>();
  for (const row of existingRows) {
    const d = String(row.date).slice(0, 10);
    const start = toMinutes(String(row.start_time).slice(0, 5));
    const end = start + Number(row.duration_minutes);
    if (!existingByDate.has(d)) existingByDate.set(d, []);
    existingByDate.get(d)!.push({ start, end });
  }

  const newStart = toMinutes(startTime);
  const newEnd = newStart + duration;
  const skippedDates: string[] = [];
  const datesToInsert: string[] = [];
  for (const d of candidateDates) {
    const existing = existingByDate.get(d) ?? [];
    const overlaps = existing.some((e) => newStart < e.end && e.start < newEnd);
    if (overlaps) {
      skippedDates.push(d);
    } else {
      datesToInsert.push(d);
    }
  }

  if (datesToInsert.length === 0) {
    return NextResponse.json({ error: 'all_occurrences_overlap' }, { status: 409 });
  }

  const recurrenceId = randomUUID();
  const inserted = [];
  for (const d of datesToInsert) {
    const rows = await sql`
      INSERT INTO slots (tutor_id, date, start_time, duration_minutes, recurrence_id)
      VALUES (${tutorId}, ${d}, ${startTime}, ${duration}, ${recurrenceId})
      RETURNING *
    `;
    inserted.push(rowToSlot(rows[0]));
  }

  return NextResponse.json({ created: inserted, skippedDates }, { status: 201 });
}
