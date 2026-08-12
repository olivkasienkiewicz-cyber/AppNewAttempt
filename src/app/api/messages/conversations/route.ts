import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Returns one row per conversation partner: their id, the last message
// exchanged, and how many unread messages the current user has from them.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  const lastMessages = await sql`
    SELECT DISTINCT ON (other_id) other_id, body, created_at, sender_id
    FROM (
      SELECT
        CASE WHEN sender_id = ${userId} THEN recipient_id ELSE sender_id END AS other_id,
        body, created_at, sender_id
      FROM messages
      WHERE sender_id = ${userId} OR recipient_id = ${userId}
    ) t
    ORDER BY other_id, created_at DESC
  `;

  const unread = await sql`
    SELECT sender_id AS other_id, COUNT(*)::int AS unread
    FROM messages
    WHERE recipient_id = ${userId} AND read = false
    GROUP BY sender_id
  `;
  const unreadMap = new Map<string, number>();
  for (const row of unread) {
    unreadMap.set(row.other_id as string, row.unread as number);
  }

  const conversations = lastMessages
    .map((row) => ({
      otherUserId: row.other_id as string,
      lastMessageBody: row.body as string,
      lastMessageAt: new Date(row.created_at as string).toISOString(),
      lastMessageFromMe: (row.sender_id as string) === userId,
      unreadCount: unreadMap.get(row.other_id as string) ?? 0,
    }))
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

  return NextResponse.json(conversations);
}
