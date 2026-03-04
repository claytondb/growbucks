import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateInterest,
  projectBalance,
  formatCurrency,
  getInterpolatedBalance,
} from './interest';

describe('calculateInterest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zero interest when less than 1 day elapsed', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    // Interest applied 6 hours ago
    const lastApplied = new Date('2026-03-04T06:00:00Z');
    const result = calculateInterest(100, 0.01, lastApplied);
    
    expect(result).toEqual({
      principal: 100,
      newBalance: 100,
      interestEarned: 0,
      daysElapsed: 0,
    });
  });

  it('returns zero interest for zero balance', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-01T12:00:00Z');
    const result = calculateInterest(0, 0.01, lastApplied);
    
    expect(result.interestEarned).toBe(0);
    expect(result.newBalance).toBe(0);
  });

  it('calculates 1 day of interest correctly', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    // Interest applied 24 hours ago
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = calculateInterest(100, 0.01, lastApplied);
    
    expect(result.daysElapsed).toBe(1);
    expect(result.principal).toBe(100);
    expect(result.newBalance).toBe(101); // 100 * 1.01 = 101
    expect(result.interestEarned).toBe(1);
  });

  it('calculates multi-day compound interest correctly', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    // Interest applied 7 days ago
    const lastApplied = new Date('2026-02-25T12:00:00Z');
    const result = calculateInterest(100, 0.01, lastApplied);
    
    expect(result.daysElapsed).toBe(7);
    expect(result.principal).toBe(100);
    // 100 * 1.01^7 = 107.21 (rounded to cents)
    expect(result.newBalance).toBe(107.21);
    expect(result.interestEarned).toBe(7.21);
  });

  it('handles partial days correctly (floors to whole days)', () => {
    const now = new Date('2026-03-04T18:00:00Z'); // 6 PM
    vi.setSystemTime(now);
    
    // Interest applied 36 hours ago (1.5 days -> floors to 1)
    const lastApplied = new Date('2026-03-03T06:00:00Z'); // 6 AM yesterday
    const result = calculateInterest(100, 0.01, lastApplied);
    
    expect(result.daysElapsed).toBe(1);
  });

  it('handles high interest rates', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = calculateInterest(100, 0.05, lastApplied); // 5% daily
    
    expect(result.newBalance).toBe(105);
    expect(result.interestEarned).toBe(5);
  });

  it('handles very small balances', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = calculateInterest(0.50, 0.01, lastApplied); // 50 cents
    
    expect(result.newBalance).toBe(0.51); // 0.50 * 1.01 = 0.505 → 0.51
  });

  it('handles large balances', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = calculateInterest(10000, 0.01, lastApplied);
    
    expect(result.newBalance).toBe(10100);
    expect(result.interestEarned).toBe(100);
  });
});

describe('projectBalance', () => {
  it('projects future balance correctly', () => {
    // $100 at 1% for 7 days
    expect(projectBalance(100, 0.01, 7)).toBe(107.21);
    
    // $100 at 1% for 30 days
    expect(projectBalance(100, 0.01, 30)).toBe(134.78);
    
    // $100 at 1% for 365 days (one year)
    expect(projectBalance(100, 0.01, 365)).toBe(3778.34);
  });

  it('returns same balance for 0 days', () => {
    expect(projectBalance(100, 0.01, 0)).toBe(100);
  });

  it('returns same balance for 0 rate', () => {
    expect(projectBalance(100, 0, 30)).toBe(100);
  });

  it('handles zero balance', () => {
    expect(projectBalance(0, 0.01, 30)).toBe(0);
  });

  it('handles negative days (past projection)', () => {
    // $100 at 1%, going back 7 days
    // What balance 7 days ago would have grown to $100?
    const result = projectBalance(100, 0.01, -7);
    expect(result).toBeCloseTo(93.27, 1);
  });
});

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0.99)).toBe('$0.99');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(10.999)).toBe('$11.00');
    expect(formatCurrency(10.994)).toBe('$10.99');
  });
});

describe('getInterpolatedBalance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns exact balance when interest just applied', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const result = getInterpolatedBalance(100, 0.01, now);
    expect(result).toBe(100);
  });

  it('interpolates for partial day', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    // Interest applied 12 hours ago (0.5 days)
    const lastApplied = new Date('2026-03-04T00:00:00Z');
    const result = getInterpolatedBalance(100, 0.01, lastApplied);
    
    // 100 * 1.01^0.5 ≈ 100.4987 → 100.50
    expect(result).toBe(100.5);
  });

  it('interpolates for full day', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = getInterpolatedBalance(100, 0.01, lastApplied);
    
    expect(result).toBe(101); // Full day of interest
  });

  it('allows interpolation beyond 1 day (continuous)', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    // Interest applied 2 days ago
    const lastApplied = new Date('2026-03-02T12:00:00Z');
    const result = getInterpolatedBalance(100, 0.01, lastApplied);
    
    // 100 * 1.01^2 = 102.01
    expect(result).toBe(102.01);
  });

  it('handles zero balance', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = getInterpolatedBalance(0, 0.01, lastApplied);
    
    expect(result).toBe(0);
  });

  it('handles zero rate', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    vi.setSystemTime(now);
    
    const lastApplied = new Date('2026-03-03T12:00:00Z');
    const result = getInterpolatedBalance(100, 0, lastApplied);
    
    expect(result).toBe(100);
  });
});
