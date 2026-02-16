/**
 * GrowBucks Interest Calculation
 * Uses daily compound interest: A = P(1 + r)^t
 */

export interface InterestCalculation {
  principal: number;
  newBalance: number;
  interestEarned: number;
  daysElapsed: number;
}

/**
 * Calculate compound interest earned since last calculation
 * @param balance Current balance
 * @param dailyRate Daily interest rate (e.g., 0.01 = 1%)
 * @param lastApplied Date when interest was last applied
 * @returns Interest calculation details
 */
export function calculateInterest(
  balance: number,
  dailyRate: number,
  lastApplied: Date
): InterestCalculation {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((now.getTime() - lastApplied.getTime()) / msPerDay);
  
  if (daysElapsed < 1 || balance <= 0) {
    return {
      principal: balance,
      newBalance: balance,
      interestEarned: 0,
      daysElapsed: 0
    };
  }
  
  // Compound interest formula: A = P(1 + r)^t
  const newBalance = balance * Math.pow(1 + dailyRate, daysElapsed);
  const interestEarned = newBalance - balance;
  
  return {
    principal: balance,
    newBalance: Math.round(newBalance * 100) / 100, // Round to cents
    interestEarned: Math.round(interestEarned * 100) / 100,
    daysElapsed
  };
}

/**
 * Calculate projected future balance
 * @param balance Current balance
 * @param dailyRate Daily interest rate
 * @param days Number of days in the future
 * @returns Projected balance
 */
export function projectBalance(
  balance: number,
  dailyRate: number,
  days: number
): number {
  return Math.round(balance * Math.pow(1 + dailyRate, days) * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Calculate real-time interpolated balance (for smooth animations)
 * @param balance Base balance (with interest already applied)
 * @param dailyRate Daily interest rate
 * @param lastApplied When interest was last applied
 * @returns Current interpolated balance
 */
export function getInterpolatedBalance(
  balance: number,
  dailyRate: number,
  lastApplied: Date
): number {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = (now.getTime() - lastApplied.getTime()) / msPerDay;
  
  // Use continuous compounding for smooth animation
  // A = P * e^(r*t) approximated as P * (1 + r)^t for small t
  const interpolatedBalance = balance * Math.pow(1 + dailyRate, daysElapsed);
  
  return Math.round(interpolatedBalance * 100) / 100;
}
