import { sql } from '@/lib/db';

export type DiscountApplyResult =
  | { ok: true; discountedAmount: number; code: string }
  | { ok: false; error: 'not_found' | 'already_redeemed' | 'wrong_type' };

// Looks up a code without redeeming it — used to preview the discount
// before committing to a booking or batch.
export async function previewDiscountCode(
  rawCode: string,
  originalAmount: number,
  context: 'single' | 'batch'
): Promise<DiscountApplyResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'not_found' };

  const rows = await sql`SELECT * FROM discount_codes WHERE code = ${code}`;
  if (rows.length === 0) return { ok: false, error: 'not_found' };
  const row = rows[0];

  if (row.redeemed_at !== null) return { ok: false, error: 'already_redeemed' };
  if (row.applies_to !== 'both' && row.applies_to !== context) return { ok: false, error: 'wrong_type' };

  const discountedAmount = computeDiscountedAmount(
    originalAmount,
    row.discount_type as 'percent' | 'flat',
    Number(row.discount_value)
  );
  return { ok: true, discountedAmount, code };
}

// Atomically redeems a code (one-time use — the WHERE clause ensures two
// concurrent requests can't both succeed on the same code). Call this only
// once the booking/batch it applies to is actually being created.
export async function redeemDiscountCode(
  rawCode: string,
  studentId: string,
  originalAmount: number,
  context: 'single' | 'batch'
): Promise<DiscountApplyResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'not_found' };

  const preRows = await sql`SELECT * FROM discount_codes WHERE code = ${code}`;
  if (preRows.length === 0) return { ok: false, error: 'not_found' };
  const pre = preRows[0];
  if (pre.applies_to !== 'both' && pre.applies_to !== context) {
    return { ok: false, error: 'wrong_type' };
  }

  const redeemed = await sql`
    UPDATE discount_codes
    SET redeemed_at = now(), redeemed_by_student_id = ${studentId}
    WHERE code = ${code} AND redeemed_at IS NULL
    RETURNING *
  `;
  if (redeemed.length === 0) {
    return { ok: false, error: 'already_redeemed' };
  }

  const row = redeemed[0];
  const discountedAmount = computeDiscountedAmount(
    originalAmount,
    row.discount_type as 'percent' | 'flat',
    Number(row.discount_value)
  );
  return { ok: true, discountedAmount, code };
}

function computeDiscountedAmount(original: number, type: 'percent' | 'flat', value: number): number {
  const discounted = type === 'percent' ? original * (1 - value / 100) : original - value;
  return Math.max(0, Math.round(discounted * 100) / 100);
}
