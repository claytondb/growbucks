/**
 * GrowBucks Split Savings Utilities
 *
 * Enables parents to automatically split incoming deposits between two buckets:
 *   - "Spend"  → free-to-use portion (balance_cents - save_balance_cents)
 *   - "Save"   → locked portion (save_balance_cents), released only by parent
 *
 * Interest continues to compound on the full balance_cents (spend + save combined)
 * so kids benefit from the compound effect across both buckets.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum allowed split percentage (0 = feature disabled) */
export const MIN_SPLIT_PERCENT = 0;

/** Maximum allowed split percentage (90 keeps at least 10% spendable) */
export const MAX_SPLIT_PERCENT = 90;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SplitSavingsConfig {
  /** 0–90. 0 means no auto-split. */
  split_save_percent: number;
}

export interface ChildBalance {
  /** Total balance including both buckets, used for interest. Cents. */
  balance_cents: number;
  /** Locked savings bucket. Cents. */
  save_balance_cents: number;
}

export interface SplitResult {
  /** Amount routed to the spend bucket. Cents. */
  spend_cents: number;
  /** Amount routed to the save bucket. Cents. */
  save_cents: number;
}

export interface SpendSaveBalances {
  /** Freely spendable by the child. Cents. */
  spend_balance_cents: number;
  /** Locked savings balance. Cents. */
  save_balance_cents: number;
  /** Total (spend + save). Cents. */
  total_balance_cents: number;
  /** Percentage currently in savings (0–100, rounded). */
  save_percent_of_total: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Check whether a split percentage value is valid.
 */
export function isValidSplitPercent(percent: number): boolean {
  return (
    Number.isInteger(percent) &&
    percent >= MIN_SPLIT_PERCENT &&
    percent <= MAX_SPLIT_PERCENT
  );
}

/**
 * Return a human-readable label for a split percentage.
 *
 * @example
 * splitPercentLabel(0)   // "No split"
 * splitPercentLabel(50)  // "50% to savings"
 */
export function splitPercentLabel(percent: number): string {
  if (percent === 0) return 'No split';
  return `${percent}% to savings`;
}

// ─── Core Calculations ────────────────────────────────────────────────────────

/**
 * Calculate how a deposit amount is divided between spend and save.
 *
 * The save portion is floor-divided to avoid fractional cents;
 * any remainder lands in spend so kids never lose a cent.
 *
 * @param depositCents  Gross deposit amount in cents (must be > 0)
 * @param splitPercent  Parent-configured save split (0–90)
 * @returns             { spend_cents, save_cents }
 */
export function calculateSplit(depositCents: number, splitPercent: number): SplitResult {
  if (depositCents <= 0) {
    return { spend_cents: 0, save_cents: 0 };
  }
  if (!isValidSplitPercent(splitPercent) || splitPercent === 0) {
    return { spend_cents: depositCents, save_cents: 0 };
  }

  const save_cents = Math.floor((depositCents * splitPercent) / 100);
  const spend_cents = depositCents - save_cents;
  return { spend_cents, save_cents };
}

/**
 * Derive the spend/save breakdown from a child's stored balance values.
 */
export function getSpendSaveBalances(child: ChildBalance): SpendSaveBalances {
  const total_balance_cents = child.balance_cents;
  const save_balance_cents = child.save_balance_cents;
  const spend_balance_cents = Math.max(0, total_balance_cents - save_balance_cents);
  const save_percent_of_total =
    total_balance_cents > 0
      ? Math.round((save_balance_cents / total_balance_cents) * 100)
      : 0;

  return {
    spend_balance_cents,
    save_balance_cents,
    total_balance_cents,
    save_percent_of_total,
  };
}

/**
 * Calculate the new balance state after releasing savings back to spend.
 * Parents use this to unlock all or part of the savings bucket.
 *
 * @param current     Current balance state
 * @param releaseCents  Cents to move from savings → spending (must be ≤ save_balance_cents)
 * @returns           Updated balance state, or null if release amount is invalid
 */
export function calculateSavingsRelease(
  current: ChildBalance,
  releaseCents: number
): ChildBalance | null {
  if (releaseCents <= 0 || releaseCents > current.save_balance_cents) {
    return null;
  }
  return {
    balance_cents: current.balance_cents, // total unchanged
    save_balance_cents: current.save_balance_cents - releaseCents,
  };
}

/**
 * Calculate the new balance state after applying a deposit with auto-split.
 *
 * @param current       Current balance state
 * @param depositCents  New deposit amount in cents
 * @param splitPercent  Auto-split percentage (from child_settings)
 * @returns             Updated balance state and split breakdown
 */
export function applyDepositWithSplit(
  current: ChildBalance,
  depositCents: number,
  splitPercent: number
): { updated: ChildBalance; split: SplitResult } {
  const split = calculateSplit(depositCents, splitPercent);
  const updated: ChildBalance = {
    balance_cents: current.balance_cents + depositCents,
    save_balance_cents: current.save_balance_cents + split.save_cents,
  };
  return { updated, split };
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/**
 * Format a balance in cents as a dollar string (e.g. "$12.34").
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Return a motivational savings milestone label based on current save balance.
 *
 * @example
 * savingsMilestone(500)    // "Just getting started! 💰"
 * savingsMilestone(5000)   // "Great saver! 🌟"
 */
export function savingsMilestone(saveBalanceCents: number): string {
  if (saveBalanceCents <= 0) return '';
  if (saveBalanceCents < 1000) return 'Just getting started! 💰';
  if (saveBalanceCents < 5000) return 'Building good habits! 🌱';
  if (saveBalanceCents < 10000) return 'Great saver! 🌟';
  if (saveBalanceCents < 50000) return 'Super saver! 🚀';
  return 'Savings champion! 🏆';
}

/**
 * Generate a plain-English description of a savings_deposit transaction.
 */
export function savingsDepositDescription(splitPercent: number): string {
  return `Auto-save (${splitPercent}% split)`;
}

/**
 * Generate a plain-English description of a savings_release transaction.
 */
export function savingsReleaseDescription(): string {
  return 'Savings released to spending';
}

// ─── Preset Split Options ─────────────────────────────────────────────────────

export interface SplitPreset {
  label: string;
  value: number;
  description: string;
}

/** Suggested split percentages for the parent settings UI. */
export const SPLIT_PRESETS: SplitPreset[] = [
  { label: 'No split',       value: 0,  description: 'All deposits go to spending' },
  { label: '10% to savings', value: 10, description: 'A small healthy habit' },
  { label: '20% to savings', value: 20, description: 'The classic rule of thumb' },
  { label: '30% to savings', value: 30, description: 'Serious saver' },
  { label: '50% to savings', value: 50, description: 'Half and half' },
];
