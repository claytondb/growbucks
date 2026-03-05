import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

type Frequency = 'weekly' | 'biweekly' | 'monthly';

function calculateNextDeposit(
  frequency: Frequency,
  currentDate: Date,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const next = new Date(currentDate);
  next.setHours(9, 0, 0, 0); // 9 AM

  if (frequency === 'monthly' && dayOfMonth) {
    // Move to next month, same day
    next.setMonth(next.getMonth() + 1);
    next.setDate(dayOfMonth);
  } else if (frequency === 'biweekly') {
    // Add 14 days
    next.setDate(next.getDate() + 14);
  } else {
    // Weekly - add 7 days
    next.setDate(next.getDate() + 7);
  }

  return next;
}

// POST /api/recurring-deposits/process - Process due recurring deposits
// Called by cron job (Vercel cron or external scheduler)
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date();

  // Find all active recurring deposits that are due
  const { data: dueDeposits, error: fetchError } = await supabase
    .from('recurring_deposits')
    .select(`
      *,
      children:child_id (id, name, balance_cents)
    `)
    .eq('is_active', true)
    .lte('next_deposit_at', now.toISOString())
    .order('next_deposit_at', { ascending: true })
    .limit(100); // Process max 100 at a time

  if (fetchError) {
    console.error('Error fetching due deposits:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch due deposits' }, { status: 500 });
  }

  if (!dueDeposits || dueDeposits.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No deposits due' });
  }

  let processed = 0;
  let failed = 0;
  const results: { id: string; child: string; amount: number; success: boolean }[] = [];

  for (const deposit of dueDeposits) {
    try {
      const child = deposit.children as { id: string; name: string; balance_cents: number };
      const newBalance = child.balance_cents + deposit.amount_cents;

      // Create the deposit transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          child_id: deposit.child_id,
          type: 'deposit',
          amount_cents: deposit.amount_cents,
          balance_after_cents: newBalance,
          description: deposit.description || 'Recurring deposit',
          status: 'completed',
          processed_at: now.toISOString(),
        });

      if (txError) {
        console.error(`Error creating transaction for ${deposit.id}:`, txError);
        failed++;
        results.push({
          id: deposit.id,
          child: child.name,
          amount: deposit.amount_cents,
          success: false,
        });
        continue;
      }

      // Update child balance
      const { error: balanceError } = await supabase
        .from('children')
        .update({
          balance_cents: newBalance,
          updated_at: now.toISOString(),
        })
        .eq('id', deposit.child_id);

      if (balanceError) {
        console.error(`Error updating balance for ${deposit.child_id}:`, balanceError);
        // Transaction created but balance not updated - log but continue
      }

      // Calculate next deposit date
      const nextDepositAt = calculateNextDeposit(
        deposit.frequency as Frequency,
        now,
        deposit.day_of_week,
        deposit.day_of_month
      );

      // Update recurring deposit schedule
      const { error: updateError } = await supabase
        .from('recurring_deposits')
        .update({
          next_deposit_at: nextDepositAt.toISOString(),
          last_deposit_at: now.toISOString(),
        })
        .eq('id', deposit.id);

      if (updateError) {
        console.error(`Error updating schedule for ${deposit.id}:`, updateError);
      }

      processed++;
      results.push({
        id: deposit.id,
        child: child.name,
        amount: deposit.amount_cents,
        success: true,
      });

      // Create notification for the deposit
      await supabase.from('notifications').insert({
        child_id: deposit.child_id,
        type: 'deposit',
        title: 'Allowance deposited! 💰',
        message: `$${(deposit.amount_cents / 100).toFixed(2)} has been added to your account.`,
      });
    } catch (err) {
      console.error(`Unexpected error processing ${deposit.id}:`, err);
      failed++;
      results.push({
        id: deposit.id,
        child: deposit.children?.name || 'Unknown',
        amount: deposit.amount_cents,
        success: false,
      });
    }
  }

  return NextResponse.json({
    processed,
    failed,
    total: dueDeposits.length,
    results,
    message: `Processed ${processed} recurring deposits, ${failed} failed`,
  });
}

// GET - Health check / status
export async function GET() {
  const supabase = getSupabase();
  const now = new Date();

  // Count pending deposits
  const { count: dueCount } = await supabase
    .from('recurring_deposits')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('next_deposit_at', now.toISOString());

  // Count total active
  const { count: activeCount } = await supabase
    .from('recurring_deposits')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  return NextResponse.json({
    status: 'ok',
    due: dueCount || 0,
    active: activeCount || 0,
    timestamp: now.toISOString(),
  });
}
