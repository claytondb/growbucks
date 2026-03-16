import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  validateCreateDonation,
  hasSufficientBalance,
  sortDonations,
  type DonationPledge,
} from '@/lib/giving';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * GET /api/giving
 *
 * Parents: returns all donation pledges for their children.
 * Children: returns their own donation pledges.
 *
 * Query params:
 *   child_id=<uuid>  — filter to a single child (parent only)
 *   status=pending|approved|rejected  — filter by status
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filterChildId = searchParams.get('child_id');
  const filterStatus = searchParams.get('status');

  const supabase = getSupabase();

  if (session.user.isChild) {
    // Child can only see their own pledges
    const childId = session.user.id;

    let query = supabase
      .from('donation_pledges')
      .select('*')
      .eq('child_id', childId)
      .order('submitted_at', { ascending: false });

    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching donation pledges:', error);
      return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
    }

    return NextResponse.json(sortDonations(data || []));
  }

  // Parent: fetch children, then their pledges
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const childrenQuery = supabase
    .from('children')
    .select('id, name')
    .eq('user_id', user.id);

  const { data: children, error: childrenError } = await childrenQuery;

  if (childrenError || !children) {
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (children.length === 0) {
    return NextResponse.json([]);
  }

  // Build child id list (respecting optional filter)
  const childIds = filterChildId
    ? children.filter((c: { id: string }) => c.id === filterChildId).map((c: { id: string }) => c.id)
    : children.map((c: { id: string }) => c.id);

  if (childIds.length === 0) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const childMap = new Map<string, string>(
    children.map((c: { id: string; name: string }) => [c.id, c.name]),
  );

  let query = supabase
    .from('donation_pledges')
    .select('*')
    .in('child_id', childIds)
    .order('submitted_at', { ascending: false });

  if (filterStatus) {
    query = query.eq('status', filterStatus);
  }

  const { data: pledges, error } = await query;

  if (error) {
    console.error('Error fetching donation pledges:', error);
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
  }

  // Enrich with child names
  const enriched = (pledges || []).map((p: DonationPledge) => ({
    ...p,
    child_name: childMap.get(p.child_id) ?? 'Unknown',
  }));

  return NextResponse.json(sortDonations(enriched));
}

/**
 * POST /api/giving
 *
 * Child submits a charitable donation pledge for parent review.
 *
 * Body: { cause_name, message?, amount_cents }
 * The child_id is derived from the session.
 *
 * Parents CANNOT submit pledges on behalf of children via this route
 * (they can use the deposit flow for direct donations).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.isChild) {
    return NextResponse.json(
      { error: 'Only children can submit donation pledges' },
      { status: 403 },
    );
  }

  const childId = session.user.id;
  const body = await request.json();
  const { cause_name, message, amount_cents } = body;

  // Validate input
  const validation = validateCreateDonation({
    child_id: childId,
    cause_name,
    message,
    amount_cents,
  });

  if (!validation.valid) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const supabase = getSupabase();

  // Check the child's spend balance (balance_cents - save_balance_cents)
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, balance_cents, save_balance_cents')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const spendBalance = child.balance_cents - (child.save_balance_cents ?? 0);

  if (!hasSufficientBalance(spendBalance, amount_cents)) {
    return NextResponse.json(
      { error: `Insufficient balance. Available to donate: $${(spendBalance / 100).toFixed(2)}` },
      { status: 400 },
    );
  }

  // Check for too many pending pledges (prevent spam — max 3 pending at once)
  const { count: pendingCount } = await supabase
    .from('donation_pledges')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('status', 'pending');

  if ((pendingCount ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'You already have 3 pending donation requests. Wait for a parent to review them first.' },
      { status: 400 },
    );
  }

  // Create the pledge
  const { data: pledge, error: insertError } = await supabase
    .from('donation_pledges')
    .insert({
      child_id: childId,
      cause_name: cause_name.trim(),
      message: message?.trim() || null,
      amount_cents,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !pledge) {
    console.error('Error creating donation pledge:', insertError);
    return NextResponse.json({ error: 'Failed to create donation request' }, { status: 500 });
  }

  return NextResponse.json(pledge, { status: 201 });
}
