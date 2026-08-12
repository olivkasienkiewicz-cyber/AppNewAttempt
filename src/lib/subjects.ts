// Single source of truth for every subject a tutor can offer, and whether
// that subject needs an HL/SL level. Used by the tutor profile edit page,
// the API validation, and the student browse/filter page.

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
  'Other',
] as const;

export const ALL_SUBJECTS = [...IB_SUBJECTS, ...SERVICE_SUBJECTS] as const;

export const LEVEL_OPTIONS = ['HL', 'SL', 'HL/SL'] as const;

export function subjectRequiresLevel(subject: string): boolean {
  return (IB_SUBJECTS as readonly string[]).includes(subject);
}

// "University Application Support" and "Other" both carry a free-text
// detail field — for the former it's optional context (e.g. "UK, US,
// Canada"), for the latter it's required and IS the custom subject name
// the tutor is describing (e.g. "Latin", "IELTS Prep").
export function subjectSupportsDetail(subject: string): boolean {
  return subject === 'University Application Support' || subject === 'Other';
}

export function subjectDetailRequired(subject: string): boolean {
  return subject === 'Other';
}

export const MAX_DETAIL_LEN = 100;

export type TutorSubject = {
  subject: string;
  level: string | null;
  detail: string | null;
};
