import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { firstName } from '@/lib/referral';

export const dynamic = 'force-dynamic';

// Public — used by the /r/CODE landing page. Only reveals whether the code
// is a live referral code and the referrer's first name.
export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code: raw } = await context.params;
  const code = decodeURIComponent(raw ?? '').trim().toUpperCase();
  if (!code || code.length > 40) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const rows = await sql`
    SELECT u.name
    FROM discount_codes d JOIN users u ON u.id = d.owner_user_id
    WHERE d.code = ${code} AND d.kind = 'referral'
  `;
  if (rows.length === 0) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  return NextResponse.json({ valid: true, code, referrerName: firstName(rows[0].name as string) || null });
}
