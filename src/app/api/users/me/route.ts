import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import type { Role } from '@/lib/store';

// Completes onboarding for the *currently signed-in* user only. There is no
// id in the request body — the row to update comes entirely from the
// session, so there's no way to onboard/overwrite someone else's account.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { name, role } = (body ?? {}) as { name?: unknown; role?: unknown };

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 40) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (role !== 'tutor' && role !== 'student') {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const trimmed = name.trim();
  const roleValue: Role = role;
  const rows = await sql`
    UPDATE users
    SET name = ${trimmed}, role = ${roleValue}
    WHERE id = ${session.user.id}
    RETURNING *
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(rowToUser(rows[0]));
}
