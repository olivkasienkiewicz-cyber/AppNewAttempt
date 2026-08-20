import { hourlyRateForSubject } from './subjects';

// Placeholder bank details — replace with real account info before launch.
export const BANK_DETAILS = {
  accountHolder: 'Studilly - Olivia Sienkiewicz',
  iban: 'PL92 1050 1025 1000 0090 8734 1583',
  bankName: 'ING Bank Śląski',
} as const;

export function referenceCodeForSlot(slotId: string): string {
  return `STUDILLY-${slotId.slice(0, 8).toUpperCase()}`;
}

// Rate now depends on the session's subject — IB coursework, IB entrance
// exam prep, and egzamin ósmoklasisty are priced differently. Falls back
// to the standard IB rate for null/unrecognized subjects (see
// hourlyRateForSubject in subjects.ts for the exact matching rules).
export function amountForSlot(durationMinutes: number, subject: string | null): number {
  const rate = hourlyRateForSubject(subject ?? '');
  return Math.round((durationMinutes / 60) * rate * 100) / 100;
}

export const ADMIN_EMAIL = 'olivkasienkiewicz@gmail.com';
