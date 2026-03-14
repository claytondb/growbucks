/**
 * GET  /api/chores?childId=xxx  — List chores for a child (parent or child can view)
 * POST /api/chores              — Create a new chore (parent only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateCreateChore, sortChores } from '@/lib/chores';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// GET /api/chores?childId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify the requesting user owns the child (or IS the child)
  if (!session.user.isChild) {
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('user_id', session.user.id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
  } else if (session.user.id !== childId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: chores, error } = await supabase
    .from('chores')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chores:', error);
    return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
  }

  return NextResponse.json({ chores: sortChores(chores ?? []) });
}

// POST /api/chores
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = {
    child_id: body.child_id as string,
    title: (body.title as string)?.trim(),
    description: body.description as string | undefined,
    reward_cents: body.reward_cents as number,
    frequency: (body.frequency as 'one_time' | 'recurring') ?? 'recurring',
    emoji: body.emoji as string | undefined,
  };

  const validation = validateCreateChore(input);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify the parent owns the child
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', input.child_id)
    .eq('user_id', session.user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const { data: chore, error } = await supabase
    .from('chores')
    .insert({
      child_id: input.child_id,
      title: input.title,
      description: input.description ?? null,
      reward_cents: input.reward_cents,
      frequency: input.frequency,
      emoji: input.emoji ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chore:', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }

  return NextResponse.json({ chore }, { status: 201 });
}
