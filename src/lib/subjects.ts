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
  'Other',
] as const;
export const ALL_SUBJECTS = [...IB_SUBJECTS, ...SERVICE_SUBJECTS] as const;
export const LEVEL_OPTIONS = ['HL', 'SL', 'HL/SL'] as const;
export function subjectRequiresLevel(subject: string): boolean {
  return (IB_SUBJECTS as readonly string[]).includes(subject);
}
// "University Application Support", "Egzamin ósmoklasisty", and "Other"
// all carry a free-text detail field. For University Application Support
// it's optional context (e.g. "UK, US, Canada"). For "Other" it's required
// and IS the custom subject name. For "Egzamin ósmoklasisty" it specifies
// which exam component the tutor teaches (e.g. "matematyka", "angielski").
export function subjectSupportsDetail(subject: string): boolean {
  return (
    subject === 'University Application Support' ||
    subject === 'Egzamin ósmoklasisty' ||
    subject === 'Other'
  );
}
export function subjectDetailRequired(subject: string): boolean {
  return subject === 'Other' || subject === 'Egzamin ósmoklasisty';
}
export const MAX_DETAIL_LEN = 100;

// Pricing tiers — each subject maps to one hourly rate in PLN.
export const RATE_IB_PLN = 230;
export const RATE_IB_ENTRANCE_EXAM_PLN = 160;
export const RATE_EGZAMIN_OSMOKLASISTY_PLN = 120;

export function hourlyRateForSubject(subject: string): number {
  if (subject === 'Egzamin ósmoklasisty') return RATE_EGZAMIN_OSMOKLASISTY_PLN;
  if (subject === 'Egzaminy wstępne do szkół IB') return RATE_IB_ENTRANCE_EXAM_PLN;
  return RATE_IB_PLN;
}

export type TutorSubject = {
  subject: string;
  level: string | null;
  detail: string | null;
};
