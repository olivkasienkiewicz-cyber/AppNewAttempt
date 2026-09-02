import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { referenceCodeForBatch, amountForSlot, BANK_DETAILS, ADMIN_EMAIL } from '@/lib/payment';
import { sendEmail } from '@/lib/email';
import { isSelfOrLinkedParent } from '@/lib/parent-access';
import { randomUUID } from 'crypto';

// Lets the signed-in student — or that student's linked parent — bundle
// several of the student's own unpaid, unbatched slots into a single
// payment batch: one reference code and one amount covering all of them.
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
  const { slotIds, studentId: requestedStudentId } = (body ?? {}) as { slotIds?: unknown; studentId?: unknown };
  if (!Array.isArray(slotIds) || slotIds.length === 0 || !slotIds.every((s) => typeof s === 'string')) {
    return NextResponse.json({ error: 'invalid_slot_ids' }, { status: 400 });
  }
  const studentId = typeof requestedStudentId === 'string' && requestedStudentId ? requestedStudentId : session.user.id;

  if (!(await isSelfOrLinkedParent(session.user.id, studentId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rows = await sql`
    SELECT * FROM slots
    WHERE id = ANY(${slotIds})
      AND booked_by_student_id = ${studentId}
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
    VALUES (${batchId}, ${referenceCode}, ${amount}, 'PLN', 'unpaid', ${studentId})
  `;
  await sql`
    UPDATE slots SET payment_batch_id = ${batchId}
    WHERE id = ANY(${slotIds})
  `;

  const [studentRow] = await sql`SELECT * FROM users WHERE id = ${studentId}`;
  const student = studentRow ? rowToUser(studentRow) : null;
  const studentEmail = studentRow?.email as string | undefined;

  const payment = {
    referenceCode,
    amount,
    currency: 'PLN',
    bankDetails: BANK_DETAILS,
  };

  // Payment info goes to whichever email is appropriate: the linked
  // parent if there is one, otherwise the student themselves.
  let payerEmail = studentEmail;
  if (student?.parentId) {
    const [parentRow] = await sql`SELECT * FROM users WHERE id = ${student.parentId}`;
    payerEmail = (parentRow?.email as string | undefined) ?? studentEmail;
  }

  if (payerEmail) {
    await sendEmail({
      to: payerEmail,
      subject: `Payment for ${slots.length} sessions — Studilly`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Payment for ${slots.length} session${slots.length === 1 ? '' : 's'}</h2>
          <p>This transfer covers ${slots.length} session${slots.length === 1 ? '' : 's'} for ${student?.name ?? 'the student'}.</p>
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
