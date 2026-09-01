import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const LINK_EXPIRY_DAYS = 7;

export type Direction = 'student_invites_parent' | 'parent_invites_student';

export type CreateAccountLinkResult =
  | { ok: true }
  | { ok: false; error: 'invalid_email' | 'self_invite' | 'already_linked' | 'send_failed' };

// Creates a pending account_links row and emails the invitee a confirmation
// link — NOT an Auth.js sign-in link. Works identically whether the
// invitee already has an account or not: the actual role/parent_id change
// only happens later, when they open the link while signed in as that
// exact email (see /confirm-link and its confirm route).
export async function createAccountLink(
  initiatorId: string,
  initiatorEmail: string,
  initiatorName: string,
  inviteeEmail: string,
  direction: Direction
): Promise<CreateAccountLinkResult> {
  const email = inviteeEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }
  if (email === initiatorEmail.trim().toLowerCase()) {
    return { ok: false, error: 'self_invite' };
  }

  if (direction === 'student_invites_parent') {
    const existing = await sql`SELECT parent_id FROM users WHERE id = ${initiatorId}`;
    if (existing[0]?.parent_id) {
      return { ok: false, error: 'already_linked' };
    }
  } else {
    const existingChild = await sql`
      SELECT id FROM users WHERE role = 'student' AND parent_id = ${initiatorId} LIMIT 1
    `;
    if (existingChild.length > 0) {
      return { ok: false, error: 'already_linked' };
    }
  }

  const token = globalThis.crypto.randomUUID();
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO account_links (initiator_id, invitee_email, direction, token, expires_at)
    VALUES (${initiatorId}, ${email}, ${direction}, ${token}, ${expiresAt})
  `;

  const confirmUrl = `${process.env.NEXTAUTH_URL ?? ''}/confirm-link?token=${token}`;
  const subject =
    direction === 'student_invites_parent'
      ? `${initiatorName} added you as a parent on Studilly`
      : `${initiatorName} added you as their student on Studilly`;
  const body =
    direction === 'student_invites_parent'
      ? `<p><strong>${initiatorName}</strong> would like to link you to their account as a parent, so you can handle payments for their sessions.</p>`
      : `<p><strong>${initiatorName}</strong> would like to link your account as their student.</p>`;

  try {
    await sendEmail({
      to: email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Studilly family link</h2>
          ${body}
          <p><a href="${confirmUrl}" style="display: inline-block; padding: 10px 18px; background: #16B8A7; color: white; text-decoration: none; border-radius: 6px;">Confirm</a></p>
          <p style="color: #666; font-size: 13px;">If you don't recognize this, you can ignore this email.</p>
        </div>
      `,
    });
  } catch {
    return { ok: false, error: 'send_failed' };
  }

  return { ok: true };
}
