-- Migration 010: Gift Links
-- Enables parents to create shareable links that let relatives (grandparents,
-- aunts/uncles, family friends) deposit money as gifts for a specific child.
-- The gift link is public (no login required for the giver) but redemption
-- creates a *pending* deposit that requires parent approval before money lands.
--
-- Design decisions:
--   - Tokens are 32-character random hex strings (URL-safe, unguessable)
--   - Each link is tied to one child and one parent family
--   - Links can optionally have a max total amount or expiry date
--   - Single-use links auto-deactivate on first redemption
--   - Parents can revoke links at any time

-- ─── gift_links ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_links (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT        NOT NULL UNIQUE,
  child_id        UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_by      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT        NOT NULL DEFAULT 'Gift'
                              CHECK (char_length(label) <= 100),
  message         TEXT        CHECK (char_length(message) <= 500),
  -- Optional constraints
  max_uses        INTEGER     CHECK (max_uses IS NULL OR max_uses >= 1),
  use_count       INTEGER     NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  max_amount_per_gift_cents INTEGER CHECK (max_amount_per_gift_cents IS NULL OR max_amount_per_gift_cents >= 100),
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── gift_link_redemptions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_link_redemptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_link_id    UUID        NOT NULL REFERENCES gift_links(id) ON DELETE CASCADE,
  child_id        UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  giver_name      TEXT        NOT NULL CHECK (char_length(giver_name) <= 100),
  giver_message   TEXT        CHECK (char_length(giver_message) <= 300),
  amount_cents    INTEGER     NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 100000),
  -- Linked pending deposit transaction
  transaction_id  UUID        REFERENCES transactions(id) ON DELETE SET NULL,
  -- Status mirrors transaction status
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_gift_links_token ON gift_links(token);
CREATE INDEX IF NOT EXISTS idx_gift_links_child_id ON gift_links(child_id);
CREATE INDEX IF NOT EXISTS idx_gift_links_created_by ON gift_links(created_by);
CREATE INDEX IF NOT EXISTS idx_gift_link_redemptions_link_id ON gift_link_redemptions(gift_link_id);
CREATE INDEX IF NOT EXISTS idx_gift_link_redemptions_child_id ON gift_link_redemptions(child_id);
