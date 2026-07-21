import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id: slotId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { meetingUrl } = (body ?? {}) as { meetingUrl?: unknown };
  if (meetingUrl !== null && typeof meetingUrl !== 'string') {
    return NextResponse.json({ error: 'invalid_meeting_url' }, { status: 400 });
  }
  const trimmed = typeof meetingUrl === 'string' ? meetingUrl.trim() : null;
  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    return NextResponse.json({ error: 'invalid_meeting_url' }, { status: 400 });
  }

  // Only the tutor who owns this slot can set its link — enforced at the
  // database level, same pattern as the booking route's race-condition guard.
  const updated = await sql`
    UPDATE slots
    SET meeting_url = ${trimmed || null}
    WHERE id = ${slotId} AND tutor_id = ${session.user.id}
    RETURNING *
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
  }
  return NextResponse.json(rowToSlot(updated[0]));
}
