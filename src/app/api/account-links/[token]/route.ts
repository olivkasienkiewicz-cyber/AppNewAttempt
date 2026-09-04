import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rows = await sql`SELECT * FROM account_links WHERE token = ${token}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const link = rows[0];

  const initiatorRows = await sql`SELECT name FROM users WHERE id = ${link.initiator_id}`;
  const initiatorName = (initiatorRows[0]?.name as string | undefined) ?? 'Someone';

  return NextResponse.json({
    direction: link.direction as 'student_invites_parent' | 'parent_invites_student',
    inviteeEmail: link.invitee_email as string,
    initiatorName,
    expired: new Date(link.expires_at as string).getTime() < Date.now(),
    confirmed: link.confirmed_at !== null,
  });
}
