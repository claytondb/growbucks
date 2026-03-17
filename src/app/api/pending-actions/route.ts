import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export interface PendingAction {
  id: string;
  type: 'withdrawal' | 'chore_completion' | 'donation';
  childId: string;
  childName: string;
  /** Short label for the action — e.g. chore title, cause name, or "Withdrawal" */
  label: string;
  amountCents: number;
  submittedAt: string;
  /** Extra info — e.g. chore emoji or child notes */
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export interface PendingActionsResponse {
  total: number;
  withdrawals: PendingAction[];
  choreCompletions: PendingAction[];
  donations: PendingAction[];
}

/**
 * GET /api/pending-actions
 *
 * Returns ALL pending parent-approval items across all children:
 *   - Pending withdrawal transactions
 *   - Pending chore completion submissions
 *   - Pending charitable donation pledges
 *
 * Parents only. Children receive 401.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Resolve user id from email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!.toLowerCase())
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch all children for this parent
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', user.id);

  if (childrenError) {
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (!children || children.length === 0) {
    return NextResponse.json({
      total: 0,
      withdrawals: [],
      choreCompletions: [],
      donations: [],
    } satisfies PendingActionsResponse);
  }

  const childIds = (children as { id: string; name: string }[]).map((c) => c.id);
  const childMap = new Map<string, string>(
    (children as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  // ── 1. Pending withdrawals ─────────────────────────────────────────────────
  const { data: pendingTx } = await supabase
    .from('transactions')
    .select('id, child_id, amount_cents, description, requested_at, created_at')
    .eq('status', 'pending')
    .eq('type', 'withdrawal')
    .in('child_id', childIds)
    .order('created_at', { ascending: true });

  const withdrawals: PendingAction[] = (pendingTx ?? []).map(
    (tx: {
      id: string;
      child_id: string;
      amount_cents: number;
      description: string | null;
      requested_at: string | null;
      created_at: string;
    }) => ({
      id: tx.id,
      type: 'withdrawal' as const,
      childId: tx.child_id,
      childName: childMap.get(tx.child_id) ?? 'Unknown',
      label: tx.description ?? 'Withdrawal',
      amountCents: Math.abs(tx.amount_cents),
      submittedAt: tx.requested_at ?? tx.created_at,
    }),
  );

  // ── 2. Pending chore completions ───────────────────────────────────────────
  const { data: pendingCompletions } = await supabase
    .from('chore_completions')
    .select(`
      id,
      child_id,
      notes,
      submitted_at,
      chores (
        id,
        title,
        reward_cents,
        emoji
      )
    `)
    .eq('status', 'pending')
    .in('child_id', childIds)
    .order('submitted_at', { ascending: true });

  const choreCompletions: PendingAction[] = (pendingCompletions ?? []).map(
    (c: {
      id: string;
      child_id: string;
      notes: string | null;
      submitted_at: string;
      chores: {
        id: string;
        title: string;
        reward_cents: number;
        emoji: string | null;
      } | null;
    }) => ({
      id: c.id,
      type: 'chore_completion' as const,
      childId: c.child_id,
      childName: childMap.get(c.child_id) ?? 'Unknown',
      label: c.chores?.title ?? 'Chore',
      amountCents: c.chores?.reward_cents ?? 0,
      submittedAt: c.submitted_at,
      meta: {
        emoji: c.chores?.emoji ?? null,
        notes: c.notes ?? null,
        choreId: c.chores?.id ?? null,
      },
    }),
  );

  // ── 3. Pending donation pledges ────────────────────────────────────────────
  const { data: pendingDonations } = await supabase
    .from('donation_pledges')
    .select('id, child_id, cause_name, message, amount_cents, submitted_at')
    .eq('status', 'pending')
    .in('child_id', childIds)
    .order('submitted_at', { ascending: true });

  const donations: PendingAction[] = (pendingDonations ?? []).map(
    (d: {
      id: string;
      child_id: string;
      cause_name: string;
      message: string | null;
      amount_cents: number;
      submitted_at: string;
    }) => ({
      id: d.id,
      type: 'donation' as const,
      childId: d.child_id,
      childName: childMap.get(d.child_id) ?? 'Unknown',
      label: d.cause_name,
      amountCents: d.amount_cents,
      submittedAt: d.submitted_at,
      meta: { message: d.message ?? null },
    }),
  );

  const total = withdrawals.length + choreCompletions.length + donations.length;

  return NextResponse.json({
    total,
    withdrawals,
    choreCompletions,
    donations,
  } satisfies PendingActionsResponse);
}
