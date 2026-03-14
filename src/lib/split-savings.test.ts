import { describe, it, expect } from 'vitest';
import {
  isValidSplitPercent,
  splitPercentLabel,
  calculateSplit,
  getSpendSaveBalances,
  calculateSavingsRelease,
  applyDepositWithSplit,
  formatCents,
  savingsMilestone,
  savingsDepositDescription,
  savingsReleaseDescription,
  SPLIT_PRESETS,
  MIN_SPLIT_PERCENT,
  MAX_SPLIT_PERCENT,
} from './split-savings';

// ─── isValidSplitPercent ──────────────────────────────────────────────────────
describe('isValidSplitPercent', () => {
  it('accepts 0 (disabled)', () => {
    expect(isValidSplitPercent(0)).toBe(true);
  });

  it('accepts 10, 20, 50, 90', () => {
    [10, 20, 50, 90].forEach(v => expect(isValidSplitPercent(v)).toBe(true));
  });

  it('rejects values above MAX_SPLIT_PERCENT', () => {
    expect(isValidSplitPercent(91)).toBe(false);
    expect(isValidSplitPercent(100)).toBe(false);
  });

  it('rejects negative values', () => {
    expect(isValidSplitPercent(-1)).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(isValidSplitPercent(10.5)).toBe(false);
    expect(isValidSplitPercent(NaN)).toBe(false);
  });

  it('enforces MIN and MAX constants', () => {
    expect(isValidSplitPercent(MIN_SPLIT_PERCENT)).toBe(true);
    expect(isValidSplitPercent(MAX_SPLIT_PERCENT)).toBe(true);
    expect(isValidSplitPercent(MAX_SPLIT_PERCENT + 1)).toBe(false);
  });
});

// ─── splitPercentLabel ────────────────────────────────────────────────────────
describe('splitPercentLabel', () => {
  it('returns "No split" for 0', () => {
    expect(splitPercentLabel(0)).toBe('No split');
  });

  it('returns formatted label for non-zero', () => {
    expect(splitPercentLabel(20)).toBe('20% to savings');
    expect(splitPercentLabel(90)).toBe('90% to savings');
  });
});

// ─── calculateSplit ───────────────────────────────────────────────────────────
describe('calculateSplit', () => {
  it('returns full deposit as spend when splitPercent is 0', () => {
    const result = calculateSplit(1000, 0);
    expect(result).toEqual({ spend_cents: 1000, save_cents: 0 });
  });

  it('splits correctly at 20%', () => {
    const result = calculateSplit(1000, 20);
    expect(result.save_cents).toBe(200);
    expect(result.spend_cents).toBe(800);
    expect(result.spend_cents + result.save_cents).toBe(1000);
  });

  it('splits correctly at 50%', () => {
    const result = calculateSplit(500, 50);
    expect(result.save_cents).toBe(250);
    expect(result.spend_cents).toBe(250);
  });

  it('floors save_cents to avoid fractional cents (remainder goes to spend)', () => {
    // 10% of $0.01 = 0.001 → floor = 0; spend gets 1
    const result = calculateSplit(1, 10);
    expect(result.save_cents).toBe(0);
    expect(result.spend_cents).toBe(1);
  });

  it('floors save_cents: 10% of 7 cents = 0.7 → 0', () => {
    const result = calculateSplit(7, 10);
    expect(result.save_cents).toBe(0);
    expect(result.spend_cents).toBe(7);
  });

  it('splits at 90% (max)', () => {
    const result = calculateSplit(1000, 90);
    expect(result.save_cents).toBe(900);
    expect(result.spend_cents).toBe(100);
  });

  it('returns zeros for 0 deposit', () => {
    const result = calculateSplit(0, 20);
    expect(result).toEqual({ spend_cents: 0, save_cents: 0 });
  });

  it('returns zeros for negative deposit', () => {
    const result = calculateSplit(-500, 20);
    expect(result).toEqual({ spend_cents: 0, save_cents: 0 });
  });

  it('handles invalid splitPercent gracefully', () => {
    // 91 is invalid → treated as 0 → no split
    const result = calculateSplit(1000, 91);
    expect(result).toEqual({ spend_cents: 1000, save_cents: 0 });
  });

  it('save + spend always equals deposit for valid inputs', () => {
    const amounts = [100, 333, 999, 5000, 12345];
    const percents = [10, 20, 30, 50, 75, 90];
    amounts.forEach(amount => {
      percents.forEach(percent => {
        const { spend_cents, save_cents } = calculateSplit(amount, percent);
        expect(spend_cents + save_cents).toBe(amount);
      });
    });
  });
});

// ─── getSpendSaveBalances ─────────────────────────────────────────────────────
describe('getSpendSaveBalances', () => {
  it('derives spend as total minus save', () => {
    const result = getSpendSaveBalances({ balance_cents: 1000, save_balance_cents: 200 });
    expect(result.spend_balance_cents).toBe(800);
    expect(result.save_balance_cents).toBe(200);
    expect(result.total_balance_cents).toBe(1000);
  });

  it('calculates save_percent_of_total', () => {
    const result = getSpendSaveBalances({ balance_cents: 1000, save_balance_cents: 250 });
    expect(result.save_percent_of_total).toBe(25);
  });

  it('returns 0% when total is 0', () => {
    const result = getSpendSaveBalances({ balance_cents: 0, save_balance_cents: 0 });
    expect(result.save_percent_of_total).toBe(0);
    expect(result.spend_balance_cents).toBe(0);
  });

  it('clamps spend_balance_cents to 0 if data is inconsistent', () => {
    // save > total should not produce negative spend
    const result = getSpendSaveBalances({ balance_cents: 100, save_balance_cents: 200 });
    expect(result.spend_balance_cents).toBe(0);
  });

  it('handles no savings (split disabled)', () => {
    const result = getSpendSaveBalances({ balance_cents: 5000, save_balance_cents: 0 });
    expect(result.spend_balance_cents).toBe(5000);
    expect(result.save_percent_of_total).toBe(0);
  });
});

// ─── calculateSavingsRelease ──────────────────────────────────────────────────
describe('calculateSavingsRelease', () => {
  const current = { balance_cents: 1000, save_balance_cents: 400 };

  it('correctly decrements save balance', () => {
    const result = calculateSavingsRelease(current, 200);
    expect(result).not.toBeNull();
    expect(result!.save_balance_cents).toBe(200);
    expect(result!.balance_cents).toBe(1000); // total unchanged
  });

  it('allows releasing full savings amount', () => {
    const result = calculateSavingsRelease(current, 400);
    expect(result).not.toBeNull();
    expect(result!.save_balance_cents).toBe(0);
    expect(result!.balance_cents).toBe(1000);
  });

  it('returns null when releasing more than available', () => {
    expect(calculateSavingsRelease(current, 401)).toBeNull();
  });

  it('returns null for zero release', () => {
    expect(calculateSavingsRelease(current, 0)).toBeNull();
  });

  it('returns null for negative release', () => {
    expect(calculateSavingsRelease(current, -100)).toBeNull();
  });
});

// ─── applyDepositWithSplit ────────────────────────────────────────────────────
describe('applyDepositWithSplit', () => {
  const initial = { balance_cents: 1000, save_balance_cents: 100 };

  it('increases total balance by deposit amount', () => {
    const { updated } = applyDepositWithSplit(initial, 500, 20);
    expect(updated.balance_cents).toBe(1500);
  });

  it('increases save balance by split amount', () => {
    const { updated, split } = applyDepositWithSplit(initial, 500, 20);
    expect(split.save_cents).toBe(100);
    expect(updated.save_balance_cents).toBe(200); // 100 + 100
  });

  it('returns correct split breakdown', () => {
    const { split } = applyDepositWithSplit(initial, 500, 20);
    expect(split.spend_cents).toBe(400);
    expect(split.save_cents).toBe(100);
  });

  it('no save increase when split is 0', () => {
    const { updated, split } = applyDepositWithSplit(initial, 500, 0);
    expect(split.save_cents).toBe(0);
    expect(updated.save_balance_cents).toBe(100); // unchanged
    expect(updated.balance_cents).toBe(1500);
  });
});

// ─── formatCents ─────────────────────────────────────────────────────────────
describe('formatCents', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCents(1000)).toBe('$10.00');
    expect(formatCents(0)).toBe('$0.00');
  });

  it('formats cent amounts', () => {
    expect(formatCents(99)).toBe('$0.99');
    expect(formatCents(1234)).toBe('$12.34');
  });
});

// ─── savingsMilestone ─────────────────────────────────────────────────────────
describe('savingsMilestone', () => {
  it('returns empty string for zero balance', () => {
    expect(savingsMilestone(0)).toBe('');
  });

  it('returns correct milestone for small balance', () => {
    expect(savingsMilestone(500)).toContain('getting started');
  });

  it('returns correct milestone for medium balance', () => {
    expect(savingsMilestone(2500)).toContain('habits');
  });

  it('returns correct milestone for great saver', () => {
    expect(savingsMilestone(7500)).toContain('Great saver');
  });

  it('returns correct milestone for super saver', () => {
    expect(savingsMilestone(25000)).toContain('Super saver');
  });

  it('returns champion milestone for large balance', () => {
    expect(savingsMilestone(100000)).toContain('champion');
  });
});

// ─── Description helpers ──────────────────────────────────────────────────────
describe('savingsDepositDescription', () => {
  it('includes the split percent', () => {
    expect(savingsDepositDescription(20)).toContain('20%');
    expect(savingsDepositDescription(50)).toContain('50%');
  });
});

describe('savingsReleaseDescription', () => {
  it('returns a non-empty string', () => {
    expect(savingsReleaseDescription()).toBeTruthy();
    expect(typeof savingsReleaseDescription()).toBe('string');
  });
});

// ─── SPLIT_PRESETS ────────────────────────────────────────────────────────────
describe('SPLIT_PRESETS', () => {
  it('has at least 3 options', () => {
    expect(SPLIT_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it('first preset is 0 (no split)', () => {
    expect(SPLIT_PRESETS[0].value).toBe(0);
  });

  it('all preset values are valid', () => {
    SPLIT_PRESETS.forEach(p => {
      expect(isValidSplitPercent(p.value)).toBe(true);
    });
  });

  it('each preset has label and description', () => {
    SPLIT_PRESETS.forEach(p => {
      expect(typeof p.label).toBe('string');
      expect(p.label.length).toBeGreaterThan(0);
      expect(typeof p.description).toBe('string');
    });
  });
});
