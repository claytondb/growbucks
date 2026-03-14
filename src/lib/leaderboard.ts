/**
 * Leaderboard utilities for GrowBucks.
 *
 * Produces opt-in sibling rankings across four categories:
 *  - balance      → who has the most money
 *  - interest     → who earned the most interest this month
 *  - savingsRate  → who saves the highest % of their balance
 *  - growth       → whose balance grew the most % this month
 *
 * All logic is pure (no DB calls) so it's fully testable.
 */

export type LeaderboardCategory = 'balance' | 'interest' | 'savingsRate' | 'growth';

export interface LeaderboardEntry {
  childId: string;
  name: string;
  avatarUrl: string | null;
  /** Balance in cents */
  balanceCents: number;
  /** Interest earned this month in cents */
  interestThisMonthCents: number;
  /** Savings bucket in cents (split-savings feature) */
  saveBalanceCents: number;
  /** Balance at the start of the month in cents (for growth %) */
  balanceStartOfMonthCents: number;
}

export interface RankedEntry extends LeaderboardEntry {
  rank: number;
  /** The numeric value used for this category ranking */
  score: number;
  /** Formatted display value */
  display: string;
  /** Whether this entry is tied with another */
  tied: boolean;
}

export interface Leaderboard {
  category: LeaderboardCategory;
  label: string;
  emoji: string;
  entries: RankedEntry[];
  /** True if all scores are identical (don't render) */
  allTied: boolean;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function balanceScore(e: LeaderboardEntry): number {
  return e.balanceCents;
}

function interestScore(e: LeaderboardEntry): number {
  return e.interestThisMonthCents;
}

function savingsRateScore(e: LeaderboardEntry): number {
  if (e.balanceCents <= 0) return 0;
  return Math.round((e.saveBalanceCents / e.balanceCents) * 10000); // basis points
}

function growthScore(e: LeaderboardEntry): number {
  if (e.balanceStartOfMonthCents <= 0) return 0;
  const gained = e.balanceCents - e.balanceStartOfMonthCents;
  return Math.round((gained / e.balanceStartOfMonthCents) * 10000); // basis points
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `$${dollars.toFixed(2)}`;
}

function formatPercent(basisPoints: number): string {
  const pct = basisPoints / 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

// ─── Core ranking ─────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  LeaderboardCategory,
  { label: string; emoji: string; score: (e: LeaderboardEntry) => number; format: (n: number) => string }
> = {
  balance: {
    label: 'Biggest Saver',
    emoji: '💰',
    score: balanceScore,
    format: formatCents,
  },
  interest: {
    label: 'Top Earner This Month',
    emoji: '📈',
    score: interestScore,
    format: formatCents,
  },
  savingsRate: {
    label: 'Best Saver %',
    emoji: '🏦',
    score: savingsRateScore,
    format: formatPercent,
  },
  growth: {
    label: 'Fastest Growing',
    emoji: '🚀',
    score: growthScore,
    format: formatPercent,
  },
};

/**
 * Build a ranked leaderboard for a given category.
 * Ties share the same rank and set `tied: true`.
 */
export function buildLeaderboard(
  entries: LeaderboardEntry[],
  category: LeaderboardCategory
): Leaderboard {
  if (entries.length === 0) {
    const meta = CATEGORY_META[category];
    return { category, label: meta.label, emoji: meta.emoji, entries: [], allTied: true };
  }

  const meta = CATEGORY_META[category];
  const scored = entries.map((e) => ({ ...e, score: meta.score(e) }));

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  // Assign ranks (tied entries get same rank)
  let currentRank = 1;
  const ranked: RankedEntry[] = scored.map((e, idx) => {
    if (idx > 0 && scored[idx - 1].score !== e.score) {
      currentRank = idx + 1;
    }
    return {
      ...e,
      rank: currentRank,
      display: meta.format(e.score),
      tied: false, // filled in below
    };
  });

  // Mark ties
  for (let i = 0; i < ranked.length; i++) {
    const hasSameRankNeighbour =
      (i > 0 && ranked[i - 1].rank === ranked[i].rank) ||
      (i < ranked.length - 1 && ranked[i + 1].rank === ranked[i].rank);
    ranked[i].tied = hasSameRankNeighbour;
  }

  const allTied = ranked.every((e) => e.rank === 1);

  return {
    category,
    label: meta.label,
    emoji: meta.emoji,
    entries: ranked,
    allTied,
  };
}

/**
 * Build all four leaderboards at once.
 * Filters out categories where all children have a score of 0 (nothing useful to show).
 */
export function buildAllLeaderboards(entries: LeaderboardEntry[]): Leaderboard[] {
  const categories: LeaderboardCategory[] = ['balance', 'interest', 'savingsRate', 'growth'];
  return categories
    .map((cat) => buildLeaderboard(entries, cat))
    .filter((lb) => !lb.allTied);
}

/** Medals for ranks 1-3; empty string otherwise. */
export function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

/**
 * Pick one "featured" leaderboard to spotlight on the dashboard.
 * Priority: interest (most motivating month-to-month) → balance → others.
 */
export function featuredLeaderboard(leaderboards: Leaderboard[]): Leaderboard | null {
  if (leaderboards.length === 0) return null;
  const preferred: LeaderboardCategory[] = ['interest', 'balance', 'growth', 'savingsRate'];
  for (const cat of preferred) {
    const found = leaderboards.find((lb) => lb.category === cat);
    if (found) return found;
  }
  return leaderboards[0];
}
