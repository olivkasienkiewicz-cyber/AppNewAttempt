import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const MAX_BODY_LEN = 2000;

type MessageRow = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string | Date;
  attachment_url: string | null;
  attachment_type: string | null;
};

function rowToMessage(row: MessageRow) {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    read: row.read,
    createdAt: new Date(row.created_at).toISOString(),
    attachmentUrl: row.attachment_url,
    attachmentType: row.attachment_type,
  };
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const otherId = searchParams.get('with');
  if (!otherId) {
    return NextResponse.json({ error: 'missing_with' }, { status: 400 });
  }
  const rows = await sql`
    SELECT * FROM messages
    WHERE (sender_id = ${session.user.id} AND recipient_id = ${otherId})
       OR (sender_id = ${otherId} AND recipient_id = ${session.user.id})
    ORDER BY created_at ASC
  `;
  await sql`
    UPDATE messages
    SET read = true
    WHERE recipient_id = ${session.user.id} AND sender_id = ${otherId} AND read = false
  `;
  return NextResponse.json(rows.map((r) => rowToMessage(r as MessageRow)));
}

// Any signed-in user can message any other signed-in user — no booking
// relationship required. Sends an email notification to the recipient.
// A message must have either non-empty text or an attachment (or both).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { recipientId, body: text, attachmentUrl, attachmentType } = (parsedBody ?? {}) as {
    recipientId?: unknown;
    body?: unknown;
    attachmentUrl?: unknown;
    attachmentType?: unknown;
  };
  if (typeof recipientId !== 'string' || recipientId.length === 0) {
    return NextResponse.json({ error: 'invalid_recipient' }, { status: 400 });
  }
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  const hasAttachment = typeof attachmentUrl === 'string' && attachmentUrl.length > 0;
  if (!hasAttachment && (trimmedText.length === 0 || trimmedText.length > MAX_BODY_LEN)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (trimmedText.length > MAX_BODY_LEN) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (attachmentUrl !== undefined && typeof attachmentUrl !== 'string') {
    return NextResponse.json({ error: 'invalid_attachment' }, { status: 400 });
  }
  if (attachmentType !== undefined && typeof attachmentType !== 'string') {
    return NextResponse.json({ error: 'invalid_attachment' }, { status: 400 });
  }
  if (recipientId === session.user.id) {
    return NextResponse.json({ error: 'cannot_message_self' }, { status: 400 });
  }
  const recipientRows = await sql`
    SELECT id, name, email FROM users WHERE id = ${recipientId}
  `;
  if (recipientRows.length === 0) {
    return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 });
  }
  const recipient = recipientRows[0] as { id: string; name: string; email: string | null };
  const senderRows = await sql`SELECT name FROM users WHERE id = ${session.user.id}`;
  const senderName = (senderRows[0]?.name as string | undefined) ?? 'Someone';

  const [row] = await sql`
    INSERT INTO messages (sender_id, recipient_id, body, attachment_url, attachment_type)
    VALUES (${session.user.id}, ${recipientId}, ${trimmedText}, ${hasAttachment ? attachmentUrl : null}, ${hasAttachment ? (attachmentType ?? null) : null})
    RETURNING *
  `;

  if (recipient.email) {
    const attachmentNote = hasAttachment ? '<p><em>Sent an attachment.</em></p>' : '';
    sendEmail({
      to: recipient.email,
      subject: `New message from ${senderName} on Studilly`,
      html: `<p><strong>${escapeHtml(senderName)}</strong> sent you a message on Studilly:</p><p>${escapeHtml(trimmedText)}</p>${attachmentNote}<p><a href="https://studilly.com/messages/${session.user.id}">Reply on Studilly</a></p>`,
    }).catch((err) => {
      console.error('Failed to send message notification email:', err);
    });
  }

  return NextResponse.json(rowToMessage(row as MessageRow));
}
