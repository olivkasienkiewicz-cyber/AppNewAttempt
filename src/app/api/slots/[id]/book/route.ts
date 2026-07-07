import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rowToSlot, rowToNotification, rowToUser } from '@/lib/db-mappers';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { studentId } = (body ?? {}) as { studentId?: unknown };
  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'invalid_student_id' }, { status: 400 });
  }

  // Atomic race-condition guard: this single UPDATE only succeeds for
  // whichever request gets there first, because the WHERE clause re-checks
  // status='free' at the database row level. If two students tap "confirm"
  // on the same slot at the same instant, Postgres serializes the two
  // UPDATEs; the second one matches zero rows and gets slot_taken.
  const updated = await sql`
    UPDATE slots
    SET status = 'booked', booked_by_student_id = ${studentId}, booked_at = now()
    WHERE id = ${slotId} AND status = 'free'
    RETURNING *
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
  }

  const slot = rowToSlot(updated[0]);

  const [studentRows, tutorRows] = await Promise.all([
    sql`SELECT * FROM users WHERE id = ${studentId}`,
    sql`SELECT * FROM users WHERE id = ${slot.tutorId}`,
  ]);
  const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
  const tutor = tutorRows[0] ? rowToUser(tutorRows[0]) : null;

  // Per A3.6: same phrasing for both roles, DD.MM date format.
  const [, mm, dd] = slot.date.split('-');
  const ddmm = `${dd}.${mm}`;

  const [tutorNotifRows, studentNotifRows] = await Promise.all([
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (
        ${slot.tutorId},
        ${`You have an upcoming meeting with ${student?.name ?? 'a student'} at ${slot.startTime} on ${ddmm}.`},
        ${slot.id}
      )
      RETURNING *
    `,
    sql`
      INSERT INTO notifications (recipient_user_id, message, related_slot_id)
      VALUES (
        ${studentId},
        ${`You have an upcoming meeting with ${tutor?.name ?? 'a tutor'} at ${slot.startTime} on ${ddmm}.`},
        ${slot.id}
      )
      RETURNING *
    `,
  ]);

  return NextResponse.json({
    slot,
    notifications: [rowToNotification(tutorNotifRows[0]), rowToNotification(studentNotifRows[0])],
  });
}
