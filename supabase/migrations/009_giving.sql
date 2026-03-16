-- Migration 009: Charitable Giving
-- Adds donation_pledges table for the charitable giving feature.
-- Children propose donations, parents approve or reject them.
-- On approval a matching `donation` transaction is created.

-- ─── Enum-like constraint helper ──────────────────────────────────────────────

-- donation_pledges ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS donation_pledges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  cause_name        TEXT        NOT NULL CHECK (char_length(cause_name) <= 100),
  message           TEXT        CHECK (char_length(message) <= 500),
  amount_cents      INTEGER     NOT NULL CHECK (amount_cents >= 1 AND amount_cents <= 100000),
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       TEXT,                 -- parent user email
  rejection_reason  TEXT        CHECK (char_length(rejection_reason) <= 255),
  transaction_id    UUID        REFERENCES transactions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by child
CREATE INDEX IF NOT EXISTS idx_donation_pledges_child_id
  ON donation_pledges(child_id);

-- Index for pending review queue
CREATE INDEX IF NOT EXISTS idx_donation_pledges_status
  ON donation_pledges(status)
  WHERE status = 'pending';

-- ─── Update transaction type constraint ───────────────────────────────────────
-- Add 'donation' to the allowed transaction types.
-- (In a real Supabase env this would be done via Supabase dashboard or a
--  migration that alters the check constraint. We document it here.)

-- ALTER TABLE transactions
--   DROP CONSTRAINT IF EXISTS transactions_type_check;
-- ALTER TABLE transactions
--   ADD CONSTRAINT transactions_type_check
--   CHECK (type IN (
--     'deposit', 'withdrawal', 'interest', 'adjustment',
--     'savings_deposit', 'savings_release', 'donation'
--   ));

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- Note: In production Supabase these would be full RLS policies.
-- The app layer enforces access control via session checks.

-- Enable RLS on the new table (policies applied via Supabase dashboard)
ALTER TABLE donation_pledges ENABLE ROW LEVEL SECURITY;

-- ─── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE donation_pledges IS
  'Charitable donation requests submitted by children for parent approval.';

COMMENT ON COLUMN donation_pledges.cause_name IS
  'Name of the charity or cause (e.g. "Animal Shelter")';

COMMENT ON COLUMN donation_pledges.message IS
  'Optional message from the child explaining their choice';

COMMENT ON COLUMN donation_pledges.amount_cents IS
  'Requested donation amount in cents, deducted from spend balance on approval';

COMMENT ON COLUMN donation_pledges.transaction_id IS
  'Linked donation transaction created when parent approves';
