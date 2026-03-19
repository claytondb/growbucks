import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  computeFamilyMonthlySummary,
  computeChildMonthlySummaries,
} from '@/lib/monthly-summary';
import type { Transaction } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * GET /api/monthly-summary
 *
 * Returns a month-by-month performance summary for the authenticated parent's
 * children for a given calendar year. Designed for the parent dashboard and as
 * the data foundation for future email digest notifications.
 *
 * Query params:
 *   year=<YYYY>         — defaults to current year
 *   child_id=<uuid>     — limit to one child (returns ChildMonthlySummaries)
 *
 * Response when child_id is omitted:
 *   FamilyMonthlySummary — all children + family totals
 *
 * Response when child_id is provided:
 *   ChildMonthlySummaries — single child 12-month breakdown
 *
 * Auth: parent session only. Children receive 403.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isChild) {
    return NextResponse.json(
      { error: 'Monthly summaries are only available to parents' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const filterChildId = searchParams.get('child_id') ?? null;

  const currentYear = new Date().getUTCFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  if (isNaN(year) || year < 2020 || year > currentYear + 1) {
    return NextResponse.json(
      { error: 'Invalid year. Must be between 2020 and next year.' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Resolve user from email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!.toLowerCase())
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch children
  const childQuery = supabase
    .from('children')
    .select('id, name, balance_cents')
    .eq('user_id', user.id);

  const { data: allChildren, error: childrenError } = filterChildId
    ? await childQuery.eq('id', filterChildId)
    : await childQuery;

  if (childrenError) {
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (!allChildren || allChildren.length === 0) {
    if (filterChildId) {
      return NextResponse.json({ error: 'Child not found or access denied' }, { status: 404 });
    }
    // Return empty family summary
    return NextResponse.json({
      year,
      generatedAt: new Date().toISOString(),
      children: [],
      familyTotals: { interestCents: 0, totalDepositCents: 0, withdrawalCents: 0, donationCents: 0 },
    });
  }

  const children = allChildren as Array<{ id: string; name: string; balance_cents: number }>;
  const childIds = children.map((c) => c.id);

  // Fetch all transactions for these children for the requested year
  // Include the prior year's last transaction per child to infer starting balance
  const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('id, child_id, type, amount_cents, balance_after_cents, description, status, requested_at, processed_at, processed_by, created_at')
    .in('child_id', childIds)
    .gte('created_at', yearStart)
    .lt('created_at', yearEnd)
    .order('created_at', { ascending: true });

  if (txError) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  // Determine starting balance per child: balance_after of the most recent
  // transaction before yearStart, or 0 if none.
  const startingBalanceByChild = new Map<string, number>();

  // Fetch the last transaction before this year for each child (in one query)
  const { data: priorTxData } = await supabase
    .from('transactions')
    .select('child_id, balance_after_cents, created_at')
    .in('child_id', childIds)
    .lt('created_at', yearStart)
    .order('created_at', { ascending: false });

  if (priorTxData) {
    // We only want the most recent per child
    const seen = new Set<string>();
    for (const row of priorTxData as Array<{ child_id: string; balance_after_cents: number; created_at: string }>) {
      if (!seen.has(row.child_id)) {
        startingBalanceByChild.set(row.child_id, row.balance_after_cents);
        seen.add(row.child_id);
      }
    }
  }

  // Group transactions by child
  const transactions = (txData ?? []) as Transaction[];
  const txsByChild = new Map<string, Transaction[]>();
  for (const child of children) {
    txsByChild.set(child.id, []);
  }
  for (const tx of transactions) {
    txsByChild.get(tx.child_id)?.push(tx);
  }

  // Compute summaries
  if (filterChildId) {
    const child = children[0];
    const summary = computeChildMonthlySummaries(
      child.id,
      child.name,
      year,
      txsByChild.get(child.id) ?? [],
      startingBalanceByChild.get(child.id) ?? 0,
    );
    return NextResponse.json(summary);
  }

  const family = computeFamilyMonthlySummary(
    year,
    children,
    txsByChild,
    startingBalanceByChild,
  );

  return NextResponse.json(family);
}
