import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { token } = await params;
  const rows = await sql`SELECT * FROM account_links WHERE token = ${token}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const link = rows[0];
  if (link.confirmed_at !== null) {
    return NextResponse.json({ error: 'already_confirmed' }, { status: 400 });
  }
  if (new Date(link.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }
  if (session.user.email.trim().toLowerCase() !== (link.invitee_email as string).trim().toLowerCase()) {
    return NextResponse.json({ error: 'wrong_account' }, { status: 403 });
  }
  const meRows = await sql`SELECT * FROM users WHERE id = ${session.user.id}`;
  const myRole = meRows[0]?.role as string | null;
  const direction = link.direction as 'student_invites_parent' | 'parent_invites_student';
  if (direction === 'student_invites_parent') {
    // I'm becoming (or already am) the parent.
    if (myRole === 'tutor' || myRole === 'admin' || myRole === 'student') {
      return NextResponse.json({ error: 'role_conflict' }, { status: 400 });
    }
    const studentCheck = await sql`SELECT parent_id FROM users WHERE id = ${link.initiator_id}`;
    if (studentCheck[0]?.parent_id) {
      return NextResponse.json({ error: 'already_linked' }, { status: 400 });
    }
    await sql`UPDATE users SET role = 'parent' WHERE id = ${session.user.id}`;
    await sql`UPDATE users SET parent_id = ${session.user.id} WHERE id = ${link.initiator_id}`;
  } else {
    // I'm becoming (or already am) the student.
    if (myRole === 'tutor' || myRole === 'admin' || myRole === 'parent') {
      return NextResponse.json({ error: 'role_conflict' }, { status: 400 });
    }
    if (meRows[0]?.parent_id) {
      return NextResponse.json({ error: 'already_linked' }, { status: 400 });
    }
    const parentChildCheck = await sql`
      SELECT id FROM users WHERE role = 'student' AND parent_id = ${link.initiator_id} LIMIT 1
    `;
    if (parentChildCheck.length > 0) {
      return NextResponse.json({ error: 'already_linked' }, { status: 400 });
    }
    await sql`UPDATE users SET role = COALESCE(role, 'student') WHERE id = ${session.user.id}`;
    await sql`UPDATE users SET parent_id = ${link.initiator_id} WHERE id = ${session.user.id}`;

    // Any sessions the parent booked under their own account (the
    // no-linked-student fast path) now belong to this student instead —
    // otherwise they'd stay orphaned under the parent forever.
    await sql`
      UPDATE slots
      SET booked_by_student_id = ${session.user.id}
      WHERE booked_by_student_id = ${link.initiator_id}
    `;
  }
  await sql`UPDATE account_links SET confirmed_at = now() WHERE id = ${link.id}`;
  return NextResponse.json({ ok: true });
}
