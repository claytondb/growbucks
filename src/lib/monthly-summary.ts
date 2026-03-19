/**
 * GrowBucks Monthly Summary Utilities
 *
 * Aggregates per-month stats for a single child or an entire family.
 * Designed for the parent dashboard's month-by-month view and as the
 * data foundation for future email digest notifications.
 *
 * Key output per month:
 *   - Interest earned
 *   - Deposits (regular + allowance/savings_deposit)
 *   - Chore earnings
 *   - Withdrawals approved
 *   - Donation activity
 *   - Savings rate (savings_deposit ÷ total deposits)
 *   - Transaction count
 *   - Peak and ending balance
 */

import { Transaction } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlySummary {
  /** 1-indexed month (1 = January) */
  month: number;
  /** Full month name */
  monthName: string;
  /** Calendar year */
  year: number;
  /** ISO date string for the first day of this month */
  periodStart: string;
  /** ISO date string for the last day of this month */
  periodEnd: string;

  /** Compound interest earned this month (cents) */
  interestCents: number;
  /** All deposits (parent + allowance + chore + savings) this month (cents) */
  totalDepositCents: number;
  /** Savings auto-deposits this month (savings_deposit transactions, cents) */
  savingsDepositCents: number;
  /** Chore/job earnings deposited this month (cents) */
  choreEarningsCents: number;
  /** Withdrawals completed this month (absolute value, cents) */
  withdrawalCents: number;
  /** Donation amounts approved this month (cents) */
  donationCents: number;

  /**
   * Savings rate: savingsDepositCents ÷ totalDepositCents (0–1).
   * Returns 0 if no deposits occurred.
   */
  savingsRate: number;

  /** Number of completed/processed transactions this month */
  transactionCount: number;
  /** Ending balance (balance_after of last transaction, cents) */
  endingBalanceCents: number;
  /** Highest balance_after seen during the month (cents) */
  peakBalanceCents: number;
}

export interface ChildMonthlySummaries {
  childId: string;
  childName: string;
  year: number;
  /** 12 entries, Jan–Dec */
  months: MonthlySummary[];
  /** Totals across the full year */
  yearTotals: {
    interestCents: number;
    totalDepositCents: number;
    savingsDepositCents: number;
    choreEarningsCents: number;
    withdrawalCents: number;
    donationCents: number;
    transactionCount: number;
  };
}

export interface FamilyMonthlySummary {
  year: number;
  generatedAt: string;
  children: ChildMonthlySummaries[];
  /** Family-wide totals */
  familyTotals: {
    interestCents: number;
    totalDepositCents: number;
    withdrawalCents: number;
    donationCents: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the 0-indexed UTC month of a transaction date.
 */
export function txMonth(dateStr: string): number {
  return new Date(dateStr).getUTCMonth();
}

/**
 * Return the UTC year of a transaction date.
 */
export function txYear(dateStr: string): number {
  return new Date(dateStr).getUTCFullYear();
}

/**
 * ISO string for the first instant of a given month (UTC).
 */
export function monthStart(year: number, month0: number): string {
  return new Date(Date.UTC(year, month0, 1)).toISOString();
}

/**
 * ISO string for the last instant of a given month (UTC).
 */
export function monthEnd(year: number, month0: number): string {
  // First day of next month minus 1 ms
  return new Date(Date.UTC(year, month0 + 1, 1) - 1).toISOString();
}

/**
 * Return true when a transaction counts as a chore/job earning.
 * We classify 'deposit' and 'savings_deposit' transactions whose description
 * contains "chore", "job", or "earn" (case-insensitive) as chore earnings.
 */
export function isChoreEarning(tx: Transaction): boolean {
  if (tx.type !== 'deposit' && tx.type !== 'savings_deposit') return false;
  const desc = (tx.description ?? '').toLowerCase();
  return desc.includes('chore') || desc.includes('job') || desc.includes('earn');
}

/**
 * Format cents as a rounded dollar string for display, e.g. "$12.34".
 */
export function formatCents(cents: number): string {
  return '$' + (Math.abs(cents) / 100).toFixed(2);
}

/**
 * Build a plain-text summary line for a single month — useful for email digests.
 */
export function formatMonthlySummaryLine(s: MonthlySummary): string {
  const parts: string[] = [
    `${s.monthName} ${s.year}`,
    `Interest: ${formatCents(s.interestCents)}`,
    `Deposits: ${formatCents(s.totalDepositCents)}`,
  ];
  if (s.choreEarningsCents > 0) {
    parts.push(`Chore earnings: ${formatCents(s.choreEarningsCents)}`);
  }
  if (s.withdrawalCents > 0) {
    parts.push(`Withdrawals: ${formatCents(s.withdrawalCents)}`);
  }
  if (s.donationCents > 0) {
    parts.push(`Donations: ${formatCents(s.donationCents)}`);
  }
  parts.push(`Ending balance: ${formatCents(s.endingBalanceCents)}`);
  return parts.join(' | ');
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Compute monthly summaries for a single child for a full calendar year.
 *
 * @param childId    UUID of the child
 * @param childName  Display name
 * @param year       Calendar year (e.g. 2026)
 * @param transactions  All transactions for this child (any year; filtered internally)
 * @param startingBalance  Balance as of 01 Jan of `year` (cents). Defaults to 0.
 */
export function computeChildMonthlySummaries(
  childId: string,
  childName: string,
  year: number,
  transactions: Transaction[],
  startingBalance = 0,
): ChildMonthlySummaries {
  // Filter to the given year, completed/interest transactions only
  const yearTxs = transactions.filter(
    (tx) =>
      txYear(tx.created_at) === year &&
      (tx.status === 'completed' || tx.type === 'interest'),
  );

  // Sort chronologically
  const sorted = [...yearTxs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Build 12 empty buckets
  const months: MonthlySummary[] = Array.from({ length: 12 }, (_, m) => ({
    month: m + 1,
    monthName: MONTH_NAMES[m],
    year,
    periodStart: monthStart(year, m),
    periodEnd: monthEnd(year, m),
    interestCents: 0,
    totalDepositCents: 0,
    savingsDepositCents: 0,
    choreEarningsCents: 0,
    withdrawalCents: 0,
    donationCents: 0,
    savingsRate: 0,
    transactionCount: 0,
    endingBalanceCents: 0,
    peakBalanceCents: 0,
  }));

  // Seed each month's endingBalance with the prior month's (or starting balance)
  // We'll overwrite it as we process transactions.
  let rollingBalance = startingBalance;
  for (const bucket of months) {
    bucket.endingBalanceCents = rollingBalance;
    bucket.peakBalanceCents = rollingBalance;
  }

  // Accumulate per-transaction
  for (const tx of sorted) {
    const m = txMonth(tx.created_at); // 0-indexed
    const bucket = months[m];

    bucket.transactionCount++;

    if (tx.balance_after_cents > bucket.peakBalanceCents) {
      bucket.peakBalanceCents = tx.balance_after_cents;
    }
    bucket.endingBalanceCents = tx.balance_after_cents;

    switch (tx.type) {
      case 'interest':
        bucket.interestCents += tx.amount_cents;
        break;

      case 'savings_deposit':
        bucket.savingsDepositCents += tx.amount_cents;
        bucket.totalDepositCents += tx.amount_cents;
        if (isChoreEarning(tx)) {
          bucket.choreEarningsCents += tx.amount_cents;
        }
        break;

      case 'deposit':
      case 'savings_release':
        bucket.totalDepositCents += tx.amount_cents;
        if (isChoreEarning(tx)) {
          bucket.choreEarningsCents += tx.amount_cents;
        }
        break;

      case 'withdrawal':
        bucket.withdrawalCents += Math.abs(tx.amount_cents);
        break;

      case 'donation':
        bucket.donationCents += Math.abs(tx.amount_cents);
        break;

      default:
        // 'adjustment' and unknown types — count them but no category bucket
        break;
    }
  }

  // Compute savings rates and propagate endingBalance forward where no tx occurred
  let lastKnownBalance = startingBalance;
  for (const bucket of months) {
    // If the bucket had no transactions, keep the rolling balance from the prior month
    if (bucket.transactionCount === 0) {
      bucket.endingBalanceCents = lastKnownBalance;
      bucket.peakBalanceCents = lastKnownBalance;
    } else {
      lastKnownBalance = bucket.endingBalanceCents;
    }

    // Savings rate
    bucket.savingsRate =
      bucket.totalDepositCents > 0
        ? bucket.savingsDepositCents / bucket.totalDepositCents
        : 0;
  }

  // Year totals
  const yearTotals = months.reduce(
    (acc, m) => ({
      interestCents: acc.interestCents + m.interestCents,
      totalDepositCents: acc.totalDepositCents + m.totalDepositCents,
      savingsDepositCents: acc.savingsDepositCents + m.savingsDepositCents,
      choreEarningsCents: acc.choreEarningsCents + m.choreEarningsCents,
      withdrawalCents: acc.withdrawalCents + m.withdrawalCents,
      donationCents: acc.donationCents + m.donationCents,
      transactionCount: acc.transactionCount + m.transactionCount,
    }),
    {
      interestCents: 0,
      totalDepositCents: 0,
      savingsDepositCents: 0,
      choreEarningsCents: 0,
      withdrawalCents: 0,
      donationCents: 0,
      transactionCount: 0,
    },
  );

  return { childId, childName, year, months, yearTotals };
}

/**
 * Build a family-wide monthly summary report.
 */
export function computeFamilyMonthlySummary(
  year: number,
  children: Array<{ id: string; name: string }>,
  transactionsByChild: Map<string, Transaction[]>,
  startingBalanceByChild: Map<string, number> = new Map(),
): FamilyMonthlySummary {
  const childSummaries = children.map((c) =>
    computeChildMonthlySummaries(
      c.id,
      c.name,
      year,
      transactionsByChild.get(c.id) ?? [],
      startingBalanceByChild.get(c.id) ?? 0,
    ),
  );

  const familyTotals = childSummaries.reduce(
    (acc, cs) => ({
      interestCents: acc.interestCents + cs.yearTotals.interestCents,
      totalDepositCents: acc.totalDepositCents + cs.yearTotals.totalDepositCents,
      withdrawalCents: acc.withdrawalCents + cs.yearTotals.withdrawalCents,
      donationCents: acc.donationCents + cs.yearTotals.donationCents,
    }),
    { interestCents: 0, totalDepositCents: 0, withdrawalCents: 0, donationCents: 0 },
  );

  return {
    year,
    generatedAt: new Date().toISOString(),
    children: childSummaries,
    familyTotals,
  };
}

/**
 * Find the best month for a child by a given metric.
 * Returns the MonthlySummary with the highest value for `metric`.
 */
export function bestMonth(
  summaries: MonthlySummary[],
  metric: keyof Pick<MonthlySummary, 'interestCents' | 'totalDepositCents' | 'choreEarningsCents' | 'savingsRate'>,
): MonthlySummary | null {
  if (summaries.length === 0) return null;
  return summaries.reduce((best, m) => (m[metric] > best[metric] ? m : best), summaries[0]);
}

/**
 * Return months where a given metric exceeds a threshold — useful for highlights.
 */
export function monthsAboveThreshold(
  summaries: MonthlySummary[],
  metric: keyof Pick<MonthlySummary, 'interestCents' | 'totalDepositCents' | 'choreEarningsCents'>,
  thresholdCents: number,
): MonthlySummary[] {
  return summaries.filter((m) => m[metric] >= thresholdCents);
}

/**
 * Compute the running balance from month 0 through the given month index.
 * Returns an array of { month, balanceCents } for charting.
 */
export function runningBalances(
  summaries: MonthlySummary[],
): Array<{ month: number; monthName: string; balanceCents: number }> {
  return summaries.map((s) => ({
    month: s.month,
    monthName: s.monthName,
    balanceCents: s.endingBalanceCents,
  }));
}
