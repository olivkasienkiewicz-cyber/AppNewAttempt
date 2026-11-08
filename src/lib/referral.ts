import { randomInt } from 'crypto';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import {
  REFERRAL_AMOUNT_PLN, REFERRAL_REWARD_VALID_DAYS, SITE_URL, referralLink,
} from '@/lib/referral-copy';

// Unambiguous characters only (no 0/O, 1/I/L) so codes are easy to read out loud.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChars(n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return out;
}

export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

// "Amelia Kaszowska" -> "AMELIA", "Łucja" -> "LUCJA"
function nameSlug(fullName: string | null | undefined): string {
  const slug = firstName(fullName)
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
  return slug || 'STUDILLY';
}

export type ReferralCodeRow = {
  id: string;
  code: string;
  ownerUserId: string;
};

// Every account gets exactly one personal referral code, created on first view.
export async function getOrCreateReferralCode(ownerId: string): Promise<ReferralCodeRow> {
  const existing = await sql`
    SELECT id, code, owner_user_id FROM discount_codes
    WHERE kind = 'referral' AND owner_user_id = ${ownerId}
  `;
  if (existing.length > 0) {
    return { id: existing[0].id as string, code: existing[0].code as string, ownerUserId: ownerId };
  }

  const [owner] = await sql`SELECT name FROM users WHERE id = ${ownerId}`;
  const slug = nameSlug(owner?.name as string | undefined);

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `${slug}-${randomChars(attempt < 3 ? 3 : 5)}`;
    try {
      const inserted = await sql`
        INSERT INTO discount_codes
          (code, discount_type, discount_value, applies_to, valid_until, single_use, kind, owner_user_id)
        VALUES
          (${code}, 'flat', ${REFERRAL_AMOUNT_PLN}, 'both', NULL, false, 'referral', ${ownerId})
        RETURNING id, code
      `;
      return { id: inserted[0].id as string, code: inserted[0].code as string, ownerUserId: ownerId };
    } catch (err) {
      if ((err as { code?: string }).code !== '23505') throw err;
      // Either the code clashed with another one (retry with new characters)
      // or a parallel request already created this owner's code (return it).
      const raced = await sql`
        SELECT id, code FROM discount_codes WHERE kind = 'referral' AND owner_user_id = ${ownerId}
      `;
      if (raced.length > 0) {
        return { id: raced[0].id as string, code: raced[0].code as string, ownerUserId: ownerId };
      }
    }
  }
  throw new Error('Could not generate a unique referral code');
}

// Student and code owner are the same family (self, parent <-> child, siblings).
async function isSameFamily(ownerId: string, studentId: string): Promise<boolean> {
  if (ownerId === studentId) return true;
  const rows = await sql`SELECT id, parent_id FROM users WHERE id IN (${ownerId}, ${studentId})`;
  const owner = rows.find((r) => r.id === ownerId);
  const student = rows.find((r) => r.id === studentId);
  if (!owner || !student) return false;
  if (student.parent_id === ownerId || owner.parent_id === studentId) return true;
  return owner.parent_id !== null && owner.parent_id === student.parent_id;
}

// "New" = never had a paid or held class, never had a paid work check,
// and was never referred before. The booking currently being created is
// still unpaid, so it doesn't count against them.
async function isNewStudent(studentId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT
      (SELECT COUNT(*) FROM slots
        WHERE booked_by_student_id = ${studentId}
          AND (payment_status = 'paid' OR outcome_status IS NOT NULL))
      + (SELECT COUNT(*) FROM work_checks
          WHERE student_id = ${studentId} AND status IN ('paid', 'delivered'))
      + (SELECT COUNT(*) FROM referrals WHERE referred_id = ${studentId})
      AS history_count
  `;
  return Number(row.history_count) === 0;
}

export type ReferralEligibilityError = 'own_code' | 'not_new_student';

export async function checkReferralEligibility(
  ownerId: string,
  studentId: string | undefined
): Promise<ReferralEligibilityError | null> {
  if (!studentId) return null;
  if (await isSameFamily(ownerId, studentId)) return 'own_code';
  if (!(await isNewStudent(studentId))) return 'not_new_student';
  return null;
}

// Claims the "referred" slot for this student. Returns false if they were
// already referred by someone (unique on referred_id).
export async function recordReferral(codeId: string, ownerId: string, studentId: string): Promise<boolean> {
  const inserted = await sql`
    INSERT INTO referrals (referrer_id, referred_id, referral_code_id)
    VALUES (${ownerId}, ${studentId}, ${codeId})
    ON CONFLICT (referred_id) DO NOTHING
    RETURNING id
  `;
  return inserted.length > 0;
}

export async function undoReferral(studentId: string, codeId: string): Promise<void> {
  await sql`
    DELETE FROM referrals
    WHERE referred_id = ${studentId} AND referral_code_id = ${codeId} AND status = 'pending'
  `;
}

// Called when a class is marked completed or a work check is delivered.
// The first time it happens for a referred student, the referrer gets a
// one-time 50 zł code and an email. Safe to call repeatedly.
export async function maybeRewardReferral(studentId: string | null | undefined): Promise<void> {
  if (!studentId) return;
  try {
    const claimed = await sql`
      UPDATE referrals SET status = 'rewarded', rewarded_at = now()
      WHERE referred_id = ${studentId} AND status = 'pending'
      RETURNING id, referrer_id
    `;
    if (claimed.length === 0) return;
    const referralId = claimed[0].id as string;
    const referrerId = claimed[0].referrer_id as string;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + REFERRAL_REWARD_VALID_DAYS);

    let rewardCode = '';
    let rewardId = '';
    for (let attempt = 0; attempt < 5 && !rewardId; attempt++) {
      rewardCode = `THANKS-${randomChars(6)}`;
      try {
        const inserted = await sql`
          INSERT INTO discount_codes
            (code, discount_type, discount_value, applies_to, valid_until, single_use, kind, owner_user_id)
          VALUES
            (${rewardCode}, 'flat', ${REFERRAL_AMOUNT_PLN}, 'both', ${validUntil.toISOString()}, true, 'referral_reward', ${referrerId})
          RETURNING id
        `;
        rewardId = inserted[0].id as string;
      } catch (err) {
        if ((err as { code?: string }).code !== '23505') throw err;
      }
    }
    if (!rewardId) throw new Error('Could not generate a reward code');

    await sql`UPDATE referrals SET reward_code_id = ${rewardId} WHERE id = ${referralId}`;

    const people = await sql`
      SELECT u.id, u.name, u.email, p.email AS parent_email
      FROM users u LEFT JOIN users p ON p.id = u.parent_id
      WHERE u.id IN (${referrerId}, ${studentId})
    `;
    const referrer = people.find((r) => r.id === referrerId);
    const friend = people.find((r) => r.id === studentId);
    if (!referrer) return;

    const recipients = [referrer.email, referrer.parent_email]
      .filter((e): e is string => typeof e === 'string' && e.length > 0);
    const html = rewardEmailHtml({
      name: firstName(referrer.name as string),
      friend: firstName(friend?.name as string | undefined) || null,
      code: rewardCode,
      validUntil: formatDdMmYyyy(validUntil),
    });
    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject: 'Masz 50 zł od Studilly 🎉 / You earned 50 zł from Studilly', html })
      )
    );
  } catch (err) {
    // A reward failure must never break marking a class as completed.
    console.error('maybeRewardReferral failed', err);
  }
}

function formatDdMmYyyy(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function codeBox(code: string): string {
  return `<div style="margin: 20px 0; padding: 16px; border: 2px dashed #16B8A7; border-radius: 10px; text-align: center; font-family: monospace; font-size: 22px; letter-spacing: 2px; color: #0E2A47; background: #F7F5F0;"><strong>${escapeHtml(code)}</strong></div>`;
}

function rewardEmailHtml(args: { name: string; friend: string | null; code: string; validUntil: string }): string {
  const { name, friend, code, validUntil } = args;
  const friendPl = friend ? escapeHtml(friend) : 'Twój znajomy';
  const friendEn = friend ? escapeHtml(friend) : 'Your friend';
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #12202B;">
      <div style="background: #0E2A47; color: #fff; padding: 24px; border-radius: 12px 12px 0 0;">
        <p style="margin: 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #7CD8C5;">Studilly · Polecenia</p>
        <h2 style="margin: 8px 0 0; font-size: 24px;">50 zł dla Ciebie!</h2>
      </div>
      <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Cześć ${escapeHtml(name)},</p>
        <p>${friendPl} właśnie odbył(a) pierwszą lekcję ze Studilly z Twojego polecenia. Dziękujemy! Oto Twoja nagroda — <strong>50 zł zniżki</strong> na kolejne zajęcia, pakiet lub sprawdzenie pracy:</p>
        ${codeBox(code)}
        <p style="font-size: 13px; color: #666;">Kod jednorazowy, ważny do <strong>${validUntil}</strong>. Poleć kolejną osobę, a dostaniesz następne 50 zł.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

        <p>Hi ${escapeHtml(name)},</p>
        <p>${friendEn} just had their first Studilly lesson thanks to you. Thank you! Here's your reward — <strong>50 zł off</strong> your next class, bundle or work check:</p>
        ${codeBox(code)}
        <p style="font-size: 13px; color: #666;">One-time code, valid until <strong>${validUntil}</strong>. Refer another friend to earn another 50 zł.</p>

        <p style="text-align: center; margin-top: 24px;">
          <a href="${SITE_URL}/referrals" style="display: inline-block; background: #16B8A7; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">Twoje polecenia / Your referrals</a>
        </p>
      </div>
    </div>
  `;
}

export { referralLink };
