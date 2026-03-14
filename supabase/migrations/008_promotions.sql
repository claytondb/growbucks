-- Migration 008: Interest Rate Promotions
-- Adds bonus interest rate periods that parents can create for their kids.
-- A promotion adds a bonus_rate_daily on top of the child's base rate for a
-- limited time window. If child_id is NULL it applies to all of the parent's
-- children; otherwise it applies only to the specified child.
--
-- Example: "Summer savings challenge" → +0.5%/day bonus for 30 days

CREATE TABLE IF NOT EXISTS interest_promotions (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id       UUID        REFERENCES children(id) ON DELETE CASCADE, -- null = all children
  name           TEXT        NOT NULL,
  bonus_rate_daily DECIMAL(7,5) NOT NULL, -- e.g. 0.005 = 0.5% bonus per day
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT promotion_bonus_rate_positive CHECK (bonus_rate_daily > 0),
  CONSTRAINT promotion_bonus_rate_max      CHECK (bonus_rate_daily <= 0.10), -- max +10%/day
  CONSTRAINT promotion_valid_period        CHECK (ends_at > starts_at),
  CONSTRAINT promotion_name_not_empty      CHECK (length(trim(name)) > 0),
  CONSTRAINT promotion_name_max_length     CHECK (length(name) <= 100)
);

-- Index for fetching active promotions for a user quickly
CREATE INDEX IF NOT EXISTS idx_interest_promotions_user_id
  ON interest_promotions(user_id);

CREATE INDEX IF NOT EXISTS idx_interest_promotions_child_id
  ON interest_promotions(child_id)
  WHERE child_id IS NOT NULL;

-- Index for cron job: find all currently-active promotions
CREATE INDEX IF NOT EXISTS idx_interest_promotions_active
  ON interest_promotions(starts_at, ends_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_interest_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interest_promotions_updated_at
  BEFORE UPDATE ON interest_promotions
  FOR EACH ROW EXECUTE FUNCTION update_interest_promotions_updated_at();

-- RLS
ALTER TABLE interest_promotions ENABLE ROW LEVEL SECURITY;

-- Parents can only see/manage their own promotions
CREATE POLICY "parents_own_promotions" ON interest_promotions
  USING (auth.uid()::text = user_id::text);
