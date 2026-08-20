import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { tutorId, period, paid } = (body ?? {}) as { tutorId?: unknown; period?: unknown; paid?: unknown };
  if (typeof tutorId !== 'string' || !tutorId) {
    return NextResponse.json({ error: 'invalid_tutor' }, { status: 400 });
  }
  if (typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'invalid_period' }, { status: 400 });
  }
  if (typeof paid !== 'boolean') {
    return NextResponse.json({ error: 'invalid_paid' }, { status: 400 });
  }

  const paidAt = paid ? new Date().toISOString() : null;

  await sql`
    INSERT INTO tutor_payouts (tutor_id, period, paid, paid_at)
    VALUES (${tutorId}, ${period}, ${paid}, ${paidAt})
    ON CONFLICT (tutor_id, period)
    DO UPDATE SET paid = EXCLUDED.paid, paid_at = EXCLUDED.paid_at
  `;

  return NextResponse.json({ ok: true });
}
