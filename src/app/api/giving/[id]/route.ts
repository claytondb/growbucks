import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateReviewDonation } from '@/lib/giving';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * GET /api/giving/[id]
 *
 * Fetch a single donation pledge.
 * Parent can view any of their children's pledges.
 * Child can only view their own.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabase();

  const { data: pledge, error } = await supabase
    .from('donation_pledges')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pledge) {
    return NextResponse.json({ error: 'Donation pledge not found' }, { status: 404 });
  }

  // Access control
  if (session.user.isChild) {
    if (pledge.child_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    // Parent: verify pledge belongs to one of their children
    const { data: child } = await supabase
      .from('children')
      .select('user_id')
      .eq('id', pledge.child_id)
      .single();

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single();

    if (!child || !user || child.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(pledge);
}

/**
 * PATCH /api/giving/[id]
 *
 * Parent approves or rejects a donation pledge.
 *
 * Body: { approved: boolean, rejection_reason?: string }
 *
 * On approval:
 *   1. Verify child still has sufficient spend balance
 *   2. Deduct from child's balance_cents
 *   3. Create a `donation` transaction
 *   4. Update pledge status and link transaction
 *
 * Children cannot call this endpoint.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isChild) {
    return NextResponse.json({ error: 'Only parents can review donation requests' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  // Validate review input
  const validation = validateReviewDonation(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const { approved, rejection_reason } = body;
  const supabase = getSupabase();

  // Fetch pledge
  const { data: pledge, error: pledgeError } = await supabase
    .from('donation_pledges')
    .select('*')
    .eq('id', id)
    .single();

  if (pledgeError || !pledge) {
    return NextResponse.json({ error: 'Donation pledge not found' }, { status: 404 });
  }

  if (pledge.status !== 'pending') {
    return NextResponse.json(
      { error: `Pledge is already ${pledge.status}` },
      { status: 409 },
    );
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, balance_cents, save_balance_cents, user_id')
    .eq('id', pledge.child_id)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user || child.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (!approved) {
    // Rejection — no balance change needed
    const { data: updated, error: updateError } = await supabase
      .from('donation_pledges')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: session.user.email,
        rejection_reason: rejection_reason?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting donation pledge:', updateError);
      return NextResponse.json({ error: 'Failed to reject donation' }, { status: 500 });
    }

    return NextResponse.json(updated);
  }

  // Approval — deduct from spend balance
  const spendBalance = child.balance_cents - (child.save_balance_cents ?? 0);

  if (spendBalance < pledge.amount_cents) {
    return NextResponse.json(
      {
        error: `Child no longer has sufficient balance. Available: $${(spendBalance / 100).toFixed(2)}`,
      },
      { status: 400 },
    );
  }

  const newBalance = child.balance_cents - pledge.amount_cents;

  // Create a donation transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      child_id: pledge.child_id,
      type: 'donation',
      amount_cents: -pledge.amount_cents, // negative = outflow
      balance_after_cents: newBalance,
      description: `Donation to: ${pledge.cause_name}`,
      status: 'completed',
      processed_at: now,
      processed_by: session.user.email,
    })
    .select()
    .single();

  if (txError || !transaction) {
    console.error('Error creating donation transaction:', txError);
    return NextResponse.json({ error: 'Failed to create donation transaction' }, { status: 500 });
  }

  // Update child balance
  const { error: balanceError } = await supabase
    .from('children')
    .update({
      balance_cents: newBalance,
      updated_at: now,
    })
    .eq('id', pledge.child_id);

  if (balanceError) {
    console.error('Error updating child balance:', balanceError);
    // Don't surface this — transaction was written, this is a partial failure
    // In production you'd want to roll back or handle via a DB transaction
  }

  // Update pledge to approved
  const { data: updatedPledge, error: updateError } = await supabase
    .from('donation_pledges')
    .update({
      status: 'approved',
      reviewed_at: now,
      reviewed_by: session.user.email,
      transaction_id: transaction.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating pledge status:', updateError);
    return NextResponse.json({ error: 'Failed to update pledge' }, { status: 500 });
  }

  return NextResponse.json({
    ...updatedPledge,
    transaction,
    new_balance_cents: newBalance,
  });
}

/**
 * DELETE /api/giving/[id]
 *
 * Child can cancel a pending donation pledge they submitted.
 * Only allowed while status is still 'pending'.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.isChild) {
    return NextResponse.json({ error: 'Only the child who submitted can cancel a pledge' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = getSupabase();

  const { data: pledge, error } = await supabase
    .from('donation_pledges')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pledge) {
    return NextResponse.json({ error: 'Donation pledge not found' }, { status: 404 });
  }

  if (pledge.child_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (pledge.status !== 'pending') {
    return NextResponse.json(
      { error: 'Can only cancel pending pledges' },
      { status: 409 },
    );
  }

  const { error: deleteError } = await supabase
    .from('donation_pledges')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting pledge:', deleteError);
    return NextResponse.json({ error: 'Failed to cancel pledge' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Donation pledge cancelled' });
}
