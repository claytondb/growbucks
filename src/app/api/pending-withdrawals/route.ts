import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// GET /api/pending-withdrawals - Get count and list of pending withdrawals
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get user ID from email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!.toLowerCase())
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all children belonging to this parent
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', user.id);

  if (childrenError) {
    console.error('Error fetching children:', childrenError);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (!children || children.length === 0) {
    return NextResponse.json({ count: 0, totalCents: 0, withdrawals: [] });
  }

  const childIds = children.map((c: { id: string }) => c.id);
  const childMap = Object.fromEntries(children.map((c: { id: string; name: string }) => [c.id, c.name]));

  // Get pending withdrawal transactions for these children
  const { data: pendingTx, error: txError } = await supabase
    .from('transactions')
    .select('id, child_id, amount_cents, description, requested_at, created_at')
    .eq('status', 'pending')
    .eq('type', 'withdrawal')
    .in('child_id', childIds)
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('Error fetching pending withdrawals:', txError);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }

  const withdrawals = (pendingTx || []).map((tx: {
    id: string;
    child_id: string;
    amount_cents: number;
    description: string;
    requested_at: string;
    created_at: string;
  }) => ({
    id: tx.id,
    childId: tx.child_id,
    childName: childMap[tx.child_id] || 'Unknown',
    amountCents: Math.abs(tx.amount_cents),
    description: tx.description,
    requestedAt: tx.requested_at || tx.created_at,
  }));

  const totalCents = withdrawals.reduce((sum: number, w: { amountCents: number }) => sum + w.amountCents, 0);

  return NextResponse.json({
    count: withdrawals.length,
    totalCents,
    withdrawals,
  });
}
