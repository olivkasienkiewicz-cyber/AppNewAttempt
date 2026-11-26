import { sql } from '@/lib/db';
import { rowToUser, rowToNotification } from '@/lib/db-mappers';
import { referenceCodeForSlot, amountForSlot, BANK_DETAILS, ADMIN_EMAIL } from '@/lib/payment';
import { sendEmail } from '@/lib/email';
import { redeemDiscountCode } from '@/lib/discount';
import { notifyLinkedParent } from '@/lib/parent-notify';
import type { Slot } from '@/lib/store';

// Everything that happens AFTER a slot has been marked as booked for a
// student: price + optional discount code, in-app notifications for the
// tutor and the student, and the confirmation emails (student with bank
// details, tutor, and admin). Shared by the student self-booking route and
// the admin "Book a session" route so both produce identical results.
export async function completeBooking(args: {
  slot: Slot;
  studentId: string;
  discountCode?: string | null;
}) {
  const { slot, studentId, discountCode } = args;
  const slotId = slot.id;

  // Discount is applied AFTER the booking succeeds, so a bad or already-
  // used code never blocks the booking itself — the student just doesn't
  // get the discount if it doesn't work out.
  const fullAmount = amountForSlot(slot.durationMinutes, slot.subject);
  let finalAmount = fullAmount;
  let appliedCode: string | null = null;
  let discountError: string | null = null;

  if (typeof discountCode === 'string' && discountCode.trim().length > 0) {
    const result = await redeemDiscountCode(discountCode, studentId, fullAmount, 'single', slot.durationMinutes, slot.subject);
    if (result.ok) {
      finalAmount = result.discountedAmount;
      appliedCode = result.code;
    } else {
      discountError = result.error;
    }
  }

  await sql`
    UPDATE slots SET amount = ${finalAmount}, discount_code = ${appliedCode}
    WHERE id = ${slotId}
  `;

  const [studentRows, tutorRows] = await Promise.all([
    sql`SELECT * FROM users WHERE id = ${studentId}`,
    sql`SELECT * FROM users WHERE id = ${slot.tutorId}`,
  ]);
  const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
  const tutor = tutorRows[0] ? rowToUser(tutorRows[0]) : null;
  const studentEmail = studentRows[0]?.email as string | undefined;
  const tutorEmail = tutorRows[0]?.email as string | undefined;

  const [, mm, dd] = slot.date.split('-');
  const ddmm = `${dd}.${mm}`;
  const subjectSuffix = slot.subject ? ` (${slot.subject})` : '';

  const [tutorNotifRows, studentNotifRows] = await Promise.all([
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (
        ${slot.tutorId},
        ${`You have an upcoming meeting with ${student?.name ?? 'a student'} at ${slot.startTime} on ${ddmm}${subjectSuffix}.`},
        ${slot.id}
      )
      RETURNING *
    `,
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (
        ${studentId},
        ${`You have an upcoming meeting with ${tutor?.name ?? 'a tutor'} at ${slot.startTime} on ${ddmm}${subjectSuffix}.`},
        ${slot.id}
      )
      RETURNING *
    `,
  ]);

  const payment = {
    referenceCode: referenceCodeForSlot(slot.id),
    amount: finalAmount,
    currency: 'PLN',
    bankDetails: BANK_DETAILS,
    discountApplied: appliedCode !== null,
    discountCode: appliedCode,
  };

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
            sessionSubject: slot.subject,
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
            sessionSubject: slot.subject,
          }),
        })
      : Promise.resolve(),
    // A linked parent gets the same confirmation (with bank details), since
    // they're usually the one paying. No-op if the student has no parent.
    notifyLinkedParent(
      studentId,
      `Booking confirmed for ${student?.name ?? 'your child'} — ${ddmm} at ${slot.startTime}`,
      parentBookingEmailHtml({
        studentName: student?.name ?? 'your child',
        tutorName: tutor?.name ?? 'the tutor',
        ddmm,
        startTime: slot.startTime,
        sessionSubject: slot.subject,
        payment,
      }),
    ).catch((err) => console.error('Failed to email linked parent about booking:', err)),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New booking — ${student?.name ?? 'a student'} × ${tutor?.name ?? 'a tutor'} — ${ddmm} at ${slot.startTime}`,
      html: adminEmailHtml({
        studentName: student?.name ?? 'Unknown student',
        studentEmail: studentEmail ?? '—',
        tutorName: tutor?.name ?? 'Unknown tutor',
        ddmm,
        startTime: slot.startTime,
        sessionSubject: slot.subject,
        payment,
      }),
    }),
  ]);

  return {
    notifications: [rowToNotification(tutorNotifRows[0]), rowToNotification(studentNotifRows[0])],
    payment,
    discountError,
  };
}

function studentEmailHtml(args: {
  studentName: string;
  tutorName: string;
  ddmm: string;
  startTime: string;
  sessionSubject: string | null;
  payment: {
    referenceCode: string;
    amount: number;
    currency: string;
    bankDetails: { accountHolder: string; iban: string; bankName: string };
    discountApplied: boolean;
    discountCode: string | null;
  };
}): string {
  const { studentName, tutorName, ddmm, startTime, sessionSubject, payment } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Booking confirmed</h2>
      <p>Hi ${studentName},</p>
      <p>Your session with <strong>${tutorName}</strong> is booked for <strong>${ddmm}</strong> at <strong>${startTime}</strong>${sessionSubject ? ` — <strong>${sessionSubject}</strong>` : ''}.</p>
      ${payment.discountApplied ? `<p style="color: #16B8A7;">Discount code <strong>${payment.discountCode}</strong> applied!</p>` : ''}
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

export function parentBookingEmailHtml(args: {
  studentName: string;
  tutorName: string;
  ddmm: string;
  startTime: string;
  sessionSubject: string | null;
  payment: {
    referenceCode: string;
    amount: number;
    currency: string;
    bankDetails: { accountHolder: string; iban: string; bankName: string };
    discountApplied: boolean;
    discountCode: string | null;
  };
}): string {
  const { studentName, tutorName, ddmm, startTime, sessionSubject, payment } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Booking confirmed</h2>
      <p>Hello,</p>
      <p><strong>${studentName}</strong>'s session with <strong>${tutorName}</strong> is booked for <strong>${ddmm}</strong> at <strong>${startTime}</strong>${sessionSubject ? ` — <strong>${sessionSubject}</strong>` : ''}.</p>
      ${payment.discountApplied ? `<p style="color: #16B8A7;">Discount code <strong>${payment.discountCode}</strong> applied!</p>` : ''}
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
  sessionSubject: string | null;
}): string {
  const { tutorName, studentName, ddmm, startTime, sessionSubject } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>New booking</h2>
      <p>Hi ${tutorName},</p>
      <p><strong>${studentName}</strong> booked a session with you on <strong>${ddmm}</strong> at <strong>${startTime}</strong>${sessionSubject ? ` — <strong>${sessionSubject}</strong>` : ''}.</p>
      <p style="color: #666; font-size: 13px;">You can add a meeting link for this session from your slot list in the app.</p>
    </div>
  `;
}

function adminEmailHtml(args: {
  studentName: string;
  studentEmail: string;
  tutorName: string;
  ddmm: string;
  startTime: string;
  sessionSubject: string | null;
  payment: {
    referenceCode: string;
    amount: number;
    currency: string;
    bankDetails: { accountHolder: string; iban: string; bankName: string };
    discountApplied: boolean;
    discountCode: string | null;
  };
}): string {
  const { studentName, studentEmail, tutorName, ddmm, startTime, sessionSubject, payment } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>New booking</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #666;">Student</td><td style="padding: 4px 0; text-align: right;">${studentName} (${studentEmail})</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Tutor</td><td style="padding: 4px 0; text-align: right;">${tutorName}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Subject</td><td style="padding: 4px 0; text-align: right;">${sessionSubject ?? '—'}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Date</td><td style="padding: 4px 0; text-align: right;">${ddmm} at ${startTime}</td></tr>
        ${payment.discountApplied ? `<tr><td style="padding: 4px 0; color: #666;">Discount code</td><td style="padding: 4px 0; text-align: right;">${payment.discountCode}</td></tr>` : ''}
        <tr><td style="padding: 4px 0; color: #666;">Amount due</td><td style="padding: 4px 0; text-align: right;">${payment.amount.toFixed(2)} ${payment.currency}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Reference code</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${payment.referenceCode}</td></tr>
      </table>
      <p style="color: #666; font-size: 13px;">Watch for a transfer matching this reference code, then confirm payment in the admin bookings page.</p>
    </div>
  `;
}
