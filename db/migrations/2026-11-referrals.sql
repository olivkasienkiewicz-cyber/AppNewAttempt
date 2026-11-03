-- Referral programme: "Poleć znajomego — oboje dostajecie 50 zł zniżki"
-- Run once in the Neon SQL editor BEFORE deploying the code that uses it.
--
-- How it works:
--   * Every student (or parent booking under their own account) gets one
--     personal referral code, stored in discount_codes with kind = 'referral'
--     (flat 50 PLN, singles + bundles, one use per student).
--   * A friend uses it on their first booking -> a row in `referrals`.
--   * When the friend's first class is marked completed (or their first
--     written work check is delivered), the referrer automatically gets a
--     one-time 50 PLN reward code (kind = 'referral_reward').

ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'standard';
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id);

-- One personal referral code per account
CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_one_referral_per_owner
  ON discount_codes (owner_user_id) WHERE kind = 'referral';

CREATE TABLE IF NOT EXISTS referrals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       uuid NOT NULL REFERENCES users(id),
  referred_id       uuid NOT NULL UNIQUE REFERENCES users(id),   -- a student can only ever be referred once
  referral_code_id  uuid NOT NULL REFERENCES discount_codes(id),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded')),
  reward_code_id    uuid REFERENCES discount_codes(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  rewarded_at       timestamptz
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);

-- Tracks who has already received the one-off "referral programme" announcement
-- email sent from /admin/referrals, so a second click never double-sends.
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_announcement_sent_at timestamptz;
