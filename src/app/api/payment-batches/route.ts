import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { referenceCodeForBatch, amountForSlot, BANK_DETAILS, ADMIN_EMAIL } from '@/lib/payment';
import { sendEmail } from '@/lib/email';
import { randomUUID } from 'crypto';

// Lets the signed-in student bundle several of their own unpaid, unbatched
// slots into a single payment batch — one reference code and one amount
// covering all of them, for parents who'd rather send one transfer than
// several. Slots not yet in a batch keep paying individually as before.
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
  const { slotIds } = (body ?? {}) as { slotIds?: unknown };
  if (!Array.isArray(slotIds) || slotIds.length === 0 || !slotIds.every((s) => typeof s === 'string')) {
    return NextResponse.json({ error: 'invalid_slot_ids' }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM slots
    WHERE id = ANY(${slotIds})
      AND booked_by_student_id = ${session.user.id}
      AND payment_status = 'unpaid'
      AND payment_batch_id IS NULL
  `;
  if (rows.length !== slotIds.length) {
    return NextResponse.json({ error: 'slots_not_eligible' }, { status: 409 });
  }
  const slots = rows.map(rowToSlot);

  const amount = slots.reduce((sum, s) => sum + amountForSlot(s.durationMinutes, s.subject), 0);
  const batchId = randomUUID();
  const referenceCode = referenceCodeForBatch(batchId);

  await sql`
    INSERT INTO payment_batches (id, reference_code, amount, currency, status, student_id)
    VALUES (${batchId}, ${referenceCode}, ${amount}, 'PLN', 'unpaid', ${session.user.id})
  `;
  await sql`
    UPDATE slots SET payment_batch_id = ${batchId}
    WHERE id = ANY(${slotIds})
  `;

  const [studentRow] = await sql`SELECT * FROM users WHERE id = ${session.user.id}`;
  const student = studentRow ? rowToUser(studentRow) : null;
  const studentEmail = studentRow?.email as string | undefined;

  const payment = {
    referenceCode,
    amount,
    currency: 'PLN',
    bankDetails: BANK_DETAILS,
  };

  if (studentEmail) {
    await sendEmail({
      to: studentEmail,
      subject: `Payment for ${slots.length} sessions — Studilly`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Payment for ${slots.length} session${slots.length === 1 ? '' : 's'}</h2>
          <p>Hi ${student?.name ?? 'there'},</p>
          <p>This transfer covers ${slots.length} session${slots.length === 1 ? '' : 's'}.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; color: #666;">Account holder</td><td style="padding: 4px 0; text-align: right;">${BANK_DETAILS.accountHolder}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">IBAN</td><td style="padding: 4px 0; text-align: right;">${BANK_DETAILS.iban}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Bank</td><td style="padding: 4px 0; text-align: right;">${BANK_DETAILS.bankName}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Amount</td><td style="padding: 4px 0; text-align: right;">${amount.toFixed(2)} PLN</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Reference</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${referenceCode}</td></tr>
          </table>
          <p style="color: #666; font-size: 13px;">Please include the reference code exactly as shown so we can match your transfer to these sessions.</p>
        </div>
      `,
    }).catch((err) => console.error('Failed to send batch payment email:', err));
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New payment batch — ${student?.name ?? 'a student'} — ${slots.length} sessions`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New payment batch</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; color: #666;">Student</td><td style="padding: 4px 0; text-align: right;">${student?.name ?? 'Unknown'} (${studentEmail ?? '—'})</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Sessions</td><td style="padding: 4px 0; text-align: right;">${slots.length}</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Amount due</td><td style="padding: 4px 0; text-align: right;">${amount.toFixed(2)} PLN</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Reference code</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${referenceCode}</td></tr>
        </table>
        <p style="color: #666; font-size: 13px;">Confirming this batch's payment should mark all ${slots.length} sessions as paid.</p>
      </div>
    `,
  }).catch((err) => console.error('Failed to send admin batch notification:', err));

  return NextResponse.json({ batchId, payment, slotIds }, { status: 201 });
}
