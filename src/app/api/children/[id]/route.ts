import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calculateConsecutiveStreak } from '@/lib/streaks';

// Type definitions for database entities
interface DbChild {
  id: string;
  user_id: string;
  name: string;
  pin_hash: string;
  balance_cents: number;
  interest_rate_daily: number;
  interest_paused: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DbUser {
  id: string;
  email: string;
}

interface DbTransaction {
  id: string;
  child_id: string;
  type: string;
  amount_cents: number;
  description: string | null;
  created_at: string;
}

interface ChildUpdatePayload {
  name?: string;
  pin_hash?: string;
  interest_rate_daily?: number;
  interest_paused?: boolean;
  avatar_url?: string | null;
  updated_at?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/children/[id] - Get a specific child
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const { id } = await context.params;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get the child
  const { data: child, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .single() as { data: DbChild | null; error: Error | null };

  if (error || !child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Verify ownership (either parent or child themselves)
  if (session.user.isChild) {
    if (session.user.id !== child.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single() as { data: DbUser | null };

    if (!user || child.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Get transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('child_id', id)
    .order('created_at', { ascending: false })
    .limit(100) as { data: DbTransaction[] | null };

  // Calculate interest stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const interestThisMonth = transactions
    ?.filter((tx) => tx.type === 'interest' && new Date(tx.created_at) >= startOfMonth)
    .reduce((sum, tx) => sum + tx.amount_cents, 0) || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const interestToday = transactions
    ?.filter((tx) => tx.type === 'interest' && new Date(tx.created_at) >= today)
    .reduce((sum, tx) => sum + tx.amount_cents, 0) || 0;

  // --- Achievement stats ---

  // Goals: count created and achieved
  const { data: goals } = await supabase
    .from('savings_goals')
    .select('id, achieved_at')
    .eq('child_id', id) as { data: { id: string; achieved_at: string | null }[] | null };

  const goalsCreated = goals?.length ?? 0;
  const goalsAchieved = goals?.filter((g) => g.achieved_at != null).length ?? 0;

  // Days since last withdrawal (from child column or transaction history)
  const lastWithdrawalAt: string | null = (child as DbChild & { last_withdrawal_at?: string | null }).last_withdrawal_at ?? null;
  const lastWithdrawalTx = transactions?.find((tx) => tx.type === 'withdrawal');
  const lastWithdrawDate = lastWithdrawalAt
    ? new Date(lastWithdrawalAt)
    : lastWithdrawalTx
    ? new Date(lastWithdrawalTx.created_at)
    : null;

  const daysSinceLastWithdraw = lastWithdrawDate
    ? Math.floor((Date.now() - lastWithdrawDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999; // Never withdrawn

  // Login streak from child_activity table
  const { data: activityRows } = await supabase
    .from('child_activity')
    .select('activity_date')
    .eq('child_id', id)
    .order('activity_date', { ascending: false })
    .limit(60) as { data: { activity_date: string }[] | null };

  const activityDates = activityRows?.map((r) => new Date(r.activity_date + 'T00:00:00Z')) ?? [];
  const loginStreak = calculateConsecutiveStreak(activityDates);

  return NextResponse.json({
    ...child,
    transactions: transactions || [],
    interest_earned_today: interestToday,
    interest_earned_this_month: interestThisMonth,
    // Achievement stats
    total_interest_earned: (child as DbChild & { total_interest_earned_cents?: number }).total_interest_earned_cents ?? 0,
    goals_created: goalsCreated,
    goals_achieved: goalsAchieved,
    days_since_last_withdraw: daysSinceLastWithdraw,
    login_streak: loginStreak,
    days_active: loginStreak, // backward-compat alias used by calculateAchievements
  });
}

// PATCH /api/children/[id] - Update a child
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const { id } = await context.params;
  
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, pin, interest_rate_daily, interest_paused, avatar_url } = body;

  const supabase = getSupabase();

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Verify ownership
  const { data: child } = await supabase
    .from('children')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!child || child.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Build update object
  const updates: ChildUpdatePayload = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 50) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    updates.name = name.trim();
  }

  if (pin !== undefined) {
    if (typeof pin !== 'string' || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
    }
    updates.pin_hash = await bcrypt.hash(pin, 10);
  }

  if (interest_rate_daily !== undefined) {
    if (typeof interest_rate_daily !== 'number' || interest_rate_daily < 0.001 || interest_rate_daily > 0.05) {
      return NextResponse.json({ error: 'Interest rate must be between 0.1% and 5%' }, { status: 400 });
    }
    updates.interest_rate_daily = interest_rate_daily;
  }

  if (interest_paused !== undefined) {
    updates.interest_paused = Boolean(interest_paused);
  }

  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data: updatedChild, error } = await supabase
    .from('children')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating child:', error);
    return NextResponse.json({ error: 'Failed to update child' }, { status: 500 });
  }

  return NextResponse.json(updatedChild);
}

// DELETE /api/children/[id] - Delete a child (soft delete)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const { id } = await context.params;
  
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Verify ownership
  const { data: child } = await supabase
    .from('children')
    .select('user_id, balance_cents')
    .eq('id', id)
    .single();

  if (!child || child.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Warn if balance > 0
  if (child.balance_cents > 0) {
    const url = new URL(request.url);
    if (url.searchParams.get('confirm') !== 'true') {
      return NextResponse.json({
        error: 'This account has a balance. Add ?confirm=true to proceed.',
        balance_cents: child.balance_cents,
      }, { status: 400 });
    }
  }

  // Delete child (could be soft delete in production)
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting child:', error);
    return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
