/**
 * GrowBucks Streak Tracking
 * Calculates consecutive login day streaks from activity records.
 */

/**
 * Convert a Date to a YYYY-MM-DD string in UTC.
 */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a YYYY-MM-DD string to a UTC midnight Date.
 */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Subtract N days from a Date (UTC-safe).
 */
export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

/**
 * Calculate the current consecutive login streak.
 *
 * A streak is a run of calendar days (UTC) ending on today or yesterday.
 * If the most recent activity was 2+ days ago, streak is 0.
 *
 * @param activityDates - Array of dates the child was active (duplicates OK)
 * @returns Number of consecutive active days (0 if no recent activity)
 */
export function calculateConsecutiveStreak(activityDates: Date[]): number {
  if (activityDates.length === 0) return 0;

  // Deduplicate to YYYY-MM-DD strings
  const dateSet = new Set<string>(activityDates.map((d) => toDateString(d)));

  const today = toDateString(new Date());
  const yesterday = toDateString(subtractDays(new Date(), 1));

  // Streak must end today or yesterday (otherwise it's broken)
  const startDate = dateSet.has(today)
    ? today
    : dateSet.has(yesterday)
    ? yesterday
    : null;

  if (!startDate) return 0;

  // Count consecutive days backwards from startDate
  let streak = 0;
  let current = startDate;

  while (dateSet.has(current)) {
    streak++;
    current = toDateString(subtractDays(parseDateString(current), 1));
  }

  return streak;
}

/**
 * Check whether a streak is currently active (activity today or yesterday).
 */
export function isStreakActive(lastActivityDate: Date | null | undefined): boolean {
  if (!lastActivityDate) return false;

  const today = toDateString(new Date());
  const yesterday = toDateString(subtractDays(new Date(), 1));
  const last = toDateString(lastActivityDate);

  return last === today || last === yesterday;
}

/**
 * Return how many days until a streak would expire.
 * Returns 0 if the streak is already broken, 1 if it expires today.
 */
export function daysUntilStreakExpires(lastActivityDate: Date | null | undefined): number {
  if (!isStreakActive(lastActivityDate)) return 0;

  const today = toDateString(new Date());
  const last = toDateString(lastActivityDate!);

  // If active today, still have rest of tomorrow to log in
  return last === today ? 2 : 1;
}
