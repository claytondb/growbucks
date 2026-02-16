import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format cents to dollars with currency symbol
export function formatMoney(cents: number, options?: { showSign?: boolean }): string {
  const dollars = cents / 100;
  const sign = options?.showSign && cents > 0 ? '+' : '';
  return `${sign}$${dollars.toFixed(2)}`;
}

// Format money with animated decimal parts
export function formatMoneyParts(cents: number): { dollars: string; cents: string } {
  const total = cents / 100;
  const dollarPart = Math.floor(total).toLocaleString();
  const centPart = (total % 1).toFixed(2).slice(2);
  return { dollars: dollarPart, cents: centPart };
}

// Calculate compound interest
export function calculateCompoundInterest(
  principalCents: number,
  dailyRate: number,
  days: number
): number {
  // A = P × (1 + r)^n
  const finalAmount = principalCents * Math.pow(1 + dailyRate, days);
  return Math.floor(finalAmount);
}

// Calculate interest for a single day
export function calculateDailyInterest(balanceCents: number, dailyRate: number): number {
  return Math.floor(balanceCents * dailyRate);
}

// Calculate real-time display balance (interpolated)
export function getDisplayBalance(
  balanceCents: number,
  dailyRate: number,
  lastInterestAt: Date
): number {
  const now = Date.now();
  const lastInterest = lastInterestAt.getTime();
  const msInDay = 24 * 60 * 60 * 1000;
  
  // Fraction of day elapsed since last interest
  const dayFraction = Math.min((now - lastInterest) / msInDay, 1);
  
  // Today's pending interest (not yet applied)
  const pendingInterest = balanceCents * dailyRate * dayFraction;
  
  return balanceCents + pendingInterest;
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Format percentage for display
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// Generate avatar initials
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Random avatar color based on name
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-green-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

// Validate PIN
export function validatePin(pin: string): { valid: boolean; error?: string } {
  if (!pin || pin.length < 4 || pin.length > 6) {
    return { valid: false, error: 'PIN must be 4-6 digits' };
  }
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }
  return { valid: true };
}

// Validate interest rate
export function validateInterestRate(rate: number): { valid: boolean; error?: string } {
  if (rate < 0.001 || rate > 0.05) {
    return { valid: false, error: 'Interest rate must be between 0.1% and 5%' };
  }
  return { valid: true };
}

// Validate deposit/withdrawal amount
export function validateAmount(cents: number, maxCents?: number): { valid: boolean; error?: string } {
  if (cents < 1) {
    return { valid: false, error: 'Amount must be at least $0.01' };
  }
  if (cents > 1000000) { // $10,000 max
    return { valid: false, error: 'Amount cannot exceed $10,000' };
  }
  if (maxCents !== undefined && cents > maxCents) {
    return { valid: false, error: `Amount cannot exceed ${formatMoney(maxCents)}` };
  }
  return { valid: true };
}

// Calculate days until goal
export function daysUntilGoal(
  currentCents: number,
  goalCents: number,
  dailyRate: number
): number | null {
  if (currentCents >= goalCents) return 0;
  if (currentCents <= 0 || dailyRate <= 0) return null;
  
  // Solve for n in: goal = current * (1 + rate)^n
  // n = log(goal/current) / log(1 + rate)
  const n = Math.log(goalCents / currentCents) / Math.log(1 + dailyRate);
  return Math.ceil(n);
}

// Get greeting based on time of day
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
