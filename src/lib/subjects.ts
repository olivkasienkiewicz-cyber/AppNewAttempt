export const IB_SUBJECTS = [
  'Mathematics: Analysis and Approaches',
  'Mathematics: Applications and Interpretation',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'Business Management',
  'Psychology',
  'History',
  'Geography',
  'Environmental Systems and Societies',
  'Global Politics',
  'Philosophy',
  'English A: Language and Literature',
  'English B',
  'French B',
  'Spanish B',
  'German B',
  'Visual Arts',
  'Theatre',
  'Music',
] as const;
export const SERVICE_SUBJECTS = [
  'SAT Preparation',
  'University Application Support',
  'Egzaminy wstępne do szkół IB',
  'Egzamin ósmoklasisty',
  'Polska Matura',
  'Language Classes',
  'Other',
] as const;
export const ALL_SUBJECTS = [...IB_SUBJECTS, ...SERVICE_SUBJECTS] as const;
export const LEVEL_OPTIONS = ['HL', 'SL', 'HL/SL'] as const;
// The three components of the actual egzamin ósmoklasisty exam — used as
// a fixed dropdown both when a tutor adds this subject and when a student
// filters for it, so the value is always consistent (no free-text drift).
export const EGZAMIN_OSMOKLASISTY_SUBJECTS = ['Matematyka', 'Język polski', 'Język angielski'] as const;
// The Matura subjects currently offered, crossed with the two exam
// levels, into a single fixed dropdown (e.g. "Matematyka – poziom
// rozszerzony"). This matches the format tutors' already-published
// `detail` values are stored in, so no migration was needed when this
// was introduced — it just formalizes the combined string into a
// closed set going forward instead of free text.
export const POLSKA_MATURA_BASE_SUBJECTS = [
  'Matematyka',
  'Język polski',
  'Język angielski',
  'Biologia',
  'Chemia',
  'Historia',
] as const;
export const POLSKA_MATURA_LEVELS = ['poziom podstawowy', 'poziom rozszerzony'] as const;
export const POLSKA_MATURA_SUBJECTS = POLSKA_MATURA_BASE_SUBJECTS.flatMap((subject) =>
  POLSKA_MATURA_LEVELS.map((level) => `${subject} – ${level}` as const)
);
// The languages offered under "Language Classes" — a fixed dropdown for
// the tutor's `detail` field, same pattern as EGZAMIN_OSMOKLASISTY_SUBJECTS.
// Flat rate regardless of language (see RATE_LANGUAGE_CLASSES_PLN below).
export const LANGUAGE_CLASSES_SUBJECTS = ['French', 'English', 'German'] as const;
export function subjectRequiresLevel(subject: string): boolean {
  return (IB_SUBJECTS as readonly string[]).includes(subject);
}
// "University Application Support", "Egzamin ósmoklasisty", "Polska
// Matura", "Language Classes", and "Other" all carry a free-text detail
// field. For University Application Support it's optional context (e.g.
// "UK, US, Canada"). For "Other" it's required and IS the custom subject
// name. For "Egzamin ósmoklasisty" it specifies which exam component the
// tutor teaches — selected from EGZAMIN_OSMOKLASISTY_SUBJECTS. For
// "Polska Matura" it specifies subject AND level combined — selected
// from POLSKA_MATURA_SUBJECTS (e.g. "Matematyka – poziom rozszerzony").
// For "Language Classes" it specifies which language — selected from
// LANGUAGE_CLASSES_SUBJECTS.
export function subjectSupportsDetail(subject: string): boolean {
  return (
    subject === 'University Application Support' ||
    subject === 'Egzamin ósmoklasisty' ||
    subject === 'Polska Matura' ||
    subject === 'Language Classes' ||
    subject === 'Other'
  );
}
export function subjectDetailRequired(subject: string): boolean {
  return (
    subject === 'Other' ||
    subject === 'Egzamin ósmoklasisty' ||
    subject === 'Polska Matura' ||
    subject === 'Language Classes'
  );
}
export const MAX_DETAIL_LEN = 100;
// Subjects a tutor can list more than once, using `detail` to distinguish
// entries — e.g. two 'Egzamin ósmoklasisty' entries for different exam
// components (Matematyka, Język angielski), several 'Polska Matura'
// entries for different subject+level combinations (Matematyka – poziom
// podstawowy, Historia – poziom rozszerzony, etc.), several 'Language
// Classes' entries for different languages (French, German), or several
// custom 'Other' subjects. Everywhere "does this tutor already have
// subject X" is checked, these need identity-by-(subject + detail)
// instead of identity-by-subject-alone.
export function isMultiInstanceSubject(subject: string): boolean {
  return (
    subject === 'Other' ||
    subject === 'Egzamin ósmoklasisty' ||
    subject === 'Polska Matura' ||
    subject === 'Language Classes'
  );
}

// --- Student-facing pricing (what students pay per hour) ---
export const RATE_IB_PLN = 230;
export const RATE_IB_ENTRANCE_EXAM_PLN = 160;
export const RATE_EGZAMIN_OSMOKLASISTY_PLN = 120;
export const RATE_MATURA_PODSTAWOWY_PLN = 160;
export const RATE_MATURA_ROZSZERZONY_PLN = 180;
export const RATE_UNIVERSITY_APPLICATION_SUPPORT_PLN = 300;
export const RATE_SAT_PREPARATION_PLN = 250;
// Flat rate regardless of which language is taught.
export const RATE_LANGUAGE_CLASSES_PLN = 180;
// Subject labels saved on a booked slot can be composite (e.g.
// "Egzamin ósmoklasisty – Matematyka" or "Polska Matura – Matematyka –
// poziom rozszerzony", combining the base subject with the tutor's
// detail — see subjectDisplayLabel below), so this matches by substring
// rather than exact equality. Matura rate depends on which level appears
// anywhere in the label, checked before the generic "starts with Polska
// Matura" fallback.
export function hourlyRateForSubject(subject: string): number {
  if (subject.startsWith('Egzamin ósmoklasisty')) return RATE_EGZAMIN_OSMOKLASISTY_PLN;
  if (subject.startsWith('Egzaminy wstępne do szkół IB')) return RATE_IB_ENTRANCE_EXAM_PLN;
  if (subject.startsWith('Polska Matura')) {
    return subject.includes('poziom rozszerzony') ? RATE_MATURA_ROZSZERZONY_PLN : RATE_MATURA_PODSTAWOWY_PLN;
  }
  if (subject.startsWith('University Application Support')) return RATE_UNIVERSITY_APPLICATION_SUPPORT_PLN;
  if (subject.startsWith('SAT Preparation')) return RATE_SAT_PREPARATION_PLN;
  if (subject.startsWith('Language Classes')) return RATE_LANGUAGE_CLASSES_PLN;
  return RATE_IB_PLN;
}

// --- Tutor payout rates (what tutors are paid per hour) ---
// Separate rate schedule from the student-facing prices above — the
// difference between the two is the platform's margin per session.
export const TUTOR_RATE_IB_PLN = 100;
export const TUTOR_RATE_IB_ENTRANCE_EXAM_PLN = 80;
export const TUTOR_RATE_EGZAMIN_OSMOKLASISTY_PLN = 80;
// Flat payout regardless of Matura subject or level — the platform's
// margin is larger on poziom rozszerzony (80 PLN vs 100 PLN payout)
// since the student price is higher but the tutor rate doesn't change.
export const TUTOR_RATE_MATURA_PLN = 100;
export const TUTOR_RATE_UNIVERSITY_APPLICATION_SUPPORT_PLN = 100;
export const TUTOR_RATE_SAT_PREPARATION_PLN = 100;
// Flat payout regardless of language. NOTE: not specified — matched to
// the 100 PLN default most other service types use. Change if needed.
export const TUTOR_RATE_LANGUAGE_CLASSES_PLN = 100;
export function tutorPayoutRateForSubject(subject: string): number {
  if (subject.startsWith('Egzamin ósmoklasisty')) return TUTOR_RATE_EGZAMIN_OSMOKLASISTY_PLN;
  if (subject.startsWith('Egzaminy wstępne do szkół IB')) return TUTOR_RATE_IB_ENTRANCE_EXAM_PLN;
  if (subject.startsWith('Polska Matura')) return TUTOR_RATE_MATURA_PLN;
  if (subject.startsWith('University Application Support')) return TUTOR_RATE_UNIVERSITY_APPLICATION_SUPPORT_PLN;
  if (subject.startsWith('SAT Preparation')) return TUTOR_RATE_SAT_PREPARATION_PLN;
  if (subject.startsWith('Language Classes')) return TUTOR_RATE_LANGUAGE_CLASSES_PLN;
  return TUTOR_RATE_IB_PLN;
}

// Single source of truth for turning a tutor's subject entry into the
// human-readable label shown to students and used as the canonical
// subject string on bookings. Must produce identical output everywhere
// this is called — API routes validate booked subjects by checking this
// exact string against the tutor's labels.
export function subjectDisplayLabel(ts: { subject: string; detail: string | null }): string {
  if (ts.subject === 'Other' && ts.detail) return ts.detail;
  if (ts.subject === 'Egzamin ósmoklasisty' && ts.detail) return `Egzamin ósmoklasisty – ${ts.detail}`;
  if (ts.subject === 'Polska Matura' && ts.detail) return `Polska Matura – ${ts.detail}`;
  if (ts.subject === 'Language Classes' && ts.detail) return `Language Classes – ${ts.detail}`;
  return ts.subject;
}
export type TutorSubject = {
  subject: string;
  level: string | null;
  detail: string | null;
};
