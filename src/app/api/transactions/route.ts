import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// POST /api/transactions - Create a deposit or withdrawal
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { child_id, type, amount_cents, description } = body;

  // Validate
  if (!child_id || !type || !amount_cents) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['deposit', 'withdrawal'].includes(type)) {
    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
  }

  if (typeof amount_cents !== 'number' || amount_cents < 1 || amount_cents > 1000000) {
    return NextResponse.json({ error: 'Amount must be between $0.01 and $10,000' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get the child and verify access
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('*')
    .eq('id', child_id)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Check authorization
  const isChildUser = session.user.isChild && session.user.id === child.id;
  let isParentUser = false;

  if (!session.user.isChild) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single();

    isParentUser = user?.id === child.user_id;
  }

  if (!isChildUser && !isParentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Handle deposit (parent only)
  if (type === 'deposit') {
    if (!isParentUser) {
      return NextResponse.json({ error: 'Only parents can deposit' }, { status: 403 });
    }

    const newBalance = child.balance_cents + amount_cents;

    // Create transaction and update balance in a transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        child_id,
        type: 'deposit',
        amount_cents,
        balance_after_cents: newBalance,
        description: description || 'Deposit',
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Update child balance
    await supabase
      .from('children')
      .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
      .eq('id', child_id);

    return NextResponse.json(transaction, { status: 201 });
  }

  // Handle withdrawal
  if (type === 'withdrawal') {
    if (amount_cents > child.balance_cents) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Parent: process immediately
    // Child: create pending request
    if (isParentUser) {
      const newBalance = child.balance_cents - amount_cents;

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          child_id,
          type: 'withdrawal',
          amount_cents: -amount_cents,
          balance_after_cents: newBalance,
          description: description || 'Withdrawal',
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        console.error('Error creating transaction:', txError);
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
      }

      await supabase
        .from('children')
        .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
        .eq('id', child_id);

      return NextResponse.json(transaction, { status: 201 });
    } else {
      // Child requesting withdrawal - create pending transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          child_id,
          type: 'withdrawal',
          amount_cents: -amount_cents,
          balance_after_cents: child.balance_cents - amount_cents, // Projected
          description: description || 'Withdrawal request',
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        console.error('Error creating transaction:', txError);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
      }

      return NextResponse.json(transaction, { status: 201 });
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// PATCH /api/transactions - Approve/reject withdrawal request
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { transaction_id, approved, reason } = body;

  if (!transaction_id || typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*, children!inner(user_id, balance_cents)')
    .eq('id', transaction_id)
    .eq('status', 'pending')
    .single();

  if (txError || !transaction) {
    return NextResponse.json({ error: 'Transaction not found or not pending' }, { status: 404 });
  }

  // Verify parent owns this child
  if ((transaction.children as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (approved) {
    const childBalance = (transaction.children as any).balance_cents;
    const withdrawAmount = Math.abs(transaction.amount_cents);

    if (withdrawAmount > childBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const newBalance = childBalance - withdrawAmount;

    // Approve and process
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        balance_after_cents: newBalance,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      })
      .eq('id', transaction_id);

    await supabase
      .from('children')
      .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
      .eq('id', transaction.child_id);

    return NextResponse.json({ success: true, status: 'approved' });
  } else {
    // Reject
    await supabase
      .from('transactions')
      .update({
        status: 'rejected',
        description: reason ? `${transaction.description} (Rejected: ${reason})` : transaction.description,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      })
      .eq('id', transaction_id);

    return NextResponse.json({ success: true, status: 'rejected' });
  }
}
