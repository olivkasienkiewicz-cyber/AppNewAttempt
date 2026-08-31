import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') === 'all_future' ? 'all_future' : 'only';

  if (scope === 'only') {
    // Ownership is enforced at the query level — you can only delete your
    // own free slots, never someone else's, regardless of what id you know.
    const rows = await sql`
      DELETE FROM slots
      WHERE id = ${id} AND status = 'free' AND tutor_id = ${session.user.id}
      RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'not_deletable' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, deletedIds: rows.map((r) => r.id) });
  }

  // scope === 'all_future': delete this occurrence plus every other free
  // occurrence in the same recurrence series dated on or after it. If the
  // target slot has no recurrence_id (a one-off), this falls back to
  // deleting just that one row via the `id = ${id}` clause.
  const rows = await sql`
    WITH target AS (
      SELECT recurrence_id, date FROM slots
      WHERE id = ${id} AND tutor_id = ${session.user.id}
    )
    DELETE FROM slots
    WHERE tutor_id = ${session.user.id}
      AND status = 'free'
      AND date >= (SELECT date FROM target)
      AND (
        (recurrence_id IS NOT NULL AND recurrence_id = (SELECT recurrence_id FROM target))
        OR id = ${id}
      )
    RETURNING id
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_deletable' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, deletedIds: rows.map((r) => r.id) });
}
