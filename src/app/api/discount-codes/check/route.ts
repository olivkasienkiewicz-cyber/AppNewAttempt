import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
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
  const { code } = (body ?? {}) as { code?: unknown };
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();
  const rows = await sql`SELECT * FROM discount_codes WHERE code = ${normalized}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const row = rows[0];

  if (row.valid_until !== null && new Date(row.valid_until as string) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }
  if (row.single_use && row.redeemed_at !== null) {
    return NextResponse.json({ error: 'already_redeemed' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    requiredDurationMinutes: row.required_duration_minutes !== null ? Number(row.required_duration_minutes) : null,
    appliesTo: row.applies_to as string,
  });
}
