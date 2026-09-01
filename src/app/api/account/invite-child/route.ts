import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import { createAccountLink } from '@/lib/account-link';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const rows = await sql`SELECT * FROM users WHERE id = ${session.user.id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const currentUser = rowToUser(rows[0]);
  if (currentUser.role !== 'parent') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { email } = (body ?? {}) as { email?: unknown };
  if (typeof email !== 'string' || email.trim().length === 0) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const baseUrl = new URL(req.url).origin;
  const result = await createAccountLink(
    session.user.id,
    session.user.email,
    currentUser.name,
    email,
    'parent_invites_student',
    baseUrl
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
