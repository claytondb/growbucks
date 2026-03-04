import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatMoney,
  formatMoneyParts,
  calculateCompoundInterest,
  calculateDailyInterest,
  getDisplayBalance,
  formatDate,
  formatPercent,
  getInitials,
  getAvatarColor,
  validatePin,
  validateInterestRate,
  validateAmount,
  daysUntilGoal,
  getGreeting,
} from './utils';

describe('cn (class name merger)', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays and objects', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});

describe('formatMoney', () => {
  it('formats positive cents to dollars', () => {
    expect(formatMoney(100)).toBe('$1.00');
    expect(formatMoney(1234)).toBe('$12.34');
    expect(formatMoney(99999)).toBe('$999.99');
  });

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-500)).toBe('$-5.00');
  });

  it('shows positive sign when requested', () => {
    expect(formatMoney(500, { showSign: true })).toBe('+$5.00');
    expect(formatMoney(-500, { showSign: true })).toBe('$-5.00');
    expect(formatMoney(0, { showSign: true })).toBe('$0.00');
  });

  it('handles fractional cents', () => {
    expect(formatMoney(99.5)).toBe('$0.99'); // 99.5 cents → $0.995 → $0.99
    expect(formatMoney(1)).toBe('$0.01');
  });
});

describe('formatMoneyParts', () => {
  it('splits dollars and cents correctly', () => {
    expect(formatMoneyParts(12345)).toEqual({ dollars: '123', cents: '45' });
    expect(formatMoneyParts(100)).toEqual({ dollars: '1', cents: '00' });
    expect(formatMoneyParts(50)).toEqual({ dollars: '0', cents: '50' });
  });

  it('formats large amounts with commas', () => {
    expect(formatMoneyParts(100000000)).toEqual({ dollars: '1,000,000', cents: '00' });
  });

  it('handles zero', () => {
    expect(formatMoneyParts(0)).toEqual({ dollars: '0', cents: '00' });
  });
});

describe('calculateCompoundInterest', () => {
  it('calculates compound interest correctly', () => {
    // $100 at 1% daily for 1 day = $101
    expect(calculateCompoundInterest(10000, 0.01, 1)).toBe(10100);
    
    // $100 at 1% daily for 7 days = $107.21 (rounded down)
    const result = calculateCompoundInterest(10000, 0.01, 7);
    expect(result).toBe(10721); // Math.floor(100 * 1.01^7 * 100)
  });

  it('returns principal when days is 0', () => {
    expect(calculateCompoundInterest(10000, 0.01, 0)).toBe(10000);
  });

  it('handles zero principal', () => {
    expect(calculateCompoundInterest(0, 0.01, 30)).toBe(0);
  });

  it('handles zero rate', () => {
    expect(calculateCompoundInterest(10000, 0, 30)).toBe(10000);
  });
});

describe('calculateDailyInterest', () => {
  it('calculates single day interest', () => {
    // $100 at 1% = $1 interest
    expect(calculateDailyInterest(10000, 0.01)).toBe(100);
    
    // $500 at 2% = $10 interest
    expect(calculateDailyInterest(50000, 0.02)).toBe(1000);
  });

  it('floors the result', () => {
    // $33.33 at 1% = 33.33 cents, floored to 33
    expect(calculateDailyInterest(3333, 0.01)).toBe(33);
  });

  it('handles zero balance', () => {
    expect(calculateDailyInterest(0, 0.05)).toBe(0);
  });
});

describe('getDisplayBalance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns balance when interest was just applied', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const balance = getDisplayBalance(10000, 0.01, now);
    expect(balance).toBe(10000);
  });

  it('interpolates balance for partial day', () => {
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z'));
    
    // Interest applied 12 hours ago (half a day)
    const lastInterest = new Date('2026-03-04T00:00:00Z');
    const balance = getDisplayBalance(10000, 0.01, lastInterest);
    
    // Half day of 1% = 0.5% = $50 in pending interest
    expect(balance).toBe(10050);
  });

  it('caps interpolation at 1 day', () => {
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z'));
    
    // Interest applied 2 days ago
    const lastInterest = new Date('2026-03-02T12:00:00Z');
    const balance = getDisplayBalance(10000, 0.01, lastInterest);
    
    // Should cap at 1 day worth of pending interest
    expect(balance).toBe(10100);
  });
});

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Just now" for very recent dates', () => {
    expect(formatDate('2026-03-04T14:59:30Z')).toBe('Just now');
  });

  it('shows minutes ago', () => {
    expect(formatDate('2026-03-04T14:45:00Z')).toBe('15 minutes ago');
  });

  it('shows hours ago', () => {
    expect(formatDate('2026-03-04T12:00:00Z')).toBe('3 hours ago');
    expect(formatDate('2026-03-04T14:00:00Z')).toBe('1 hour ago');
  });

  it('shows "Yesterday" for yesterday', () => {
    expect(formatDate('2026-03-03T10:00:00Z')).toBe('Yesterday');
  });

  it('shows days ago for recent dates', () => {
    expect(formatDate('2026-03-01T10:00:00Z')).toBe('3 days ago');
  });

  it('shows formatted date for older dates', () => {
    const result = formatDate('2026-02-15T10:00:00Z');
    expect(result).toMatch(/Feb\s+15/);
  });

  it('includes year for different year', () => {
    const result = formatDate('2025-12-25T10:00:00Z');
    expect(result).toMatch(/Dec\s+25,?\s+2025/);
  });
});

describe('formatPercent', () => {
  it('formats rate as percentage', () => {
    expect(formatPercent(0.01)).toBe('1.0%');
    expect(formatPercent(0.001)).toBe('0.1%');
    expect(formatPercent(0.05)).toBe('5.0%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('handles precision', () => {
    expect(formatPercent(0.0123)).toBe('1.2%');
    expect(formatPercent(0.0156)).toBe('1.6%'); // rounds
  });
});

describe('getInitials', () => {
  it('gets initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Alice Bob Charlie')).toBe('AB');
  });

  it('handles single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('limits to 2 characters', () => {
    expect(getInitials('A B C D')).toBe('AB');
  });

  it('uppercases', () => {
    expect(getInitials('john doe')).toBe('JD');
  });
});

describe('getAvatarColor', () => {
  it('returns a tailwind bg color class', () => {
    const color = getAvatarColor('John');
    expect(color).toMatch(/^bg-\w+-500$/);
  });

  it('returns consistent color for same name', () => {
    expect(getAvatarColor('Alice')).toBe(getAvatarColor('Alice'));
  });

  it('returns different colors for different names', () => {
    // Not guaranteed but likely with different names
    const colors = new Set([
      getAvatarColor('Alice'),
      getAvatarColor('Bob'),
      getAvatarColor('Charlie'),
      getAvatarColor('David'),
    ]);
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('validatePin', () => {
  it('accepts valid 4-digit PIN', () => {
    expect(validatePin('1234')).toEqual({ valid: true });
  });

  it('accepts valid 6-digit PIN', () => {
    expect(validatePin('123456')).toEqual({ valid: true });
  });

  it('rejects too short PIN', () => {
    expect(validatePin('123')).toEqual({ valid: false, error: 'PIN must be 4-6 digits' });
  });

  it('rejects too long PIN', () => {
    expect(validatePin('1234567')).toEqual({ valid: false, error: 'PIN must be 4-6 digits' });
  });

  it('rejects non-numeric PIN', () => {
    expect(validatePin('12ab')).toEqual({ valid: false, error: 'PIN must contain only numbers' });
    expect(validatePin('abcd')).toEqual({ valid: false, error: 'PIN must contain only numbers' });
  });

  it('rejects empty PIN', () => {
    expect(validatePin('')).toEqual({ valid: false, error: 'PIN must be 4-6 digits' });
  });
});

describe('validateInterestRate', () => {
  it('accepts valid rates', () => {
    expect(validateInterestRate(0.001)).toEqual({ valid: true }); // 0.1%
    expect(validateInterestRate(0.01)).toEqual({ valid: true });  // 1%
    expect(validateInterestRate(0.05)).toEqual({ valid: true });  // 5%
  });

  it('rejects too low rate', () => {
    expect(validateInterestRate(0.0005)).toEqual({ 
      valid: false, 
      error: 'Interest rate must be between 0.1% and 5%' 
    });
  });

  it('rejects too high rate', () => {
    expect(validateInterestRate(0.06)).toEqual({ 
      valid: false, 
      error: 'Interest rate must be between 0.1% and 5%' 
    });
  });
});

describe('validateAmount', () => {
  it('accepts valid amounts', () => {
    expect(validateAmount(1)).toEqual({ valid: true });     // $0.01
    expect(validateAmount(100)).toEqual({ valid: true });   // $1.00
    expect(validateAmount(1000000)).toEqual({ valid: true }); // $10,000 (max)
  });

  it('rejects zero or negative', () => {
    expect(validateAmount(0)).toEqual({ valid: false, error: 'Amount must be at least $0.01' });
    expect(validateAmount(-100)).toEqual({ valid: false, error: 'Amount must be at least $0.01' });
  });

  it('rejects amounts over $10,000', () => {
    expect(validateAmount(1000001)).toEqual({ 
      valid: false, 
      error: 'Amount cannot exceed $10,000' 
    });
  });

  it('respects custom max', () => {
    expect(validateAmount(500, 400)).toEqual({ 
      valid: false, 
      error: 'Amount cannot exceed $4.00' 
    });
    expect(validateAmount(300, 400)).toEqual({ valid: true });
  });
});

describe('daysUntilGoal', () => {
  it('returns 0 when goal is already met', () => {
    expect(daysUntilGoal(10000, 5000, 0.01)).toBe(0);
    expect(daysUntilGoal(10000, 10000, 0.01)).toBe(0);
  });

  it('calculates days correctly', () => {
    // $100 at 1% daily to reach $110
    // 110 = 100 * 1.01^n → n = ln(1.1) / ln(1.01) ≈ 9.5 → ceil = 10
    expect(daysUntilGoal(10000, 11000, 0.01)).toBe(10);
  });

  it('returns null for zero balance', () => {
    expect(daysUntilGoal(0, 10000, 0.01)).toBeNull();
  });

  it('returns null for zero rate', () => {
    expect(daysUntilGoal(5000, 10000, 0)).toBeNull();
  });

  it('returns null for negative balance', () => {
    expect(daysUntilGoal(-1000, 10000, 0.01)).toBeNull();
  });
});

describe('getGreeting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns morning greeting before noon', () => {
    vi.setSystemTime(new Date('2026-03-04T08:00:00'));
    expect(getGreeting()).toBe('Good morning');
    
    vi.setSystemTime(new Date('2026-03-04T11:59:00'));
    expect(getGreeting()).toBe('Good morning');
  });

  it('returns afternoon greeting from noon to 5pm', () => {
    vi.setSystemTime(new Date('2026-03-04T12:00:00'));
    expect(getGreeting()).toBe('Good afternoon');
    
    vi.setSystemTime(new Date('2026-03-04T16:59:00'));
    expect(getGreeting()).toBe('Good afternoon');
  });

  it('returns evening greeting after 5pm', () => {
    vi.setSystemTime(new Date('2026-03-04T17:00:00'));
    expect(getGreeting()).toBe('Good evening');
    
    vi.setSystemTime(new Date('2026-03-04T23:00:00'));
    expect(getGreeting()).toBe('Good evening');
  });
});
