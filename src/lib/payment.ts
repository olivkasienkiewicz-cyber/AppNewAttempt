import { hourlyRateForSubject, tutorPayoutRateForSubject } from './subjects';
export const BANK_DETAILS = {
  accountHolder: 'Studilly - Olivia Sienkiewicz',
  iban: 'PL92 1050 1025 1000 0090 8734 1583',
  bankName: 'ING Bank Śląski',
} as const;
export function referenceCodeForSlot(slotId: string): string {
  return `STUDILLY-${slotId.slice(0, 8).toUpperCase()}`;
}
// Used when several sessions are paid for in one transfer (a payment
// batch) instead of one reference code per session.
export function referenceCodeForBatch(batchId: string): string {
  return `STUDILLY-B-${batchId.slice(0, 8).toUpperCase()}`;
}
export function amountForSlot(durationMinutes: number, subject: string | null): number {
  const rate = hourlyRateForSubject(subject ?? '');
  return Math.round((durationMinutes / 60) * rate * 100) / 100;
}
// What the tutor is owed for a given session — separate rate schedule
// from what the student pays (the platform's margin is the difference).
export function payoutForSlot(durationMinutes: number, subject: string | null): number {
  const rate = tutorPayoutRateForSubject(subject ?? '');
  return Math.round((durationMinutes / 60) * rate * 100) / 100;
}
// Per-tutor payout settings stored on the users table. When set, they
// replace the standard per-subject tutor rate above.
export type TutorPayoutSettings = {
  hourlyOverridePln: number | null; // fixed PLN/hour regardless of subject
  fullAmount: boolean; // tutor receives the whole amount the student pays
};

export function payoutForTutorSlot(
  durationMinutes: number,
  subject: string | null,
  slotAmount: number | null,
  settings: TutorPayoutSettings
): number {
  if (settings.fullAmount) {
    // What the student was actually charged (after any discount);
    // falls back to the list price for older slots without a stored amount.
    return slotAmount ?? amountForSlot(durationMinutes, subject);
  }
  if (settings.hourlyOverridePln != null) {
    return Math.round((durationMinutes / 60) * settings.hourlyOverridePln * 100) / 100;
  }
  return payoutForSlot(durationMinutes, subject);
}

export const ADMIN_EMAIL = 'olivkasienkiewicz@gmail.com';
