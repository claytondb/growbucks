import { describe, it, expect } from 'vitest';
import {
  validateCreateDonation,
  validateReviewDonation,
  hasSufficientBalance,
  balanceAfterDonation,
  formatDonationAmount,
  getDonationStatusBadge,
  sortDonations,
  countPendingDonations,
  totalDonatedCents,
  getGivingMilestoneMessage,
  CAUSE_NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  REJECTION_REASON_MAX_LENGTH,
  DONATION_MIN_CENTS,
  DONATION_MAX_CENTS,
  type DonationPledge,
} from './giving';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePledge(overrides: Partial<DonationPledge> = {}): DonationPledge {
  return {
    id: 'pledge-1',
    child_id: 'child-1',
    cause_name: 'Animal Shelter',
    message: 'I love animals!',
    amount_cents: 500,
    status: 'pending',
    submitted_at: '2026-03-10T10:00:00Z',
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    transaction_id: null,
    created_at: '2026-03-10T10:00:00Z',
    ...overrides,
  };
}

// ─── validateCreateDonation ───────────────────────────────────────────────────

describe('validateCreateDonation', () => {
  it('accepts a valid donation', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Animal Shelter',
      message: 'Help the cats!',
      amount_cents: 500,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a donation with no message', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Hunger Relief',
      amount_cents: 1000,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects missing cause_name', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: '',
      amount_cents: 500,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Cause name is required');
  });

  it('rejects cause_name that is too long', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'A'.repeat(CAUSE_NAME_MAX_LENGTH + 1),
      amount_cents: 500,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Cause name must be/);
  });

  it('rejects message that is too long', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Test',
      message: 'B'.repeat(MESSAGE_MAX_LENGTH + 1),
      amount_cents: 500,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Message must be/);
  });

  it('rejects missing amount', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Test',
      // @ts-expect-error intentional
      amount_cents: undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Donation amount is required');
  });

  it('rejects amount below minimum', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Test',
      amount_cents: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /at least|whole number/.test(e))).toBe(true);
  });

  it(`rejects amount above maximum (${DONATION_MAX_CENTS} cents)`, () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Test',
      amount_cents: DONATION_MAX_CENTS + 1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/cannot exceed/);
  });

  it('rejects non-integer cents', () => {
    const result = validateCreateDonation({
      child_id: 'child-1',
      cause_name: 'Test',
      amount_cents: 5.5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/whole number/);
  });

  it('rejects missing child_id', () => {
    const result = validateCreateDonation({
      child_id: '',
      cause_name: 'Test',
      amount_cents: 500,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Child ID is required');
  });

  it('collects multiple errors at once', () => {
    const result = validateCreateDonation({
      child_id: '',
      cause_name: '',
      amount_cents: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it(`accepts boundary minimum (${DONATION_MIN_CENTS} cent)`, () => {
    const result = validateCreateDonation({
      child_id: 'c',
      cause_name: 'Test',
      amount_cents: DONATION_MIN_CENTS,
    });
    expect(result.valid).toBe(true);
  });

  it(`accepts boundary maximum (${DONATION_MAX_CENTS} cents)`, () => {
    const result = validateCreateDonation({
      child_id: 'c',
      cause_name: 'Test',
      amount_cents: DONATION_MAX_CENTS,
    });
    expect(result.valid).toBe(true);
  });
});

// ─── validateReviewDonation ───────────────────────────────────────────────────

describe('validateReviewDonation', () => {
  it('accepts approval with no reason', () => {
    const result = validateReviewDonation({ approved: true });
    expect(result.valid).toBe(true);
  });

  it('accepts rejection with a reason', () => {
    const result = validateReviewDonation({ approved: false, rejection_reason: 'Too much' });
    expect(result.valid).toBe(true);
  });

  it('accepts rejection with no reason', () => {
    const result = validateReviewDonation({ approved: false });
    expect(result.valid).toBe(true);
  });

  it('rejects if approved is not a boolean', () => {
    // @ts-expect-error intentional
    const result = validateReviewDonation({ approved: 'yes' });
    expect(result.valid).toBe(false);
  });

  it('rejects rejection_reason that is too long', () => {
    const result = validateReviewDonation({
      approved: false,
      rejection_reason: 'X'.repeat(REJECTION_REASON_MAX_LENGTH + 1),
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Rejection reason/);
  });

  it('allows long approval reason (not validated for approvals)', () => {
    // We only validate rejection_reason length when not approved
    const result = validateReviewDonation({
      approved: true,
      rejection_reason: 'X'.repeat(REJECTION_REASON_MAX_LENGTH + 1),
    });
    expect(result.valid).toBe(true);
  });
});

// ─── hasSufficientBalance ─────────────────────────────────────────────────────

describe('hasSufficientBalance', () => {
  it('returns true when balance equals donation', () => {
    expect(hasSufficientBalance(500, 500)).toBe(true);
  });

  it('returns true when balance exceeds donation', () => {
    expect(hasSufficientBalance(1000, 500)).toBe(true);
  });

  it('returns false when balance is less than donation', () => {
    expect(hasSufficientBalance(400, 500)).toBe(false);
  });

  it('returns false when balance is zero', () => {
    expect(hasSufficientBalance(0, 100)).toBe(false);
  });
});

// ─── balanceAfterDonation ─────────────────────────────────────────────────────

describe('balanceAfterDonation', () => {
  it('subtracts correctly', () => {
    expect(balanceAfterDonation(1000, 300)).toBe(700);
  });

  it('returns zero when exact match', () => {
    expect(balanceAfterDonation(500, 500)).toBe(0);
  });
});

// ─── formatDonationAmount ─────────────────────────────────────────────────────

describe('formatDonationAmount', () => {
  it('formats whole dollar amounts', () => {
    expect(formatDonationAmount(500)).toBe('$5.00');
  });

  it('formats sub-dollar amounts', () => {
    expect(formatDonationAmount(99)).toBe('$0.99');
  });

  it('formats large amounts', () => {
    expect(formatDonationAmount(100000)).toBe('$1000.00');
  });

  it('formats zero', () => {
    expect(formatDonationAmount(0)).toBe('$0.00');
  });
});

// ─── getDonationStatusBadge ───────────────────────────────────────────────────

describe('getDonationStatusBadge', () => {
  it('returns pending badge', () => {
    const badge = getDonationStatusBadge('pending');
    expect(badge.emoji).toBe('⏳');
    expect(badge.label).toBeTruthy();
  });

  it('returns approved badge', () => {
    const badge = getDonationStatusBadge('approved');
    expect(badge.emoji).toBe('💚');
  });

  it('returns rejected badge', () => {
    const badge = getDonationStatusBadge('rejected');
    expect(badge.emoji).toBe('❌');
  });

  it('returns different colors for each status', () => {
    const pending = getDonationStatusBadge('pending').color;
    const approved = getDonationStatusBadge('approved').color;
    const rejected = getDonationStatusBadge('rejected').color;
    expect(new Set([pending, approved, rejected]).size).toBe(3);
  });
});

// ─── sortDonations ────────────────────────────────────────────────────────────

describe('sortDonations', () => {
  it('puts pending pledges first', () => {
    const pledges = [
      makePledge({ id: '1', status: 'approved', submitted_at: '2026-03-10T12:00:00Z' }),
      makePledge({ id: '2', status: 'pending', submitted_at: '2026-03-08T12:00:00Z' }),
      makePledge({ id: '3', status: 'rejected', submitted_at: '2026-03-09T12:00:00Z' }),
    ];
    const sorted = sortDonations(pledges);
    expect(sorted[0].status).toBe('pending');
  });

  it('sorts non-pending by most recent first', () => {
    const pledges = [
      makePledge({ id: '1', status: 'approved', submitted_at: '2026-03-08T12:00:00Z' }),
      makePledge({ id: '2', status: 'rejected', submitted_at: '2026-03-10T12:00:00Z' }),
    ];
    const sorted = sortDonations(pledges);
    expect(sorted[0].id).toBe('2'); // newer
  });

  it('does not mutate the original array', () => {
    const pledges = [makePledge({ id: 'a' }), makePledge({ id: 'b' })];
    const original = [...pledges];
    sortDonations(pledges);
    expect(pledges[0].id).toBe(original[0].id);
  });

  it('handles an empty array', () => {
    expect(sortDonations([])).toEqual([]);
  });
});

// ─── countPendingDonations ────────────────────────────────────────────────────

describe('countPendingDonations', () => {
  it('counts only pending pledges', () => {
    const pledges = [
      makePledge({ status: 'pending' }),
      makePledge({ status: 'pending' }),
      makePledge({ status: 'approved' }),
      makePledge({ status: 'rejected' }),
    ];
    expect(countPendingDonations(pledges)).toBe(2);
  });

  it('returns 0 when no pending', () => {
    expect(countPendingDonations([makePledge({ status: 'approved' })])).toBe(0);
  });

  it('returns 0 for empty list', () => {
    expect(countPendingDonations([])).toBe(0);
  });
});

// ─── totalDonatedCents ────────────────────────────────────────────────────────

describe('totalDonatedCents', () => {
  it('sums approved pledges only', () => {
    const pledges = [
      makePledge({ status: 'approved', amount_cents: 500 }),
      makePledge({ status: 'approved', amount_cents: 1000 }),
      makePledge({ status: 'pending', amount_cents: 2000 }),
      makePledge({ status: 'rejected', amount_cents: 3000 }),
    ];
    expect(totalDonatedCents(pledges)).toBe(1500);
  });

  it('returns 0 when nothing approved', () => {
    expect(totalDonatedCents([makePledge({ status: 'pending' })])).toBe(0);
  });

  it('returns 0 for empty list', () => {
    expect(totalDonatedCents([])).toBe(0);
  });
});

// ─── getGivingMilestoneMessage ────────────────────────────────────────────────

describe('getGivingMilestoneMessage', () => {
  it('returns null for no donations', () => {
    expect(getGivingMilestoneMessage(0)).toBeNull();
  });

  it('returns first milestone at $1', () => {
    const msg = getGivingMilestoneMessage(100);
    expect(msg).not.toBeNull();
    expect(msg).toMatch(/dollar|donated/i);
  });

  it('returns $10 milestone', () => {
    const msg = getGivingMilestoneMessage(1000);
    expect(msg).toContain('$10');
  });

  it('returns $25 milestone', () => {
    const msg = getGivingMilestoneMessage(2500);
    expect(msg).toContain('$25');
  });

  it('returns $50 milestone', () => {
    const msg = getGivingMilestoneMessage(5000);
    expect(msg).toContain('$50');
  });

  it('returns $100 milestone', () => {
    const msg = getGivingMilestoneMessage(10000);
    expect(msg).toContain('$100');
  });

  it('returns highest applicable milestone for large amounts', () => {
    // $150 should match the $100 tier
    const msg = getGivingMilestoneMessage(15000);
    expect(msg).toContain('$100');
  });

  it('returns null below first milestone', () => {
    expect(getGivingMilestoneMessage(99)).toBeNull();
  });
});
