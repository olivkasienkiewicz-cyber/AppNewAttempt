import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await context.params;

  // Ownership is now enforced at the query level — you can only delete your
  // own free slots, never someone else's, regardless of what id you know.
  const rows = await sql`
    DELETE FROM slots
    WHERE id = ${id} AND status = 'free' AND tutor_id = ${session.user.id}
    RETURNING id
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_deletable' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
