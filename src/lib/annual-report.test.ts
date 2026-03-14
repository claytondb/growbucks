import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  isInYear,
  getUtcMonth,
  isInterestTransaction,
  isDepositType,
  isWithdrawalType,
  isChoreEarning,
  computeChildAnnualReport,
  computeAnnualReport,
  childAnnualReportToCSV,
  familyAnnualReportToCSV,
  MONTHS,
} from './annual-report';
import type { Transaction } from '@/types/database';

// ─── Test helpers ──────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> & { created_at: string }): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2, 8),
    child_id: 'child-1',
    type: 'deposit',
    amount_cents: 1000,
    balance_after_cents: 10000,
    description: null,
    status: 'completed',
    requested_at: null,
    processed_at: overrides.created_at,
    processed_by: null,
    ...overrides,
  };
}

// ─── formatMoney ───────────────────────────────────────────────────────────────

describe('formatMoney', () => {
  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('formats positive cents', () => {
    expect(formatMoney(100)).toBe('$1.00');
    expect(formatMoney(1099)).toBe('$10.99');
    expect(formatMoney(123456)).toBe('$1,234.56');
  });

  it('formats negative cents with minus sign', () => {
    expect(formatMoney(-500)).toBe('-$5.00');
  });

  it('formats large amounts with comma separator', () => {
    expect(formatMoney(1000000)).toBe('$10,000.00');
    expect(formatMoney(10000000)).toBe('$100,000.00');
  });

  it('handles fractional cents (rounds to 2 dp)', () => {
    // 1 cent = $0.01
    expect(formatMoney(1)).toBe('$0.01');
  });
});

// ─── isInYear ─────────────────────────────────────────────────────────────────

describe('isInYear', () => {
  it('returns true for a date in the target year', () => {
    expect(isInYear('2026-06-15T00:00:00Z', 2026)).toBe(true);
  });

  it('returns false for a date in a different year', () => {
    expect(isInYear('2025-12-31T23:59:59Z', 2026)).toBe(false);
    expect(isInYear('2027-01-01T00:00:00Z', 2026)).toBe(false);
  });

  it('handles boundary: Jan 1 start of year', () => {
    expect(isInYear('2026-01-01T00:00:00Z', 2026)).toBe(true);
  });

  it('handles boundary: Dec 31 end of year', () => {
    expect(isInYear('2026-12-31T23:59:59Z', 2026)).toBe(true);
  });
});

// ─── getUtcMonth ───────────────────────────────────────────────────────────────

describe('getUtcMonth', () => {
  it('returns 1 for January', () => {
    expect(getUtcMonth('2026-01-15T00:00:00Z')).toBe(1);
  });

  it('returns 12 for December', () => {
    expect(getUtcMonth('2026-12-01T00:00:00Z')).toBe(12);
  });

  it('returns correct month for all 12 months', () => {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      expect(getUtcMonth(`2026-${mm}-01T00:00:00Z`)).toBe(m);
    }
  });
});

// ─── isInterestTransaction ────────────────────────────────────────────────────

describe('isInterestTransaction', () => {
  it('returns true for type=interest', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'interest' });
    expect(isInterestTransaction(tx)).toBe(true);
  });

  it('returns false for deposit', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit' });
    expect(isInterestTransaction(tx)).toBe(false);
  });

  it('returns false for withdrawal', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'withdrawal' });
    expect(isInterestTransaction(tx)).toBe(false);
  });
});

// ─── isDepositType ────────────────────────────────────────────────────────────

describe('isDepositType', () => {
  it('returns true for deposit', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit' });
    expect(isDepositType(tx)).toBe(true);
  });

  it('returns true for savings_deposit', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'savings_deposit' });
    expect(isDepositType(tx)).toBe(true);
  });

  it('returns true for savings_release', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'savings_release' });
    expect(isDepositType(tx)).toBe(true);
  });

  it('returns false for withdrawal', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'withdrawal' });
    expect(isDepositType(tx)).toBe(false);
  });

  it('returns false for interest', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'interest' });
    expect(isDepositType(tx)).toBe(false);
  });
});

// ─── isWithdrawalType ─────────────────────────────────────────────────────────

describe('isWithdrawalType', () => {
  it('returns true for withdrawal', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'withdrawal' });
    expect(isWithdrawalType(tx)).toBe(true);
  });

  it('returns false for deposit', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit' });
    expect(isWithdrawalType(tx)).toBe(false);
  });
});

// ─── isChoreEarning ───────────────────────────────────────────────────────────

describe('isChoreEarning', () => {
  it('returns true for deposit with "chore" in description', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', description: 'Chore: dishes' });
    expect(isChoreEarning(tx)).toBe(true);
  });

  it('returns true for deposit with "job" in description (case-insensitive)', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', description: 'Job reward' });
    expect(isChoreEarning(tx)).toBe(true);
  });

  it('returns true for deposit with "earn" in description', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', description: 'earned allowance' });
    expect(isChoreEarning(tx)).toBe(true);
  });

  it('returns false for deposit with no matching keywords', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', description: 'Birthday money' });
    expect(isChoreEarning(tx)).toBe(false);
  });

  it('returns false for withdrawal even with "chore" in description', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'withdrawal', description: 'chore reversal' });
    expect(isChoreEarning(tx)).toBe(false);
  });

  it('returns false when description is null', () => {
    const tx = makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', description: null });
    expect(isChoreEarning(tx)).toBe(false);
  });
});

// ─── MONTHS constant ──────────────────────────────────────────────────────────

describe('MONTHS', () => {
  it('has 12 entries', () => {
    expect(MONTHS.length).toBe(12);
  });

  it('starts with January and ends with December', () => {
    expect(MONTHS[0]).toBe('January');
    expect(MONTHS[11]).toBe('December');
  });
});

// ─── computeChildAnnualReport ─────────────────────────────────────────────────

describe('computeChildAnnualReport', () => {
  it('returns empty report when no transactions', () => {
    const report = computeChildAnnualReport('child-1', 'Alice', 2026, []);
    expect(report.childId).toBe('child-1');
    expect(report.childName).toBe('Alice');
    expect(report.year).toBe(2026);
    expect(report.totalInterestCents).toBe(0);
    expect(report.totalDepositCents).toBe(0);
    expect(report.totalWithdrawalCents).toBe(0);
    expect(report.completedTransactionCount).toBe(0);
    expect(report.startingBalanceCents).toBe(0);
    expect(report.endingBalanceCents).toBe(0);
    expect(report.monthly).toHaveLength(12);
  });

  it('counts a single interest transaction', () => {
    const txs = [
      makeTx({
        created_at: '2026-03-01T10:00:00Z',
        type: 'interest',
        amount_cents: 50,
        balance_after_cents: 10050,
        status: 'completed',
      }),
    ];
    const report = computeChildAnnualReport('child-1', 'Bob', 2026, txs);
    expect(report.totalInterestCents).toBe(50);
    expect(report.totalDepositCents).toBe(0);
    expect(report.completedTransactionCount).toBe(1);
    // March is index 2
    expect(report.monthly[2].interestCents).toBe(50);
    expect(report.monthly[2].transactionCount).toBe(1);
    // Other months are zero
    expect(report.monthly[0].interestCents).toBe(0);
  });

  it('filters out transactions outside the target year', () => {
    const txs = [
      makeTx({ created_at: '2025-12-31T23:59:59Z', type: 'interest', amount_cents: 999, balance_after_cents: 5000 }),
      makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'interest', amount_cents: 50, balance_after_cents: 5050 }),
      makeTx({ created_at: '2027-01-01T00:00:00Z', type: 'interest', amount_cents: 999, balance_after_cents: 6000 }),
    ];
    const report = computeChildAnnualReport('child-1', 'Carol', 2026, txs);
    expect(report.totalInterestCents).toBe(50);
    expect(report.completedTransactionCount).toBe(1);
  });

  it('uses prior year ending balance as starting balance', () => {
    const priorYearTx = makeTx({
      created_at: '2025-06-15T00:00:00Z',
      type: 'deposit',
      amount_cents: 5000,
      balance_after_cents: 8000,
    });
    const currentYearTx = makeTx({
      created_at: '2026-02-01T00:00:00Z',
      type: 'deposit',
      amount_cents: 1000,
      balance_after_cents: 9000,
    });
    const report = computeChildAnnualReport('child-1', 'Dave', 2026, [priorYearTx, currentYearTx]);
    expect(report.startingBalanceCents).toBe(8000);
    expect(report.endingBalanceCents).toBe(9000);
  });

  it('infers starting balance from first tx when no prior txs', () => {
    const txs = [
      makeTx({
        created_at: '2026-01-15T00:00:00Z',
        type: 'deposit',
        amount_cents: 5000,
        balance_after_cents: 5000,
      }),
    ];
    const report = computeChildAnnualReport('child-1', 'Eve', 2026, txs);
    // balance_after(5000) - amount(5000) = 0
    expect(report.startingBalanceCents).toBe(0);
    expect(report.endingBalanceCents).toBe(5000);
  });

  it('accumulates deposits correctly', () => {
    const txs = [
      makeTx({ created_at: '2026-01-10T00:00:00Z', type: 'deposit', amount_cents: 1000, balance_after_cents: 1000 }),
      makeTx({ created_at: '2026-02-10T00:00:00Z', type: 'deposit', amount_cents: 2000, balance_after_cents: 3000 }),
    ];
    const report = computeChildAnnualReport('child-1', 'Frank', 2026, txs);
    expect(report.totalDepositCents).toBe(3000);
    expect(report.monthly[0].depositCents).toBe(1000);
    expect(report.monthly[1].depositCents).toBe(2000);
  });

  it('accumulates withdrawals as absolute values', () => {
    const txs = [
      makeTx({ created_at: '2026-01-10T00:00:00Z', type: 'deposit', amount_cents: 5000, balance_after_cents: 5000 }),
      makeTx({ created_at: '2026-03-05T00:00:00Z', type: 'withdrawal', amount_cents: -500, balance_after_cents: 4500, status: 'completed' }),
    ];
    const report = computeChildAnnualReport('child-1', 'Gina', 2026, txs);
    expect(report.totalWithdrawalCents).toBe(500);
    expect(report.monthly[2].withdrawalCents).toBe(500);
  });

  it('tracks savings_deposit in both depositCents and savingsDepositCents', () => {
    const txs = [
      makeTx({
        created_at: '2026-04-01T00:00:00Z',
        type: 'savings_deposit',
        amount_cents: 300,
        balance_after_cents: 10300,
      }),
    ];
    const report = computeChildAnnualReport('child-1', 'Han', 2026, txs);
    expect(report.totalDepositCents).toBe(300);
    expect(report.monthly[3].savingsDepositCents).toBe(300);
    expect(report.monthly[3].depositCents).toBe(300);
  });

  it('detects chore earnings', () => {
    const txs = [
      makeTx({
        created_at: '2026-05-01T00:00:00Z',
        type: 'deposit',
        amount_cents: 200,
        balance_after_cents: 5200,
        description: 'Chore: vacuumed',
      }),
    ];
    const report = computeChildAnnualReport('child-1', 'Iris', 2026, txs);
    expect(report.totalEarnedCents).toBe(200);
    expect(report.monthly[4].earnedCents).toBe(200);
  });

  it('tracks peak balance correctly', () => {
    const txs = [
      makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', amount_cents: 10000, balance_after_cents: 10000 }),
      makeTx({ created_at: '2026-06-01T00:00:00Z', type: 'interest', amount_cents: 500, balance_after_cents: 10500 }),
      makeTx({ created_at: '2026-12-01T00:00:00Z', type: 'withdrawal', amount_cents: -2000, balance_after_cents: 8500, status: 'completed' }),
    ];
    const report = computeChildAnnualReport('child-1', 'Jake', 2026, txs);
    expect(report.peakBalanceCents).toBe(10500);
    expect(report.endingBalanceCents).toBe(8500);
  });

  it('multiple interest events in same month accumulate', () => {
    const txs = [
      makeTx({ created_at: '2026-07-01T00:00:00Z', type: 'interest', amount_cents: 10, balance_after_cents: 1010 }),
      makeTx({ created_at: '2026-07-15T00:00:00Z', type: 'interest', amount_cents: 11, balance_after_cents: 1021 }),
      makeTx({ created_at: '2026-07-31T00:00:00Z', type: 'interest', amount_cents: 12, balance_after_cents: 1033 }),
    ];
    const report = computeChildAnnualReport('child-1', 'Kate', 2026, txs);
    expect(report.totalInterestCents).toBe(33);
    expect(report.monthly[6].interestCents).toBe(33);
    expect(report.monthly[6].transactionCount).toBe(3);
  });

  it('all 12 monthly slots are present', () => {
    const report = computeChildAnnualReport('child-1', 'Liam', 2026, []);
    expect(report.monthly).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      expect(report.monthly[i].month).toBe(i + 1);
      expect(report.monthly[i].monthName).toBe(MONTHS[i]);
    }
  });

  it('ignores pending/rejected transactions when counting', () => {
    const txs = [
      makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'withdrawal', amount_cents: -500, balance_after_cents: 4500, status: 'pending' }),
      makeTx({ created_at: '2026-01-15T00:00:00Z', type: 'deposit', amount_cents: 1000, balance_after_cents: 6000, status: 'completed' }),
    ];
    const report = computeChildAnnualReport('child-1', 'Mia', 2026, txs);
    // pending withdrawal should not count
    expect(report.totalWithdrawalCents).toBe(0);
    // completed deposit should count
    expect(report.totalDepositCents).toBe(1000);
    expect(report.completedTransactionCount).toBe(1);
  });

  it('ending balance is the last transaction balance_after', () => {
    const txs = [
      makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'deposit', amount_cents: 500, balance_after_cents: 500 }),
      makeTx({ created_at: '2026-06-01T00:00:00Z', type: 'interest', amount_cents: 10, balance_after_cents: 510 }),
      makeTx({ created_at: '2026-11-01T00:00:00Z', type: 'deposit', amount_cents: 1000, balance_after_cents: 1510 }),
    ];
    const report = computeChildAnnualReport('child-1', 'Noah', 2026, txs);
    expect(report.endingBalanceCents).toBe(1510);
  });
});

// ─── computeAnnualReport ──────────────────────────────────────────────────────

describe('computeAnnualReport', () => {
  it('returns empty report when no children', () => {
    const summary = computeAnnualReport(2026, [], new Map());
    expect(summary.year).toBe(2026);
    expect(summary.children).toHaveLength(0);
    expect(summary.totalFamilyInterestCents).toBe(0);
  });

  it('sums family interest across all children', () => {
    const child1Txs = [
      makeTx({ created_at: '2026-01-01T00:00:00Z', child_id: 'c1', type: 'interest', amount_cents: 200, balance_after_cents: 10200 }),
    ];
    const child2Txs = [
      makeTx({ created_at: '2026-01-01T00:00:00Z', child_id: 'c2', type: 'interest', amount_cents: 150, balance_after_cents: 5150 }),
    ];
    const txMap = new Map([['c1', child1Txs], ['c2', child2Txs]]);
    const summary = computeAnnualReport(2026, [{ id: 'c1', name: 'Alice' }, { id: 'c2', name: 'Bob' }], txMap);
    expect(summary.totalFamilyInterestCents).toBe(350);
    expect(summary.children).toHaveLength(2);
  });

  it('handles children with no transactions', () => {
    const txMap = new Map([['c1', [] as Transaction[]]]);
    const summary = computeAnnualReport(2026, [{ id: 'c1', name: 'Empty Kid' }], txMap);
    expect(summary.children[0].totalInterestCents).toBe(0);
    expect(summary.totalFamilyInterestCents).toBe(0);
  });

  it('uses empty array for missing child in map', () => {
    const summary = computeAnnualReport(2026, [{ id: 'missing', name: 'Ghost' }], new Map());
    expect(summary.children[0].totalInterestCents).toBe(0);
  });

  it('sets generatedAt as ISO string', () => {
    const summary = computeAnnualReport(2026, [], new Map());
    expect(() => new Date(summary.generatedAt)).not.toThrow();
    expect(summary.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── childAnnualReportToCSV ────────────────────────────────────────────────────

describe('childAnnualReportToCSV', () => {
  const baseReport = computeChildAnnualReport('c1', 'Alice', 2026, [
    makeTx({ created_at: '2026-03-01T00:00:00Z', type: 'interest', amount_cents: 100, balance_after_cents: 5100 }),
    makeTx({ created_at: '2026-03-10T00:00:00Z', type: 'deposit', amount_cents: 2000, balance_after_cents: 7100 }),
    makeTx({ created_at: '2026-09-01T00:00:00Z', type: 'withdrawal', amount_cents: -500, balance_after_cents: 6600, status: 'completed' }),
  ]);

  it('includes child name in header', () => {
    const csv = childAnnualReportToCSV(baseReport);
    expect(csv).toContain('Alice');
  });

  it('includes tax year', () => {
    const csv = childAnnualReportToCSV(baseReport);
    expect(csv).toContain('2026');
  });

  it('contains monthly breakdown section', () => {
    const csv = childAnnualReportToCSV(baseReport);
    expect(csv).toContain('Monthly Breakdown');
    expect(csv).toContain('March');
    expect(csv).toContain('September');
  });

  it('contains summary section with totals', () => {
    const csv = childAnnualReportToCSV(baseReport);
    expect(csv).toContain('Total Interest Earned');
    expect(csv).toContain('$1.00'); // 100 cents
    expect(csv).toContain('Total Deposits');
  });

  it('has 12 monthly data rows plus header and TOTAL', () => {
    const csv = childAnnualReportToCSV(baseReport);
    const lines = csv.split('\n');
    // Find the monthly breakdown header
    const breakdownIdx = lines.findIndex((l) => l.includes('Month,Interest'));
    expect(breakdownIdx).toBeGreaterThan(0);
    // 12 data rows + 1 TOTAL row
    const dataRows = lines.slice(breakdownIdx + 1, breakdownIdx + 14);
    expect(dataRows).toHaveLength(13);
    expect(dataRows[12]).toContain('TOTAL');
  });

  it('includes disclaimer note', () => {
    const csv = childAnnualReportToCSV(baseReport);
    expect(csv).toContain('tax professional');
  });
});

// ─── familyAnnualReportToCSV ──────────────────────────────────────────────────

describe('familyAnnualReportToCSV', () => {
  it('includes family header', () => {
    const summary = computeAnnualReport(2026, [], new Map());
    const csv = familyAnnualReportToCSV(summary);
    expect(csv).toContain('Family Annual Report');
  });

  it('includes total family interest', () => {
    const txs = [makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'interest', amount_cents: 500, balance_after_cents: 500 })];
    const summary = computeAnnualReport(2026, [{ id: 'c1', name: 'Kid' }], new Map([['c1', txs]]));
    const csv = familyAnnualReportToCSV(summary);
    expect(csv).toContain('$5.00');
  });

  it('includes section per child', () => {
    const txMap = new Map([
      ['c1', [makeTx({ created_at: '2026-01-01T00:00:00Z', type: 'interest', amount_cents: 100, balance_after_cents: 100 })]],
      ['c2', [makeTx({ created_at: '2026-01-01T00:00:00Z', child_id: 'c2', type: 'interest', amount_cents: 200, balance_after_cents: 200 })]],
    ]);
    const summary = computeAnnualReport(2026, [{ id: 'c1', name: 'Alice' }, { id: 'c2', name: 'Bob' }], txMap);
    const csv = familyAnnualReportToCSV(summary);
    expect(csv).toContain('Alice');
    expect(csv).toContain('Bob');
  });
});
