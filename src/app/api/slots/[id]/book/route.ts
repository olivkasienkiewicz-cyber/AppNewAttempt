import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { isSelfOrLinkedParent } from '@/lib/parent-access';
import { completeBooking } from '@/lib/booking-complete';

function labelsForUser(user: { subjects: { subject: string; detail: string | null }[] }): string[] {
  return user.subjects.map((ts) => {
    if (ts.subject === 'Other' && ts.detail) return ts.detail;
    if (ts.subject === 'Egzamin ósmoklasisty' && ts.detail) return `Egzamin ósmoklasisty – ${ts.detail}`;
    return ts.subject;
  });
}

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
  const { studentId, subject, discountCode } = (body ?? {}) as {
    studentId?: unknown;
    subject?: unknown;
    discountCode?: unknown;
  };
  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'invalid_student_id' }, { status: 400 });
  }
  if (subject !== undefined && subject !== null && typeof subject !== 'string') {
    return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
  }
  if (discountCode !== undefined && discountCode !== null && typeof discountCode !== 'string') {
    return NextResponse.json({ error: 'invalid_discount_code' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!(await isSelfOrLinkedParent(session.user.id, studentId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const preRows = await sql`SELECT tutor_id FROM slots WHERE id = ${slotId}`;
  let normalizedSubject: string | null = null;
  if (preRows.length > 0 && typeof subject === 'string' && subject.trim().length > 0) {
    const tutorRows = await sql`SELECT * FROM users WHERE id = ${preRows[0].tutor_id}`;
    if (tutorRows[0]) {
      const tutorUser = rowToUser(tutorRows[0]);
      if (labelsForUser(tutorUser).includes(subject.trim())) {
        normalizedSubject = subject.trim();
      }
    }
  }

  const updated = await sql`
    UPDATE slots
    SET status = 'booked', booked_by_student_id = ${studentId}, booked_at = now(), subject = ${normalizedSubject}
    WHERE id = ${slotId} AND status = 'free'
    RETURNING *
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
  }
  const slot = rowToSlot(updated[0]);

  const { notifications, payment, discountError } = await completeBooking({
    slot,
    studentId,
    discountCode: typeof discountCode === 'string' ? discountCode : null,
  });

  return NextResponse.json({
    slot,
    notifications,
    payment,
    discountError,
  });
}
