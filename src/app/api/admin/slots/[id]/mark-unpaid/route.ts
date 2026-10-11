import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

export const dynamic = 'force-dynamic';

// Admin-only: sets a class back to unpaid. Used after refunding/crediting a
// class the student shouldn't pay for, or to undo a mistaken "Mark paid".
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  const updated = await sql`
    UPDATE slots
    SET payment_status = 'unpaid'
    WHERE id = ${id}
    RETURNING id, payment_status
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ slot: updated[0] });
}
