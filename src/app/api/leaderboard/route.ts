import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { buildAllLeaderboards, LeaderboardEntry } from '@/lib/leaderboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * GET /api/leaderboard
 * Returns all meaningful sibling leaderboards for the logged-in parent's family.
 * Requires 2+ children to be useful (returns empty array otherwise).
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Resolve parent user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch all children
  const { data: children, error } = await supabase
    .from('children')
    .select('id, name, avatar_url, balance_cents, save_balance_cents')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching children for leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (!children || children.length < 2) {
    // No leaderboard needed for 0 or 1 children
    return NextResponse.json({ leaderboards: [] });
  }

  // Date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // For each child, fetch interest earned this month and balance at start of month
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: LeaderboardEntry[] = await Promise.all(children.map(async (child: any) => {
    // Interest earned this month
    const { data: interestTx } = await supabase
      .from('transactions')
      .select('amount_cents')
      .eq('child_id', child.id)
      .eq('type', 'interest')
      .gte('created_at', startOfMonth.toISOString());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interestThisMonthCents = interestTx?.reduce((sum: number, tx: any) => sum + tx.amount_cents, 0) ?? 0;

    // Balance at start of month: current balance minus net deposits/withdrawals this month
    // Approximate: sum all non-interest transactions this month and subtract from current
    const { data: netTx } = await supabase
      .from('transactions')
      .select('amount_cents, type')
      .eq('child_id', child.id)
      .neq('type', 'interest')
      .gte('created_at', startOfMonth.toISOString());

    let netNonInterestThisMonth = 0;
    if (netTx) {
      for (const tx of netTx) {
        const amt: number = tx.amount_cents;
        if (['deposit', 'chore_earning', 'savings_release', 'recurring_deposit'].includes(tx.type)) {
          netNonInterestThisMonth += amt;
        } else if (['withdrawal', 'savings_deposit'].includes(tx.type)) {
          netNonInterestThisMonth -= amt;
        }
      }
    }

    const balanceStartOfMonthCents = Math.max(
      0,
      child.balance_cents - interestThisMonthCents - netNonInterestThisMonth
    );

    return {
      childId: child.id,
      name: child.name,
      avatarUrl: child.avatar_url ?? null,
      balanceCents: child.balance_cents ?? 0,
      interestThisMonthCents,
      saveBalanceCents: child.save_balance_cents ?? 0,
      balanceStartOfMonthCents,
    };
  }));

  const leaderboards = buildAllLeaderboards(entries);

  return NextResponse.json({ leaderboards });
}
