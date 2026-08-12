import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';

export const dynamic = 'force-dynamic';

// Either the tutor who owns the slot or the student who booked it can
// cancel. This does not enforce the 24-hour policy — it's informational,
// shown as a warning client-side before this endpoint is even called.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await params;

  const rows = await sql`SELECT * FROM slots WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const slot = rowToSlot(rows[0]);

  const isTutor = slot.tutorId === session.user.id;
  const isBookingStudent = slot.bookedByStudentId === session.user.id;
  if (!isTutor && !isBookingStudent) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (slot.status !== 'booked') {
    return NextResponse.json({ error: 'not_booked' }, { status: 400 });
  }

  const updatedRows = await sql`
    UPDATE slots
    SET status = 'free', payment_status = 'unpaid', booked_by_student_id = NULL, booked_at = NULL
    WHERE id = ${id}
    RETURNING *
  `;

  const otherPartyId = isTutor ? slot.bookedByStudentId : slot.tutorId;
  if (otherPartyId) {
    const who = isTutor ? 'Your tutor' : 'Your student';
    const message = `${who} cancelled the session on ${slot.date} at ${slot.startTime}.`;
    await sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (${otherPartyId}, ${message}, ${id})
    `;
  }

  return NextResponse.json(rowToSlot(updatedRows[0]));
}
