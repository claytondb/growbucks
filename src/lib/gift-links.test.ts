import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  validateCreateGiftLink,
  validateRedeemGiftLink,
  generateGiftToken,
  isValidTokenFormat,
  getLinkStatus,
  remainingUses,
  formatGiftAmount,
  buildGiftUrl,
  formatExpiry,
  sortGiftLinks,
  sortRedemptions,
  countPendingRedemptions,
  totalApprovedGiftCents,
  redemptionStatusBadge,
  GIFT_MIN_CENTS,
  GIFT_MAX_CENTS,
  MAX_USES_LIMIT,
  GIFT_LINK_LABEL_MAX_LENGTH,
  GIFT_LINK_MESSAGE_MAX_LENGTH,
  GIVER_NAME_MAX_LENGTH,
  GIVER_MESSAGE_MAX_LENGTH,
  type GiftLink,
  type GiftLinkRedemption,
} from './gift-links';

// ─── Test Helpers ──────────────────────────────────────────────────────────────

function makeLink(overrides: Partial<GiftLink> = {}): GiftLink {
  return {
    id: 'link-1',
    token: 'a'.repeat(32),
    child_id: 'child-1',
    created_by: 'user-1',
    label: 'Birthday Gift Link',
    message: null,
    max_uses: null,
    use_count: 0,
    max_amount_per_gift_cents: null,
    expires_at: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRedemption(overrides: Partial<GiftLinkRedemption> = {}): GiftLinkRedemption {
  return {
    id: 'redemption-1',
    gift_link_id: 'link-1',
    child_id: 'child-1',
    giver_name: 'Grandma Jo',
    giver_message: 'Happy birthday!',
    amount_cents: 2500,
    transaction_id: null,
    status: 'pending',
    redeemed_at: '2026-03-01T12:00:00Z',
    reviewed_at: null,
    reviewed_by: null,
    ...overrides,
  };
}

// ─── validateCreateGiftLink ────────────────────────────────────────────────────

describe('validateCreateGiftLink', () => {
  it('accepts minimal valid input', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1' });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts full valid input', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const result = validateCreateGiftLink({
      child_id: 'child-1',
      label: 'Birthday 2026',
      message: 'Welcome family!',
      max_uses: 10,
      max_amount_per_gift_cents: 5000,
      expires_at: future,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects missing child_id', () => {
    const result = validateCreateGiftLink({ child_id: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('child_id is required');
  });

  it('rejects blank label', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', label: '   ' });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('label'))).toBe(true);
  });

  it('rejects label that is too long', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', label: 'x'.repeat(GIFT_LINK_LABEL_MAX_LENGTH + 1) });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('label'))).toBe(true);
  });

  it('rejects message that is too long', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', message: 'x'.repeat(GIFT_LINK_MESSAGE_MAX_LENGTH + 1) });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('message'))).toBe(true);
  });

  it('rejects max_uses of 0', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', max_uses: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects max_uses above limit', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', max_uses: MAX_USES_LIMIT + 1 });
    expect(result.ok).toBe(false);
  });

  it('rejects max_amount_per_gift_cents below minimum', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', max_amount_per_gift_cents: 50 });
    expect(result.ok).toBe(false);
  });

  it('rejects max_amount_per_gift_cents above maximum', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', max_amount_per_gift_cents: GIFT_MAX_CENTS + 1 });
    expect(result.ok).toBe(false);
  });

  it('rejects expires_at in the past', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = validateCreateGiftLink({ child_id: 'child-1', expires_at: past });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('future'))).toBe(true);
  });

  it('rejects invalid expires_at string', () => {
    const result = validateCreateGiftLink({ child_id: 'child-1', expires_at: 'not-a-date' });
    expect(result.ok).toBe(false);
  });
});

// ─── validateRedeemGiftLink ────────────────────────────────────────────────────

describe('validateRedeemGiftLink', () => {
  const link = makeLink();

  it('accepts valid redemption', () => {
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', amount_cents: 2500 }, link);
    expect(result.ok).toBe(true);
  });

  it('rejects missing giver_name', () => {
    const result = validateRedeemGiftLink({ giver_name: '', amount_cents: 2500 }, link);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('giver_name'))).toBe(true);
  });

  it('rejects giver_name that is too long', () => {
    const result = validateRedeemGiftLink({ giver_name: 'x'.repeat(GIVER_NAME_MAX_LENGTH + 1), amount_cents: 2500 }, link);
    expect(result.ok).toBe(false);
  });

  it('rejects giver_message that is too long', () => {
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', giver_message: 'x'.repeat(GIVER_MESSAGE_MAX_LENGTH + 1), amount_cents: 2500 }, link);
    expect(result.ok).toBe(false);
  });

  it('rejects amount below minimum', () => {
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', amount_cents: GIFT_MIN_CENTS - 1 }, link);
    expect(result.ok).toBe(false);
  });

  it('rejects amount above maximum', () => {
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', amount_cents: GIFT_MAX_CENTS + 1 }, link);
    expect(result.ok).toBe(false);
  });

  it('rejects amount above per-gift cap', () => {
    const cappedLink = makeLink({ max_amount_per_gift_cents: 1000 });
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', amount_cents: 1001 }, cappedLink);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('cap'))).toBe(true);
  });

  it('accepts amount exactly at per-gift cap', () => {
    const cappedLink = makeLink({ max_amount_per_gift_cents: 1000 });
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', amount_cents: 1000 }, cappedLink);
    expect(result.ok).toBe(true);
  });

  it('allows any amount when no per-gift cap is set', () => {
    const result = validateRedeemGiftLink({ giver_name: 'Grandma', amount_cents: 50000 }, link);
    expect(result.ok).toBe(true);
  });
});

// ─── generateGiftToken ────────────────────────────────────────────────────────

describe('generateGiftToken', () => {
  it('returns a 32-character hex string', () => {
    const token = generateGiftToken();
    expect(token).toHaveLength(32);
    expect(isValidTokenFormat(token)).toBe(true);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateGiftToken()));
    expect(tokens.size).toBe(20);
  });
});

// ─── isValidTokenFormat ───────────────────────────────────────────────────────

describe('isValidTokenFormat', () => {
  it('accepts valid 32-char hex', () => {
    expect(isValidTokenFormat('a'.repeat(32))).toBe(true);
    expect(isValidTokenFormat('0123456789abcdef0123456789abcdef')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidTokenFormat('a'.repeat(31))).toBe(false);
    expect(isValidTokenFormat('a'.repeat(33))).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidTokenFormat('g'.repeat(32))).toBe(false);
    expect(isValidTokenFormat('AAAA'.repeat(8))).toBe(false); // uppercase
  });
});

// ─── getLinkStatus ────────────────────────────────────────────────────────────

describe('getLinkStatus', () => {
  it('returns active for an open link', () => {
    const status = getLinkStatus(makeLink());
    expect(status.usable).toBe(true);
    expect(status.reason).toBe('active');
  });

  it('returns deactivated when is_active=false', () => {
    const status = getLinkStatus(makeLink({ is_active: false }));
    expect(status.usable).toBe(false);
    expect(status.reason).toBe('deactivated');
  });

  it('returns expired when past expires_at', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const status = getLinkStatus(makeLink({ expires_at: past }));
    expect(status.usable).toBe(false);
    expect(status.reason).toBe('expired');
  });

  it('returns active when expires_at is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const status = getLinkStatus(makeLink({ expires_at: future }));
    expect(status.usable).toBe(true);
  });

  it('returns max_uses_reached when fully used', () => {
    const status = getLinkStatus(makeLink({ max_uses: 3, use_count: 3 }));
    expect(status.usable).toBe(false);
    expect(status.reason).toBe('max_uses_reached');
  });

  it('returns active when under max_uses', () => {
    const status = getLinkStatus(makeLink({ max_uses: 5, use_count: 4 }));
    expect(status.usable).toBe(true);
  });

  it('deactivated takes priority over expired', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const status = getLinkStatus(makeLink({ is_active: false, expires_at: past }));
    expect(status.reason).toBe('deactivated');
  });
});

// ─── remainingUses ────────────────────────────────────────────────────────────

describe('remainingUses', () => {
  it('returns null when no max_uses', () => {
    expect(remainingUses(makeLink())).toBeNull();
  });

  it('returns correct remaining count', () => {
    expect(remainingUses(makeLink({ max_uses: 10, use_count: 3 }))).toBe(7);
  });

  it('returns 0 when fully used', () => {
    expect(remainingUses(makeLink({ max_uses: 5, use_count: 5 }))).toBe(0);
  });

  it('does not go negative', () => {
    expect(remainingUses(makeLink({ max_uses: 3, use_count: 5 }))).toBe(0);
  });
});

// ─── formatGiftAmount ─────────────────────────────────────────────────────────

describe('formatGiftAmount', () => {
  it('formats dollars and cents', () => {
    expect(formatGiftAmount(2500)).toBe('$25.00');
    expect(formatGiftAmount(100)).toBe('$1.00');
    expect(formatGiftAmount(1)).toBe('$0.01');
  });

  it('formats large amounts', () => {
    expect(formatGiftAmount(100000)).toBe('$1000.00');
  });
});

// ─── buildGiftUrl ─────────────────────────────────────────────────────────────

describe('buildGiftUrl', () => {
  it('builds a correct URL with base', () => {
    expect(buildGiftUrl('abc123', 'https://growbucks.app')).toBe('https://growbucks.app/gift/abc123');
  });

  it('strips trailing slash from base', () => {
    expect(buildGiftUrl('abc123', 'https://growbucks.app/')).toBe('https://growbucks.app/gift/abc123');
  });

  it('works with empty base', () => {
    expect(buildGiftUrl('abc123')).toBe('/gift/abc123');
  });
});

// ─── formatExpiry ─────────────────────────────────────────────────────────────

describe('formatExpiry', () => {
  it('returns null when no expiry', () => {
    expect(formatExpiry(makeLink())).toBeNull();
  });

  it('returns a formatted string when expiry is set', () => {
    const result = formatExpiry(makeLink({ expires_at: '2026-12-31T00:00:00Z' }));
    expect(result).toMatch(/Expires/);
    expect(result).toMatch(/2026/);
  });
});

// ─── sortGiftLinks ────────────────────────────────────────────────────────────

describe('sortGiftLinks', () => {
  it('puts active links before inactive ones', () => {
    const inactive = makeLink({ id: 'l1', is_active: false, created_at: '2026-01-02T00:00:00Z' });
    const active = makeLink({ id: 'l2', is_active: true, created_at: '2026-01-01T00:00:00Z' });
    const sorted = sortGiftLinks([inactive, active]);
    expect(sorted[0].id).toBe('l2');
  });

  it('sorts active links newest first', () => {
    const older = makeLink({ id: 'l1', created_at: '2026-01-01T00:00:00Z' });
    const newer = makeLink({ id: 'l2', created_at: '2026-02-01T00:00:00Z' });
    const sorted = sortGiftLinks([older, newer]);
    expect(sorted[0].id).toBe('l2');
  });
});

// ─── sortRedemptions ──────────────────────────────────────────────────────────

describe('sortRedemptions', () => {
  it('puts pending redemptions first', () => {
    const approved = makeRedemption({ id: 'r1', status: 'approved', redeemed_at: '2026-03-02T00:00:00Z' });
    const pending = makeRedemption({ id: 'r2', status: 'pending', redeemed_at: '2026-03-01T00:00:00Z' });
    const sorted = sortRedemptions([approved, pending]);
    expect(sorted[0].id).toBe('r2');
  });

  it('sorts non-pending by most recent first', () => {
    const older = makeRedemption({ id: 'r1', status: 'approved', redeemed_at: '2026-02-01T00:00:00Z' });
    const newer = makeRedemption({ id: 'r2', status: 'approved', redeemed_at: '2026-03-01T00:00:00Z' });
    const sorted = sortRedemptions([older, newer]);
    expect(sorted[0].id).toBe('r2');
  });
});

// ─── countPendingRedemptions ──────────────────────────────────────────────────

describe('countPendingRedemptions', () => {
  it('returns 0 for empty array', () => {
    expect(countPendingRedemptions([])).toBe(0);
  });

  it('counts only pending redemptions', () => {
    const redemptions = [
      makeRedemption({ status: 'pending' }),
      makeRedemption({ status: 'approved' }),
      makeRedemption({ status: 'pending' }),
      makeRedemption({ status: 'rejected' }),
    ];
    expect(countPendingRedemptions(redemptions)).toBe(2);
  });
});

// ─── totalApprovedGiftCents ───────────────────────────────────────────────────

describe('totalApprovedGiftCents', () => {
  it('returns 0 for empty array', () => {
    expect(totalApprovedGiftCents([])).toBe(0);
  });

  it('sums only approved redemptions', () => {
    const redemptions = [
      makeRedemption({ status: 'approved', amount_cents: 1000 }),
      makeRedemption({ status: 'pending', amount_cents: 500 }),
      makeRedemption({ status: 'approved', amount_cents: 2000 }),
      makeRedemption({ status: 'rejected', amount_cents: 750 }),
    ];
    expect(totalApprovedGiftCents(redemptions)).toBe(3000);
  });
});

// ─── redemptionStatusBadge ────────────────────────────────────────────────────

describe('redemptionStatusBadge', () => {
  it('returns correct badge for pending', () => {
    const badge = redemptionStatusBadge('pending');
    expect(badge.emoji).toBe('⏳');
    expect(badge.label).toBe('Awaiting approval');
  });

  it('returns correct badge for approved', () => {
    const badge = redemptionStatusBadge('approved');
    expect(badge.emoji).toBe('🎁');
  });

  it('returns correct badge for rejected', () => {
    const badge = redemptionStatusBadge('rejected');
    expect(badge.emoji).toBe('❌');
  });
});
