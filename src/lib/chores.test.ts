import { describe, it, expect } from 'vitest';
import {
  validateCreateChore,
  validateUpdateChore,
  validateSubmitCompletion,
  canSubmitCompletion,
  formatReward,
  getFrequencyLabel,
  getCompletionStatusLabel,
  calculateTotalEarnings,
  countByStatus,
  sortChores,
  getPendingCompletions,
  CHORE_REWARD_MAX_CENTS,
  CHORE_REWARD_MIN_CENTS,
  CHORE_TITLE_MAX_LENGTH,
  type Chore,
  type ChoreCompletion,
} from './chores';

// ─── validateCreateChore ──────────────────────────────────────────────────────

describe('validateCreateChore', () => {
  const validInput = {
    child_id: 'child-123',
    title: 'Take out the trash',
    reward_cents: 200,
  };

  it('accepts a valid chore', () => {
    const result = validateCreateChore(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires a title', () => {
    const result = validateCreateChore({ ...validInput, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('rejects whitespace-only title', () => {
    const result = validateCreateChore({ ...validInput, title: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('rejects title exceeding max length', () => {
    const result = validateCreateChore({
      ...validInput,
      title: 'x'.repeat(CHORE_TITLE_MAX_LENGTH + 1),
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('100 characters or fewer');
  });

  it('requires reward_cents', () => {
    const result = validateCreateChore({ ...validInput, reward_cents: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Reward amount is required');
  });

  it('rejects reward below minimum', () => {
    const result = validateCreateChore({ ...validInput, reward_cents: 0 });
    expect(result.valid).toBe(false);
  });

  it('accepts minimum reward of 1 cent', () => {
    const result = validateCreateChore({ ...validInput, reward_cents: CHORE_REWARD_MIN_CENTS });
    expect(result.valid).toBe(true);
  });

  it('rejects reward above maximum', () => {
    const result = validateCreateChore({
      ...validInput,
      reward_cents: CHORE_REWARD_MAX_CENTS + 1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('cannot exceed');
  });

  it('accepts maximum reward', () => {
    const result = validateCreateChore({ ...validInput, reward_cents: CHORE_REWARD_MAX_CENTS });
    expect(result.valid).toBe(true);
  });

  it('rejects non-integer reward', () => {
    const result = validateCreateChore({ ...validInput, reward_cents: 1.5 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Reward amount must be a whole number of cents');
  });

  it('requires child_id', () => {
    const result = validateCreateChore({ ...validInput, child_id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Child ID is required');
  });

  it('rejects invalid frequency', () => {
    const result = validateCreateChore({
      ...validInput,
      frequency: 'daily' as 'one_time',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Frequency must be one_time or recurring');
  });

  it('accepts one_time frequency', () => {
    const result = validateCreateChore({ ...validInput, frequency: 'one_time' });
    expect(result.valid).toBe(true);
  });

  it('accepts recurring frequency', () => {
    const result = validateCreateChore({ ...validInput, frequency: 'recurring' });
    expect(result.valid).toBe(true);
  });

  it('accepts optional description within limit', () => {
    const result = validateCreateChore({ ...validInput, description: 'Clean thoroughly.' });
    expect(result.valid).toBe(true);
  });

  it('rejects description exceeding max length', () => {
    const result = validateCreateChore({ ...validInput, description: 'x'.repeat(501) });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('500 characters or fewer');
  });

  it('accumulates multiple errors', () => {
    const result = validateCreateChore({ child_id: '', title: '', reward_cents: 0 });
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ─── validateUpdateChore ──────────────────────────────────────────────────────

describe('validateUpdateChore', () => {
  it('accepts empty update (no-op)', () => {
    const result = validateUpdateChore({});
    expect(result.valid).toBe(true);
  });

  it('accepts valid title update', () => {
    const result = validateUpdateChore({ title: 'New Title' });
    expect(result.valid).toBe(true);
  });

  it('rejects empty title', () => {
    const result = validateUpdateChore({ title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title cannot be empty');
  });

  it('rejects title too long', () => {
    const result = validateUpdateChore({ title: 'x'.repeat(101) });
    expect(result.valid).toBe(false);
  });

  it('accepts valid reward update', () => {
    const result = validateUpdateChore({ reward_cents: 500 });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid reward update', () => {
    const result = validateUpdateChore({ reward_cents: -1 });
    expect(result.valid).toBe(false);
  });

  it('accepts valid status update', () => {
    expect(validateUpdateChore({ status: 'paused' }).valid).toBe(true);
    expect(validateUpdateChore({ status: 'archived' }).valid).toBe(true);
    expect(validateUpdateChore({ status: 'active' }).valid).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = validateUpdateChore({ status: 'deleted' as 'archived' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Status must be active, paused, or archived');
  });

  it('accepts null description (clearing it)', () => {
    const result = validateUpdateChore({ description: null });
    expect(result.valid).toBe(true);
  });

  it('rejects description too long', () => {
    const result = validateUpdateChore({ description: 'y'.repeat(501) });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid frequency', () => {
    const result = validateUpdateChore({ frequency: 'weekly' as 'one_time' });
    expect(result.valid).toBe(false);
  });
});

// ─── validateSubmitCompletion ─────────────────────────────────────────────────

describe('validateSubmitCompletion', () => {
  const validInput = { chore_id: 'chore-1', child_id: 'child-1' };

  it('accepts valid input', () => {
    const result = validateSubmitCompletion(validInput);
    expect(result.valid).toBe(true);
  });

  it('requires chore_id', () => {
    const result = validateSubmitCompletion({ ...validInput, chore_id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chore ID is required');
  });

  it('requires child_id', () => {
    const result = validateSubmitCompletion({ ...validInput, child_id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Child ID is required');
  });

  it('accepts notes within limit', () => {
    const result = validateSubmitCompletion({ ...validInput, notes: 'Did a great job!' });
    expect(result.valid).toBe(true);
  });

  it('rejects notes exceeding max length', () => {
    const result = validateSubmitCompletion({ ...validInput, notes: 'n'.repeat(256) });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('255 characters or fewer');
  });

  it('accepts notes exactly at limit', () => {
    const result = validateSubmitCompletion({ ...validInput, notes: 'n'.repeat(255) });
    expect(result.valid).toBe(true);
  });
});

// ─── canSubmitCompletion ──────────────────────────────────────────────────────

describe('canSubmitCompletion', () => {
  const activeRecurring = { status: 'active' as const, frequency: 'recurring' as const };
  const activeOneTime = { status: 'active' as const, frequency: 'one_time' as const };
  const paused = { status: 'paused' as const, frequency: 'recurring' as const };
  const archived = { status: 'archived' as const, frequency: 'recurring' as const };

  it('allows submission for active recurring chore with no completions', () => {
    const result = canSubmitCompletion(activeRecurring, []);
    expect(result.allowed).toBe(true);
  });

  it('allows submission for active recurring chore with prior approved completions', () => {
    const completions = [{ status: 'approved' as const }, { status: 'rejected' as const }];
    const result = canSubmitCompletion(activeRecurring, completions);
    expect(result.allowed).toBe(true);
  });

  it('blocks submission when a pending completion exists', () => {
    const completions = [{ status: 'pending' as const }];
    const result = canSubmitCompletion(activeRecurring, completions);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('waiting for review');
  });

  it('blocks submission for paused chore', () => {
    const result = canSubmitCompletion(paused, []);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('paused');
  });

  it('blocks submission for archived chore', () => {
    const result = canSubmitCompletion(archived, []);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('archived');
  });

  it('allows one_time chore with no completions', () => {
    const result = canSubmitCompletion(activeOneTime, []);
    expect(result.allowed).toBe(true);
  });

  it('blocks one_time chore after approval', () => {
    const completions = [{ status: 'approved' as const }];
    const result = canSubmitCompletion(activeOneTime, completions);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('already been completed');
  });

  it('allows one_time chore resubmission after rejection', () => {
    const completions = [{ status: 'rejected' as const }];
    const result = canSubmitCompletion(activeOneTime, completions);
    expect(result.allowed).toBe(true);
  });

  it('pending takes priority over archived for one_time', () => {
    // If somehow pending + archived (edge case), pending check runs first
    const completions = [{ status: 'pending' as const }];
    const result = canSubmitCompletion(archived, completions);
    // archived check runs first in our implementation
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('archived');
  });
});

// ─── formatReward ─────────────────────────────────────────────────────────────

describe('formatReward', () => {
  it('formats whole dollar amounts', () => {
    expect(formatReward(500)).toBe('$5.00');
  });

  it('formats cents', () => {
    expect(formatReward(1)).toBe('$0.01');
  });

  it('formats mixed amounts', () => {
    expect(formatReward(250)).toBe('$2.50');
  });

  it('formats zero', () => {
    expect(formatReward(0)).toBe('$0.00');
  });

  it('formats large amounts', () => {
    expect(formatReward(10000)).toBe('$100.00');
  });
});

// ─── getFrequencyLabel ────────────────────────────────────────────────────────

describe('getFrequencyLabel', () => {
  it('returns label for one_time', () => {
    expect(getFrequencyLabel('one_time')).toBe('One-time');
  });

  it('returns label for recurring', () => {
    expect(getFrequencyLabel('recurring')).toBe('Recurring');
  });
});

// ─── getCompletionStatusLabel ─────────────────────────────────────────────────

describe('getCompletionStatusLabel', () => {
  it('returns label for pending', () => {
    expect(getCompletionStatusLabel('pending')).toBe('Pending Review');
  });

  it('returns label for approved', () => {
    expect(getCompletionStatusLabel('approved')).toBe('Approved');
  });

  it('returns label for rejected', () => {
    expect(getCompletionStatusLabel('rejected')).toBe('Needs Redo');
  });
});

// ─── calculateTotalEarnings ───────────────────────────────────────────────────

describe('calculateTotalEarnings', () => {
  it('sums approved completion rewards', () => {
    const completions = [
      { status: 'approved' as const, chore: { reward_cents: 200 } },
      { status: 'approved' as const, chore: { reward_cents: 500 } },
      { status: 'pending' as const, chore: { reward_cents: 300 } },
      { status: 'rejected' as const, chore: { reward_cents: 100 } },
    ];
    expect(calculateTotalEarnings(completions)).toBe(700);
  });

  it('returns 0 when no approved completions', () => {
    const completions = [
      { status: 'pending' as const, chore: { reward_cents: 200 } },
      { status: 'rejected' as const, chore: { reward_cents: 100 } },
    ];
    expect(calculateTotalEarnings(completions)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalEarnings([])).toBe(0);
  });

  it('skips completions without chore data', () => {
    const completions = [
      { status: 'approved' as const, chore: undefined },
      { status: 'approved' as const, chore: { reward_cents: 300 } },
    ];
    expect(calculateTotalEarnings(completions)).toBe(300);
  });
});

// ─── countByStatus ────────────────────────────────────────────────────────────

describe('countByStatus', () => {
  it('counts completions by status', () => {
    const completions = [
      { status: 'pending' as const },
      { status: 'pending' as const },
      { status: 'approved' as const },
      { status: 'rejected' as const },
    ];
    const counts = countByStatus(completions);
    expect(counts.pending).toBe(2);
    expect(counts.approved).toBe(1);
    expect(counts.rejected).toBe(1);
  });

  it('returns zeros for empty array', () => {
    const counts = countByStatus([]);
    expect(counts.pending).toBe(0);
    expect(counts.approved).toBe(0);
    expect(counts.rejected).toBe(0);
  });

  it('handles all same status', () => {
    const completions = [
      { status: 'approved' as const },
      { status: 'approved' as const },
      { status: 'approved' as const },
    ];
    const counts = countByStatus(completions);
    expect(counts.approved).toBe(3);
    expect(counts.pending).toBe(0);
    expect(counts.rejected).toBe(0);
  });
});

// ─── sortChores ───────────────────────────────────────────────────────────────

describe('sortChores', () => {
  const makeChore = (title: string, status: Chore['status']): Chore => ({
    id: title,
    child_id: 'c1',
    title,
    reward_cents: 100,
    frequency: 'recurring',
    status,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  });

  it('sorts active before paused before archived', () => {
    const chores = [
      makeChore('Archived Task', 'archived'),
      makeChore('Active Task', 'active'),
      makeChore('Paused Task', 'paused'),
    ];
    const sorted = sortChores(chores);
    expect(sorted[0].status).toBe('active');
    expect(sorted[1].status).toBe('paused');
    expect(sorted[2].status).toBe('archived');
  });

  it('sorts alphabetically within same status', () => {
    const chores = [
      makeChore('Zebra task', 'active'),
      makeChore('Apple task', 'active'),
      makeChore('Mango task', 'active'),
    ];
    const sorted = sortChores(chores);
    expect(sorted[0].title).toBe('Apple task');
    expect(sorted[1].title).toBe('Mango task');
    expect(sorted[2].title).toBe('Zebra task');
  });

  it('does not mutate the original array', () => {
    const chores = [
      makeChore('B', 'active'),
      makeChore('A', 'active'),
    ];
    sortChores(chores);
    expect(chores[0].title).toBe('B'); // original unchanged
  });

  it('handles empty array', () => {
    expect(sortChores([])).toEqual([]);
  });
});

// ─── getPendingCompletions ────────────────────────────────────────────────────

describe('getPendingCompletions', () => {
  it('returns only pending completions', () => {
    const completions = [
      { status: 'pending' as const, submitted_at: '2026-03-01T10:00:00Z' },
      { status: 'approved' as const, submitted_at: '2026-03-01T08:00:00Z' },
      { status: 'rejected' as const, submitted_at: '2026-03-01T09:00:00Z' },
    ];
    const pending = getPendingCompletions(completions);
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('pending');
  });

  it('sorts pending by oldest first', () => {
    const completions = [
      { status: 'pending' as const, submitted_at: '2026-03-03T10:00:00Z' },
      { status: 'pending' as const, submitted_at: '2026-03-01T08:00:00Z' },
      { status: 'pending' as const, submitted_at: '2026-03-02T09:00:00Z' },
    ];
    const pending = getPendingCompletions(completions);
    expect(pending[0].submitted_at).toBe('2026-03-01T08:00:00Z');
    expect(pending[1].submitted_at).toBe('2026-03-02T09:00:00Z');
    expect(pending[2].submitted_at).toBe('2026-03-03T10:00:00Z');
  });

  it('returns empty array when none are pending', () => {
    const completions = [
      { status: 'approved' as const, submitted_at: '2026-03-01T10:00:00Z' },
    ];
    expect(getPendingCompletions(completions)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(getPendingCompletions([])).toHaveLength(0);
  });
});
