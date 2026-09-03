import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { referenceCodeForBatch, amountForSlot, BANK_DETAILS, ADMIN_EMAIL } from '@/lib/payment';
import { sendEmail } from '@/lib/email';
import { isSelfOrLinkedParent } from '@/lib/parent-access';
import { redeemDiscountCode } from '@/lib/discount';
import { randomUUID } from 'crypto';

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
  const { slotIds, studentId: requestedStudentId, discountCode } = (body ?? {}) as {
    slotIds?: unknown;
    studentId?: unknown;
    discountCode?: unknown;
  };
  if (!Array.isArray(slotIds) || slotIds.length === 0 || !slotIds.every((s) => typeof s === 'string')) {
    return NextResponse.json({ error: 'invalid_slot_ids' }, { status: 400 });
  }
  if (discountCode !== undefined && discountCode !== null && typeof discountCode !== 'string') {
    return NextResponse.json({ error: 'invalid_discount_code' }, { status: 400 });
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

  const fullAmount = slots.reduce((sum, s) => sum + amountForSlot(s.durationMinutes, s.subject), 0);

  // Unlike single-session booking, the batch doesn't exist yet, so a bad
  // code is rejected upfront rather than applied best-effort afterward.
  let finalAmount = fullAmount;
  let appliedCode: string | null = null;
  if (typeof discountCode === 'string' && discountCode.trim().length > 0) {
    const result = await redeemDiscountCode(discountCode, studentId, fullAmount, 'batch');
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: 'discount_code_not_found',
        already_redeemed: 'discount_code_already_used',
        wrong_type: 'discount_code_not_valid_for_batches',
      };
      return NextResponse.json({ error: messages[result.error] }, { status: 400 });
    }
    finalAmount = result.discountedAmount;
    appliedCode = result.code;
  }

  const batchId = randomUUID();
  const referenceCode = referenceCodeForBatch(batchId);

  await sql`
    INSERT INTO payment_batches (id, reference_code, amount, currency, status, student_id, discount_code)
    VALUES (${batchId}, ${referenceCode}, ${finalAmount}, 'PLN', 'unpaid', ${studentId}, ${appliedCode})
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
    amount: finalAmount,
    currency: 'PLN',
    bankDetails: BANK_DETAILS,
  };

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
          ${appliedCode ? `<p style="color: #16B8A7;">Discount code <strong>${appliedCode}</strong> applied!</p>` : ''}
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; color: #666;">Account holder</td><td style="padding: 4px 0; text-align: right;">${BANK_DETAILS.accountHolder}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">IBAN</td><td style="padding: 4px 0; text-align: right;">${BANK_DETAILS.iban}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Bank</td><td style="padding: 4px 0; text-align: right;">${BANK_DETAILS.bankName}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Amount</td><td style="padding: 4px 0; text-align: right;">${finalAmount.toFixed(2)} PLN</td></tr>
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
          ${appliedCode ? `<tr><td style="padding: 4px 0; color: #666;">Discount code</td><td style="padding: 4px 0; text-align: right;">${appliedCode}</td></tr>` : ''}
          <tr><td style="padding: 4px 0; color: #666;">Amount due</td><td style="padding: 4px 0; text-align: right;">${finalAmount.toFixed(2)} PLN</td></tr>
          <tr><td style="padding: 4px 0; color: #666;">Reference code</td><td style="padding: 4px 0; text-align: right; font-weight: bold;">${referenceCode}</td></tr>
        </table>
        <p style="color: #666; font-size: 13px;">Confirming this batch's payment should mark all ${slots.length} sessions as paid.</p>
      </div>
    `,
  }).catch((err) => console.error('Failed to send admin batch notification:', err));

  return NextResponse.json({ batchId, payment, slotIds }, { status: 201 });
}
