// Browser-side helpers that remember a referral code a friend arrived with
// (via studilly.com/r/CODE) so it can be pre-filled at their first booking.

const STORAGE_KEY = 'studilly_referral_code';

export function savePendingReferralCode(code: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
  } catch {
    // storage unavailable (private mode etc.) — the code is still shown on screen
  }
}

export function getPendingReferralCode(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Call after any booking response: once the saved code has been applied
// (or rejected for good), stop pre-filling it.
export function settlePendingReferralCode(usedCode: string | null | undefined, discountError?: string | null): void {
  const pending = getPendingReferralCode();
  if (!pending || !usedCode || usedCode.trim().toUpperCase() !== pending) return;
  if (!discountError || ['already_redeemed', 'own_code', 'not_new_student', 'not_found', 'expired'].includes(discountError)) {
    clearPendingReferralCode();
  }
}
