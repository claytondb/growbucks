import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// GET /api/goals - List all goals for the user's children
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Get user ID from email (consistent with children API)
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all children for this user
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name, balance_cents')
      .eq('user_id', user.id);

    if (childrenError) {
      console.error('Error fetching children:', childrenError);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json([]);
    }

    const childIds = children.map((c: { id: string; name: string; balance_cents: number }) => c.id);
    const childMap = new Map<string, { id: string; name: string; balance_cents: number }>(
      children.map((c: { id: string; name: string; balance_cents: number }) => [c.id, c])
    );

    // Get all goals for these children
    const { data: goals, error: goalsError } = await supabase
      .from('savings_goals')
      .select('*')
      .in('child_id', childIds)
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }

    // Enrich goals with child name and current balance
    const enrichedGoals = (goals || []).map((goal: any) => {
      const child = childMap.get(goal.child_id);
      return {
        ...goal,
        child_name: child?.name || 'Unknown',
        current_cents: child?.balance_cents || 0,
        emoji: goal.emoji || '🎯',
      };
    });

    return NextResponse.json(enrichedGoals);
  } catch (error) {
    console.error('Error in GET /api/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Get user ID from email (consistent with children API)
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { child_id, name, target_cents, target_date, emoji } = body;

    if (!child_id || !name || !target_cents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify child belongs to user
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', child_id)
      .eq('user_id', user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Create the goal
    const { data: goal, error: goalError } = await supabase
      .from('savings_goals')
      .insert({
        child_id,
        name,
        target_cents,
        target_date: target_date || null,
        emoji: emoji || '🎯',
        is_active: true,
      })
      .select()
      .single();

    if (goalError) {
      console.error('Error creating goal:', goalError);
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
