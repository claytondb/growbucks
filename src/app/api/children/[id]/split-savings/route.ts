import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isValidSplitPercent, calculateSavingsRelease, savingsReleaseDescription } from '@/lib/split-savings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * PATCH /api/children/[id]/split-savings
 * Update the auto-split percentage for a child.
 * Body: { split_save_percent: number }
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: childId } = await context.params;
  const body = await request.json();
  const { split_save_percent } = body;

  if (typeof split_save_percent !== 'number' || !isValidSplitPercent(split_save_percent)) {
    return NextResponse.json(
      { error: 'split_save_percent must be an integer between 0 and 90' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Verify ownership
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: child } = await supabase
    .from('children')
    .select('id, user_id')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Upsert child_settings with new split_save_percent
  const { data: updated, error } = await supabase
    .from('child_settings')
    .upsert(
      { child_id: childId, split_save_percent, updated_at: new Date().toISOString() },
      { onConflict: 'child_id', returning: 'representation' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating split_save_percent:', error);
    return NextResponse.json({ error: 'Failed to update split settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true, split_save_percent: updated.split_save_percent });
}

/**
 * POST /api/children/[id]/split-savings
 * Release a portion of savings back to the spending bucket.
 * Body: { release_cents: number }
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: childId } = await context.params;
  const body = await request.json();
  const { release_cents } = body;

  if (typeof release_cents !== 'number' || release_cents <= 0 || !Number.isInteger(release_cents)) {
    return NextResponse.json({ error: 'release_cents must be a positive integer' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify ownership
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: child } = await supabase
    .from('children')
    .select('id, user_id, balance_cents, save_balance_cents')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Use the utility to validate and compute new state
  const updated = calculateSavingsRelease(
    { balance_cents: child.balance_cents, save_balance_cents: child.save_balance_cents ?? 0 },
    release_cents
  );

  if (!updated) {
    return NextResponse.json(
      { error: `Cannot release ${release_cents} cents — only ${child.save_balance_cents ?? 0} cents in savings` },
      { status: 400 }
    );
  }

  // Update child.save_balance_cents
  const { error: updateError } = await supabase
    .from('children')
    .update({ save_balance_cents: updated.save_balance_cents, updated_at: new Date().toISOString() })
    .eq('id', childId);

  if (updateError) {
    console.error('Error releasing savings:', updateError);
    return NextResponse.json({ error: 'Failed to release savings' }, { status: 500 });
  }

  // Record a savings_release transaction for audit trail
  await supabase.from('transactions').insert({
    child_id: childId,
    type: 'savings_release',
    amount_cents: release_cents,
    balance_after_cents: updated.balance_cents, // total unchanged
    description: savingsReleaseDescription(),
    status: 'completed',
    processed_at: new Date().toISOString(),
    processed_by: user.id,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    released_cents: release_cents,
    new_save_balance_cents: updated.save_balance_cents,
    balance_cents: updated.balance_cents,
  });
}

/**
 * GET /api/children/[id]/split-savings
 * Get current split settings and balance breakdown for a child.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: childId } = await context.params;
  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: child } = await supabase
    .from('children')
    .select('id, user_id, balance_cents, save_balance_cents')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const { data: settings } = await supabase
    .from('child_settings')
    .select('split_save_percent')
    .eq('child_id', childId)
    .single();

  const saveBalanceCents = child.save_balance_cents ?? 0;
  const spendBalanceCents = Math.max(0, child.balance_cents - saveBalanceCents);

  return NextResponse.json({
    split_save_percent: settings?.split_save_percent ?? 0,
    balance_cents: child.balance_cents,
    save_balance_cents: saveBalanceCents,
    spend_balance_cents: spendBalanceCents,
  });
}
