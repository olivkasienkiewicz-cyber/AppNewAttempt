import { sql } from '@/lib/db';
import { checkReferralEligibility, recordReferral, undoReferral, isNewStudent } from '@/lib/referral';
import { REFERRAL_MIN_DURATION_MINUTES } from '@/lib/referral-copy';
import { IB_SUBJECTS } from '@/lib/subjects';

export type DiscountApplyResult =
  | { ok: true; discountedAmount: number; code: string }
  | { ok: false; error: 'not_found' | 'already_redeemed' | 'wrong_type' | 'expired' | 'wrong_duration' | 'wrong_subject' | 'own_code' | 'not_new_student' };

// Groups a code can be limited to via discount_codes.allowed_subject_groups.
export type DiscountSubjectGroup = 'ib' | 'sat' | 'university_applications';

export function discountSubjectGroup(subject: string | null | undefined): DiscountSubjectGroup | null {
  if (!subject) return null;
  if ((IB_SUBJECTS as readonly string[]).includes(subject)) return 'ib';
  if (subject.startsWith('SAT Preparation')) return 'sat';
  if (subject.startsWith('University Application Support')) return 'university_applications';
  return null;
}

// Optional per-code limits (see db/migrations/2026-11-discount-code-limits.sql).
// A code limited to certain subjects never applies when the subject is
// unknown (e.g. work checks), so it can't slip through.
async function checkCodeLimits(
  row: Record<string, unknown>,
  studentId: string | undefined,
  subject: string | null | undefined
): Promise<'wrong_subject' | 'not_new_student' | null> {
  const groups = row.allowed_subject_groups as string[] | null | undefined;
  if (groups !== null && groups !== undefined) {
    const group = discountSubjectGroup(subject);
    if (!group || !groups.includes(group)) return 'wrong_subject';
  }
  if (row.new_students_only === true && studentId && !(await isNewStudent(studentId))) {
    return 'not_new_student';
  }
  return null;
}

export async function previewDiscountCode(
  rawCode: string,
  originalAmount: number,
  context: 'single' | 'batch',
  studentId?: string,
  durationMinutes?: number,
  subject?: string | null
): Promise<DiscountApplyResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'not_found' };

  const rows = await sql`SELECT * FROM discount_codes WHERE code = ${code}`;
  if (rows.length === 0) return { ok: false, error: 'not_found' };
  const row = rows[0];

  if (row.valid_until !== null && new Date(row.valid_until as string) < new Date()) {
    return { ok: false, error: 'expired' };
  }
  if (row.applies_to !== 'both' && row.applies_to !== context) {
    return { ok: false, error: 'wrong_type' };
  }
  if (row.required_duration_minutes !== null && durationMinutes !== undefined && Number(row.required_duration_minutes) !== durationMinutes) {
    return { ok: false, error: 'wrong_duration' };
  }
  if (row.excluded_subject !== null && subject !== undefined && subject !== null && row.excluded_subject === subject) {
    return { ok: false, error: 'wrong_subject' };
  }
  const limitError = await checkCodeLimits(row, studentId, subject);
  if (limitError) return { ok: false, error: limitError };

  if (row.kind === 'referral') {
    if (durationMinutes !== undefined && durationMinutes < REFERRAL_MIN_DURATION_MINUTES) {
      return { ok: false, error: 'wrong_duration' };
    }
    const referralError = await checkReferralEligibility(row.owner_user_id as string, studentId);
    if (referralError) return { ok: false, error: referralError };
  }

  if (row.single_use) {
    if (row.redeemed_at !== null) return { ok: false, error: 'already_redeemed' };
  } else if (studentId) {
    const existing = await sql`
      SELECT 1 FROM discount_code_redemptions
      WHERE discount_code_id = ${row.id} AND student_id = ${studentId}
    `;
    if (existing.length > 0) return { ok: false, error: 'already_redeemed' };
  }

  const discountedAmount = computeDiscountedAmount(
    originalAmount,
    row.discount_type as 'percent' | 'flat',
    Number(row.discount_value)
  );
  return { ok: true, discountedAmount, code };
}

export async function redeemDiscountCode(
  rawCode: string,
  studentId: string,
  originalAmount: number,
  context: 'single' | 'batch',
  durationMinutes?: number,
  subject?: string | null
): Promise<DiscountApplyResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'not_found' };

  const preRows = await sql`SELECT * FROM discount_codes WHERE code = ${code}`;
  if (preRows.length === 0) return { ok: false, error: 'not_found' };
  const pre = preRows[0];

  if (pre.valid_until !== null && new Date(pre.valid_until as string) < new Date()) {
    return { ok: false, error: 'expired' };
  }
  if (pre.applies_to !== 'both' && pre.applies_to !== context) {
    return { ok: false, error: 'wrong_type' };
  }
  if (pre.required_duration_minutes !== null && durationMinutes !== undefined && Number(pre.required_duration_minutes) !== durationMinutes) {
    return { ok: false, error: 'wrong_duration' };
  }
  if (pre.excluded_subject !== null && subject !== undefined && subject !== null && pre.excluded_subject === subject) {
    return { ok: false, error: 'wrong_subject' };
  }
  const limitError = await checkCodeLimits(pre, studentId, subject);
  if (limitError) return { ok: false, error: limitError };

  // Personal referral codes: friends only, first booking only, 60+ min.
  const isReferral = pre.kind === 'referral';
  if (isReferral) {
    if (durationMinutes !== undefined && durationMinutes < REFERRAL_MIN_DURATION_MINUTES) {
      return { ok: false, error: 'wrong_duration' };
    }
    const referralError = await checkReferralEligibility(pre.owner_user_id as string, studentId);
    if (referralError) return { ok: false, error: referralError };
    const recorded = await recordReferral(pre.id as string, pre.owner_user_id as string, studentId);
    if (!recorded) return { ok: false, error: 'not_new_student' };
  }

  if (pre.single_use) {
    const claimed = await sql`
      UPDATE discount_codes
      SET redeemed_at = now(), redeemed_by_student_id = ${studentId}
      WHERE id = ${pre.id} AND redeemed_at IS NULL
      RETURNING *
    `;
    if (claimed.length === 0) {
      return { ok: false, error: 'already_redeemed' };
    }
  } else {
    try {
      await sql`
        INSERT INTO discount_code_redemptions (discount_code_id, student_id)
        VALUES (${pre.id}, ${studentId})
      `;
    } catch (err) {
      if (isReferral) await undoReferral(studentId, pre.id as string);
      if ((err as { code?: string }).code === '23505') {
        return { ok: false, error: 'already_redeemed' };
      }
      throw err;
    }
  }

  const discountedAmount = computeDiscountedAmount(
    originalAmount,
    pre.discount_type as 'percent' | 'flat',
    Number(pre.discount_value)
  );
  return { ok: true, discountedAmount, code: pre.code as string };
}

function computeDiscountedAmount(original: number, type: 'percent' | 'flat', value: number): number {
  const discounted = type === 'percent' ? original * (1 - value / 100) : original - value;
  return Math.max(0, Math.round(discounted * 100) / 100);
}
