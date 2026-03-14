/**
 * GrowBucks Chores & Jobs Utilities
 * Helper functions for the virtual jobs/chores → earnings system.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChoreFrequency = 'one_time' | 'recurring';
export type ChoreStatus = 'active' | 'paused' | 'archived';
export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export interface Chore {
  id: string;
  child_id: string;
  title: string;
  description?: string | null;
  reward_cents: number;
  frequency: ChoreFrequency;
  status: ChoreStatus;
  emoji?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChoreCompletion {
  id: string;
  chore_id: string;
  child_id: string;
  status: CompletionStatus;
  notes?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  transaction_id?: string | null;
  created_at: string;
}

export interface CreateChoreInput {
  child_id: string;
  title: string;
  description?: string;
  reward_cents: number;
  frequency?: ChoreFrequency;
  emoji?: string;
}

export interface UpdateChoreInput {
  title?: string;
  description?: string | null;
  reward_cents?: number;
  frequency?: ChoreFrequency;
  status?: ChoreStatus;
  emoji?: string | null;
}

export interface SubmitCompletionInput {
  chore_id: string;
  child_id: string;
  notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHORE_TITLE_MAX_LENGTH = 100;
export const CHORE_DESCRIPTION_MAX_LENGTH = 500;
export const CHORE_NOTES_MAX_LENGTH = 255;
export const CHORE_REJECTION_REASON_MAX_LENGTH = 255;

/** Minimum reward: 1 cent */
export const CHORE_REWARD_MIN_CENTS = 1;
/** Maximum reward: $999.99 */
export const CHORE_REWARD_MAX_CENTS = 99_999;

export const CHORE_FREQUENCY_LABELS: Record<ChoreFrequency, string> = {
  one_time: 'One-time',
  recurring: 'Recurring',
};

export const CHORE_STATUS_LABELS: Record<ChoreStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

export const COMPLETION_STATUS_LABELS: Record<CompletionStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Needs Redo',
};

/** Suggested emoji options for chores */
export const CHORE_EMOJI_SUGGESTIONS = [
  '🧹', '🍽️', '🐕', '🌿', '🚗', '🧺', '🛏️', '🗑️',
  '🧴', '📚', '🌻', '⭐', '🏠', '🧼', '🪴', '🍳',
];

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate input for creating a new chore.
 */
export function validateCreateChore(input: CreateChoreInput): ValidationResult {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (input.title.trim().length > CHORE_TITLE_MAX_LENGTH) {
    errors.push(`Title must be ${CHORE_TITLE_MAX_LENGTH} characters or fewer`);
  }

  if (input.description && input.description.length > CHORE_DESCRIPTION_MAX_LENGTH) {
    errors.push(`Description must be ${CHORE_DESCRIPTION_MAX_LENGTH} characters or fewer`);
  }

  if (!input.reward_cents || typeof input.reward_cents !== 'number') {
    errors.push('Reward amount is required');
  } else if (!Number.isInteger(input.reward_cents)) {
    errors.push('Reward amount must be a whole number of cents');
  } else if (input.reward_cents < CHORE_REWARD_MIN_CENTS) {
    errors.push(`Reward must be at least $0.01`);
  } else if (input.reward_cents > CHORE_REWARD_MAX_CENTS) {
    errors.push(`Reward cannot exceed $${(CHORE_REWARD_MAX_CENTS / 100).toFixed(2)}`);
  }

  if (input.frequency && !['one_time', 'recurring'].includes(input.frequency)) {
    errors.push('Frequency must be one_time or recurring');
  }

  if (!input.child_id || input.child_id.trim().length === 0) {
    errors.push('Child ID is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate input for updating a chore.
 */
export function validateUpdateChore(input: UpdateChoreInput): ValidationResult {
  const errors: string[] = [];

  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (input.title.trim().length > CHORE_TITLE_MAX_LENGTH) {
      errors.push(`Title must be ${CHORE_TITLE_MAX_LENGTH} characters or fewer`);
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (input.description.length > CHORE_DESCRIPTION_MAX_LENGTH) {
      errors.push(`Description must be ${CHORE_DESCRIPTION_MAX_LENGTH} characters or fewer`);
    }
  }

  if (input.reward_cents !== undefined) {
    if (!Number.isInteger(input.reward_cents)) {
      errors.push('Reward amount must be a whole number of cents');
    } else if (input.reward_cents < CHORE_REWARD_MIN_CENTS) {
      errors.push(`Reward must be at least $0.01`);
    } else if (input.reward_cents > CHORE_REWARD_MAX_CENTS) {
      errors.push(`Reward cannot exceed $${(CHORE_REWARD_MAX_CENTS / 100).toFixed(2)}`);
    }
  }

  if (input.frequency !== undefined && !['one_time', 'recurring'].includes(input.frequency)) {
    errors.push('Frequency must be one_time or recurring');
  }

  if (input.status !== undefined && !['active', 'paused', 'archived'].includes(input.status)) {
    errors.push('Status must be active, paused, or archived');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a completion submission from a child.
 */
export function validateSubmitCompletion(input: SubmitCompletionInput): ValidationResult {
  const errors: string[] = [];

  if (!input.chore_id || input.chore_id.trim().length === 0) {
    errors.push('Chore ID is required');
  }

  if (!input.child_id || input.child_id.trim().length === 0) {
    errors.push('Child ID is required');
  }

  if (input.notes && input.notes.length > CHORE_NOTES_MAX_LENGTH) {
    errors.push(`Notes must be ${CHORE_NOTES_MAX_LENGTH} characters or fewer`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a reward amount in cents as a dollar string (e.g. "$2.50").
 */
export function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get a human-readable label for a chore frequency.
 */
export function getFrequencyLabel(frequency: ChoreFrequency): string {
  return CHORE_FREQUENCY_LABELS[frequency] ?? frequency;
}

/**
 * Get a human-readable label for a completion status.
 */
export function getCompletionStatusLabel(status: CompletionStatus): string {
  return COMPLETION_STATUS_LABELS[status] ?? status;
}

// ─── Business Logic ───────────────────────────────────────────────────────────

/**
 * Check if a child can submit a completion for a chore.
 * Returns { allowed, reason } explaining why it's blocked (if it is).
 *
 * Rules:
 * - Chore must be active
 * - If one_time, no prior approved completion allowed
 * - No pending completion already in flight (prevent double-submitting)
 */
export function canSubmitCompletion(
  chore: Pick<Chore, 'status' | 'frequency'>,
  existingCompletions: Pick<ChoreCompletion, 'status'>[]
): { allowed: boolean; reason?: string } {
  if (chore.status === 'archived') {
    return { allowed: false, reason: 'This chore has been archived' };
  }

  if (chore.status === 'paused') {
    return { allowed: false, reason: 'This chore is currently paused' };
  }

  const hasPending = existingCompletions.some((c) => c.status === 'pending');
  if (hasPending) {
    return { allowed: false, reason: 'A completion is already waiting for review' };
  }

  if (chore.frequency === 'one_time') {
    const hasApproved = existingCompletions.some((c) => c.status === 'approved');
    if (hasApproved) {
      return { allowed: false, reason: 'This one-time chore has already been completed' };
    }
  }

  return { allowed: true };
}

/**
 * Calculate total earnings from approved completions.
 */
export function calculateTotalEarnings(
  completions: Array<{ status: CompletionStatus; chore?: { reward_cents: number } }>
): number {
  return completions
    .filter((c) => c.status === 'approved' && c.chore)
    .reduce((sum, c) => sum + (c.chore?.reward_cents ?? 0), 0);
}

/**
 * Count completions by status.
 */
export function countByStatus(completions: Pick<ChoreCompletion, 'status'>[]): {
  pending: number;
  approved: number;
  rejected: number;
} {
  return completions.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );
}

/**
 * Sort chores: active first, then paused, then archived. Within same status, sort by title.
 */
export function sortChores(chores: Chore[]): Chore[] {
  const statusOrder: Record<ChoreStatus, number> = { active: 0, paused: 1, archived: 2 };
  return [...chores].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Get pending completions sorted by submission date (oldest first for fairness).
 */
export function getPendingCompletions<T extends Pick<ChoreCompletion, 'status' | 'submitted_at'>>(
  completions: T[]
): T[] {
  return completions
    .filter((c) => c.status === 'pending')
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
}
