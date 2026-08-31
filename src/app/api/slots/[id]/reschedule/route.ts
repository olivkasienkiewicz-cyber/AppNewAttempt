import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';

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
  const isBookingStudent = oldSlot.bookedByStudentId === session.user.id;
  let isLinkedParent = false;
  if (!isTutor && !isBookingStudent && oldSlot.bookedByStudentId) {
    const [actorRows, studentRows] = await Prom
