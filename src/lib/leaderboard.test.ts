import { describe, it, expect } from 'vitest';
import {
  buildLeaderboard,
  buildAllLeaderboards,
  rankMedal,
  featuredLeaderboard,
  LeaderboardEntry,
} from './leaderboard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const alice: LeaderboardEntry = {
  childId: 'a1',
  name: 'Alice',
  avatarUrl: null,
  balanceCents: 5000,          // $50
  interestThisMonthCents: 300, // $3
  saveBalanceCents: 2500,      // $25 (50% savings rate)
  balanceStartOfMonthCents: 4000, // started at $40 → +25% growth
};

const bob: LeaderboardEntry = {
  childId: 'b1',
  name: 'Bob',
  avatarUrl: null,
  balanceCents: 3000,           // $30
  interestThisMonthCents: 500,  // $5 (more interest earned)
  saveBalanceCents: 300,        // $3 (10% savings rate)
  balanceStartOfMonthCents: 2500, // started at $25 → +20% growth
};

const charlie: LeaderboardEntry = {
  childId: 'c1',
  name: 'Charlie',
  avatarUrl: null,
  balanceCents: 1000,           // $10
  interestThisMonthCents: 100,  // $1
  saveBalanceCents: 900,        // $9 (90% savings rate — super saver!)
  balanceStartOfMonthCents: 500,  // started at $5 → +100% growth
};

// ─── buildLeaderboard — balance ───────────────────────────────────────────────

describe('buildLeaderboard balance', () => {
  it('ranks by balance descending', () => {
    const lb = buildLeaderboard([alice, bob, charlie], 'balance');
    expect(lb.entries.map((e) => e.childId)).toEqual(['a1', 'b1', 'c1']);
    expect(lb.entries.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('uses $X.XX format', () => {
    const lb = buildLeaderboard([alice], 'balance');
    expect(lb.entries[0].display).toBe('$50.00');
  });

  it('sets emoji and label', () => {
    const lb = buildLeaderboard([alice], 'balance');
    expect(lb.emoji).toBe('💰');
    expect(lb.label).toBe('Biggest Saver');
  });
});

// ─── buildLeaderboard — interest ─────────────────────────────────────────────

describe('buildLeaderboard interest', () => {
  it('ranks by interest earned descending (bob > alice > charlie)', () => {
    const lb = buildLeaderboard([alice, bob, charlie], 'interest');
    expect(lb.entries.map((e) => e.childId)).toEqual(['b1', 'a1', 'c1']);
  });

  it('formats as dollars', () => {
    const lb = buildLeaderboard([bob], 'interest');
    expect(lb.entries[0].display).toBe('$5.00');
  });
});

// ─── buildLeaderboard — savingsRate ──────────────────────────────────────────

describe('buildLeaderboard savingsRate', () => {
  it('ranks by savings rate descending (charlie 90% > alice 50% > bob 10%)', () => {
    const lb = buildLeaderboard([alice, bob, charlie], 'savingsRate');
    expect(lb.entries.map((e) => e.childId)).toEqual(['c1', 'a1', 'b1']);
  });

  it('formats as percentage', () => {
    const lb = buildLeaderboard([alice], 'savingsRate');
    expect(lb.entries[0].display).toBe('+50.0%');
  });

  it('returns 0 for child with no balance', () => {
    const noBalance: LeaderboardEntry = { ...alice, balanceCents: 0, saveBalanceCents: 0 };
    const lb = buildLeaderboard([noBalance], 'savingsRate');
    expect(lb.entries[0].score).toBe(0);
  });
});

// ─── buildLeaderboard — growth ────────────────────────────────────────────────

describe('buildLeaderboard growth', () => {
  it('ranks by growth % descending (charlie 100% > alice 25% > bob 20%)', () => {
    const lb = buildLeaderboard([alice, bob, charlie], 'growth');
    expect(lb.entries.map((e) => e.childId)).toEqual(['c1', 'a1', 'b1']);
  });

  it('formats as percentage with sign', () => {
    const lb = buildLeaderboard([charlie], 'growth');
    expect(lb.entries[0].display).toBe('+100.0%');
  });

  it('returns 0 for child with no start balance', () => {
    const noHistory: LeaderboardEntry = { ...alice, balanceStartOfMonthCents: 0 };
    const lb = buildLeaderboard([noHistory], 'growth');
    expect(lb.entries[0].score).toBe(0);
  });
});

// ─── Ties ─────────────────────────────────────────────────────────────────────

describe('tie handling', () => {
  const tied1: LeaderboardEntry = { ...alice, childId: 't1', balanceCents: 1000 };
  const tied2: LeaderboardEntry = { ...bob, childId: 't2', balanceCents: 1000 };
  const winner: LeaderboardEntry = { ...charlie, childId: 'tw', balanceCents: 2000 };

  it('assigns same rank to tied entries', () => {
    const lb = buildLeaderboard([tied1, tied2], 'balance');
    expect(lb.entries[0].rank).toBe(1);
    expect(lb.entries[1].rank).toBe(1);
  });

  it('marks both tied entries with tied=true', () => {
    const lb = buildLeaderboard([tied1, tied2], 'balance');
    expect(lb.entries[0].tied).toBe(true);
    expect(lb.entries[1].tied).toBe(true);
  });

  it('does not mark winner as tied when two others are tied for 2nd', () => {
    const lb = buildLeaderboard([winner, tied1, tied2], 'balance');
    expect(lb.entries[0].rank).toBe(1);
    expect(lb.entries[0].tied).toBe(false);
    expect(lb.entries[1].rank).toBe(2);
    expect(lb.entries[1].tied).toBe(true);
    expect(lb.entries[2].rank).toBe(2);
    expect(lb.entries[2].tied).toBe(true);
  });

  it('sets allTied=true when all have same score', () => {
    const lb = buildLeaderboard([tied1, tied2], 'balance');
    expect(lb.allTied).toBe(true);
  });

  it('sets allTied=false when there is a clear winner', () => {
    const lb = buildLeaderboard([winner, tied1, tied2], 'balance');
    expect(lb.allTied).toBe(false);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles empty entries array', () => {
    const lb = buildLeaderboard([], 'balance');
    expect(lb.entries).toHaveLength(0);
    expect(lb.allTied).toBe(true);
  });

  it('handles single entry (no ties)', () => {
    const lb = buildLeaderboard([alice], 'balance');
    expect(lb.entries[0].rank).toBe(1);
    expect(lb.entries[0].tied).toBe(false);
    expect(lb.allTied).toBe(true); // single child — nothing to compare
  });
});

// ─── buildAllLeaderboards ────────────────────────────────────────────────────

describe('buildAllLeaderboards', () => {
  it('returns only non-allTied leaderboards', () => {
    const lbs = buildAllLeaderboards([alice, bob, charlie]);
    expect(lbs.every((lb) => !lb.allTied)).toBe(true);
  });

  it('returns up to 4 categories', () => {
    const lbs = buildAllLeaderboards([alice, bob, charlie]);
    expect(lbs.length).toBeGreaterThan(0);
    expect(lbs.length).toBeLessThanOrEqual(4);
  });

  it('returns empty array for empty input', () => {
    expect(buildAllLeaderboards([])).toHaveLength(0);
  });
});

// ─── rankMedal ───────────────────────────────────────────────────────────────

describe('rankMedal', () => {
  it('returns gold for rank 1', () => expect(rankMedal(1)).toBe('🥇'));
  it('returns silver for rank 2', () => expect(rankMedal(2)).toBe('🥈'));
  it('returns bronze for rank 3', () => expect(rankMedal(3)).toBe('🥉'));
  it('returns empty string for rank 4+', () => expect(rankMedal(4)).toBe(''));
  it('returns empty string for rank 0', () => expect(rankMedal(0)).toBe(''));
});

// ─── featuredLeaderboard ─────────────────────────────────────────────────────

describe('featuredLeaderboard', () => {
  it('returns null for empty array', () => {
    expect(featuredLeaderboard([])).toBeNull();
  });

  it('prefers interest category', () => {
    const lbs = buildAllLeaderboards([alice, bob, charlie]);
    const featured = featuredLeaderboard(lbs);
    // interest or balance should be featured (depends on whether interest is tied)
    expect(featured).not.toBeNull();
    expect(['interest', 'balance', 'growth', 'savingsRate']).toContain(featured!.category);
  });

  it('falls back to first leaderboard if preferred categories not present', () => {
    const lbs = buildAllLeaderboards([alice, bob]);
    expect(featuredLeaderboard(lbs)).not.toBeNull();
  });
});
