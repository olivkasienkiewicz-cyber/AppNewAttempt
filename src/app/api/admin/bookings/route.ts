import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { ADMIN_EMAIL } from '@/lib/payment';
import { completeBooking } from '@/lib/booking-complete';

export const dynamic = 'force-dynamic';

function labelsForUser(user: { subjects: { subject: string; detail: string | null }[] }): string[] {
  return user.subjects.map((ts) => {
    if (ts.subject === 'Other' && ts.detail) return ts.detail;
    if (ts.subject === 'Egzamin ósmoklasisty' && ts.detail) return `Egzamin ósmoklasisty – ${ts.detail}`;
    if (ts.subject === 'Polska Matura' && ts.detail) return `Polska Matura – ${ts.detail}`;
    return ts.subject;
  });
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Lets the admin book a session for a student with a tutor directly. The
// slot is created as 'booked' and then goes through exactly the same
// completion step as a student booking it themselves: price (+ optional
// discount code), in-app notifications, and confirmation emails to the
// student (with bank details), the tutor and the admin.
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { tutorId, studentId, date, startTime, durationMinutes, subject, discountCode } = (body ?? {}) as {
    tutorId?: unknown;
    studentId?: unknown;
    date?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
    subject?: unknown;
    discountCode?: unknown;
  };

  if (typeof tutorId !== 'string' || !tutorId) {
    return NextResponse.json({ error: 'invalid_tutor_id' }, { status: 400 });
  }
  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'invalid_student_id' }, { status: 400 });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  if (typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
  }
  if (typeof subject !== 'string' || subject.trim().length === 0) {
    return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
  }
  if (discountCode !== undefined && discountCode !== null && typeof discountCode !== 'string') {
    return NextResponse.json({ error: 'invalid_discount_code' }, { status: 400 });
  }

  const [tutorRow] = await sql`SELECT * FROM users WHERE id = ${tutorId} AND role = 'tutor'`;
  if (!tutorRow) {
    return NextResponse.json({ error: 'tutor_not_found' }, { status: 404 });
  }
  const [studentRow] = await sql`SELECT * FROM users WHERE id = ${studentId} AND role = 'student'`;
  if (!studentRow) {
    return NextResponse.json({ error: 'student_not_found' }, { status: 404 });
  }

  // The subject decides the price, so it must be one the tutor actually
  // teaches (the form only offers those) rather than silently falling back.
  const normalizedSubject = subject.trim();
  if (!labelsForUser(rowToUser(tutorRow)).includes(normalizedSubject)) {
    return NextResponse.json({ error: 'subject_not_taught_by_tutor' }, { status: 400 });
  }

  // Can't land on top of anything the tutor already has (free or booked).
  const existingRows = await sql`
    SELECT start_time, duration_minutes FROM slots
    WHERE tutor_id = ${tutorId} AND date = ${date}
  `;
  const newStart = toMinutes(startTime);
  const newEnd = newStart + durationMinutes;
  const overlaps = existingRows.some((row) => {
    const start = toMinutes(String(row.start_time).slice(0, 5));
    const end = start + Number(row.duration_minutes);
    return newStart < end && start < newEnd;
  });
  if (overlaps) {
    return NextResponse.json({ error: 'tutor_time_conflict' }, { status: 409 });
  }

  const inserted = await sql`
    INSERT INTO slots (tutor_id, date, start_time, duration_minutes, status, booked_by_student_id, booked_at, subject)
    VALUES (${tutorId}, ${date}, ${startTime}, ${durationMinutes}, 'booked', ${studentId}, now(), ${normalizedSubject})
    RETURNING *
  `;
  const slot = rowToSlot(inserted[0]);

  const { notifications, payment, discountError } = await completeBooking({
    slot,
    studentId,
    discountCode: typeof discountCode === 'string' ? discountCode : null,
  });

  return NextResponse.json({ slot, notifications, payment, discountError }, { status: 201 });
}
