-- GrowBucks Split Savings Schema
-- Allows parents to automatically split deposits between "spend" and "save" buckets.
-- The "save" portion is locked and can only be released back to spending by a parent.
--
-- How it works:
--   balance_cents          = total balance (spend + save), used for interest calculation
--   save_balance_cents     = locked savings portion
--   spend_balance_cents    = derived: balance_cents - save_balance_cents (displayed in UI only)
--   split_save_percent     = stored on child_settings; 0 = no split (default)

-- ── 1. Add save_balance_cents to children ─────────────────────────────────────
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS save_balance_cents BIGINT NOT NULL DEFAULT 0
    CHECK (save_balance_cents >= 0);

-- Ensure save balance never exceeds total balance
ALTER TABLE children
  ADD CONSTRAINT chk_save_lte_balance
    CHECK (save_balance_cents <= balance_cents);

-- ── 2. Add split_save_percent to child_settings ───────────────────────────────
ALTER TABLE child_settings
  ADD COLUMN IF NOT EXISTS split_save_percent SMALLINT NOT NULL DEFAULT 0
    CHECK (split_save_percent >= 0 AND split_save_percent <= 90);

-- ── 3. Expand transaction type to include savings movements ──────────────────
-- Drop and recreate the check constraint to include new types.
-- (Supabase / Postgres: drop old constraint by name then add new one.)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check
    CHECK (type IN (
      'deposit',
      'withdrawal',
      'interest',
      'adjustment',
      'savings_deposit',    -- auto-split to savings on incoming deposit
      'savings_release'     -- parent moves savings → spending
    ));

-- ── 4. Helpful index ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_child_type
  ON transactions(child_id, type);

-- ── Notes for app deployment ──────────────────────────────────────────────────
-- After running this migration:
--   1. Deploy app code (split-savings.ts, updated API routes, UI components)
--   2. Existing children will have save_balance_cents = 0 and split_save_percent = 0
--      (no behaviour change for existing accounts until a parent enables it)
