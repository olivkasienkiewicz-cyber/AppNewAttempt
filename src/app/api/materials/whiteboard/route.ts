import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { isSelfOrLinkedParent } from '@/lib/parent-access';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const tutorId = searchParams.get('tutorId');
  const studentId = searchParams.get('studentId');
  if (!tutorId || !studentId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }
  const isTutor = session.user.id === tutorId;
  if (!isTutor && !(await isSelfOrLinkedParent(session.user.id, studentId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rows = await sql`
    SELECT whiteboard_url FROM tutor_student_whiteboards
    WHERE tutor_id = ${tutorId} AND student_id = ${studentId}
  `;
  return NextResponse.json({ whiteboardUrl: (rows[0]?.whiteboard_url as string | null) ?? null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const [me] = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
  if (!me || me.role !== 'tutor') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { studentId, whiteboardUrl } = (body ?? {}) as { studentId?: unknown; whiteboardUrl?: unknown };
  if (typeof studentId !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (whiteboardUrl !== null && typeof whiteboardUrl !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  await sql`
    INSERT INTO tutor_student_whiteboards (tutor_id, student_id, whiteboard_url, updated_at)
    VALUES (${session.user.id}, ${studentId}, ${whiteboardUrl}, now())
    ON CONFLICT (tutor_id, student_id)
    DO UPDATE SET whiteboard_url = ${whiteboardUrl}, updated_at = now()
  `;
  return NextResponse.json({ ok: true });
}
