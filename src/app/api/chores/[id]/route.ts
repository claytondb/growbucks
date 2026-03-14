/**
 * GET    /api/chores/[id]  — Get a single chore (parent or child)
 * PATCH  /api/chores/[id]  — Update a chore (parent only)
 * DELETE /api/chores/[id]  — Archive a chore (parent only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateUpdateChore } from '@/lib/chores';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

type RouteContext = { params: Promise<{ id: string }> };

async function getChoreWithOwnerCheck(
  choreId: string,
  userId: string,
  isChild: boolean,
  childId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ chore: any | null; error: NextResponse | null }> {
  const supabase = getSupabase();

  const { data: chore, error } = await supabase
    .from('chores')
    .select('*, children!inner(user_id)')
    .eq('id', choreId)
    .single();

  if (error || !chore) {
    return { chore: null, error: NextResponse.json({ error: 'Chore not found' }, { status: 404 }) };
  }

  if (isChild) {
    // Child can only see their own chores
    if (chore.child_id !== childId) {
      return { chore: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  } else {
    // Parent must own the child
    if (chore.children.user_id !== userId) {
      return { chore: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  }

  return { chore, error: null };
}

// GET /api/chores/[id]
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { chore, error } = await getChoreWithOwnerCheck(
    id,
    session.user.id,
    session.user.isChild ?? false,
    session.user.isChild ? session.user.id : undefined
  );

  if (error) return error;

  // Strip the joined children data before returning
  const { children: _children, ...choreData } = chore;
  return NextResponse.json({ chore: choreData });
}

// PATCH /api/chores/[id]
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { chore, error } = await getChoreWithOwnerCheck(id, session.user.id, false);
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = {
    ...(body.title !== undefined && { title: (body.title as string).trim() }),
    ...(body.description !== undefined && { description: body.description as string | null }),
    ...(body.reward_cents !== undefined && { reward_cents: body.reward_cents as number }),
    ...(body.frequency !== undefined && { frequency: body.frequency as 'one_time' | 'recurring' }),
    ...(body.status !== undefined && { status: body.status as 'active' | 'paused' | 'archived' }),
    ...(body.emoji !== undefined && { emoji: body.emoji as string | null }),
  };

  const validation = validateUpdateChore(input);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  if (Object.keys(input).length === 0) {
    const { children: _children, ...choreData } = chore;
    return NextResponse.json({ chore: choreData });
  }

  const supabase = getSupabase();
  const { data: updated, error: updateError } = await supabase
    .from('chores')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating chore:', updateError);
    return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 });
  }

  return NextResponse.json({ chore: updated });
}

// DELETE /api/chores/[id] — soft-delete by archiving
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { error: ownerError } = await getChoreWithOwnerCheck(id, session.user.id, false);
  if (ownerError) return ownerError;

  const supabase = getSupabase();
  const { error } = await supabase
    .from('chores')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    console.error('Error archiving chore:', error);
    return NextResponse.json({ error: 'Failed to archive chore' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
