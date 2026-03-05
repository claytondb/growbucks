/**
 * Recurring Deposits Utilities
 * Helper functions for recurring deposit scheduling and validation
 */

export type Frequency = 'weekly' | 'biweekly' | 'monthly';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
};

export const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Calculate the next deposit date based on frequency and day settings
 */
export function calculateNextDeposit(
  frequency: Frequency,
  dayOfWeek?: number,
  dayOfMonth?: number,
  fromDate?: Date
): Date {
  const now = fromDate || new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0); // Default to 9 AM

  if (frequency === 'monthly' && dayOfMonth !== undefined) {
    // Set to the specified day of month
    next.setDate(dayOfMonth);
    // If we've passed that day this month, move to next month
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  if (dayOfWeek !== undefined) {
    // Weekly or biweekly
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    next.setDate(now.getDate() + daysUntil);

    // For biweekly, if it's less than 7 days away, add another week
    if (frequency === 'biweekly' && daysUntil < 7) {
      next.setDate(next.getDate() + 7);
    }
  }

  return next;
}

/**
 * Calculate the next deposit date after a deposit was processed
 */
export function calculateNextDepositAfter(
  frequency: Frequency,
  currentDate: Date,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const next = new Date(currentDate);
  next.setHours(9, 0, 0, 0);

  if (frequency === 'monthly' && dayOfMonth) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(dayOfMonth);
  } else if (frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
  } else {
    // weekly
    next.setDate(next.getDate() + 7);
  }

  return next;
}

/**
 * Validate recurring deposit amount
 */
export function validateAmount(amountCents: number): { valid: boolean; error?: string } {
  if (typeof amountCents !== 'number' || !Number.isFinite(amountCents)) {
    return { valid: false, error: 'Amount must be a number' };
  }
  if (amountCents < 1) {
    return { valid: false, error: 'Amount must be at least $0.01' };
  }
  if (amountCents > 1000000) {
    return { valid: false, error: 'Amount cannot exceed $10,000' };
  }
  return { valid: true };
}

/**
 * Validate frequency
 */
export function validateFrequency(frequency: string): frequency is Frequency {
  return ['weekly', 'biweekly', 'monthly'].includes(frequency);
}

/**
 * Validate day of week (0-6, Sunday-Saturday)
 */
export function validateDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * Validate day of month (1-28)
 */
export function validateDayOfMonth(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 28;
}

/**
 * Format a recurring deposit schedule for display
 */
export function formatSchedule(
  frequency: Frequency,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): string {
  if (frequency === 'monthly' && dayOfMonth) {
    const suffix = getOrdinalSuffix(dayOfMonth);
    return `Monthly on the ${dayOfMonth}${suffix}`;
  }

  if (dayOfWeek !== undefined && dayOfWeek !== null) {
    const dayName = DAY_OF_WEEK_LABELS[dayOfWeek];
    if (frequency === 'biweekly') {
      return `Every other ${dayName}`;
    }
    return `Every ${dayName}`;
  }

  return FREQUENCY_LABELS[frequency];
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Format amount in cents to dollars
 */
export function formatAmountCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
