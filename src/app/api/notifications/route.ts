import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToNotification } from '@/lib/db-mappers';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const rows = await sql`
    SELECT * FROM notifications
    WHERE recipient_user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows.map(rowToNotification));
}

// Marks the *signed-in* user's notifications as read. No userId is read from
// the body anymore — you can no longer mark someone else's as read.
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const rows = await sql`
    UPDATE notifications
    SET read = true
    WHERE recipient_user_id = ${session.user.id} AND read = false
    RETURNING *
  `;
  return NextResponse.json(rows.map(rowToNotification));
}
