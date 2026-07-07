import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';

// Listing users (e.g. for the student's tutor picker) still requires being
// signed in — but no longer lets anyone *become* another user, since there's
// no more POST here at all. Users are created only by Auth.js on sign-in,
// and named/roled only by the account holder via PATCH /api/users/me.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const rows = await sql`
    SELECT * FROM users WHERE role IS NOT NULL ORDER BY created_at ASC
  `;
  return NextResponse.json(rows.map(rowToUser));
}
