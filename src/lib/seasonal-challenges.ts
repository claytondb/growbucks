/**
 * GrowBucks Seasonal Challenges
 *
 * Time-limited gamification events that give kids extra financial goals
 * and bonus XP/rewards during holidays and seasons.
 *
 * Design goals:
 *  - Pure utility functions (no DB calls) → easy to test
 *  - Parent-controlled: parents can enable/disable seasonal challenges
 *  - 5 fixed challenge types, each with built-in seasons
 *  - Progress evaluated from existing transaction + activity data
 *  - Integrates with the achievement/XP system via xpReward
 *
 * Challenge types:
 *  - SAVINGS_SPRINT: Save X dollars in N days
 *  - INTEREST_COLLECTOR: Earn X cents of interest this month
 *  - CHORE_STREAK: Complete chores Y days in a row
 *  - GIVING_GOAL: Donate X cents to charity this season
 *  - BALANCE_MILESTONE: Reach a target balance
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChallengeType =
  | 'SAVINGS_SPRINT'
  | 'INTEREST_COLLECTOR'
  | 'CHORE_STREAK'
  | 'GIVING_GOAL'
  | 'BALANCE_MILESTONE';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';

export type ChallengeStatus = 'locked' | 'active' | 'completed' | 'expired';

export interface SeasonalChallenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  emoji: string;
  season: Season;
  /** UTC start date (inclusive) */
  startDate: Date;
  /** UTC end date (inclusive) */
  endDate: Date;
  /** Target value in base units (cents for money, count for streaks) */
  targetValue: number;
  /** XP awarded on completion */
  xpReward: number;
  /** Optional cents bonus deposited on completion */
  bonusCents?: number;
}

export interface ChallengeProgress {
  challenge: SeasonalChallenge;
  status: ChallengeStatus;
  currentValue: number;
  progressPercent: number;
  /** Human-readable progress label, e.g. "$3.50 / $10.00" */
  progressLabel: string;
  /** Days remaining until challenge expires (0 if expired) */
  daysRemaining: number;
  completedAt?: Date;
}

export interface ChallengeSummary {
  active: ChallengeProgress[];
  completed: ChallengeProgress[];
  upcoming: ChallengeProgress[];
  expired: ChallengeProgress[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine the current season from a UTC date.
 *
 * Northern hemisphere meteorological seasons:
 *  winter → Dec, Jan, Feb
 *  spring → Mar, Apr, May
 *  summer → Jun, Jul, Aug
 *  fall   → Sep, Oct, Nov
 */
export function getSeason(date: Date): Season {
  const month = date.getUTCMonth() + 1; // 1–12
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'fall';
}

/**
 * Get the number of calendar days between two UTC dates (inclusive of both ends).
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
}

/**
 * Return days remaining from today until the end date (0 if past).
 */
export function daysRemaining(endDate: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);
  const remaining = Math.ceil((end.getTime() - now.getTime()) / msPerDay);
  return Math.max(0, remaining);
}

/**
 * Format cents as a dollar string: formatMoneyCents(350) → "$3.50"
 */
export function formatMoneyCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Clamp a progress percent to 0–100.
 */
export function clampPercent(value: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((value / target) * 100));
}

// ─── Built-in seasonal challenges ────────────────────────────────────────────

/**
 * Build the challenge calendar for a given year.
 *
 * Returns one challenge per type per season where it makes sense.
 * Challenges span ~90-day seasonal windows.
 */
export function buildSeasonalCalendar(year: number): SeasonalChallenge[] {
  return [
    // ── Winter (Dec 1 prev year → Feb 28) ──
    {
      id: `winter-savings-${year}`,
      type: 'SAVINGS_SPRINT',
      title: 'Winter Savings Sprint',
      description: 'Save $20 during the winter season.',
      emoji: '❄️',
      season: 'winter',
      startDate: new Date(`${year}-01-01T00:00:00Z`),
      endDate: new Date(`${year}-02-28T23:59:59Z`),
      targetValue: 2000, // cents
      xpReward: 100,
      bonusCents: 250,
    },
    {
      id: `winter-interest-${year}`,
      type: 'INTEREST_COLLECTOR',
      title: 'Frosty Interest Collector',
      description: 'Earn at least $1.00 in interest this January.',
      emoji: '🌨️',
      season: 'winter',
      startDate: new Date(`${year}-01-01T00:00:00Z`),
      endDate: new Date(`${year}-01-31T23:59:59Z`),
      targetValue: 100, // cents
      xpReward: 60,
    },

    // ── Spring (Mar 1 → May 31) ──
    {
      id: `spring-savings-${year}`,
      type: 'SAVINGS_SPRINT',
      title: 'Spring into Savings',
      description: 'Save $15 before summer begins.',
      emoji: '🌸',
      season: 'spring',
      startDate: new Date(`${year}-03-01T00:00:00Z`),
      endDate: new Date(`${year}-05-31T23:59:59Z`),
      targetValue: 1500, // cents
      xpReward: 80,
      bonusCents: 200,
    },
    {
      id: `spring-giving-${year}`,
      type: 'GIVING_GOAL',
      title: 'Spring Giving Drive',
      description: 'Donate $5 to a cause you care about this spring.',
      emoji: '🌱',
      season: 'spring',
      startDate: new Date(`${year}-03-01T00:00:00Z`),
      endDate: new Date(`${year}-05-31T23:59:59Z`),
      targetValue: 500, // cents
      xpReward: 70,
    },

    // ── Summer (Jun 1 → Aug 31) ──
    {
      id: `summer-chore-streak-${year}`,
      type: 'CHORE_STREAK',
      title: 'Summer Job Champion',
      description: 'Complete chores 7 days in a row this summer.',
      emoji: '☀️',
      season: 'summer',
      startDate: new Date(`${year}-06-01T00:00:00Z`),
      endDate: new Date(`${year}-08-31T23:59:59Z`),
      targetValue: 7, // days
      xpReward: 90,
      bonusCents: 300,
    },
    {
      id: `summer-balance-${year}`,
      type: 'BALANCE_MILESTONE',
      title: 'Summer $50 Club',
      description: 'Reach a balance of $50 by the end of summer.',
      emoji: '🏖️',
      season: 'summer',
      startDate: new Date(`${year}-06-01T00:00:00Z`),
      endDate: new Date(`${year}-08-31T23:59:59Z`),
      targetValue: 5000, // cents
      xpReward: 120,
    },

    // ── Fall (Sep 1 → Nov 30) ──
    {
      id: `fall-savings-${year}`,
      type: 'SAVINGS_SPRINT',
      title: 'Fall Harvest Savings',
      description: 'Save $25 before the holiday season.',
      emoji: '🍂',
      season: 'fall',
      startDate: new Date(`${year}-09-01T00:00:00Z`),
      endDate: new Date(`${year}-11-30T23:59:59Z`),
      targetValue: 2500, // cents
      xpReward: 110,
      bonusCents: 300,
    },
    {
      id: `fall-interest-${year}`,
      type: 'INTEREST_COLLECTOR',
      title: 'Autumn Interest Harvest',
      description: 'Earn $2.00 in interest during October and November.',
      emoji: '🍁',
      season: 'fall',
      startDate: new Date(`${year}-10-01T00:00:00Z`),
      endDate: new Date(`${year}-11-30T23:59:59Z`),
      targetValue: 200, // cents
      xpReward: 80,
    },
  ];
}

/**
 * Get challenges that are currently active (today is within their window).
 */
export function getActiveChallenges(
  calendar: SeasonalChallenge[],
  now: Date = new Date()
): SeasonalChallenge[] {
  return calendar.filter(
    (c) => now >= c.startDate && now <= c.endDate
  );
}

/**
 * Get challenges that haven't started yet.
 */
export function getUpcomingChallenges(
  calendar: SeasonalChallenge[],
  now: Date = new Date()
): SeasonalChallenge[] {
  return calendar.filter((c) => now < c.startDate);
}

/**
 * Get challenges that have expired.
 */
export function getExpiredChallenges(
  calendar: SeasonalChallenge[],
  now: Date = new Date()
): SeasonalChallenge[] {
  return calendar.filter((c) => now > c.endDate);
}

// ─── Progress evaluation ──────────────────────────────────────────────────────

export interface TransactionSnapshot {
  type: string; // 'interest', 'deposit', 'withdrawal', 'donation', 'chore_earnings', etc.
  amount_cents: number;
  created_at: string; // ISO string
}

export interface ActivitySnapshot {
  date: string; // YYYY-MM-DD
  hadChoreCompletion: boolean;
}

export interface BalanceSnapshot {
  balance_cents: number;
}

/**
 * Evaluate progress for a SAVINGS_SPRINT challenge.
 *
 * "Savings" counts net deposits within the challenge window
 * (deposits + chore_earnings + allowance deposits, minus withdrawals).
 */
export function evaluateSavingsSprint(
  challenge: SeasonalChallenge,
  transactions: TransactionSnapshot[]
): number {
  const start = challenge.startDate.getTime();
  const end = challenge.endDate.getTime();

  const inWindow = transactions.filter((t) => {
    const ts = new Date(t.created_at).getTime();
    return ts >= start && ts <= end;
  });

  const deposited = inWindow
    .filter((t) => ['deposit', 'chore_earnings', 'savings_deposit'].includes(t.type))
    .reduce((sum, t) => sum + t.amount_cents, 0);

  const withdrawn = inWindow
    .filter((t) => ['withdrawal'].includes(t.type))
    .reduce((sum, t) => sum + t.amount_cents, 0);

  return Math.max(0, deposited - withdrawn);
}

/**
 * Evaluate progress for INTEREST_COLLECTOR.
 * Counts interest transactions within the window.
 */
export function evaluateInterestCollector(
  challenge: SeasonalChallenge,
  transactions: TransactionSnapshot[]
): number {
  const start = challenge.startDate.getTime();
  const end = challenge.endDate.getTime();

  return transactions
    .filter((t) => {
      const ts = new Date(t.created_at).getTime();
      return t.type === 'interest' && ts >= start && ts <= end;
    })
    .reduce((sum, t) => sum + t.amount_cents, 0);
}

/**
 * Evaluate progress for GIVING_GOAL.
 * Counts approved donation transactions within the window.
 */
export function evaluateGivingGoal(
  challenge: SeasonalChallenge,
  transactions: TransactionSnapshot[]
): number {
  const start = challenge.startDate.getTime();
  const end = challenge.endDate.getTime();

  return transactions
    .filter((t) => {
      const ts = new Date(t.created_at).getTime();
      return t.type === 'donation' && ts >= start && ts <= end;
    })
    .reduce((sum, t) => sum + t.amount_cents, 0);
}

/**
 * Evaluate progress for CHORE_STREAK.
 * Counts the maximum consecutive days (within the window) on which
 * the child had an approved chore completion.
 */
export function evaluateChoreStreak(
  challenge: SeasonalChallenge,
  activities: ActivitySnapshot[]
): number {
  const start = challenge.startDate.getTime();
  const end = challenge.endDate.getTime();

  const choreDates = new Set<string>(
    activities
      .filter((a) => {
        const ts = new Date(a.date + 'T00:00:00Z').getTime();
        return a.hadChoreCompletion && ts >= start && ts <= end;
      })
      .map((a) => a.date)
  );

  if (choreDates.size === 0) return 0;

  const sorted = [...choreDates].sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
    const curr = new Date(sorted[i] + 'T00:00:00Z');
    const diff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Evaluate progress for BALANCE_MILESTONE.
 * Simply checks the current balance against the target.
 */
export function evaluateBalanceMilestone(
  challenge: SeasonalChallenge,
  balance: BalanceSnapshot
): number {
  return balance.balance_cents;
}

// ─── Progress label formatters ────────────────────────────────────────────────

export function formatProgressLabel(
  type: ChallengeType,
  currentValue: number,
  targetValue: number
): string {
  switch (type) {
    case 'SAVINGS_SPRINT':
    case 'INTEREST_COLLECTOR':
    case 'GIVING_GOAL':
    case 'BALANCE_MILESTONE':
      return `${formatMoneyCents(currentValue)} / ${formatMoneyCents(targetValue)}`;
    case 'CHORE_STREAK':
      return `${currentValue} / ${targetValue} days`;
  }
}

// ─── Unified evaluator ────────────────────────────────────────────────────────

export interface ChallengeEvalInput {
  transactions: TransactionSnapshot[];
  activities: ActivitySnapshot[];
  balance: BalanceSnapshot;
  completedChallengeIds?: string[];
  now?: Date;
}

/**
 * Evaluate a single challenge and return its full progress object.
 */
export function evaluateChallenge(
  challenge: SeasonalChallenge,
  input: ChallengeEvalInput
): ChallengeProgress {
  const now = input.now ?? new Date();
  const isActive = now >= challenge.startDate && now <= challenge.endDate;
  const isExpired = now > challenge.endDate;
  const isUpcoming = now < challenge.startDate;
  const isAlreadyCompleted = (input.completedChallengeIds ?? []).includes(challenge.id);

  let currentValue = 0;
  switch (challenge.type) {
    case 'SAVINGS_SPRINT':
      currentValue = evaluateSavingsSprint(challenge, input.transactions);
      break;
    case 'INTEREST_COLLECTOR':
      currentValue = evaluateInterestCollector(challenge, input.transactions);
      break;
    case 'GIVING_GOAL':
      currentValue = evaluateGivingGoal(challenge, input.transactions);
      break;
    case 'CHORE_STREAK':
      currentValue = evaluateChoreStreak(challenge, input.activities);
      break;
    case 'BALANCE_MILESTONE':
      currentValue = evaluateBalanceMilestone(challenge, input.balance);
      break;
  }

  const met = currentValue >= challenge.targetValue;
  let status: ChallengeStatus;

  if (isAlreadyCompleted || (met && !isUpcoming)) {
    status = 'completed';
  } else if (isExpired) {
    status = 'expired';
  } else if (isUpcoming) {
    status = 'locked';
  } else {
    status = 'active';
  }

  return {
    challenge,
    status,
    currentValue,
    progressPercent: clampPercent(currentValue, challenge.targetValue),
    progressLabel: formatProgressLabel(challenge.type, currentValue, challenge.targetValue),
    daysRemaining: isActive ? daysRemaining(challenge.endDate, now) : 0,
    completedAt: isAlreadyCompleted ? now : undefined,
  };
}

/**
 * Evaluate all challenges for a child and return a categorised summary.
 */
export function evaluateAllChallenges(
  calendar: SeasonalChallenge[],
  input: ChallengeEvalInput
): ChallengeSummary {
  const all = calendar.map((c) => evaluateChallenge(c, input));

  return {
    active: all.filter((p) => p.status === 'active'),
    completed: all.filter((p) => p.status === 'completed'),
    upcoming: all.filter((p) => p.status === 'locked'),
    expired: all.filter((p) => p.status === 'expired'),
  };
}

// ─── Motivational messages ────────────────────────────────────────────────────

/**
 * Get a completion congratulations message for a challenge.
 */
export function getChallengeCompletionMessage(challenge: SeasonalChallenge): string {
  const bonusText = challenge.bonusCents
    ? ` You earned a ${formatMoneyCents(challenge.bonusCents)} bonus!`
    : '';

  switch (challenge.type) {
    case 'SAVINGS_SPRINT':
      return `${challenge.emoji} Amazing savings! You completed the "${challenge.title}" challenge!${bonusText}`;
    case 'INTEREST_COLLECTOR':
      return `${challenge.emoji} Interest master! You hit your interest goal in "${challenge.title}"!${bonusText}`;
    case 'CHORE_STREAK':
      return `${challenge.emoji} Incredible streak! You nailed "${challenge.title}"!${bonusText}`;
    case 'GIVING_GOAL':
      return `${challenge.emoji} Super generous! You completed the "${challenge.title}" challenge!${bonusText}`;
    case 'BALANCE_MILESTONE':
      return `${challenge.emoji} Balance goal reached! You conquered "${challenge.title}"!${bonusText}`;
  }
}

/**
 * Get an encouragement message based on progress percent.
 */
export function getChallengeEncouragementMessage(
  challenge: SeasonalChallenge,
  progressPercent: number
): string | null {
  if (progressPercent >= 100) return null; // already done
  if (progressPercent >= 75)
    return `${challenge.emoji} So close! You're ${progressPercent}% of the way to "${challenge.title}"!`;
  if (progressPercent >= 50)
    return `${challenge.emoji} Halfway there on "${challenge.title}"! Keep it up!`;
  if (progressPercent >= 25)
    return `${challenge.emoji} Great start on "${challenge.title}"! ${100 - progressPercent}% to go!`;
  return `${challenge.emoji} Just getting started on "${challenge.title}". Every bit counts!`;
}
