/**
 * GET /api/chores/completions?childId=xxx&status=pending
 *
 * Parent fetches completion submissions for a child.
 * Optional ?status filter (pending | approved | rejected)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getPendingCompletions } from '@/lib/chores';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');
  const statusFilter = searchParams.get('status');

  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  if (statusFilter && !['pending', 'approved', 'rejected'].includes(statusFilter)) {
    return NextResponse.json({ error: 'status must be pending, approved, or rejected' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify parent owns the child
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', session.user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  let query = supabase
    .from('chore_completions')
    .select(`
      *,
      chores (
        id,
        title,
        description,
        reward_cents,
        frequency,
        emoji
      )
    `)
    .eq('child_id', childId)
    .order('submitted_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: completions, error } = await query;

  if (error) {
    console.error('Error fetching chore completions:', error);
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
  }

  // If requesting pending completions (no filter or explicit pending), return oldest-first
  const sorted =
    !statusFilter || statusFilter === 'pending'
      ? getPendingCompletions(completions ?? [])
      : completions ?? [];

  return NextResponse.json({ completions: sorted });
}
