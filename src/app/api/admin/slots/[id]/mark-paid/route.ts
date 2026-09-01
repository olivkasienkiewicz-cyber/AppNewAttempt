import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import { ADMIN_EMAIL } from '@/lib/payment';
import { notifyLinkedParent } from '@/lib/parent-notify';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  const updated = await sql`
    UPDATE slots
    SET payment_status = 'paid'
    WHERE id = ${id}
    RETURNING *
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const studentId = updated[0].booked_by_student_id as string | null;
  if (studentId) {
    const studentRows = await sql`SELECT * FROM users WHERE id = ${studentId}`;
    const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
    await notifyLinkedParent(
      studentId,
      `Payment received for ${student?.name ?? 'your child'}`,
      `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Payment received</h2>
        <p>We've confirmed payment for <strong>${student?.name ?? 'your child'}</strong>'s session. Thank you!</p>
      </div>`
    );
  }

  return NextResponse.json({ slot: updated[0] });
}
