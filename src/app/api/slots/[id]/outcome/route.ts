import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';
import { isValidOutcomeStatus } from '@/lib/slot-outcome';

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
  const { outcomeStatus } = (body ?? {}) as { outcomeStatus?: unknown };
  if (typeof outcomeStatus !== 'string' || !isValidOutcomeStatus(outcomeStatus)) {
    return NextResponse.json({ error: 'invalid_outcome_status' }, { status: 400 });
  }

  // Only the tutor who owns this slot, and only once it has actually ended —
  // both enforced in the WHERE clause, same pattern as the meeting-link route.
  const updated = await sql`
    UPDATE slots
    SET outcome_status = ${outcomeStatus},
        outcome_set_by = 'tutor',
        outcome_set_at = now()
    WHERE id = ${slotId}
      AND tutor_id = ${session.user.id}
      AND (date + start_time::time + (duration_minutes || ' minutes')::interval) < now()
    RETURNING *
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found_forbidden_or_not_ended' }, { status: 404 });
  }
  return NextResponse.json(rowToSlot(updated[0]));
}
