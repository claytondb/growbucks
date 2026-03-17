import { describe, it, expect } from 'vitest';
import {
  flattenPendingActions,
  groupByChild,
  countByType,
  pendingActionsSummary,
  actionTypeIcon,
  actionTypeLabel,
  actionReviewPath,
  hasPendingActions,
  oldestPendingAction,
  totalPendingAmountCents,
  emptyPendingActions,
  type PendingAction,
  type PendingActionsData,
} from './pending-actions';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeWithdrawal = (overrides: Partial<PendingAction> = {}): PendingAction => ({
  id: 'w1',
  type: 'withdrawal',
  childId: 'child-1',
  childName: 'Alice',
  label: 'Birthday money',
  amountCents: 500,
  submittedAt: '2026-03-10T10:00:00Z',
  ...overrides,
});

const makeChore = (overrides: Partial<PendingAction> = {}): PendingAction => ({
  id: 'c1',
  type: 'chore_completion',
  childId: 'child-1',
  childName: 'Alice',
  label: 'Vacuum living room',
  amountCents: 250,
  submittedAt: '2026-03-11T08:00:00Z',
  meta: { emoji: '🧹', notes: 'All done!', choreId: 'chore-1' },
  ...overrides,
});

const makeDonation = (overrides: Partial<PendingAction> = {}): PendingAction => ({
  id: 'd1',
  type: 'donation',
  childId: 'child-2',
  childName: 'Bob',
  label: 'Animal Shelter',
  amountCents: 300,
  submittedAt: '2026-03-12T14:00:00Z',
  meta: { message: 'I love animals!' },
  ...overrides,
});

const emptyData: PendingActionsData = {
  total: 0,
  withdrawals: [],
  choreCompletions: [],
  donations: [],
};

const fullData: PendingActionsData = {
  total: 3,
  withdrawals: [makeWithdrawal()],
  choreCompletions: [makeChore()],
  donations: [makeDonation()],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('emptyPendingActions', () => {
  it('returns a zero-count data object', () => {
    const data = emptyPendingActions();
    expect(data.total).toBe(0);
    expect(data.withdrawals).toHaveLength(0);
    expect(data.choreCompletions).toHaveLength(0);
    expect(data.donations).toHaveLength(0);
  });
});

describe('hasPendingActions', () => {
  it('returns false for empty data', () => {
    expect(hasPendingActions(emptyData)).toBe(false);
  });

  it('returns true when there are pending items', () => {
    expect(hasPendingActions(fullData)).toBe(true);
  });

  it('returns true with only one type populated', () => {
    expect(hasPendingActions({ ...emptyData, total: 1, withdrawals: [makeWithdrawal()] })).toBe(true);
  });
});

describe('flattenPendingActions', () => {
  it('returns empty array for empty data', () => {
    expect(flattenPendingActions(emptyData)).toHaveLength(0);
  });

  it('returns all items as a flat array', () => {
    const result = flattenPendingActions(fullData);
    expect(result).toHaveLength(3);
  });

  it('sorts oldest-first by submittedAt', () => {
    const result = flattenPendingActions(fullData);
    expect(result[0].submittedAt < result[1].submittedAt).toBe(true);
    expect(result[1].submittedAt < result[2].submittedAt).toBe(true);
  });

  it('handles items with same submittedAt without crashing', () => {
    const sameTime = '2026-03-10T10:00:00Z';
    const data: PendingActionsData = {
      total: 2,
      withdrawals: [makeWithdrawal({ submittedAt: sameTime })],
      choreCompletions: [makeChore({ submittedAt: sameTime })],
      donations: [],
    };
    const result = flattenPendingActions(data);
    expect(result).toHaveLength(2);
  });
});

describe('groupByChild', () => {
  it('returns empty map for empty data', () => {
    expect(groupByChild(emptyData).size).toBe(0);
  });

  it('groups items by childId', () => {
    const map = groupByChild(fullData);
    expect(map.size).toBe(2); // Alice and Bob
    expect(map.get('child-1')).toHaveLength(2);
    expect(map.get('child-2')).toHaveLength(1);
  });

  it('includes all action types in groupings', () => {
    const map = groupByChild(fullData);
    const aliceItems = map.get('child-1')!;
    const types = aliceItems.map((i) => i.type);
    expect(types).toContain('withdrawal');
    expect(types).toContain('chore_completion');
  });
});

describe('countByType', () => {
  it('returns zeros for empty data', () => {
    const counts = countByType(emptyData);
    expect(counts.withdrawal).toBe(0);
    expect(counts.chore_completion).toBe(0);
    expect(counts.donation).toBe(0);
  });

  it('counts each type correctly', () => {
    const counts = countByType(fullData);
    expect(counts.withdrawal).toBe(1);
    expect(counts.chore_completion).toBe(1);
    expect(counts.donation).toBe(1);
  });

  it('handles multiple items of the same type', () => {
    const data: PendingActionsData = {
      total: 3,
      withdrawals: [makeWithdrawal({ id: 'w1' }), makeWithdrawal({ id: 'w2' }), makeWithdrawal({ id: 'w3' })],
      choreCompletions: [],
      donations: [],
    };
    expect(countByType(data).withdrawal).toBe(3);
    expect(countByType(data).chore_completion).toBe(0);
  });
});

describe('pendingActionsSummary', () => {
  it('returns empty string for zero items', () => {
    expect(pendingActionsSummary(emptyData)).toBe('');
  });

  it('returns singular forms for count of 1', () => {
    const data: PendingActionsData = {
      total: 1,
      withdrawals: [makeWithdrawal()],
      choreCompletions: [],
      donations: [],
    };
    expect(pendingActionsSummary(data)).toBe('1 withdrawal');
  });

  it('returns plural forms for count > 1', () => {
    const data: PendingActionsData = {
      total: 2,
      withdrawals: [makeWithdrawal({ id: 'w1' }), makeWithdrawal({ id: 'w2' })],
      choreCompletions: [],
      donations: [],
    };
    expect(pendingActionsSummary(data)).toBe('2 withdrawals');
  });

  it('combines multiple types with commas', () => {
    const result = pendingActionsSummary(fullData);
    expect(result).toContain('1 withdrawal');
    expect(result).toContain('1 chore');
    expect(result).toContain('1 donation');
  });

  it('omits types with zero items', () => {
    const data: PendingActionsData = {
      total: 1,
      withdrawals: [],
      choreCompletions: [],
      donations: [makeDonation()],
    };
    const result = pendingActionsSummary(data);
    expect(result).toBe('1 donation');
    expect(result).not.toContain('withdrawal');
    expect(result).not.toContain('chore');
  });
});

describe('actionTypeIcon', () => {
  it('returns ArrowDownCircle for withdrawal', () => {
    expect(actionTypeIcon('withdrawal')).toBe('ArrowDownCircle');
  });

  it('returns CheckSquare for chore_completion', () => {
    expect(actionTypeIcon('chore_completion')).toBe('CheckSquare');
  });

  it('returns Heart for donation', () => {
    expect(actionTypeIcon('donation')).toBe('Heart');
  });
});

describe('actionTypeLabel', () => {
  it('returns correct labels for each type', () => {
    expect(actionTypeLabel('withdrawal')).toBe('Withdrawal');
    expect(actionTypeLabel('chore_completion')).toBe('Chore Completion');
    expect(actionTypeLabel('donation')).toBe('Donation');
  });
});

describe('actionReviewPath', () => {
  it('routes withdrawals to /dashboard/transactions', () => {
    expect(actionReviewPath('withdrawal')).toBe('/dashboard/transactions');
    expect(actionReviewPath('withdrawal', 'child-1')).toBe('/dashboard/transactions');
  });

  it('routes chores to child detail page when childId provided', () => {
    expect(actionReviewPath('chore_completion', 'child-abc')).toBe('/dashboard/child/child-abc');
  });

  it('routes chores to /dashboard when no childId', () => {
    expect(actionReviewPath('chore_completion')).toBe('/dashboard');
  });

  it('routes donations to child detail page when childId provided', () => {
    expect(actionReviewPath('donation', 'child-xyz')).toBe('/dashboard/child/child-xyz');
  });

  it('routes donations to /dashboard when no childId', () => {
    expect(actionReviewPath('donation')).toBe('/dashboard');
  });
});

describe('oldestPendingAction', () => {
  it('returns null for empty data', () => {
    expect(oldestPendingAction(emptyData)).toBeNull();
  });

  it('returns the item with the earliest submittedAt', () => {
    const oldest = oldestPendingAction(fullData);
    expect(oldest?.id).toBe('w1');
    expect(oldest?.submittedAt).toBe('2026-03-10T10:00:00Z');
  });

  it('works with a single item', () => {
    const data: PendingActionsData = {
      total: 1,
      withdrawals: [makeWithdrawal()],
      choreCompletions: [],
      donations: [],
    };
    expect(oldestPendingAction(data)?.id).toBe('w1');
  });
});

describe('totalPendingAmountCents', () => {
  it('returns 0 for empty data', () => {
    expect(totalPendingAmountCents(emptyData)).toBe(0);
  });

  it('sums all amounts across types', () => {
    // withdrawal=500, chore=250, donation=300 → 1050
    expect(totalPendingAmountCents(fullData)).toBe(1050);
  });

  it('handles fractional amounts correctly', () => {
    const data: PendingActionsData = {
      total: 2,
      withdrawals: [makeWithdrawal({ amountCents: 1 })],
      choreCompletions: [makeChore({ amountCents: 1 })],
      donations: [],
    };
    expect(totalPendingAmountCents(data)).toBe(2);
  });
});
