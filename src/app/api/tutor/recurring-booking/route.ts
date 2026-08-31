import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { sendEmail } from '@/lib/email';
import { randomUUID } from 'crypto';

const RECURRING_WEEKS = 12;

function labelsForUser(user: { subjects: { subject: string; detail: string | null }[] }): string[] {
  return user.subjects.map((ts) => {
    if (ts.subject === 'Other' && ts.detail) return ts.detail;
    if (ts.subject === 'Egzamin ósmoklasisty' && ts.detail) return `Egzamin ósmoklasisty – ${ts.detail}`;
    if (ts.subject === 'Polska Matura' && ts.detail) return `Polska Matura – ${ts.detail}`;
    return ts.subject;
  });
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

// Lets a tutor pre-assign a slot (optionally repeating weekly) directly to
// a chosen student, instead of publishing it as free for anyone to book.
// Sessions are created as 'booked' immediately. Payment is handled
// separately — see /api/payment-batches — so the student/parent can
// choose to pay for one session at a time or several at once.
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
  const { studentId, date, startTime, durationMinutes, subject, repeatWeekly } = (body ?? {}) as {
    studentId?: unknown;
    date?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
    subject?: unknown;
    repeatWeekly?: unknown;
  };

  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'invalid_student_id' }, { status: 400 });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  const duration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 60;
  const shouldRepeat = repeatWeekly === true;

  const tutorId = session.user.id;
  const [tutorRow] = await sql`SELECT * FROM users WHERE id = ${tutorId}`;
  const [studentRow] = await sql`SELECT * FROM users WHERE id = ${studentId} AND role = 'student'`;
  if (!studentRow) {
    return NextResponse.json({ error: 'student_not_found' }, { status: 404 });
  }
  const tutorUser = rowToUser(tutorRow);
  const student = rowToUser(studentRow);
  const studentEmail = studentRow.email as string | undefined;

  let normalizedSubject: string | null = null;
  if (typeof subject === 'string' && subject.trim().length > 0) {
    if (labelsForUser(tutorUser).includes(subject.trim())) {
      normalizedSubject = subject.trim();
    }
  }

  const candidateDates = shouldRepeat
    ? Array.from({ length: RECURRING_WEEKS }, (_, i) => addDaysToDateString(date, i * 7))
    : [date];

  // Overlap check against ANY existing slot for this tutor (free or
  // already booked) — unlike publishing free availability, a direct
  // assignment can't land on top of something the tutor already has.
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
    if (overlaps) skippedDates.push(d); else datesToInsert.push(d);
  }
  if (datesToInsert.length === 0) {
    return NextResponse.json({ error: 'all_occurrences_overlap' }, { status: 409 });
  }

  const recurrenceId = datesToInsert.length > 1 ? randomUUID() : null;
  const inserted = [];
  for (const d of datesToInsert) {
    const rows = await sql`
      INSERT INTO slots (
        tutor_id, date, start_time, duration_minutes, recurrence_id,
        status, booked_by_student_id, booked_at, subject
      )
      VALUES (
        ${tutorId}, ${d}, ${startTime}, ${duration}, ${recurrenceId},
        'booked', ${studentId}, now(), ${normalizedSubject}
      )
      RETURNING *
    `;
    inserted.push(rowToSlot(rows[0]));
  }

  const [firstDate] = datesToInsert;
  const [, mm, dd] = firstDate.split('-');
  const countLabel = inserted.length === 1 ? 'a session' : `${inserted.length} weekly sessions`;
  const subjectSuffix = normalizedSubject ? ` (${normalizedSubject})` : '';

  await sql`
    INSERT INTO notifications (recipient_user_id, message, related_slot_id)
    VALUES (
      ${studentId},
      ${`${tutorUser.name} scheduled ${countLabel} with you, starting ${dd}.${mm} at ${startTime}${subjectSuffix}. Choose how you'd like to pay.`},
      ${inserted[0].id}
    )
  `;

  if (studentEmail) {
    await sendEmail({
      to: studentEmail,
      subject: `${tutorUser.name} scheduled sessions with you on Studilly`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Sessions scheduled</h2>
          <p>Hi ${student.name},</p>
          <p><strong>${tutorUser.name}</strong> scheduled ${countLabel} with you, starting <strong>${dd}.${mm}</strong> at <strong>${startTime}</strong>${subjectSuffix}.</p>
          ${skippedDates.length > 0 ? `<p style="color:#b45309;">Note: ${skippedDates.length} date(s) were skipped because of a scheduling conflict.</p>` : ''}
          <p>Log in to Studilly to choose how you'd like to pay — one session at a time, or several at once.</p>
        </div>
      `,
    }).catch((err) => console.error('Failed to send recurring-assignment email:', err));
  }

  return NextResponse.json({ created: inserted, skippedDates }, { status: 201 });
}
