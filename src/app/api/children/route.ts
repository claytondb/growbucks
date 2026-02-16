import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// GET /api/children - Get all children for the logged-in parent
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Don't allow child users to access this
  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();

  // Get user ID from email
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: children, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  // Calculate interest stats for each child
  const childrenWithStats = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (children || []).map(async (child: any) => {
      // Get interest earned this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: interestTx } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('child_id', child.id)
        .eq('type', 'interest')
        .gte('created_at', startOfMonth.toISOString());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interestThisMonth = interestTx?.reduce((sum: number, tx: any) => sum + tx.amount_cents, 0) || 0;

      return {
        ...child,
        interest_earned_this_month: interestThisMonth,
      };
    })
  );

  return NextResponse.json(childrenWithStats);
}

// POST /api/children - Create a new child
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, pin, interest_rate_daily, avatar_url } = body;

  // Validate inputs
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
  }

  const rate = interest_rate_daily ?? 0.01;
  if (typeof rate !== 'number' || rate < 0.001 || rate > 0.05) {
    return NextResponse.json({ error: 'Interest rate must be between 0.1% and 5%' }, { status: 400 });
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

  // Check child limit (max 10)
  const { count } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (count && count >= 10) {
    return NextResponse.json({ error: 'Maximum 10 children allowed' }, { status: 400 });
  }

  // Hash PIN
  const pinHash = await bcrypt.hash(pin, 10);

  // Create child
  const { data: child, error } = await supabase
    .from('children')
    .insert({
      user_id: user.id,
      name: name.trim(),
      pin_hash: pinHash,
      avatar_url: avatar_url || null,
      balance_cents: 0,
      interest_rate_daily: rate,
      interest_paused: false,
      last_interest_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating child:', error);
    return NextResponse.json({ error: 'Failed to create child' }, { status: 500 });
  }

  return NextResponse.json(child, { status: 201 });
}
