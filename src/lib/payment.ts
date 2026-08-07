// Placeholder bank details — replace with real account info before launch.
export const BANK_DETAILS = {
  accountHolder: 'Studilly - Olivia Sienkiewicz',
  iban: 'PL92 1050 1025 1000 0090 8734 1583',
  bankName: 'ING Bank Śląski',
} as const;

export const HOURLY_RATE_PLN = 230;

export function referenceCodeForSlot(slotId: string): string {
  return `STUDILLY-${slotId.slice(0, 8).toUpperCase()}`;
}

export function amountForSlot(durationMinutes: number): number {
  return Math.round((durationMinutes / 60) * HOURLY_RATE_PLN * 100) / 100;
}

export const ADMIN_EMAIL = 'olivkasienkiewicz@gmail.com';
