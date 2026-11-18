-- Automatic payment reminders: one email per unpaid session, 48h after the
-- class has been held. Run once in the Neon SQL editor BEFORE deploying the
-- code that uses it.
--
-- payment_reminder_sent_at is set the moment a reminder goes out, so a
-- session is never reminded twice (and a double-run of the job is harmless).

ALTER TABLE slots ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;
