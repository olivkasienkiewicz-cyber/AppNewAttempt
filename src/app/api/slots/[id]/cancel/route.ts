import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { isSelfOrLinkedParent } from '@/lib/parent-access';
import { notifyLinkedParent } from '@/lib/parent-notify';

export const dynamic = 'force-dynamic';

// Either the tutor who owns the slot, the student who booked it, or that
// student's linked parent can cancel. This does not enforce the 24-hour
// policy — it's informational, shown as a warning client-side before this
// endpoint is even called.
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
  const isAuthorizedStudentSide =
    slot.bookedByStudentId !== null &&
    (await isSelfOrLinkedParent(session.user.id, slot.bookedByStudentId));
  if (!isTutor && !isAuthorizedStudentSide) {
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

  if (slot.bookedByStudentId) {
    const [studentRows, tutorRows] = await Promise.all([
      sql`SELECT * FROM users WHERE id = ${slot.bookedByStudentId}`,
      sql`SELECT * FROM users WHERE id = ${slot.tutorId}`,
    ]);
    const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
    const tutor = tutorRows[0] ? rowToUser(tutorRows[0]) : null;
    await notifyLinkedParent(
      slot.bookedByStudentId,
      `Session cancelled — ${slot.date} at ${slot.startTime}`,
      parentCancelEmailHtml({
        studentName: student?.name ?? 'your child',
        tutorName: tutor?.name ?? 'the tutor',
        date: slot.date,
        startTime: slot.startTime,
      })
    );
  }

  return NextResponse.json(rowToSlot(updatedRows[0]));
}

function parentCancelEmailHtml(args: {
  studentName: string;
  tutorName: string;
  date: string;
  startTime: string;
}): string {
  const { studentName, tutorName, date, startTime } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Session cancelled</h2>
      <p>The session for <strong>${studentName}</strong> with <strong>${tutorName}</strong> on <strong>${date}</strong> at <strong>${startTime}</strong> has been cancelled.</p>
    </div>
  `;
}
