/**
 * PATCH /api/chores/completions/[id]
 *
 * Parent approves or rejects a chore completion.
 *
 * Body: { action: 'approve' | 'reject', rejection_reason?: string }
 *
 * On approval:
 * - Creates a deposit transaction for the child
 * - Updates child's balance
 * - Sets completion status to 'approved' and links transaction_id
 * - If chore is one_time, archives the chore
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: completionId } = await params;

  let body: { action?: string; rejection_reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, rejection_reason } = body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  if (action === 'reject' && rejection_reason && rejection_reason.length > 255) {
    return NextResponse.json({ error: 'Rejection reason must be 255 characters or fewer' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch the completion with its chore and child
  const { data: completion, error: fetchError } = await supabase
    .from('chore_completions')
    .select(`
      *,
      chores (
        id,
        title,
        reward_cents,
        frequency,
        child_id,
        children!inner (
          id,
          user_id,
          balance_cents
        )
      )
    `)
    .eq('id', completionId)
    .single();

  if (fetchError || !completion) {
    return NextResponse.json({ error: 'Completion not found' }, { status: 404 });
  }

  // Verify parent owns this child
  if (completion.chores?.children?.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Must be pending
  if (completion.status !== 'pending') {
    return NextResponse.json(
      { error: `Completion is already ${completion.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  if (action === 'reject') {
    const { error: updateError } = await supabase
      .from('chore_completions')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: session.user.id,
        rejection_reason: rejection_reason ?? null,
      })
      .eq('id', completionId);

    if (updateError) {
      console.error('Error rejecting completion:', updateError);
      return NextResponse.json({ error: 'Failed to reject completion' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'rejected' });
  }

  // ── Approve flow ──────────────────────────────────────────────────────────

  const chore = completion.chores;
  const child = chore.children;
  const rewardCents: number = chore.reward_cents;
  const newBalance: number = child.balance_cents + rewardCents;

  // 1. Create a deposit transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      child_id: child.id,
      type: 'deposit',
      amount_cents: rewardCents,
      balance_after_cents: newBalance,
      description: `Chore completed: ${chore.title}`,
      status: 'completed',
      processed_at: now,
      processed_by: session.user.id,
    })
    .select()
    .single();

  if (txError) {
    console.error('Error creating transaction:', txError);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }

  // 2. Update child's balance
  const { error: balanceError } = await supabase
    .from('children')
    .update({ balance_cents: newBalance })
    .eq('id', child.id);

  if (balanceError) {
    console.error('Error updating balance:', balanceError);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }

  // 3. Mark completion as approved
  const { error: completionError } = await supabase
    .from('chore_completions')
    .update({
      status: 'approved',
      reviewed_at: now,
      reviewed_by: session.user.id,
      transaction_id: transaction.id,
    })
    .eq('id', completionId);

  if (completionError) {
    console.error('Error approving completion:', completionError);
    return NextResponse.json({ error: 'Failed to approve completion' }, { status: 500 });
  }

  // 4. If one_time chore, archive it so it won't show up again
  if (chore.frequency === 'one_time') {
    await supabase
      .from('chores')
      .update({ status: 'archived' })
      .eq('id', chore.id);
  }

  return NextResponse.json({
    success: true,
    status: 'approved',
    reward_cents: rewardCents,
    new_balance_cents: newBalance,
    transaction_id: transaction.id,
  });
}
