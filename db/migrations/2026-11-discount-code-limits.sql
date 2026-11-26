-- Per-code limits for discount codes (first used by BFSTUDILLY50, Black Friday 2026).
-- Safe to run more than once. Existing codes are unaffected (NULL / false = no limit).
--
--   allowed_subject_groups  Only sessions in these groups qualify. NULL = any subject.
--                           Groups: 'ib' (IB Diploma subjects), 'sat' (SAT Preparation),
--                           'university_applications' (University Application Support).
--                           Bookings without a known subject (e.g. work checks) never qualify.
--   new_students_only       Only students with no paid or held class, no paid work check
--                           and no previous referral (same rule as referral codes).

ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS allowed_subject_groups text[];
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS new_students_only boolean NOT NULL DEFAULT false;

-- Black Friday 2026: -50% on the first session, new students only, IB / SAT / uni applications.
UPDATE discount_codes
SET allowed_subject_groups = ARRAY['ib', 'sat', 'university_applications'],
    new_students_only = true
WHERE code = 'BFSTUDILLY50';
