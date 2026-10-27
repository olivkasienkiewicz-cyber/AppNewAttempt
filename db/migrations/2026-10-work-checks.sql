-- Written Work Check (Sprawdzanie prac pisemnych)
-- Run once in the Neon SQL editor before deploying the code that uses it.

CREATE TABLE IF NOT EXISTS work_checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product          text NOT NULL,              -- see WORK_CHECK_PRODUCTS in src/lib/work-check.ts
  subject          text,                       -- IA / EE subject, e.g. "History"
  second_check     boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'awaiting_payment'
                   CHECK (status IN ('awaiting_quote','awaiting_payment','paid','delivered','cancelled')),
  base_price       numeric,                    -- admin-confirmed base for "from" products
  amount           numeric,                    -- what the student pays (after discount); null while awaiting a quote
  discount_code    text,                       -- code applied (or requested, while awaiting a quote)
  student_id       uuid NOT NULL REFERENCES users(id),
  ordered_by_id    uuid NOT NULL REFERENCES users(id),  -- the student, or the parent who ordered
  tutor_id         uuid REFERENCES users(id),
  tutor_payout     numeric,
  student_note     text,
  draft_url        text NOT NULL,
  draft_name       text NOT NULL,
  feedback_url     text,
  feedback_name    text,
  feedback_summary text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz,
  due_at           timestamptz,
  delivered_at     timestamptz
);

CREATE INDEX IF NOT EXISTS work_checks_student_idx ON work_checks (student_id);
CREATE INDEX IF NOT EXISTS work_checks_tutor_idx ON work_checks (tutor_id);
CREATE INDEX IF NOT EXISTS work_checks_delivered_idx ON work_checks (delivered_at);
