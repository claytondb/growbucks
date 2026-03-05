import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

type Frequency = 'weekly' | 'biweekly' | 'monthly';

function calculateNextDeposit(
  frequency: Frequency,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0); // Default to 9 AM

  if (frequency === 'monthly' && dayOfMonth !== undefined) {
    // Set to the specified day of month
    next.setDate(dayOfMonth);
    // If we've passed that day this month, move to next month
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  } else if (dayOfWeek !== undefined) {
    // Weekly or biweekly
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    next.setDate(now.getDate() + daysUntil);

    // For biweekly, if it's less than 7 days away, add another week
    if (frequency === 'biweekly' && daysUntil < 7) {
      next.setDate(next.getDate() + 7);
    }
  }

  return next;
}

// GET /api/recurring-deposits - Get all recurring deposits for the logged-in parent
export async function GET() {
  const session = await getServerSession(authOptions);

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

  const { data: deposits, error } = await supabase
    .from('recurring_deposits')
    .select(`
      *,
      children:child_id (id, name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching recurring deposits:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring deposits' }, { status: 500 });
  }

  return NextResponse.json(deposits || []);
}

// POST /api/recurring-deposits - Create a new recurring deposit
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { child_id, amount_cents, frequency, day_of_week, day_of_month, description } = body;

  // Validate required fields
  if (!child_id || !amount_cents || !frequency) {
    return NextResponse.json({ error: 'Missing required fields: child_id, amount_cents, frequency' }, { status: 400 });
  }

  // Validate amount
  if (typeof amount_cents !== 'number' || amount_cents < 1 || amount_cents > 1000000) {
    return NextResponse.json({ error: 'Amount must be between $0.01 and $10,000' }, { status: 400 });
  }

  // Validate frequency
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    return NextResponse.json({ error: 'Frequency must be weekly, biweekly, or monthly' }, { status: 400 });
  }

  // Validate day settings based on frequency
  if (frequency === 'monthly') {
    if (day_of_month === undefined || day_of_month < 1 || day_of_month > 28) {
      return NextResponse.json({ error: 'Monthly deposits require day_of_month (1-28)' }, { status: 400 });
    }
  } else {
    if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({ error: 'Weekly/biweekly deposits require day_of_week (0-6, Sunday-Saturday)' }, { status: 400 });
    }
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

  // Verify child belongs to this user
  const { data: child } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', child_id)
    .eq('user_id', user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Child not found or not yours' }, { status: 404 });
  }

  // Limit: max 5 recurring deposits per child
  const { count } = await supabase
    .from('recurring_deposits')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', child_id)
    .eq('is_active', true);

  if (count && count >= 5) {
    return NextResponse.json({ error: 'Maximum 5 active recurring deposits per child' }, { status: 400 });
  }

  // Calculate next deposit date
  const nextDepositAt = calculateNextDeposit(
    frequency as Frequency,
    day_of_week,
    day_of_month
  );

  // Create recurring deposit
  const { data: deposit, error } = await supabase
    .from('recurring_deposits')
    .insert({
      child_id,
      user_id: user.id,
      amount_cents,
      frequency,
      day_of_week: frequency !== 'monthly' ? day_of_week : null,
      day_of_month: frequency === 'monthly' ? day_of_month : null,
      description: description?.trim() || 'Allowance',
      is_active: true,
      next_deposit_at: nextDepositAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating recurring deposit:', error);
    return NextResponse.json({ error: 'Failed to create recurring deposit' }, { status: 500 });
  }

  return NextResponse.json(deposit, { status: 201 });
}

// PATCH /api/recurring-deposits - Update a recurring deposit
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, amount_cents, frequency, day_of_week, day_of_month, description, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing recurring deposit id' }, { status: 400 });
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
  const { data: existing } = await supabase
    .from('recurring_deposits')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Recurring deposit not found' }, { status: 404 });
  }

  // Build update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (amount_cents !== undefined) {
    if (typeof amount_cents !== 'number' || amount_cents < 1 || amount_cents > 1000000) {
      return NextResponse.json({ error: 'Amount must be between $0.01 and $10,000' }, { status: 400 });
    }
    updates.amount_cents = amount_cents;
  }

  if (frequency !== undefined) {
    if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'Frequency must be weekly, biweekly, or monthly' }, { status: 400 });
    }
    updates.frequency = frequency;
  }

  const newFrequency = updates.frequency || existing.frequency;

  if (newFrequency === 'monthly' && day_of_month !== undefined) {
    if (day_of_month < 1 || day_of_month > 28) {
      return NextResponse.json({ error: 'day_of_month must be 1-28' }, { status: 400 });
    }
    updates.day_of_month = day_of_month;
    updates.day_of_week = null;
  } else if (newFrequency !== 'monthly' && day_of_week !== undefined) {
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({ error: 'day_of_week must be 0-6' }, { status: 400 });
    }
    updates.day_of_week = day_of_week;
    updates.day_of_month = null;
  }

  if (description !== undefined) {
    updates.description = description?.trim() || 'Allowance';
  }

  if (is_active !== undefined) {
    updates.is_active = Boolean(is_active);
  }

  // Recalculate next deposit if schedule changed
  if (updates.frequency || updates.day_of_week !== undefined || updates.day_of_month !== undefined) {
    updates.next_deposit_at = calculateNextDeposit(
      newFrequency as Frequency,
      updates.day_of_week ?? existing.day_of_week,
      updates.day_of_month ?? existing.day_of_month
    ).toISOString();
  }

  // Apply update
  const { data: updated, error } = await supabase
    .from('recurring_deposits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recurring deposit:', error);
    return NextResponse.json({ error: 'Failed to update recurring deposit' }, { status: 500 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/recurring-deposits - Delete a recurring deposit
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing recurring deposit id' }, { status: 400 });
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

  // Verify ownership and delete
  const { error } = await supabase
    .from('recurring_deposits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting recurring deposit:', error);
    return NextResponse.json({ error: 'Failed to delete recurring deposit' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
