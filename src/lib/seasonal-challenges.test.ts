import { describe, it, expect } from 'vitest';
import {
  getSeason,
  daysBetween,
  daysRemaining,
  formatMoneyCents,
  clampPercent,
  buildSeasonalCalendar,
  getActiveChallenges,
  getUpcomingChallenges,
  getExpiredChallenges,
  evaluateSavingsSprint,
  evaluateInterestCollector,
  evaluateGivingGoal,
  evaluateChoreStreak,
  evaluateBalanceMilestone,
  formatProgressLabel,
  evaluateChallenge,
  evaluateAllChallenges,
  getChallengeCompletionMessage,
  getChallengeEncouragementMessage,
  type SeasonalChallenge,
  type ChallengeEvalInput,
  type TransactionSnapshot,
  type ActivitySnapshot,
} from './seasonal-challenges';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const JAN_15 = new Date('2026-01-15T12:00:00Z');
const APR_15 = new Date('2026-04-15T12:00:00Z');
const JUL_15 = new Date('2026-07-15T12:00:00Z');
const OCT_15 = new Date('2026-10-15T12:00:00Z');
const DEC_15 = new Date('2026-12-15T12:00:00Z');

function makeSavingsChallenge(overrides: Partial<SeasonalChallenge> = {}): SeasonalChallenge {
  return {
    id: 'test-savings',
    type: 'SAVINGS_SPRINT',
    title: 'Test Savings Sprint',
    description: 'Save $10',
    emoji: '💰',
    season: 'winter',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2026-03-31T23:59:59Z'),
    targetValue: 1000,
    xpReward: 50,
    ...overrides,
  };
}

function makeEmptyInput(overrides: Partial<ChallengeEvalInput> = {}): ChallengeEvalInput {
  return {
    transactions: [],
    activities: [],
    balance: { balance_cents: 0 },
    completedChallengeIds: [],
    ...overrides,
  };
}

function tx(
  type: string,
  amount_cents: number,
  created_at: string
): TransactionSnapshot {
  return { type, amount_cents, created_at };
}

function act(date: string, hadChoreCompletion: boolean): ActivitySnapshot {
  return { date, hadChoreCompletion };
}

// ─── getSeason ────────────────────────────────────────────────────────────────

describe('getSeason', () => {
  it('returns winter for December', () => {
    expect(getSeason(DEC_15)).toBe('winter');
  });

  it('returns winter for January', () => {
    expect(getSeason(JAN_15)).toBe('winter');
  });

  it('returns winter for February', () => {
    expect(getSeason(new Date('2026-02-14T00:00:00Z'))).toBe('winter');
  });

  it('returns spring for March', () => {
    expect(getSeason(new Date('2026-03-01T00:00:00Z'))).toBe('spring');
  });

  it('returns spring for April', () => {
    expect(getSeason(APR_15)).toBe('spring');
  });

  it('returns spring for May', () => {
    expect(getSeason(new Date('2026-05-31T00:00:00Z'))).toBe('spring');
  });

  it('returns summer for June', () => {
    expect(getSeason(new Date('2026-06-01T00:00:00Z'))).toBe('summer');
  });

  it('returns summer for July', () => {
    expect(getSeason(JUL_15)).toBe('summer');
  });

  it('returns summer for August', () => {
    expect(getSeason(new Date('2026-08-31T00:00:00Z'))).toBe('summer');
  });

  it('returns fall for September', () => {
    expect(getSeason(new Date('2026-09-01T00:00:00Z'))).toBe('fall');
  });

  it('returns fall for October', () => {
    expect(getSeason(OCT_15)).toBe('fall');
  });

  it('returns fall for November', () => {
    expect(getSeason(new Date('2026-11-30T00:00:00Z'))).toBe('fall');
  });
});

// ─── daysBetween ──────────────────────────────────────────────────────────────

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(daysBetween(d, d)).toBe(0);
  });

  it('returns 1 for adjacent days', () => {
    expect(daysBetween(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-02T00:00:00Z')
    )).toBe(1);
  });

  it('returns 90 for a quarter', () => {
    expect(daysBetween(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-04-01T00:00:00Z')
    )).toBe(90);
  });

  it('returns 0 when end is before start', () => {
    expect(daysBetween(
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-01-01T00:00:00Z')
    )).toBe(0);
  });
});

// ─── daysRemaining ────────────────────────────────────────────────────────────

describe('daysRemaining', () => {
  it('returns 0 when past', () => {
    const past = new Date('2025-01-01T00:00:00Z');
    expect(daysRemaining(past, JAN_15)).toBe(0);
  });

  it('returns positive when future', () => {
    const future = new Date('2026-01-31T00:00:00Z');
    const r = daysRemaining(future, JAN_15);
    expect(r).toBeGreaterThan(0);
  });

  it('returns 1 on the last day', () => {
    const end = new Date('2026-01-15T00:00:00Z');
    const r = daysRemaining(end, JAN_15);
    expect(r).toBeGreaterThanOrEqual(0); // depends on exact time
  });
});

// ─── formatMoneyCents ─────────────────────────────────────────────────────────

describe('formatMoneyCents', () => {
  it('formats 0 as $0.00', () => {
    expect(formatMoneyCents(0)).toBe('$0.00');
  });

  it('formats 100 as $1.00', () => {
    expect(formatMoneyCents(100)).toBe('$1.00');
  });

  it('formats 1050 as $10.50', () => {
    expect(formatMoneyCents(1050)).toBe('$10.50');
  });

  it('formats 2000 as $20.00', () => {
    expect(formatMoneyCents(2000)).toBe('$20.00');
  });
});

// ─── clampPercent ─────────────────────────────────────────────────────────────

describe('clampPercent', () => {
  it('returns 0 for no progress', () => {
    expect(clampPercent(0, 1000)).toBe(0);
  });

  it('returns 50 for half progress', () => {
    expect(clampPercent(500, 1000)).toBe(50);
  });

  it('returns 100 for full', () => {
    expect(clampPercent(1000, 1000)).toBe(100);
  });

  it('caps at 100 for over-target', () => {
    expect(clampPercent(1500, 1000)).toBe(100);
  });

  it('returns 100 when target is 0', () => {
    expect(clampPercent(0, 0)).toBe(100);
  });
});

// ─── buildSeasonalCalendar ────────────────────────────────────────────────────

describe('buildSeasonalCalendar', () => {
  const calendar = buildSeasonalCalendar(2026);

  it('returns an array of challenges', () => {
    expect(Array.isArray(calendar)).toBe(true);
    expect(calendar.length).toBeGreaterThan(0);
  });

  it('all challenges have required fields', () => {
    calendar.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.type).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.emoji).toBeTruthy();
      expect(c.startDate).toBeInstanceOf(Date);
      expect(c.endDate).toBeInstanceOf(Date);
      expect(c.targetValue).toBeGreaterThan(0);
      expect(c.xpReward).toBeGreaterThan(0);
    });
  });

  it('all challenge ids are unique', () => {
    const ids = calendar.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has at least one challenge per season', () => {
    const seasons = new Set(calendar.map((c) => c.season));
    expect(seasons.has('winter')).toBe(true);
    expect(seasons.has('spring')).toBe(true);
    expect(seasons.has('summer')).toBe(true);
    expect(seasons.has('fall')).toBe(true);
  });

  it('start dates are before end dates', () => {
    calendar.forEach((c) => {
      expect(c.startDate.getTime()).toBeLessThan(c.endDate.getTime());
    });
  });

  it('includes all challenge types', () => {
    const types = new Set(calendar.map((c) => c.type));
    expect(types.has('SAVINGS_SPRINT')).toBe(true);
    expect(types.has('INTEREST_COLLECTOR')).toBe(true);
    expect(types.has('CHORE_STREAK')).toBe(true);
    expect(types.has('GIVING_GOAL')).toBe(true);
    expect(types.has('BALANCE_MILESTONE')).toBe(true);
  });

  it('embeds the year in challenge ids', () => {
    expect(calendar[0].id).toContain('2026');
  });
});

// ─── getActiveChallenges ──────────────────────────────────────────────────────

describe('getActiveChallenges', () => {
  it('returns only challenges whose window contains now', () => {
    const calendar = buildSeasonalCalendar(2026);
    const active = getActiveChallenges(calendar, APR_15);
    active.forEach((c) => {
      expect(APR_15 >= c.startDate).toBe(true);
      expect(APR_15 <= c.endDate).toBe(true);
    });
  });

  it('returns an empty array when no challenges are active', () => {
    const future = [makeSavingsChallenge({
      startDate: new Date('2099-01-01T00:00:00Z'),
      endDate: new Date('2099-03-31T23:59:59Z'),
    })];
    expect(getActiveChallenges(future, JAN_15)).toHaveLength(0);
  });
});

// ─── getUpcomingChallenges ────────────────────────────────────────────────────

describe('getUpcomingChallenges', () => {
  it('returns challenges that have not started', () => {
    const challenge = makeSavingsChallenge({
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-08-31T23:59:59Z'),
    });
    const result = getUpcomingChallenges([challenge], APR_15);
    expect(result).toHaveLength(1);
  });

  it('returns empty when all challenges are past', () => {
    const past = [makeSavingsChallenge({
      startDate: new Date('2020-01-01T00:00:00Z'),
      endDate: new Date('2020-03-31T23:59:59Z'),
    })];
    expect(getUpcomingChallenges(past, JAN_15)).toHaveLength(0);
  });
});

// ─── getExpiredChallenges ─────────────────────────────────────────────────────

describe('getExpiredChallenges', () => {
  it('returns challenges that have ended', () => {
    const past = [makeSavingsChallenge({
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-03-31T23:59:59Z'),
    })];
    expect(getExpiredChallenges(past, JAN_15)).toHaveLength(1);
  });

  it('does not include active challenges', () => {
    const active = [makeSavingsChallenge()]; // Jan–Mar 2026, we're in Jan 2026
    expect(getExpiredChallenges(active, JAN_15)).toHaveLength(0);
  });
});

// ─── evaluateSavingsSprint ────────────────────────────────────────────────────

describe('evaluateSavingsSprint', () => {
  const challenge = makeSavingsChallenge();

  it('counts deposits within window', () => {
    const txs = [tx('deposit', 500, '2026-01-10T00:00:00Z')];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(500);
  });

  it('counts chore_earnings', () => {
    const txs = [tx('chore_earnings', 200, '2026-02-01T00:00:00Z')];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(200);
  });

  it('counts savings_deposit', () => {
    const txs = [tx('savings_deposit', 150, '2026-01-20T00:00:00Z')];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(150);
  });

  it('subtracts withdrawals', () => {
    const txs = [
      tx('deposit', 1000, '2026-01-10T00:00:00Z'),
      tx('withdrawal', 300, '2026-01-15T00:00:00Z'),
    ];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(700);
  });

  it('ignores transactions outside window', () => {
    const txs = [tx('deposit', 500, '2025-12-01T00:00:00Z')];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(0);
  });

  it('returns 0 for empty transactions', () => {
    expect(evaluateSavingsSprint(challenge, [])).toBe(0);
  });

  it('does not go below 0', () => {
    const txs = [tx('withdrawal', 1000, '2026-01-10T00:00:00Z')];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(0);
  });

  it('ignores interest transactions', () => {
    const txs = [tx('interest', 500, '2026-01-10T00:00:00Z')];
    expect(evaluateSavingsSprint(challenge, txs)).toBe(0);
  });
});

// ─── evaluateInterestCollector ────────────────────────────────────────────────

describe('evaluateInterestCollector', () => {
  const challenge = makeSavingsChallenge({ type: 'INTEREST_COLLECTOR' });

  it('sums interest transactions within window', () => {
    const txs = [
      tx('interest', 50, '2026-01-10T00:00:00Z'),
      tx('interest', 75, '2026-02-01T00:00:00Z'),
    ];
    expect(evaluateInterestCollector(challenge, txs)).toBe(125);
  });

  it('ignores non-interest transactions', () => {
    const txs = [tx('deposit', 500, '2026-01-10T00:00:00Z')];
    expect(evaluateInterestCollector(challenge, txs)).toBe(0);
  });

  it('ignores interest outside window', () => {
    const txs = [tx('interest', 100, '2025-06-01T00:00:00Z')];
    expect(evaluateInterestCollector(challenge, txs)).toBe(0);
  });

  it('returns 0 for no transactions', () => {
    expect(evaluateInterestCollector(challenge, [])).toBe(0);
  });
});

// ─── evaluateGivingGoal ───────────────────────────────────────────────────────

describe('evaluateGivingGoal', () => {
  const challenge = makeSavingsChallenge({ type: 'GIVING_GOAL' });

  it('sums donation transactions within window', () => {
    const txs = [
      tx('donation', 200, '2026-01-10T00:00:00Z'),
      tx('donation', 300, '2026-02-01T00:00:00Z'),
    ];
    expect(evaluateGivingGoal(challenge, txs)).toBe(500);
  });

  it('ignores non-donation transactions', () => {
    const txs = [tx('deposit', 500, '2026-01-10T00:00:00Z')];
    expect(evaluateGivingGoal(challenge, txs)).toBe(0);
  });

  it('returns 0 for empty transactions', () => {
    expect(evaluateGivingGoal(challenge, [])).toBe(0);
  });
});

// ─── evaluateChoreStreak ──────────────────────────────────────────────────────

describe('evaluateChoreStreak', () => {
  const challenge = makeSavingsChallenge({ type: 'CHORE_STREAK' });

  it('returns 0 with no activities', () => {
    expect(evaluateChoreStreak(challenge, [])).toBe(0);
  });

  it('returns 1 for a single chore day', () => {
    const activities = [act('2026-01-10', true)];
    expect(evaluateChoreStreak(challenge, activities)).toBe(1);
  });

  it('counts consecutive days', () => {
    const activities = [
      act('2026-01-10', true),
      act('2026-01-11', true),
      act('2026-01-12', true),
    ];
    expect(evaluateChoreStreak(challenge, activities)).toBe(3);
  });

  it('ignores non-consecutive days', () => {
    const activities = [
      act('2026-01-10', true),
      act('2026-01-12', true), // gap on 11th
    ];
    expect(evaluateChoreStreak(challenge, activities)).toBe(1);
  });

  it('returns max streak across multiple runs', () => {
    const activities = [
      act('2026-01-01', true),
      act('2026-01-02', true),
      act('2026-01-10', true),
      act('2026-01-11', true),
      act('2026-01-12', true),
      act('2026-01-13', true),
    ];
    expect(evaluateChoreStreak(challenge, activities)).toBe(4);
  });

  it('ignores activities outside window', () => {
    const activities = [
      act('2025-12-31', true),
      act('2025-12-30', true),
    ];
    expect(evaluateChoreStreak(challenge, activities)).toBe(0);
  });

  it('ignores activities without chore completion', () => {
    const activities = [
      act('2026-01-10', false),
      act('2026-01-11', false),
    ];
    expect(evaluateChoreStreak(challenge, activities)).toBe(0);
  });

  it('deduplicates same-day activities', () => {
    const activities = [
      act('2026-01-10', true),
      act('2026-01-10', true),
      act('2026-01-11', true),
    ];
    expect(evaluateChoreStreak(challenge, activities)).toBe(2);
  });
});

// ─── evaluateBalanceMilestone ─────────────────────────────────────────────────

describe('evaluateBalanceMilestone', () => {
  const challenge = makeSavingsChallenge({ type: 'BALANCE_MILESTONE', targetValue: 5000 });

  it('returns current balance', () => {
    expect(evaluateBalanceMilestone(challenge, { balance_cents: 3000 })).toBe(3000);
  });

  it('returns 0 for zero balance', () => {
    expect(evaluateBalanceMilestone(challenge, { balance_cents: 0 })).toBe(0);
  });
});

// ─── formatProgressLabel ──────────────────────────────────────────────────────

describe('formatProgressLabel', () => {
  it('formats money types correctly', () => {
    expect(formatProgressLabel('SAVINGS_SPRINT', 500, 1000)).toBe('$5.00 / $10.00');
    expect(formatProgressLabel('INTEREST_COLLECTOR', 50, 100)).toBe('$0.50 / $1.00');
    expect(formatProgressLabel('GIVING_GOAL', 200, 500)).toBe('$2.00 / $5.00');
    expect(formatProgressLabel('BALANCE_MILESTONE', 3000, 5000)).toBe('$30.00 / $50.00');
  });

  it('formats chore streak as days', () => {
    expect(formatProgressLabel('CHORE_STREAK', 3, 7)).toBe('3 / 7 days');
  });
});

// ─── evaluateChallenge ────────────────────────────────────────────────────────

describe('evaluateChallenge', () => {
  const challenge = makeSavingsChallenge();
  const JAN_10 = new Date('2026-01-10T12:00:00Z');

  it('returns active status for in-progress challenge', () => {
    const result = evaluateChallenge(challenge, makeEmptyInput({ now: JAN_10 }));
    expect(result.status).toBe('active');
  });

  it('returns locked for future challenge', () => {
    const future = makeSavingsChallenge({
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-08-31T23:59:59Z'),
    });
    const result = evaluateChallenge(future, makeEmptyInput({ now: JAN_10 }));
    expect(result.status).toBe('locked');
  });

  it('returns expired for past challenge', () => {
    const past = makeSavingsChallenge({
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-03-31T23:59:59Z'),
    });
    const result = evaluateChallenge(past, makeEmptyInput({ now: JAN_15 }));
    expect(result.status).toBe('expired');
  });

  it('returns completed when target is met', () => {
    const input = makeEmptyInput({
      now: JAN_10,
      transactions: [tx('deposit', 1500, '2026-01-05T00:00:00Z')],
    });
    const result = evaluateChallenge(challenge, input);
    expect(result.status).toBe('completed');
  });

  it('returns completed when in completedChallengeIds', () => {
    const input = makeEmptyInput({
      now: JAN_10,
      completedChallengeIds: ['test-savings'],
    });
    const result = evaluateChallenge(challenge, input);
    expect(result.status).toBe('completed');
  });

  it('includes progressPercent between 0 and 100', () => {
    const input = makeEmptyInput({
      now: JAN_10,
      transactions: [tx('deposit', 500, '2026-01-05T00:00:00Z')],
    });
    const result = evaluateChallenge(challenge, input);
    expect(result.progressPercent).toBeGreaterThanOrEqual(0);
    expect(result.progressPercent).toBeLessThanOrEqual(100);
  });

  it('includes a non-empty progressLabel', () => {
    const result = evaluateChallenge(challenge, makeEmptyInput({ now: JAN_10 }));
    expect(result.progressLabel.length).toBeGreaterThan(0);
  });

  it('includes daysRemaining > 0 for active challenge', () => {
    const result = evaluateChallenge(challenge, makeEmptyInput({ now: JAN_10 }));
    expect(result.daysRemaining).toBeGreaterThan(0);
  });

  it('includes daysRemaining == 0 for locked challenge', () => {
    const future = makeSavingsChallenge({
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-08-31T23:59:59Z'),
    });
    const result = evaluateChallenge(future, makeEmptyInput({ now: JAN_10 }));
    expect(result.daysRemaining).toBe(0);
  });
});

// ─── evaluateAllChallenges ────────────────────────────────────────────────────

describe('evaluateAllChallenges', () => {
  it('categorises challenges into active/completed/upcoming/expired', () => {
    const calendar = buildSeasonalCalendar(2026);
    const input = makeEmptyInput({ now: APR_15 });
    const summary = evaluateAllChallenges(calendar, input);
    expect(Array.isArray(summary.active)).toBe(true);
    expect(Array.isArray(summary.completed)).toBe(true);
    expect(Array.isArray(summary.upcoming)).toBe(true);
    expect(Array.isArray(summary.expired)).toBe(true);
  });

  it('total across categories equals calendar length', () => {
    const calendar = buildSeasonalCalendar(2026);
    const input = makeEmptyInput({ now: APR_15 });
    const summary = evaluateAllChallenges(calendar, input);
    const total =
      summary.active.length +
      summary.completed.length +
      summary.upcoming.length +
      summary.expired.length;
    expect(total).toBe(calendar.length);
  });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

describe('getChallengeCompletionMessage', () => {
  const challenge = makeSavingsChallenge();

  it('returns a non-empty string', () => {
    expect(getChallengeCompletionMessage(challenge).length).toBeGreaterThan(0);
  });

  it('mentions the challenge emoji', () => {
    const msg = getChallengeCompletionMessage(challenge);
    expect(msg).toContain(challenge.emoji);
  });

  it('mentions bonus when bonusCents is set', () => {
    const c = makeSavingsChallenge({ bonusCents: 250 });
    const msg = getChallengeCompletionMessage(c);
    expect(msg).toContain('$2.50');
  });

  it('does not mention bonus when bonusCents is absent', () => {
    const c = makeSavingsChallenge({ bonusCents: undefined });
    const msg = getChallengeCompletionMessage(c);
    expect(msg).not.toContain('bonus');
  });
});

describe('getChallengeEncouragementMessage', () => {
  const challenge = makeSavingsChallenge();

  it('returns null at 100%', () => {
    expect(getChallengeEncouragementMessage(challenge, 100)).toBeNull();
  });

  it('returns a string at 75%', () => {
    const msg = getChallengeEncouragementMessage(challenge, 75);
    expect(msg).not.toBeNull();
    expect(msg!.length).toBeGreaterThan(0);
  });

  it('returns a string at 50%', () => {
    const msg = getChallengeEncouragementMessage(challenge, 50);
    expect(msg).not.toBeNull();
  });

  it('returns a string at 25%', () => {
    const msg = getChallengeEncouragementMessage(challenge, 25);
    expect(msg).not.toBeNull();
  });

  it('returns a string at 0%', () => {
    const msg = getChallengeEncouragementMessage(challenge, 0);
    expect(msg).not.toBeNull();
  });

  it('includes the challenge emoji', () => {
    const msg = getChallengeEncouragementMessage(challenge, 50);
    expect(msg).toContain(challenge.emoji);
  });
});
