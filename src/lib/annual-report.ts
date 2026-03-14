/**
 * GrowBucks Annual Report Utilities
 *
 * Generates a per-child annual summary of transactions for a given tax year.
 * Useful for parents managing custodial accounts (UTMA/UGMA) who need to
 * track interest income for tax purposes.
 *
 * Key output:
 *   - Total interest earned (the "1099-INT equivalent" figure)
 *   - Monthly breakdown of interest, deposits, withdrawals
 *   - Starting and ending balance
 *   - All data in dollars (two decimal places) and raw cents
 */

import { Transaction } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type Month = typeof MONTHS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyBreakdown {
  /** 1-indexed month number */
  month: number;
  /** Full month name */
  monthName: Month;
  /** Transactions that occurred in this month */
  transactionCount: number;
  /** Interest earned this month in cents (always >= 0) */
  interestCents: number;
  /** Net deposits this month in cents (always >= 0) */
  depositCents: number;
  /** Net withdrawals this month in cents (always >= 0, absolute value) */
  withdrawalCents: number;
  /** Allowance / recurring deposits (savings_deposit) in cents */
  savingsDepositCents: number;
  /** Chore earnings included in deposits */
  earnedCents: number;
}

export interface ChildAnnualReport {
  childId: string;
  childName: string;
  year: number;
  /** Balance at the start of the year (cents) — inferred from earliest known balance_after */
  startingBalanceCents: number;
  /** Balance at the end of the year (cents) — balance_after of last completed transaction */
  endingBalanceCents: number;
  /** Total interest earned across the year (cents) */
  totalInterestCents: number;
  /** Total deposits (including auto-saves) across the year (cents) */
  totalDepositCents: number;
  /** Total withdrawals across the year (absolute value, cents) */
  totalWithdrawalCents: number;
  /** Total chore/job earnings deposited (cents) */
  totalEarnedCents: number;
  /** Count of completed transactions */
  completedTransactionCount: number;
  /** Monthly breakdown, Jan–Dec (12 items) */
  monthly: MonthlyBreakdown[];
  /** Peak balance during the year (cents) */
  peakBalanceCents: number;
}

export interface AnnualReportSummary {
  year: number;
  generatedAt: string;
  children: ChildAnnualReport[];
  /** Total interest across all children */
  totalFamilyInterestCents: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format cents as a dollar string, e.g. "$1,234.56"
 */
export function formatMoney(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = abs / 100;
  const formatted = dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Check whether a transaction falls within the given calendar year (UTC).
 */
export function isInYear(dateString: string, year: number): boolean {
  const d = new Date(dateString);
  return d.getUTCFullYear() === year;
}

/**
 * Return the 1-indexed month number (1–12) of a date string (UTC).
 */
export function getUtcMonth(dateString: string): number {
  return new Date(dateString).getUTCMonth() + 1;
}

/**
 * Determine whether a transaction contributes to interest income.
 * We count 'interest' type transactions (not deposits from chores / parent).
 */
export function isInterestTransaction(tx: Transaction): boolean {
  return tx.type === 'interest';
}

/**
 * Determine whether a transaction is a deposit-type event.
 * 'deposit', 'savings_deposit', and 'savings_release' (release back to spend)
 * are all inflows.
 */
export function isDepositType(tx: Transaction): boolean {
  return (
    tx.type === 'deposit' ||
    tx.type === 'savings_deposit' ||
    tx.type === 'savings_release'
  );
}

/**
 * Determine whether a transaction is a withdrawal.
 */
export function isWithdrawalType(tx: Transaction): boolean {
  return tx.type === 'withdrawal';
}

/**
 * Determine whether a transaction appears to be a chore/job earning.
 * Heuristic: deposit with description containing "chore" or "job" (case-insensitive).
 */
export function isChoreEarning(tx: Transaction): boolean {
  if (!isDepositType(tx)) return false;
  const desc = (tx.description ?? '').toLowerCase();
  return desc.includes('chore') || desc.includes('job') || desc.includes('earn');
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Build an empty MonthlyBreakdown for the given 1-indexed month number.
 */
function emptyMonth(month: number): MonthlyBreakdown {
  return {
    month,
    monthName: MONTHS[month - 1],
    transactionCount: 0,
    interestCents: 0,
    depositCents: 0,
    withdrawalCents: 0,
    savingsDepositCents: 0,
    earnedCents: 0,
  };
}

/**
 * Compute the annual report for a single child.
 *
 * @param childId - UUID of the child
 * @param childName - Display name
 * @param year - Calendar year (e.g. 2026)
 * @param allTransactions - All transactions for this child (any year; we filter internally)
 */
export function computeChildAnnualReport(
  childId: string,
  childName: string,
  year: number,
  allTransactions: Transaction[],
): ChildAnnualReport {
  // Filter to the target year only (completed transactions)
  const yearTxs = allTransactions.filter(
    (tx) =>
      isInYear(tx.created_at, year) &&
      (tx.status === 'completed' || tx.type === 'interest'),
  );

  // Sort chronologically
  const sorted = [...yearTxs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // ── Starting balance ──────────────────────────────────────────────────────
  // Best estimate: balance_after of the last transaction before this year.
  const priorTxs = allTransactions
    .filter((tx) => new Date(tx.created_at).getUTCFullYear() < year)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  let startingBalanceCents = 0;
  if (priorTxs.length > 0) {
    startingBalanceCents = priorTxs[0].balance_after_cents;
  } else if (sorted.length > 0) {
    // Fall back: first tx balance_after minus its own amount
    const first = sorted[0];
    startingBalanceCents = Math.max(0, first.balance_after_cents - first.amount_cents);
  }

  // ── Monthly buckets ───────────────────────────────────────────────────────
  const monthly: MonthlyBreakdown[] = Array.from({ length: 12 }, (_, i) => emptyMonth(i + 1));

  let totalInterestCents = 0;
  let totalDepositCents = 0;
  let totalWithdrawalCents = 0;
  let totalEarnedCents = 0;
  let completedTransactionCount = 0;
  let peakBalanceCents = startingBalanceCents;

  for (const tx of sorted) {
    const monthIdx = getUtcMonth(tx.created_at) - 1; // 0-indexed
    const bucket = monthly[monthIdx];

    bucket.transactionCount++;
    completedTransactionCount++;

    if (tx.balance_after_cents > peakBalanceCents) {
      peakBalanceCents = tx.balance_after_cents;
    }

    if (isInterestTransaction(tx)) {
      bucket.interestCents += tx.amount_cents;
      totalInterestCents += tx.amount_cents;
    } else if (tx.type === 'savings_deposit') {
      bucket.savingsDepositCents += tx.amount_cents;
      bucket.depositCents += tx.amount_cents;
      totalDepositCents += tx.amount_cents;
    } else if (isDepositType(tx)) {
      bucket.depositCents += tx.amount_cents;
      totalDepositCents += tx.amount_cents;
      if (isChoreEarning(tx)) {
        bucket.earnedCents += tx.amount_cents;
        totalEarnedCents += tx.amount_cents;
      }
    } else if (isWithdrawalType(tx)) {
      const absAmt = Math.abs(tx.amount_cents);
      bucket.withdrawalCents += absAmt;
      totalWithdrawalCents += absAmt;
    }
  }

  // Ending balance: last sorted tx's balance_after, or starting if no txs
  const endingBalanceCents =
    sorted.length > 0 ? sorted[sorted.length - 1].balance_after_cents : startingBalanceCents;

  return {
    childId,
    childName,
    year,
    startingBalanceCents,
    endingBalanceCents,
    totalInterestCents,
    totalDepositCents,
    totalWithdrawalCents,
    totalEarnedCents,
    completedTransactionCount,
    monthly,
    peakBalanceCents,
  };
}

/**
 * Build the full family annual report given a map of children and their transactions.
 *
 * @param year - Calendar year
 * @param children - Array of { id, name } objects
 * @param transactionsByChild - Map<childId, Transaction[]>
 */
export function computeAnnualReport(
  year: number,
  children: Array<{ id: string; name: string }>,
  transactionsByChild: Map<string, Transaction[]>,
): AnnualReportSummary {
  const reports = children.map((c) =>
    computeChildAnnualReport(c.id, c.name, year, transactionsByChild.get(c.id) ?? []),
  );

  const totalFamilyInterestCents = reports.reduce(
    (sum, r) => sum + r.totalInterestCents,
    0,
  );

  return {
    year,
    generatedAt: new Date().toISOString(),
    children: reports,
    totalFamilyInterestCents,
  };
}

// ─── CSV generation ───────────────────────────────────────────────────────────

/**
 * Generate a CSV for a single child's annual report.
 * The file has a header block, summary section, and monthly breakdown table.
 */
export function childAnnualReportToCSV(report: ChildAnnualReport): string {
  const lines: string[] = [
    `# GrowBucks Annual Report`,
    `# Child: ${report.childName}`,
    `# Tax Year: ${report.year}`,
    `# Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `#`,
    `# NOTE: This report is for informational purposes only.`,
    `# Please consult a tax professional for filing guidance.`,
    ``,
    `## Summary`,
    `Field,Value`,
    `Child Name,${report.childName}`,
    `Tax Year,${report.year}`,
    `Starting Balance,${formatMoney(report.startingBalanceCents)}`,
    `Ending Balance,${formatMoney(report.endingBalanceCents)}`,
    `Peak Balance,${formatMoney(report.peakBalanceCents)}`,
    `Total Interest Earned,${formatMoney(report.totalInterestCents)}`,
    `Total Deposits,${formatMoney(report.totalDepositCents)}`,
    `Total Withdrawals,${formatMoney(report.totalWithdrawalCents)}`,
    `Total Chore/Job Earnings,${formatMoney(report.totalEarnedCents)}`,
    `Total Transactions,${report.completedTransactionCount}`,
    ``,
    `## Monthly Breakdown`,
    `Month,Interest Earned,Deposits,Savings Auto-Deposits,Chore Earnings,Withdrawals,Transactions`,
  ];

  for (const m of report.monthly) {
    lines.push(
      [
        m.monthName,
        formatMoney(m.interestCents),
        formatMoney(m.depositCents),
        formatMoney(m.savingsDepositCents),
        formatMoney(m.earnedCents),
        formatMoney(m.withdrawalCents),
        m.transactionCount,
      ].join(','),
    );
  }

  // Totals row
  lines.push(
    [
      'TOTAL',
      formatMoney(report.totalInterestCents),
      formatMoney(report.totalDepositCents),
      formatMoney(report.monthly.reduce((s, m) => s + m.savingsDepositCents, 0)),
      formatMoney(report.totalEarnedCents),
      formatMoney(report.totalWithdrawalCents),
      report.completedTransactionCount,
    ].join(','),
  );

  return lines.join('\n');
}

/**
 * Generate a combined family CSV with all children on separate sections.
 */
export function familyAnnualReportToCSV(summary: AnnualReportSummary): string {
  const sections: string[] = [
    `# GrowBucks Family Annual Report`,
    `# Tax Year: ${summary.year}`,
    `# Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `# Total Family Interest Earned: ${formatMoney(summary.totalFamilyInterestCents)}`,
    ``,
  ];

  for (const child of summary.children) {
    sections.push(childAnnualReportToCSV(child));
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  return sections.join('\n');
}
