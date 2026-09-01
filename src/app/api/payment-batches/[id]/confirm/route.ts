import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import { ADMIN_EMAIL } from '@/lib/payment';
import { notifyLinkedParent } from '@/lib/parent-notify';

// Confirms a payment batch as paid, marking every slot in it paid at the
// same time. Restricted to the admin account, matching how individual
// slot payments are already confirmed by hand.
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id: batchId } = await context.params;

  const batchRows = await sql`
    UPDATE payment_batches SET status = 'paid' WHERE id = ${batchId} AND status = 'unpaid'
    RETURNING id
  `;
  if (batchRows.length === 0) {
    return NextResponse.json({ error: 'not_confirmable' }, { status: 409 });
  }

  const slotRows = await sql`
    UPDATE slots SET payment_status = 'paid' WHERE payment_batch_id = ${batchId}
    RETURNING id, booked_by_student_id
  `;

  // Notify each affected student's linked parent (if any). A batch can
  // span multiple slots for the same student, so dedupe first.
  const studentIds = Array.from(
    new Set(slotRows.map((r) => r.booked_by_student_id as string | null).filter((id): id is string => !!id))
  );
  await Promise.all(
    studentIds.map(async (studentId) => {
      const studentRows = await sql`SELECT * FROM users WHERE id = ${studentId}`;
      const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
      await notifyLinkedParent(
        studentId,
        `Payment received for ${student?.name ?? 'your child'}`,
        parentPaymentEmailHtml({ studentName: student?.name ?? 'your child' })
      );
    })
  );

  return NextResponse.json({ ok: true, updatedSlotIds: slotRows.map((r) => r.id) });
}

function parentPaymentEmailHtml(args: { studentName: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Payment received</h2>
      <p>We've confirmed payment for <strong>${args.studentName}</strong>'s session(s). Thank you!</p>
    </div>
  `;
}
