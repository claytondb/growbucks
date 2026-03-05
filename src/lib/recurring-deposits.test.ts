import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateNextDeposit,
  calculateNextDepositAfter,
  validateAmount,
  validateFrequency,
  validateDayOfWeek,
  validateDayOfMonth,
  formatSchedule,
  getOrdinalSuffix,
  formatAmountCents,
  Frequency,
} from './recurring-deposits';

describe('recurring-deposits', () => {
  describe('calculateNextDeposit', () => {
    beforeEach(() => {
      // Mock date: Wednesday, March 5, 2026 at 10:00 AM
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-05T10:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calculates weekly deposit for future day this week', () => {
      // Thursday -> Friday (1 day ahead) - Note: March 5, 2026 is a Thursday
      const result = calculateNextDeposit('weekly', 5); // Friday = 5
      expect(result.getDay()).toBe(5);
      expect(result.getDate()).toBe(6); // March 6
    });

    it('calculates weekly deposit for past day (wraps to next week)', () => {
      // Thursday -> Monday (wraps to next week)
      const result = calculateNextDeposit('weekly', 1); // Monday = 1
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(9); // March 9
    });

    it('calculates weekly deposit for same day (wraps to next week)', () => {
      // Thursday -> Thursday (wraps to next week)
      const result = calculateNextDeposit('weekly', 4); // Thursday = 4
      expect(result.getDay()).toBe(4);
      expect(result.getDate()).toBe(12); // March 12
    });

    it('calculates biweekly deposit', () => {
      // Thursday -> Friday, but since <7 days, adds another week
      const result = calculateNextDeposit('biweekly', 5); // Friday = 5
      expect(result.getDay()).toBe(5);
      expect(result.getDate()).toBe(13); // March 13 (biweekly from next Friday)
    });

    it('calculates monthly deposit for future day this month', () => {
      // March 5 -> March 15
      const result = calculateNextDeposit('monthly', undefined, 15);
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
    });

    it('calculates monthly deposit for past day (wraps to next month)', () => {
      // March 5 -> April 1
      const result = calculateNextDeposit('monthly', undefined, 1);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(3); // April
    });

    it('sets time to 9 AM', () => {
      const result = calculateNextDeposit('weekly', 5);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });

    it('accepts custom fromDate', () => {
      const customDate = new Date('2026-06-01T10:00:00');
      const result = calculateNextDeposit('weekly', 1, undefined, customDate); // Monday
      expect(result.getMonth()).toBe(5); // June
    });
  });

  describe('calculateNextDepositAfter', () => {
    it('adds 7 days for weekly', () => {
      const current = new Date('2026-03-05T10:00:00');
      const result = calculateNextDepositAfter('weekly', current);
      expect(result.getDate()).toBe(12);
    });

    it('adds 14 days for biweekly', () => {
      const current = new Date('2026-03-05T10:00:00');
      const result = calculateNextDepositAfter('biweekly', current);
      expect(result.getDate()).toBe(19);
    });

    it('moves to next month for monthly', () => {
      const current = new Date('2026-03-15T10:00:00');
      const result = calculateNextDepositAfter('monthly', current, null, 15);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(15);
    });
  });

  describe('validateAmount', () => {
    it('accepts valid amounts', () => {
      expect(validateAmount(100)).toEqual({ valid: true });
      expect(validateAmount(1)).toEqual({ valid: true });
      expect(validateAmount(1000000)).toEqual({ valid: true });
      expect(validateAmount(50000)).toEqual({ valid: true }); // $500
    });

    it('rejects amounts below minimum', () => {
      const result = validateAmount(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('$0.01');
    });

    it('rejects negative amounts', () => {
      const result = validateAmount(-100);
      expect(result.valid).toBe(false);
    });

    it('rejects amounts above maximum', () => {
      const result = validateAmount(1000001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('$10,000');
    });

    it('rejects non-numbers', () => {
      expect(validateAmount(NaN).valid).toBe(false);
      expect(validateAmount(Infinity).valid).toBe(false);
    });
  });

  describe('validateFrequency', () => {
    it('accepts valid frequencies', () => {
      expect(validateFrequency('weekly')).toBe(true);
      expect(validateFrequency('biweekly')).toBe(true);
      expect(validateFrequency('monthly')).toBe(true);
    });

    it('rejects invalid frequencies', () => {
      expect(validateFrequency('daily')).toBe(false);
      expect(validateFrequency('yearly')).toBe(false);
      expect(validateFrequency('')).toBe(false);
    });
  });

  describe('validateDayOfWeek', () => {
    it('accepts valid days (0-6)', () => {
      for (let i = 0; i <= 6; i++) {
        expect(validateDayOfWeek(i)).toBe(true);
      }
    });

    it('rejects out of range values', () => {
      expect(validateDayOfWeek(-1)).toBe(false);
      expect(validateDayOfWeek(7)).toBe(false);
      expect(validateDayOfWeek(10)).toBe(false);
    });

    it('rejects non-integers', () => {
      expect(validateDayOfWeek(1.5)).toBe(false);
    });
  });

  describe('validateDayOfMonth', () => {
    it('accepts valid days (1-28)', () => {
      for (let i = 1; i <= 28; i++) {
        expect(validateDayOfMonth(i)).toBe(true);
      }
    });

    it('rejects out of range values', () => {
      expect(validateDayOfMonth(0)).toBe(false);
      expect(validateDayOfMonth(29)).toBe(false);
      expect(validateDayOfMonth(30)).toBe(false);
      expect(validateDayOfMonth(31)).toBe(false);
    });

    it('rejects non-integers', () => {
      expect(validateDayOfMonth(15.5)).toBe(false);
    });
  });

  describe('formatSchedule', () => {
    it('formats weekly schedules', () => {
      expect(formatSchedule('weekly', 0)).toBe('Every Sunday');
      expect(formatSchedule('weekly', 1)).toBe('Every Monday');
      expect(formatSchedule('weekly', 5)).toBe('Every Friday');
    });

    it('formats biweekly schedules', () => {
      expect(formatSchedule('biweekly', 0)).toBe('Every other Sunday');
      expect(formatSchedule('biweekly', 3)).toBe('Every other Wednesday');
    });

    it('formats monthly schedules with ordinal suffix', () => {
      expect(formatSchedule('monthly', null, 1)).toBe('Monthly on the 1st');
      expect(formatSchedule('monthly', null, 2)).toBe('Monthly on the 2nd');
      expect(formatSchedule('monthly', null, 3)).toBe('Monthly on the 3rd');
      expect(formatSchedule('monthly', null, 4)).toBe('Monthly on the 4th');
      expect(formatSchedule('monthly', null, 15)).toBe('Monthly on the 15th');
      expect(formatSchedule('monthly', null, 21)).toBe('Monthly on the 21st');
      expect(formatSchedule('monthly', null, 22)).toBe('Monthly on the 22nd');
      expect(formatSchedule('monthly', null, 23)).toBe('Monthly on the 23rd');
    });

    it('handles null day values', () => {
      expect(formatSchedule('weekly', null, null)).toBe('Weekly');
      expect(formatSchedule('monthly', null, null)).toBe('Monthly');
    });
  });

  describe('getOrdinalSuffix', () => {
    it('returns st for 1, 21', () => {
      expect(getOrdinalSuffix(1)).toBe('st');
      expect(getOrdinalSuffix(21)).toBe('st');
    });

    it('returns nd for 2, 22', () => {
      expect(getOrdinalSuffix(2)).toBe('nd');
      expect(getOrdinalSuffix(22)).toBe('nd');
    });

    it('returns rd for 3, 23', () => {
      expect(getOrdinalSuffix(3)).toBe('rd');
      expect(getOrdinalSuffix(23)).toBe('rd');
    });

    it('returns th for 11, 12, 13 (exceptions)', () => {
      expect(getOrdinalSuffix(11)).toBe('th');
      expect(getOrdinalSuffix(12)).toBe('th');
      expect(getOrdinalSuffix(13)).toBe('th');
    });

    it('returns th for other numbers', () => {
      expect(getOrdinalSuffix(4)).toBe('th');
      expect(getOrdinalSuffix(5)).toBe('th');
      expect(getOrdinalSuffix(10)).toBe('th');
      expect(getOrdinalSuffix(15)).toBe('th');
      expect(getOrdinalSuffix(28)).toBe('th');
    });
  });

  describe('formatAmountCents', () => {
    it('formats cents to dollars with 2 decimal places', () => {
      expect(formatAmountCents(100)).toBe('$1.00');
      expect(formatAmountCents(1)).toBe('$0.01');
      expect(formatAmountCents(1050)).toBe('$10.50');
      expect(formatAmountCents(100000)).toBe('$1000.00');
      expect(formatAmountCents(999)).toBe('$9.99');
    });

    it('handles zero', () => {
      expect(formatAmountCents(0)).toBe('$0.00');
    });
  });
});
