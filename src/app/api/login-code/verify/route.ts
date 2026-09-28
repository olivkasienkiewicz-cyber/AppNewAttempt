import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  MAX_CODE_ATTEMPTS,
  hashLoginToken,
  isLockedOut,
  normalizeLoginEmail,
  recordFailedAttempt,
} from '@/lib/login-code';

// Checks a typed code before the page hands it to Auth.js, so the person gets
// a clear message ("wrong code", "expired") instead of a generic error page.
// It never signs anyone in by itself — Auth.js's callback does that.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { email, code } = (body ?? {}) as { email?: unknown; code?: unknown };
  if (typeof email !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  const identifier = normalizeLoginEmail(email);

  if (await isLockedOut(identifier)) {
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
  }

  const hashed = await hashLoginToken(code);
  const rows = await sql`
    SELECT expires FROM verification_token
    WHERE identifier = ${identifier} AND token = ${hashed}
  `;

  if (rows.length === 0) {
    await recordFailedAttempt(identifier);
    const [attempts] = await sql`SELECT failures FROM login_code_attempts WHERE identifier = ${identifier}`;
    const failures = Number(attempts?.failures ?? 0);
    if (failures >= MAX_CODE_ATTEMPTS) {
      return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }
    return NextResponse.json(
      { error: 'invalid_code', attemptsLeft: MAX_CODE_ATTEMPTS - failures },
      { status: 400 }
    );
  }

  if (new Date(rows[0].expires as string).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email: identifier });
}
