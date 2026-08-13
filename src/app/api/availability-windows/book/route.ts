import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToNotification, rowToUser } from '@/lib/db-mappers';
import { referenceCodeForSlot, amountForSlot, BANK_DETAILS, ADMIN_EMAIL } from '@/lib/payment';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const ALLOWED_DURATIONS = [60, 90, 120];

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Books a custom-length session (60/90/120 min) starting at a given time,
// validating it fits entirely inside one of the tutor's declared open
// windows and doesn't overlap any existing slot (free or booked) that day.
// The student is taken from the session, never the request body.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const studentId = session.user.id;

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
    return NextResponse.json({ error: 'invalid_tutor' }, { status: 400 });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: 'invalid_start_time' }, { status: 400 });
  }
  if (typeof durationMinutes !== 'number' || !ALLOWED_DURATIONS.includes(durationMinutes)) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
  }

  const reqStart = toMinutes(startTime);
  const reqEnd = reqStart + durationMinutes;

  const windowRows = await sql`
    SELECT * FROM availability_windows WHERE tutor_id = ${tutorId} AND date = ${date}
  `;
  const fitsInWindow = windowRows.some((w) => {
    const wStart = toMinutes(String(w.start_time).slice(0, 5));
    const wEnd = toMinutes(String(w.end_time).slice(0, 5));
    return reqStart >= wStart && reqEnd <= wEnd;
  });
  if (!fitsInWindow) {
    return NextResponse.json({ error: 'not_available' }, { status: 409 });
  }

  const daySlots = await sql`
    SELECT * FROM slots WHERE tutor_id = ${tutorId} AND date = ${date}
  `;
  const overlaps = daySlots.some((s) => {
    const sStart = toMinutes(String(s.start_time).slice(0, 5));
    const sEnd = sStart + Number(s.duration_minutes);
    return reqStart < sEnd && sStart < reqEnd;
  });
  if (overlaps) {
    return NextResponse.json({ error: 'not_available' }, { status: 409 });
  }

  const inserted = await sql`
    INSERT INTO slots (tutor_id, date, start_time, duration_minutes, status, payment_status, booked_by_student_id, booked_at)
    VALUES (${tutorId}, ${date}, ${startTime}, ${durationMinutes}, 'booked', 'unpaid', ${studentId}, now())
    RETURNING *
  `;
  const slot = rowToSlot(inserted[0]);

  const [studentRows, tutorRows] = await Promise.all([
    sql`SELECT * FROM users WHERE id = ${studentId}`,
    sql`SELECT * FROM users WHERE id = ${tutorId}`,
  ]);
  const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
  const tutor = tutorRows[0] ? rowToUser(tutorRows[0]) : null;
  const studentEmail = studentRows[0]?.email as string | undefined;
  const tutorEmail = tutorRows[0]?.email as string | undefined;

  const [, mm, dd] = slot.date.split('-');
  const ddmm = `${dd}.${mm}`;

  await Promise.all([
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (${tutorId}, ${`You have an upcoming meeting with ${student?.name ?? 'a student'} at ${slot.startTime} on ${ddmm}.`}, ${slot.id})
    `,
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (${studentId}, ${`You have an upcoming meeting with ${tutor?.name ?? 'a tutor'} at ${slot.startTime} on ${ddmm}.`}, ${slot.id})
    `,
  ]);

  const payment = {
    referenceCode: referenceCodeForSlot(slot.id),
    amount: amountForSlot(slot.durationMinutes),
    currency: 'PLN',
    bankDetails: BANK_DETAILS,
  };

  await Promise.all([
    studentEmail
      ? sendEmail({
          to: studentEmail,
          subject: `Booking confirmed — ${ddmm} at ${slot.startTime}`,
          html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Booking confirmed</h2>
            <p>Hi ${student?.name ?? 'there'},</p>
            <p>Your session with <strong>${tutor?.name ?? 'your tutor'}</strong> is booked for <strong>${ddmm}</strong> at <strong>${slot.startTime}</strong> (${slot.durationMinutes} min).</p>
            <h3>Payment by bank transfer</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 4px 0; color: #666;">Account holder</td><td style="padding: 4px 0; text-align: right;">${payment.bankDetails.accountHolder}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">IBAN</td><td style="padding: 4px 0; text-align: right;">${payment.bankDetails.iban}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Bank</td><td style="padding: 4px 0; text-align: right;">${payment.bankDetails.bankName}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Amount</td><td style="padding: 4px 0; text-align: right;">${payment.amount.toFixed(2)} ${payment.currency}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Reference</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${payment.referenceCode}</td></tr>
            </table>
            <p style="color: #666; font-size: 13px;">Please include the reference code exactly as shown so we can match your transfer to this booking.</p>
          </div>`,
        })
      : Promise.resolve(),
    tutorEmail
      ? sendEmail({
          to: tutorEmail,
          subject: `New booking — ${ddmm} at ${slot.startTime}`,
          html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>New booking</h2>
            <p>Hi ${tutor?.name ?? 'there'},</p>
            <p><strong>${student?.name ?? 'A student'}</strong> booked a ${slot.durationMinutes}-minute session with you on <strong>${ddmm}</strong> at <strong>${slot.startTime}</strong>.</p>
            <p style="color: #666; font-size: 13px;">You can add a meeting link for this session from your slot list in the app.</p>
          </div>`,
        })
      : Promise.resolve(),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New booking — ${student?.name ?? 'a student'} × ${tutor?.name ?? 'a tutor'} — ${ddmm} at ${slot.startTime}`,
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New booking</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; color: #666;">Student</td><td style="padding: 4px 0; text-align: right;">${student?.name ?? 'Unknown'} (${studentEmail ?? '—'})</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Tutor</td><td style="padding: 4px 0; text-align: right;">${tutor?.name ?? 'Unknown'}</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Date</td><td style="padding: 4px 0; text-align: right;">${ddmm} at ${slot.startTime} (${slot.durationMinutes} min)</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Amount due</td><td style="padding: 4px 0; text-align: right;">${payment.amount.toFixed(2)} ${payment.currency}</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Reference code</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${payment.referenceCode}</td></tr>
        </table>
      </div>`,
    }),
  ]);

  return NextResponse.json({ slot, payment });
}
