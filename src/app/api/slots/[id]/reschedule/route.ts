import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';
import { isSelfOrLinkedParent } from '@/lib/parent-access';

export const dynamic = 'force-dynamic';

// Moves an existing booking from one slot to another of the SAME tutor's
// other free slots. Frees the old slot and books the new one, carrying
// over payment status. The tutor, the booking student, or that student's
// linked parent can do this.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { newSlotId } = (body ?? {}) as { newSlotId?: unknown };
  if (typeof newSlotId !== 'string' || newSlotId.length === 0) {
    return NextResponse.json({ error: 'invalid_new_slot' }, { status: 400 });
  }

  const oldRows = await sql`SELECT * FROM slots WHERE id = ${id}`;
  if (oldRows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const oldSlot = rowToSlot(oldRows[0]);

  const isTutor = oldSlot.tutorId === session.user.id;
  const isAuthorizedStudentSide =
    oldSlot.bookedByStudentId !== null &&
    (await isSelfOrLinkedParent(session.user.id, oldSlot.bookedByStudentId));
  if (!isTutor && !isAuthorizedStudentSide) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (oldSlot.status !== 'booked' || !oldSlot.bookedByStudentId) {
    return NextResponse.json({ error: 'not_booked' }, { status: 400 });
  }

  const newRows = await sql`SELECT * FROM slots WHERE id = ${newSlotId}`;
  if (newRows.length === 0) {
    return NextResponse.json({ error: 'new_slot_not_found' }, { status: 404 });
  }
  const newSlot = rowToSlot(newRows[0]);

  if (newSlot.tutorId !== oldSlot.tutorId) {
    return NextResponse.json({ error: 'different_tutor' }, { status: 400 });
  }
  if (newSlot.status !== 'free') {
    return NextResponse.json({ error: 'new_slot_taken' }, { status: 409 });
  }

  const studentId = oldSlot.bookedByStudentId;

  const updatedNewRows = await sql`
    UPDATE slots
    SET status = 'booked', payment_status = ${oldSlot.paymentStatus}, booked_by_student_id = ${studentId}, booked_at = now()
    WHERE id = ${newSlotId} AND status = 'free'
    RETURNING *
  `;
  if (updatedNewRows.length === 0) {
    return NextResponse.json({ error: 'new_slot_taken' }, { status: 409 });
  }

  await sql`
    UPDATE slots
    SET status = 'free', payment_status = 'unpaid', booked_by_student_id = NULL, booked_at = NULL
    WHERE id = ${id}
  `;

  const otherPartyId = isTutor ? studentId : oldSlot.tutorId;
  const who = isTutor ? 'Your tutor' : 'Your student';
  const message = `${who} moved your session from ${oldSlot.date} ${oldSlot.startTime} to ${newSlot.date} ${newSlot.startTime}.`;
  await sql`
    INSERT INTO notifications (recipient_user_id, message, related_slot_id)
    VALUES (${otherPartyId}, ${message}, ${newSlotId})
  `;

  return NextResponse.json(rowToSlot(updatedNewRows[0]));
}
