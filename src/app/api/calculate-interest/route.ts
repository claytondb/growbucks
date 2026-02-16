import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Child } from '@/types/database';

// POST /api/calculate-interest - Cron job to apply daily interest
// Should be called daily, handles catch-up for missed days
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get all children who need interest applied
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('interest_paused', false)
    .gt('balance_cents', 0)
    .lt('last_interest_at', today.toISOString());
  
  const children = data as Child[] | null;

  if (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (!children || children.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No accounts need interest' });
  }

  let processed = 0;
  let totalInterest = 0;
  const errors: string[] = [];

  for (const child of children) {
    try {
      const lastInterest = new Date(child.last_interest_at);
      lastInterest.setHours(0, 0, 0, 0);

      // Calculate days missed
      const daysMissed = Math.floor(
        (today.getTime() - lastInterest.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysMissed <= 0) continue;

      let currentBalance = child.balance_cents;
      const transactions: any[] = [];

      // Apply interest for each missed day
      for (let i = 0; i < daysMissed; i++) {
        const interestDate = new Date(lastInterest);
        interestDate.setDate(interestDate.getDate() + i + 1);

        const interestCents = Math.floor(currentBalance * child.interest_rate_daily);

        if (interestCents > 0) {
          currentBalance += interestCents;
          totalInterest += interestCents;

          transactions.push({
            child_id: child.id,
            type: 'interest',
            amount_cents: interestCents,
            balance_after_cents: currentBalance,
            description: `Daily interest (${(child.interest_rate_daily * 100).toFixed(1)}%)`,
            status: 'completed',
            processed_at: interestDate.toISOString(),
            created_at: interestDate.toISOString(),
          });
        }
      }

      // Batch insert transactions
      if (transactions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: txError } = await (supabase as any)
          .from('transactions')
          .insert(transactions);

        if (txError) {
          errors.push(`Failed to insert transactions for child ${child.id}: ${txError.message}`);
          continue;
        }
      }

      // Update child balance and last_interest_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('children')
        .update({
          balance_cents: currentBalance,
          last_interest_at: today.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', child.id);

      if (updateError) {
        errors.push(`Failed to update child ${child.id}: ${updateError.message}`);
        continue;
      }

      processed++;
    } catch (err) {
      errors.push(`Error processing child ${child.id}: ${err}`);
    }
  }

  return NextResponse.json({
    processed,
    total_children: children.length,
    total_interest_cents: totalInterest,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}

// GET for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'calculate-interest' });
}
