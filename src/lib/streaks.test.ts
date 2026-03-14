import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  toDateString,
  parseDateString,
  subtractDays,
  calculateConsecutiveStreak,
  isStreakActive,
  daysUntilStreakExpires,
} from './streaks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a UTC date at midnight for a given YYYY-MM-DD string */
function d(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/** Build a date N days ago relative to a fixed "today" */
function daysAgo(base: Date, n: number): Date {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() - n);
  return result;
}

// ---------------------------------------------------------------------------
// toDateString
// ---------------------------------------------------------------------------

describe('toDateString', () => {
  it('formats a UTC midnight date correctly', () => {
    expect(toDateString(new Date('2024-06-15T00:00:00Z'))).toBe('2024-06-15');
  });

  it('uses UTC, not local time', () => {
    // 11 PM UTC-5 = 4 AM UTC next day
    const late = new Date('2024-06-15T04:00:00Z');
    expect(toDateString(late)).toBe('2024-06-15');
  });
});

// ---------------------------------------------------------------------------
// parseDateString
// ---------------------------------------------------------------------------

describe('parseDateString', () => {
  it('round-trips with toDateString', () => {
    const str = '2025-01-20';
    expect(toDateString(parseDateString(str))).toBe(str);
  });
});

// ---------------------------------------------------------------------------
// subtractDays
// ---------------------------------------------------------------------------

describe('subtractDays', () => {
  it('subtracts one day', () => {
    const base = d('2025-03-10');
    expect(toDateString(subtractDays(base, 1))).toBe('2025-03-09');
  });

  it('crosses month boundary', () => {
    expect(toDateString(subtractDays(d('2025-03-01'), 1))).toBe('2025-02-28');
  });

  it('crosses year boundary', () => {
    expect(toDateString(subtractDays(d('2025-01-01'), 1))).toBe('2024-12-31');
  });
});

// ---------------------------------------------------------------------------
// calculateConsecutiveStreak
// ---------------------------------------------------------------------------

describe('calculateConsecutiveStreak', () => {
  const TODAY = '2025-03-14';

  beforeEach(() => {
    // Pin "now" to TODAY for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY + 'T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty array', () => {
    expect(calculateConsecutiveStreak([])).toBe(0);
  });

  it('returns 0 when most recent activity is 2+ days ago', () => {
    const dates = [d('2025-03-11'), d('2025-03-12')]; // last active 2 days ago
    expect(calculateConsecutiveStreak(dates)).toBe(0);
  });

  it('returns 1 for activity only today', () => {
    expect(calculateConsecutiveStreak([d(TODAY)])).toBe(1);
  });

  it('returns 1 for activity only yesterday', () => {
    expect(calculateConsecutiveStreak([d('2025-03-13')])).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    // 5-day streak through today
    const dates = [
      d('2025-03-10'),
      d('2025-03-11'),
      d('2025-03-12'),
      d('2025-03-13'),
      d(TODAY),
    ];
    expect(calculateConsecutiveStreak(dates)).toBe(5);
  });

  it('counts consecutive days ending yesterday', () => {
    // 3-day streak through yesterday (today not logged)
    const dates = [d('2025-03-11'), d('2025-03-12'), d('2025-03-13')];
    expect(calculateConsecutiveStreak(dates)).toBe(3);
  });

  it('stops counting at a gap', () => {
    // Active today and 2 days ago, but NOT yesterday → streak = 1
    const dates = [d('2025-03-12'), d(TODAY)];
    expect(calculateConsecutiveStreak(dates)).toBe(1);
  });

  it('handles duplicate dates gracefully', () => {
    const dates = [
      d(TODAY),
      d(TODAY), // duplicate
      d('2025-03-13'),
      d('2025-03-13'), // duplicate
    ];
    expect(calculateConsecutiveStreak(dates)).toBe(2);
  });

  it('handles a 7-day streak (week warrior achievement)', () => {
    const dates = Array.from({ length: 7 }, (_, i) =>
      daysAgo(d(TODAY), 6 - i)
    );
    expect(calculateConsecutiveStreak(dates)).toBe(7);
  });

  it('handles a 30-day streak', () => {
    const dates = Array.from({ length: 30 }, (_, i) =>
      daysAgo(d(TODAY), 29 - i)
    );
    expect(calculateConsecutiveStreak(dates)).toBe(30);
  });

  it('ignores old dates before the gap', () => {
    // A separate old streak should not extend the current one
    const dates = [
      d('2025-02-01'),
      d('2025-02-02'),
      d('2025-02-03'),
      d('2025-03-13'), // 1-day streak ending yesterday
    ];
    expect(calculateConsecutiveStreak(dates)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// isStreakActive
// ---------------------------------------------------------------------------

describe('isStreakActive', () => {
  const TODAY = '2025-03-14';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY + 'T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false for null', () => {
    expect(isStreakActive(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isStreakActive(undefined)).toBe(false);
  });

  it('returns true for today', () => {
    expect(isStreakActive(d(TODAY))).toBe(true);
  });

  it('returns true for yesterday', () => {
    expect(isStreakActive(d('2025-03-13'))).toBe(true);
  });

  it('returns false for two days ago', () => {
    expect(isStreakActive(d('2025-03-12'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// daysUntilStreakExpires
// ---------------------------------------------------------------------------

describe('daysUntilStreakExpires', () => {
  const TODAY = '2025-03-14';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY + 'T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for broken streak', () => {
    expect(daysUntilStreakExpires(d('2025-03-12'))).toBe(0);
  });

  it('returns 2 if active today (have today + tomorrow)', () => {
    expect(daysUntilStreakExpires(d(TODAY))).toBe(2);
  });

  it('returns 1 if only active yesterday (must log in today)', () => {
    expect(daysUntilStreakExpires(d('2025-03-13'))).toBe(1);
  });

  it('returns 0 for null', () => {
    expect(daysUntilStreakExpires(null)).toBe(0);
  });
});
