import { hourlyRateForSubject, tutorPayoutRateForSubject } from './subjects';

export const BANK_DETAILS = {
  accountHolder: 'Studilly - Olivia Sienkiewicz',
  iban: 'PL92 1050 1025 1000 0090 8734 1583',
  bankName: 'ING Bank Śląski',
} as const;

export function referenceCodeForSlot(slotId: string): string {
  return `STUDILLY-${slotId.slice(0, 8).toUpperCase()}`;
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

export const ADMIN_EMAIL = 'olivkasienkiewicz@gmail.com';
