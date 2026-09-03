import { sql } from '@/lib/db';

export type DiscountApplyResult =
  | { ok: true; discountedAmount: number; code: string }
  | { ok: false; error: 'not_found' | 'already_redeemed' | 'wrong_type' | 'expired' };

export async function previewDiscountCode(
  rawCode: string,
  originalAmount: number,
  context: 'single' | 'batch',
  studentId?: string
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

  if (studentId) {
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
  context: 'single' | 'batch'
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

  try {
    await sql`
      INSERT INTO discount_code_redemptions (discount_code_id, student_id)
      VALUES (${pre.id}, ${studentId})
    `;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return { ok: false, error: 'already_redeemed' };
    }
    throw err;
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
