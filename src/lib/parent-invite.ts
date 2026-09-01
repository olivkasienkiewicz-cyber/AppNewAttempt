import { sql } from '@/lib/db';
import { signIn } from '@/auth';

const INVITE_EXPIRY_DAYS = 7;

export type CreateParentInviteResult =
  | { ok: true }
  | { ok: false; error: 'invalid_email' | 'self_invite' | 'already_linked' | 'send_failed' };

// Creates a pending parent_invites row and triggers Auth.js's normal
// magic-link email for that address. No token is embedded in the link —
// matching happens by email against this table when Auth.js creates the
// new user (see events.createUser in auth.ts). If the email already
// belongs to an existing account, this row is still created, but nothing
// will happen on sign-in, since createUser only fires for brand-new users.
export async function createParentInvite(
  studentId: string,
  studentEmail: string,
  parentEmail: string
): Promise<CreateParentInviteResult> {
  const email = parentEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }
  if (email === studentEmail.trim().toLowerCase()) {
    return { ok: false, error: 'self_invite' };
  }

  const existing = await sql`SELECT parent_id FROM users WHERE id = ${studentId}`;
  if (existing[0]?.parent_id) {
    return { ok: false, error: 'already_linked' };
  }

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO parent_invites (student_id, email, expires_at)
    VALUES (${studentId}, ${email}, ${expiresAt})
  `;

  try {
    await signIn('resend', { email, redirect: false, callbackUrl: '/post-login' });
  } catch {
    return { ok: false, error: 'send_failed' };
  }

  return { ok: true };
}
