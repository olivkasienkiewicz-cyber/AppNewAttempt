import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await req.json();
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const level = typeof body.level === 'string' && body.level.trim() ? body.level.trim() : null;
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  if (!subject) {
    return NextResponse.json({ error: 'subject_required' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO subject_requests (user_id, subject, level, note)
      VALUES (${session.user.id}, ${subject}, ${level}, ${note})
      RETURNING id
    `;
    return NextResponse.json({ id: row.id });
  } catch (err: unknown) {
    // Unique index violation = duplicate active request from this user.
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    }
    throw err;
  }
}
