import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rowToNotification } from '@/lib/db-mappers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  const rows = userId
    ? await sql`
        SELECT * FROM notifications
        WHERE recipient_user_id = ${userId}
        ORDER BY created_at DESC
      `
    : await sql`SELECT * FROM notifications ORDER BY created_at DESC`;

  return NextResponse.json(rows.map(rowToNotification));
}

// Marks all of one user's notifications as read; returns the ones that changed.
export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { userId } = (body ?? {}) as { userId?: unknown };
  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE notifications
    SET read = true
    WHERE recipient_user_id = ${userId} AND read = false
    RETURNING *
  `;

  return NextResponse.json(rows.map(rowToNotification));
}
