import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { ADMIN_EMAIL } from '@/lib/payment';
import { completeBooking } from '@/lib/booking-complete';
import { sendEmail } from '@/lib/email';
import { notifyLinkedParent } from '@/lib/parent-notify';
import { randomUUID } from 'crypto';

const MAX_REPEAT_WEEKS = 26;

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

function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function ddmm(date: string): string {
  const [, mm, dd] = date.split('-');
  return `${dd}.${mm}`;
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
  const { tutorId, studentId, date, startTime, durationMinutes, subject, discountCode, repeatWeeks } = (body ?? {}) as {
    tutorId?: unknown;
    studentId?: unknown;
    date?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
    subject?: unknown;
    discountCode?: unknown;
    repeatWeeks?: unknown;
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
  const weeks = repeatWeeks === undefined || repeatWeeks === null ? 1 : repeatWeeks;
  if (typeof weeks !== 'number' || !Number.isInteger(weeks) || weeks < 1 || weeks > MAX_REPEAT_WEEKS) {
    return NextResponse.json({ error: 'invalid_repeat_weeks' }, { status: 400 });
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

  if (weeks > 1) {
    return bookRecurring({
      tutorRow,
      studentRow,
      tutorId,
      studentId,
      date,
      startTime,
      durationMinutes,
      subject: normalizedSubject,
      weeks,
    });
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

// Weekly recurring booking made by the admin. Works like a tutor's recurring
// assignment (/api/tutor/recurring-booking): the sessions are created as
// booked and the family chooses how to pay when they log in (one session at
// a time or several at once, where they can also enter a discount code).
// Dates where the tutor already has something are skipped, not failed.
// Everyone gets ONE summary email listing all dates, not one per week.
async function bookRecurring(args: {
  tutorRow: Record<string, unknown>;
  studentRow: Record<string, unknown>;
  tutorId: string;
  studentId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  subject: string;
  weeks: number;
}) {
  const { tutorRow, studentRow, tutorId, studentId, date, startTime, durationMinutes, subject, weeks } = args;
  const tutor = rowToUser(tutorRow);
  const student = rowToUser(studentRow);
  const tutorEmail = tutorRow.email as string | undefined;
  const studentEmail = studentRow.email as string | undefined;

  const candidateDates = Array.from({ length: weeks }, (_, i) => addDaysToDateString(date, i * 7));
  const existingRows = await sql`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, start_time, duration_minutes FROM slots
    WHERE tutor_id = ${tutorId} AND date = ANY(${candidateDates}::date[])
  `;
  const newStart = toMinutes(startTime);
  const newEnd = newStart + durationMinutes;
  const skippedDates: string[] = [];
  const datesToInsert: string[] = [];
  for (const d of candidateDates) {
    const overlaps = existingRows.some((row) => {
      if (row.date !== d) return false;
      const start = toMinutes(String(row.start_time).slice(0, 5));
      const end = start + Number(row.duration_minutes);
      return newStart < end && start < newEnd;
    });
    if (overlaps) skippedDates.push(d);
    else datesToInsert.push(d);
  }
  if (datesToInsert.length === 0) {
    return NextResponse.json({ error: 'all_occurrences_overlap' }, { status: 409 });
  }

  const recurrenceId = datesToInsert.length > 1 ? randomUUID() : null;
  const created = [];
  for (const d of datesToInsert) {
    const rows = await sql`
      INSERT INTO slots (
        tutor_id, date, start_time, duration_minutes, recurrence_id,
        status, booked_by_student_id, booked_at, subject
      )
      VALUES (
        ${tutorId}, ${d}, ${startTime}, ${durationMinutes}, ${recurrenceId},
        'booked', ${studentId}, now(), ${subject}
      )
      RETURNING *
    `;
    created.push(rowToSlot(rows[0]));
  }

  const first = ddmm(datesToInsert[0]);
  const countLabel = created.length === 1 ? 'a session' : `${created.length} weekly sessions`;
  const summary = `${countLabel}, starting ${first} at ${startTime} (${durationMinutes} min, ${subject})`;
  const dateList = `<ul>${datesToInsert.map((d) => `<li>${ddmm(d)} at ${startTime}</li>`).join('')}</ul>`;
  const skippedNote = skippedDates.length > 0
    ? `<p style="color:#b45309;">Skipped because the tutor already has something then: ${skippedDates.map(ddmm).join(', ')}.</p>`
    : '';
  const payNote = `<p>Log in to Studilly to pay — one session at a time, or several at once. You can enter a discount code when you pay.</p>`;
  const wrap = (inner: string) => `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">${inner}</div>`;

  await Promise.all([
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (${studentId}, ${`You have ${summary} with ${tutor.name}. Choose how you'd like to pay.`}, ${created[0].id})
    `,
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (${tutorId}, ${`You have ${summary} with ${student.name}.`}, ${created[0].id})
    `,
    studentEmail
      ? sendEmail({
          to: studentEmail,
          subject: `Sessions booked with ${tutor.name} — from ${first}`,
          html: wrap(`<h2>Sessions booked</h2><p>Hi ${student.name},</p>
            <p>You have ${countLabel} with <strong>${tutor.name}</strong> — <strong>${subject}</strong>, ${durationMinutes} min:</p>
            ${dateList}${skippedNote}${payNote}`),
        })
      : Promise.resolve(),
    notifyLinkedParent(
      studentId,
      `Sessions booked for ${student.name} with ${tutor.name} — from ${first}`,
      wrap(`<h2>Sessions booked</h2><p>Hello,</p>
        <p><strong>${student.name}</strong> has ${countLabel} with <strong>${tutor.name}</strong> — <strong>${subject}</strong>, ${durationMinutes} min:</p>
        ${dateList}${skippedNote}${payNote}`),
    ).catch((err) => console.error('Failed to email linked parent about recurring booking:', err)),
    tutorEmail
      ? sendEmail({
          to: tutorEmail,
          subject: `New weekly sessions with ${student.name} — from ${first}`,
          html: wrap(`<h2>New sessions</h2><p>Hi ${tutor.name},</p>
            <p>You have ${countLabel} with <strong>${student.name}</strong> — <strong>${subject}</strong>, ${durationMinutes} min:</p>
            ${dateList}${skippedNote}
            <p style="color: #666; font-size: 13px;">You can add meeting links from your slot list in the app.</p>`),
        })
      : Promise.resolve(),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New recurring booking — ${student.name} × ${tutor.name} — ${created.length} sessions from ${first}`,
      html: wrap(`<h2>New recurring booking</h2>
        <p>${student.name} (${studentEmail ?? '—'}) × ${tutor.name} — ${subject}, ${durationMinutes} min:</p>
        ${dateList}${skippedNote}
        <p style="color: #666; font-size: 13px;">Payment: the family pays when they log in (single or batch).</p>`),
    }),
  ]);

  return NextResponse.json({ created, skippedDates }, { status: 201 });
}
