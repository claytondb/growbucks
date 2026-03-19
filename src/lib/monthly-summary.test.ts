/**
 * Tests for GrowBucks Monthly Summary Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  computeChildMonthlySummaries,
  computeFamilyMonthlySummary,
  bestMonth,
  monthsAboveThreshold,
  runningBalances,
  formatMonthlySummaryLine,
  isChoreEarning,
  txMonth,
  txYear,
  MONTH_NAMES,
} from './monthly-summary';
import type { Transaction } from '@/types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> & { created_at: string }): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2),
    child_id: 'child-1',
    type: 'deposit',
    amount_cents: 1000,
    balance_after_cents: 1000,
    description: null,
    status: 'completed',
    requested_at: null,
    processed_at: null,
    processed_by: null,
    ...overrides,
  };
}

const CHILD = { id: 'child-1', name: 'Emma' };

// ─── txMonth / txYear ─────────────────────────────────────────────────────────

describe('txMonth', () => {
  it('returns 0 for January', () => {
    expect(txMonth('2026-01-15T00:00:00Z')).toBe(0);
  });
  it('returns 11 for December', () => {
    expect(txMonth('2026-12-31T23:59:59Z')).toBe(11);
  });
  it('returns 5 for June', () => {
    expect(txMonth('2026-06-01T00:00:00Z')).toBe(5);
  });
});

describe('txYear', () => {
  it('returns correct year', () => {
    expect(txYear('2026-03-19T06:00:00Z')).toBe(2026);
    expect(txYear('2025-12-31T23:00:00Z')).toBe(2025);
  });
});

// ─── isChoreEarning ────────────────────────────────────────────────────────────

describe('isChoreEarning', () => {
  it('identifies chore description', () => {
    expect(isChoreEarning(makeTx({ type: 'deposit', description: 'Chore: dishes', created_at: '2026-01-01T00:00:00Z' }))).toBe(true);
  });
  it('identifies job description', () => {
    expect(isChoreEarning(makeTx({ type: 'deposit', description: 'Job reward', created_at: '2026-01-01T00:00:00Z' }))).toBe(true);
  });
  it('identifies earn description', () => {
    expect(isChoreEarning(makeTx({ type: 'savings_deposit', description: 'Earned allowance', created_at: '2026-01-01T00:00:00Z' }))).toBe(true);
  });
  it('returns false for interest', () => {
    expect(isChoreEarning(makeTx({ type: 'interest', description: 'Daily interest', created_at: '2026-01-01T00:00:00Z' }))).toBe(false);
  });
  it('returns false for plain deposit', () => {
    expect(isChoreEarning(makeTx({ type: 'deposit', description: 'Parent deposit', created_at: '2026-01-01T00:00:00Z' }))).toBe(false);
  });
  it('returns false for withdrawal', () => {
    expect(isChoreEarning(makeTx({ type: 'withdrawal', description: null, created_at: '2026-01-01T00:00:00Z' }))).toBe(false);
  });
});

// ─── computeChildMonthlySummaries ─────────────────────────────────────────────

describe('computeChildMonthlySummaries – empty', () => {
  it('returns 12 months with zero values', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, []);
    expect(result.months).toHaveLength(12);
    expect(result.months[0].monthName).toBe('January');
    expect(result.months[11].monthName).toBe('December');
    result.months.forEach((m) => {
      expect(m.interestCents).toBe(0);
      expect(m.totalDepositCents).toBe(0);
      expect(m.transactionCount).toBe(0);
    });
  });

  it('year totals are all zero', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, []);
    expect(result.yearTotals.interestCents).toBe(0);
    expect(result.yearTotals.transactionCount).toBe(0);
  });
});

describe('computeChildMonthlySummaries – single month interest', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'interest', amount_cents: 500, balance_after_cents: 10500, description: 'Daily interest (1.0%)', created_at: '2026-03-15T00:00:00Z' }),
  ];

  it('places interest in March (month 3)', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs, 10000);
    const march = result.months[2]; // 0-indexed
    expect(march.interestCents).toBe(500);
    expect(march.transactionCount).toBe(1);
    expect(march.endingBalanceCents).toBe(10500);
  });

  it('other months have zero interest', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs, 10000);
    expect(result.months[0].interestCents).toBe(0);
    expect(result.months[11].interestCents).toBe(0);
  });

  it('year totals reflect the interest', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs, 10000);
    expect(result.yearTotals.interestCents).toBe(500);
  });
});

describe('computeChildMonthlySummaries – savings deposit', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'savings_deposit', amount_cents: 2000, balance_after_cents: 2000, description: 'Allowance', created_at: '2026-06-01T00:00:00Z' }),
    makeTx({ type: 'deposit', amount_cents: 1000, balance_after_cents: 3000, description: 'Birthday money', created_at: '2026-06-10T00:00:00Z' }),
  ];

  it('classifies savings_deposit correctly', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const june = result.months[5];
    expect(june.savingsDepositCents).toBe(2000);
    expect(june.totalDepositCents).toBe(3000);
  });

  it('computes savings rate', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const june = result.months[5];
    // 2000/3000 ≈ 0.6667
    expect(june.savingsRate).toBeCloseTo(2000 / 3000, 5);
  });
});

describe('computeChildMonthlySummaries – chore earnings', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'deposit', amount_cents: 500, balance_after_cents: 500, description: 'Chore: vacuum', created_at: '2026-02-10T00:00:00Z' }),
    makeTx({ type: 'deposit', amount_cents: 300, balance_after_cents: 800, description: 'Parent top-up', created_at: '2026-02-15T00:00:00Z' }),
  ];

  it('separates chore earnings from regular deposits', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const feb = result.months[1];
    expect(feb.choreEarningsCents).toBe(500);
    expect(feb.totalDepositCents).toBe(800);
  });
});

describe('computeChildMonthlySummaries – withdrawals and donations', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'withdrawal', amount_cents: -1500, balance_after_cents: 8500, description: null, status: 'completed', created_at: '2026-04-05T00:00:00Z' }),
    makeTx({ type: 'donation', amount_cents: -250, balance_after_cents: 8250, description: 'Charity', status: 'completed', created_at: '2026-04-20T00:00:00Z' }),
  ];

  it('records withdrawal absolute value', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs, 10000);
    const april = result.months[3];
    expect(april.withdrawalCents).toBe(1500);
  });

  it('records donation absolute value', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs, 10000);
    const april = result.months[3];
    expect(april.donationCents).toBe(250);
  });
});

describe('computeChildMonthlySummaries – balance propagation', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'deposit', amount_cents: 5000, balance_after_cents: 5000, created_at: '2026-01-10T00:00:00Z' }),
    // No February transactions
    makeTx({ type: 'interest', amount_cents: 50, balance_after_cents: 5050, created_at: '2026-03-01T00:00:00Z' }),
  ];

  it('propagates balance through months with no transactions', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    expect(result.months[0].endingBalanceCents).toBe(5000); // Jan
    expect(result.months[1].endingBalanceCents).toBe(5000); // Feb (no tx, uses Jan ending)
    expect(result.months[2].endingBalanceCents).toBe(5050); // Mar
  });
});

describe('computeChildMonthlySummaries – filters out pending transactions', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'withdrawal', amount_cents: -1000, balance_after_cents: 9000, status: 'pending', created_at: '2026-01-15T00:00:00Z' }),
    makeTx({ type: 'deposit', amount_cents: 2000, balance_after_cents: 12000, status: 'completed', created_at: '2026-01-20T00:00:00Z' }),
  ];

  it('ignores pending withdrawals', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs, 10000);
    expect(result.months[0].withdrawalCents).toBe(0);
    expect(result.months[0].totalDepositCents).toBe(2000);
  });
});

describe('computeChildMonthlySummaries – filters out other years', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'interest', amount_cents: 100, balance_after_cents: 10100, created_at: '2025-12-31T23:59:59Z' }),
    makeTx({ type: 'interest', amount_cents: 200, balance_after_cents: 10300, created_at: '2026-01-01T00:00:00Z' }),
  ];

  it('only includes 2026 transactions', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    expect(result.yearTotals.interestCents).toBe(200);
  });
});

// ─── bestMonth ────────────────────────────────────────────────────────────────

describe('bestMonth', () => {
  const children = [CHILD];
  const txs: Transaction[] = [
    makeTx({ type: 'interest', amount_cents: 100, balance_after_cents: 10100, created_at: '2026-01-05T00:00:00Z' }),
    makeTx({ type: 'interest', amount_cents: 500, balance_after_cents: 10600, created_at: '2026-03-05T00:00:00Z' }),
    makeTx({ type: 'interest', amount_cents: 200, balance_after_cents: 10800, created_at: '2026-06-05T00:00:00Z' }),
  ];

  it('returns month with highest interest', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const best = bestMonth(result.months, 'interestCents');
    expect(best?.monthName).toBe('March');
    expect(best?.interestCents).toBe(500);
  });

  it('returns null for empty array', () => {
    expect(bestMonth([], 'interestCents')).toBeNull();
  });
});

// ─── monthsAboveThreshold ─────────────────────────────────────────────────────

describe('monthsAboveThreshold', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'interest', amount_cents: 1000, balance_after_cents: 11000, created_at: '2026-02-01T00:00:00Z' }),
    makeTx({ type: 'interest', amount_cents: 200, balance_after_cents: 11200, created_at: '2026-04-01T00:00:00Z' }),
    makeTx({ type: 'interest', amount_cents: 1500, balance_after_cents: 12700, created_at: '2026-07-01T00:00:00Z' }),
  ];

  it('returns months where interest >= 1000 cents', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const above = monthsAboveThreshold(result.months, 'interestCents', 1000);
    expect(above).toHaveLength(2);
    expect(above.map((m) => m.monthName)).toContain('February');
    expect(above.map((m) => m.monthName)).toContain('July');
  });
});

// ─── runningBalances ──────────────────────────────────────────────────────────

describe('runningBalances', () => {
  const txs: Transaction[] = [
    makeTx({ type: 'deposit', amount_cents: 5000, balance_after_cents: 5000, created_at: '2026-01-10T00:00:00Z' }),
    makeTx({ type: 'interest', amount_cents: 50, balance_after_cents: 5050, created_at: '2026-02-01T00:00:00Z' }),
  ];

  it('returns 12 chart points', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const chart = runningBalances(result.months);
    expect(chart).toHaveLength(12);
  });

  it('reflects correct ending balances', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, txs);
    const chart = runningBalances(result.months);
    expect(chart[0].balanceCents).toBe(5000);
    expect(chart[1].balanceCents).toBe(5050);
    expect(chart[2].balanceCents).toBe(5050); // March propagated
  });
});

// ─── computeFamilyMonthlySummary ──────────────────────────────────────────────

describe('computeFamilyMonthlySummary', () => {
  const children = [
    { id: 'child-1', name: 'Emma' },
    { id: 'child-2', name: 'Liam' },
  ];

  const child1Txs: Transaction[] = [
    makeTx({ child_id: 'child-1', type: 'interest', amount_cents: 300, balance_after_cents: 10300, created_at: '2026-05-01T00:00:00Z' }),
  ];

  const child2Txs: Transaction[] = [
    makeTx({ child_id: 'child-2', type: 'interest', amount_cents: 700, balance_after_cents: 15700, created_at: '2026-05-01T00:00:00Z' }),
    makeTx({ child_id: 'child-2', type: 'withdrawal', amount_cents: -500, balance_after_cents: 15200, status: 'completed', created_at: '2026-05-15T00:00:00Z' }),
  ];

  const txMap = new Map([
    ['child-1', child1Txs],
    ['child-2', child2Txs],
  ]);

  it('includes summaries for both children', () => {
    const family = computeFamilyMonthlySummary(2026, children, txMap);
    expect(family.children).toHaveLength(2);
    expect(family.children[0].childName).toBe('Emma');
    expect(family.children[1].childName).toBe('Liam');
  });

  it('aggregates family totals correctly', () => {
    const family = computeFamilyMonthlySummary(2026, children, txMap);
    expect(family.familyTotals.interestCents).toBe(1000);
    expect(family.familyTotals.withdrawalCents).toBe(500);
  });

  it('stores generatedAt as ISO string', () => {
    const family = computeFamilyMonthlySummary(2026, children, txMap);
    expect(() => new Date(family.generatedAt)).not.toThrow();
  });
});

// ─── formatMonthlySummaryLine ─────────────────────────────────────────────────

describe('formatMonthlySummaryLine', () => {
  it('produces a readable summary line', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, [
      makeTx({ type: 'interest', amount_cents: 125, balance_after_cents: 5125, created_at: '2026-01-15T00:00:00Z' }),
      makeTx({ type: 'deposit', amount_cents: 2000, balance_after_cents: 7125, created_at: '2026-01-20T00:00:00Z' }),
    ], 5000);
    const line = formatMonthlySummaryLine(result.months[0]);
    expect(line).toContain('January 2026');
    expect(line).toContain('Interest: $1.25');
    expect(line).toContain('Deposits: $20.00');
    expect(line).toContain('Ending balance: $71.25');
  });

  it('omits chore earnings line when 0', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, [
      makeTx({ type: 'deposit', amount_cents: 1000, balance_after_cents: 1000, created_at: '2026-03-01T00:00:00Z' }),
    ]);
    const line = formatMonthlySummaryLine(result.months[2]);
    expect(line).not.toContain('Chore earnings');
  });

  it('includes chore earnings line when non-zero', () => {
    const result = computeChildMonthlySummaries('child-1', 'Emma', 2026, [
      makeTx({ type: 'deposit', amount_cents: 500, balance_after_cents: 500, description: 'Chore: dishes', created_at: '2026-03-01T00:00:00Z' }),
    ]);
    const line = formatMonthlySummaryLine(result.months[2]);
    expect(line).toContain('Chore earnings: $5.00');
  });
});

// ─── MONTH_NAMES completeness ─────────────────────────────────────────────────

describe('MONTH_NAMES', () => {
  it('has 12 entries', () => {
    expect(MONTH_NAMES).toHaveLength(12);
  });
  it('starts with January and ends with December', () => {
    expect(MONTH_NAMES[0]).toBe('January');
    expect(MONTH_NAMES[11]).toBe('December');
  });
});
