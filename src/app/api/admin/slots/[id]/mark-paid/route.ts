import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

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

  return NextResponse.json({ slot: updated[0] });
}
