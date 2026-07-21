import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rowToSlot, rowToNotification, rowToUser } from '@/lib/db-mappers';
import { referenceCodeForSlot, amountForSlot, BANK_DETAILS } from '@/lib/payment';
import { sendEmail } from '@/lib/email';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { studentId } = (body ?? {}) as { studentId?: unknown };
  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'invalid_student_id' }, { status: 400 });
  }

  const updated = await sql`
    UPDATE slots
    SET status = 'booked', booked_by_student_id = ${studentId}, booked_at = now()
    WHERE id = ${slotId} AND status = 'free'
    RETURNING *
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
  }
  const slot = rowToSlot(updated[0]);

  const [studentRows, tutorRows] = await Promise.all([
    sql`SELECT * FROM users WHERE id = ${studentId}`,
    sql`SELECT * FROM users WHERE id = ${slot.tutorId}`,
  ]);
  const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
  const tutor = tutorRows[0] ? rowToUser(tutorRows[0]) : null;
  // Raw email addresses live on the users row but aren't part of the
  // app-level User type (rowToUser strips them), so read them off the
  // raw row instead.
  const studentEmail = studentRows[0]?.email as string | undefined;
  const tutorEmail = tutorRows[0]?.email as string | undefined;

  const [, mm, dd] = slot.date.split('-');
  const ddmm = `${dd}.${mm}`;

  const [tutorNotifRows, studentNotifRows] = await Promise.all([
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (
        ${slot.tutorId},
        ${`You have an upcoming meeting with ${student?.name ?? 'a student'} at ${slot.startTime} on ${ddmm}.`},
        ${slot.id}
      )
      RETURNING *
    `,
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (
        ${studentId},
        ${`You have an upcoming meeting with ${tutor?.name ?? 'a tutor'} at ${slot.startTime} on ${ddmm}.`},
        ${slot.id}
      )
      RETURNING *
    `,
  ]);

  const payment = {
    referenceCode: referenceCodeForSlot(slot.id),
    amount: amountForSlot(slot.durationMinutes),
    currency: 'PLN',
    bankDetails: BANK_DETAILS,
  };

  // sendEmail() never throws, so a Resend outage can't fail a booking
  // that has already succeeded above.
  await Promise.all([
    studentEmail
      ? sendEmail({
          to: studentEmail,
          subject: `Booking confirmed — ${ddmm} at ${slot.startTime}`,
          html: studentEmailHtml({
            studentName: student?.name ?? 'there',
            tutorName: tutor?.name ?? 'your tutor',
            ddmm,
            startTime: slot.startTime,
            payment,
          }),
        })
      : Promise.resolve(),
    tutorEmail
      ? sendEmail({
          to: tutorEmail,
          subject: `New booking — ${ddmm} at ${slot.startTime}`,
          html: tutorEmailHtml({
            tutorName: tutor?.name ?? 'there',
            studentName: student?.name ?? 'a student',
            ddmm,
            startTime: slot.startTime,
          }),
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    slot,
    notifications: [rowToNotification(tutorNotifRows[0]), rowToNotification(studentNotifRows[0])],
    payment,
  });
}

function studentEmailHtml(args: {
  studentName: string;
  tutorName: string;
  ddmm: string;
  startTime: string;
  payment: {
    referenceCode: string;
    amount: number;
    currency: string;
    bankDetails: { accountHolder: string; iban: string; bankName: string };
  };
}): string {
  const { studentName, tutorName, ddmm, startTime, payment } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Booking confirmed</h2>
      <p>Hi ${studentName},</p>
      <p>Your session with <strong>${tutorName}</strong> is booked for <strong>${ddmm}</strong> at <strong>${startTime}</strong>.</p>
      <h3>Payment by bank transfer</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #666;">Account holder</td><td style="padding: 4px 0; text-align: right;">${payment.bankDetails.accountHolder}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">IBAN</td><td style="padding: 4px 0; text-align: right;">${payment.bankDetails.iban}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Bank</td><td style="padding: 4px 0; text-align: right;">${payment.bankDetails.bankName}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Amount</td><td style="padding: 4px 0; text-align: right;">${payment.amount.toFixed(2)} ${payment.currency}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Reference</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${payment.referenceCode}</td></tr>
      </table>
      <p style="color: #666; font-size: 13px;">Please include the reference code exactly as shown so we can match your transfer to this booking.</p>
    </div>
  `;
}

function tutorEmailHtml(args: {
  tutorName: string;
  studentName: string;
  ddmm: string;
  startTime: string;
}): string {
  const { tutorName, studentName, ddmm, startTime } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>New booking</h2>
      <p>Hi ${tutorName},</p>
      <p><strong>${studentName}</strong> booked a session with you on <strong>${ddmm}</strong> at <strong>${startTime}</strong>.</p>
      <p style="color: #666; font-size: 13px;">You can add a meeting link for this session from your slot list in the app.</p>
    </div>
  `;
}
