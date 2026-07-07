import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const rows = await sql`
    DELETE FROM slots
    WHERE id = ${id} AND status = 'free'
    RETURNING id
  `;

  if (rows.length === 0) {
    // Either it never existed, or it's booked (mirrors the old UI rule that
    // a booked slot can't be deleted — the availability page also blocks
    // this client-side, this is the server-side backstop).
    return NextResponse.json({ error: 'not_deletable' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
