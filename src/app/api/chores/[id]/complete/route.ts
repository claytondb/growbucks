/**
 * POST /api/chores/[id]/complete
 *
 * Child marks a chore as done, submitting it for parent approval.
 * Creates a chore_completion record with status='pending'.
 *
 * Body: { notes?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { canSubmitCompletion } from '@/lib/chores';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isChild) {
    return NextResponse.json({ error: 'Only children can submit chore completions' }, { status: 403 });
  }

  const { id: choreId } = await params;
  const childId = session.user.id;

  let body: { notes?: string } = {};
  try {
    body = await request.json();
  } catch {
    // notes is optional — if body parse fails, continue with empty notes
  }

  const notes = body.notes?.trim() || null;
  if (notes && notes.length > 255) {
    return NextResponse.json({ error: 'Notes must be 255 characters or fewer' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch the chore and verify it belongs to this child
  const { data: chore, error: choreError } = await supabase
    .from('chores')
    .select('id, child_id, status, frequency, title, reward_cents')
    .eq('id', choreId)
    .single();

  if (choreError || !chore) {
    return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
  }

  if (chore.child_id !== childId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch existing completions to check business rules
  const { data: existingCompletions } = await supabase
    .from('chore_completions')
    .select('status')
    .eq('chore_id', choreId)
    .eq('child_id', childId);

  const { allowed, reason } = canSubmitCompletion(chore, existingCompletions ?? []);
  if (!allowed) {
    return NextResponse.json({ error: reason }, { status: 409 });
  }

  // Create the completion record
  const { data: completion, error: insertError } = await supabase
    .from('chore_completions')
    .insert({
      chore_id: choreId,
      child_id: childId,
      status: 'pending',
      notes,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error submitting chore completion:', insertError);
    return NextResponse.json({ error: 'Failed to submit completion' }, { status: 500 });
  }

  return NextResponse.json(
    {
      completion,
      message: `"${chore.title}" submitted for review! You could earn ${(chore.reward_cents / 100).toFixed(2)}!`,
    },
    { status: 201 }
  );
}
