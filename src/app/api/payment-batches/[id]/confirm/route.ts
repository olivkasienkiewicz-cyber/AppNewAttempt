import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

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
    RETURNING id
  `;

  return NextResponse.json({ ok: true, updatedSlotIds: slotRows.map((r) => r.id) });
}
