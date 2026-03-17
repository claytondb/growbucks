/**
 * GrowBucks Pending Actions Utilities
 *
 * Helpers for working with the aggregated list of parent-approval items
 * returned by GET /api/pending-actions.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PendingActionType = 'withdrawal' | 'chore_completion' | 'donation';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  childId: string;
  childName: string;
  label: string;
  amountCents: number;
  submittedAt: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export interface PendingActionsData {
  total: number;
  withdrawals: PendingAction[];
  choreCompletions: PendingAction[];
  donations: PendingAction[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Flatten all pending items into a single list, oldest-first.
 */
export function flattenPendingActions(data: PendingActionsData): PendingAction[] {
  return [
    ...data.withdrawals,
    ...data.choreCompletions,
    ...data.donations,
  ].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
}

/**
 * Group pending actions by child.
 */
export function groupByChild(data: PendingActionsData): Map<string, PendingAction[]> {
  const all = flattenPendingActions(data);
  const map = new Map<string, PendingAction[]>();
  for (const action of all) {
    const existing = map.get(action.childId) ?? [];
    existing.push(action);
    map.set(action.childId, existing);
  }
  return map;
}

/**
 * Count pending actions per type.
 */
export function countByType(data: PendingActionsData): Record<PendingActionType, number> {
  return {
    withdrawal: data.withdrawals.length,
    chore_completion: data.choreCompletions.length,
    donation: data.donations.length,
  };
}

/**
 * Returns a human-readable summary for the pending actions badge.
 * Examples:
 *   "3 pending requests"
 *   "2 withdrawals, 1 chore"
 *   "1 donation"
 */
export function pendingActionsSummary(data: PendingActionsData): string {
  if (data.total === 0) return '';

  const parts: string[] = [];
  const w = data.withdrawals.length;
  const c = data.choreCompletions.length;
  const d = data.donations.length;

  if (w > 0) parts.push(`${w} withdrawal${w !== 1 ? 's' : ''}`);
  if (c > 0) parts.push(`${c} chore${c !== 1 ? 's' : ''}`);
  if (d > 0) parts.push(`${d} donation${d !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

/**
 * Returns the icon name (from lucide-react) appropriate for each action type.
 */
export function actionTypeIcon(type: PendingActionType): string {
  switch (type) {
    case 'withdrawal':
      return 'ArrowDownCircle';
    case 'chore_completion':
      return 'CheckSquare';
    case 'donation':
      return 'Heart';
  }
}

/**
 * Returns a friendly label for an action type.
 */
export function actionTypeLabel(type: PendingActionType): string {
  switch (type) {
    case 'withdrawal':
      return 'Withdrawal';
    case 'chore_completion':
      return 'Chore Completion';
    case 'donation':
      return 'Donation';
  }
}

/**
 * Returns the navigation path to the review page for a given action type.
 */
export function actionReviewPath(type: PendingActionType, childId?: string): string {
  switch (type) {
    case 'withdrawal':
      return '/dashboard/transactions';
    case 'chore_completion':
      return childId ? `/dashboard/child/${childId}` : '/dashboard';
    case 'donation':
      return childId ? `/dashboard/child/${childId}` : '/dashboard';
  }
}

/**
 * Returns true if there are any pending items requiring review.
 */
export function hasPendingActions(data: PendingActionsData): boolean {
  return data.total > 0;
}

/**
 * Returns the most urgent action — oldest submission across all types.
 */
export function oldestPendingAction(data: PendingActionsData): PendingAction | null {
  const all = flattenPendingActions(data);
  return all.length > 0 ? all[0] : null;
}

/**
 * Total dollar value of all pending actions.
 */
export function totalPendingAmountCents(data: PendingActionsData): number {
  return flattenPendingActions(data).reduce((sum, a) => sum + a.amountCents, 0);
}

/**
 * Creates an empty/default PendingActionsData object (useful for loading states).
 */
export function emptyPendingActions(): PendingActionsData {
  return { total: 0, withdrawals: [], choreCompletions: [], donations: [] };
}
