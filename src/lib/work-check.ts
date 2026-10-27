// Written Work Check (PL: Sprawdzanie prac pisemnych)
// ----------------------------------------------------
// Written feedback on an IB draft (TOK essay/exhibition, IA, EE), sold at a
// flat price per piece of work instead of by the hour. Lives in its own
// `work_checks` table — it is not a slot, so none of the booking/slot code
// is involved. Single source of truth for products, prices and payouts.

export const WORK_CHECK_PRODUCTS = [
  'tok_essay',
  'tok_exhibition',
  'econ_commentary',
  'econ_portfolio',
  'ia_other',
  'extended_essay',
] as const;
export type WorkCheckProduct = (typeof WORK_CHECK_PRODUCTS)[number];

type ProductConfig = {
  // What the student pays (PLN). For `fromPrice` products this is the
  // starting price; the admin confirms the final price before payment.
  price: number;
  fromPrice: boolean;
  // What the tutor is paid (PLN) at the base price. The admin can override
  // it per order.
  payout: number;
  // Whether the student must name the subject (IA / EE only).
  needsSubject: boolean;
  label: { en: string; pl: string };
  note: { en: string; pl: string };
};

export const WORK_CHECK_CONFIG: Record<WorkCheckProduct, ProductConfig> = {
  tok_essay: {
    price: 300,
    fromPrice: false,
    payout: 170,
    needsSubject: false,
    label: { en: 'TOK essay', pl: 'Esej TOK' },
    note: { en: 'Up to 1,600 words', pl: 'Do 1600 słów' },
  },
  tok_exhibition: {
    price: 200,
    fromPrice: false,
    payout: 110,
    needsSubject: false,
    label: { en: 'TOK exhibition', pl: 'Wystawa TOK (exhibition)' },
    note: { en: 'Three objects + commentary, up to 950 words', pl: 'Trzy obiekty + komentarz, do 950 słów' },
  },
  econ_commentary: {
    price: 175,
    fromPrice: false,
    payout: 100,
    needsSubject: false,
    label: { en: 'Economics IA – one commentary', pl: 'IA z ekonomii – jeden komentarz' },
    note: { en: 'Up to 800 words', pl: 'Do 800 słów' },
  },
  econ_portfolio: {
    price: 450,
    fromPrice: false,
    payout: 270,
    needsSubject: false,
    label: { en: 'Economics IA – full portfolio', pl: 'IA z ekonomii – całe portfolio' },
    note: { en: 'All three commentaries, checked together', pl: 'Wszystkie trzy komentarze razem' },
  },
  ia_other: {
    price: 300,
    fromPrice: true,
    payout: 170,
    needsSubject: true,
    label: { en: 'Internal Assessment (other subjects)', pl: 'Internal Assessment (inne przedmioty)' },
    note: { en: 'Final price depends on subject and length', pl: 'Cena zależy od przedmiotu i długości pracy' },
  },
  extended_essay: {
    price: 550,
    fromPrice: true,
    payout: 300,
    needsSubject: true,
    label: { en: 'Extended Essay', pl: 'Extended Essay' },
    note: { en: 'Up to 4,000 words; final price depends on subject', pl: 'Do 4000 słów; cena zależy od przedmiotu' },
  },
};

// A second check of a piece already checked once: 60% of the price/payout.
export const SECOND_CHECK_MULTIPLIER = 0.6;

export const STANDARD_TURNAROUND_WORKING_DAYS = 5;

export function isWorkCheckProduct(value: unknown): value is WorkCheckProduct {
  return typeof value === 'string' && (WORK_CHECK_PRODUCTS as readonly string[]).includes(value);
}

// Check prices and payouts are always whole złoty (e.g. a second check of
// one Econ commentary: 175 × 0.6 = 105 PLN).
function roundPln(n: number): number {
  return Math.round(n);
}

function multiplier(opts: { secondCheck: boolean }): number {
  return opts.secondCheck ? SECOND_CHECK_MULTIPLIER : 1;
}

// List price for an order, before any discount code.
export function workCheckPrice(
  product: WorkCheckProduct,
  opts: { secondCheck: boolean },
  basePrice?: number // admin-confirmed base for "from" products
): number {
  return roundPln((basePrice ?? WORK_CHECK_CONFIG[product].price) * multiplier(opts));
}

// Default tutor payout for an order. For "from" products where the admin
// raised the base price, the payout scales with it.
export function workCheckPayout(
  product: WorkCheckProduct,
  opts: { secondCheck: boolean },
  basePrice?: number
): number {
  const cfg = WORK_CHECK_CONFIG[product];
  const scale = basePrice != null ? basePrice / cfg.price : 1;
  return roundPln(cfg.payout * scale * multiplier(opts));
}

export function referenceCodeForWorkCheck(id: string): string {
  return `STUDILLY-W-${id.slice(0, 8).toUpperCase()}`;
}

export function workCheckLabel(product: string, locale: 'en' | 'pl' = 'en'): string {
  return isWorkCheckProduct(product) ? WORK_CHECK_CONFIG[product].label[locale] : product;
}

// Due date once payment is confirmed: 5 working days (Mon–Fri) from the
// moment of payment.
export function workCheckDueDate(paidAt: Date): Date {
  const due = new Date(paidAt);
  let added = 0;
  while (added < STANDARD_TURNAROUND_WORKING_DAYS) {
    due.setDate(due.getDate() + 1);
    const day = due.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return due;
}

// --- Order status ---
// awaiting_quote   → "from" product, waiting for the admin to confirm the price
// awaiting_payment → price known, waiting for the bank transfer
// paid             → payment confirmed; tutor works on it (once assigned)
// delivered        → tutor uploaded feedback; counts toward the tutor's payout
// cancelled        → no payout, no further action
export const WORK_CHECK_STATUSES = [
  'awaiting_quote',
  'awaiting_payment',
  'paid',
  'delivered',
  'cancelled',
] as const;
export type WorkCheckStatus = (typeof WORK_CHECK_STATUSES)[number];

export function isWorkCheckStatus(value: unknown): value is WorkCheckStatus {
  return typeof value === 'string' && (WORK_CHECK_STATUSES as readonly string[]).includes(value);
}

// Label shown to students/parents. `paid` splits into "waiting for a
// reviewer" vs "in review" depending on whether a tutor is assigned.
export function workCheckStatusLabel(
  status: WorkCheckStatus,
  hasTutor: boolean,
  locale: 'en' | 'pl' = 'en'
): string {
  const labels: Record<string, { en: string; pl: string }> = {
    awaiting_quote: { en: 'Price being confirmed', pl: 'Potwierdzamy cenę' },
    awaiting_payment: { en: 'Awaiting payment', pl: 'Oczekuje na płatność' },
    paid_unassigned: { en: 'Paid – assigning a reviewer', pl: 'Opłacone – przydzielamy sprawdzającego' },
    paid_assigned: { en: 'In review', pl: 'W trakcie sprawdzania' },
    delivered: { en: 'Feedback ready', pl: 'Informacja zwrotna gotowa' },
    cancelled: { en: 'Cancelled', pl: 'Anulowane' },
  };
  const key = status === 'paid' ? (hasTutor ? 'paid_assigned' : 'paid_unassigned') : status;
  return labels[key][locale];
}

// Files students may upload as a draft, and tutors as feedback.
export const WORK_CHECK_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
] as const;
export const WORK_CHECK_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const WORK_CHECK_ACCEPT_ATTR = '.pdf,.doc,.docx,.odt';

// What the API returns for one order (shared by the student, tutor and
// admin views).
export type WorkCheck = {
  id: string;
  product: WorkCheckProduct;
  subject: string | null;
  secondCheck: boolean;
  status: WorkCheckStatus;
  amount: number | null; // null while awaiting a quote
  discountCode: string | null;
  referenceCode: string;
  studentId: string;
  studentName: string | null;
  orderedById: string;
  tutorId: string | null;
  tutorName: string | null;
  tutorPayout: number | null;
  studentNote: string | null;
  draftUrl: string;
  draftName: string;
  feedbackUrl: string | null;
  feedbackName: string | null;
  feedbackSummary: string | null;
  createdAt: string;
  paidAt: string | null;
  dueAt: string | null;
  deliveredAt: string | null;
};

export function rowToWorkCheck(row: Record<string, unknown>): WorkCheck {
  const num = (v: unknown) => (v == null ? null : Number(v));
  const iso = (v: unknown) => (v == null ? null : new Date(v as string).toISOString());
  return {
    id: row.id as string,
    product: row.product as WorkCheckProduct,
    subject: (row.subject as string | null) ?? null,
    secondCheck: Boolean(row.second_check),
    status: row.status as WorkCheckStatus,
    amount: num(row.amount),
    discountCode: (row.discount_code as string | null) ?? null,
    referenceCode: referenceCodeForWorkCheck(row.id as string),
    studentId: row.student_id as string,
    studentName: (row.student_name as string | null) ?? null,
    orderedById: row.ordered_by_id as string,
    tutorId: (row.tutor_id as string | null) ?? null,
    tutorName: (row.tutor_name as string | null) ?? null,
    tutorPayout: num(row.tutor_payout),
    studentNote: (row.student_note as string | null) ?? null,
    draftUrl: row.draft_url as string,
    draftName: row.draft_name as string,
    feedbackUrl: (row.feedback_url as string | null) ?? null,
    feedbackName: (row.feedback_name as string | null) ?? null,
    feedbackSummary: (row.feedback_summary as string | null) ?? null,
    createdAt: iso(row.created_at)!,
    paidAt: iso(row.paid_at),
    dueAt: iso(row.due_at),
    deliveredAt: iso(row.delivered_at),
  };
}
