/**
 * GET    /api/promotions/[id]  — Fetch a single promotion
 * PATCH  /api/promotions/[id]  — Update (only upcoming promotions can be edited)
 * DELETE /api/promotions/[id]  — Delete a promotion
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  validateUpdatePromotion,
  getPromotionStatus,
  annotatePromotions,
  type UpdatePromotionInput,
  type InterestPromotion,
} from '@/lib/promotions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

type Params = { params: Promise<{ id: string }> };

// GET /api/promotions/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('interest_promotions')
    .select('*')
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
  }

  const [annotated] = annotatePromotions([data as InterestPromotion]);
  return NextResponse.json({ promotion: annotated });
}

// PATCH /api/promotions/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Fetch existing
  const { data: existing, error: fetchError } = await supabase
    .from('interest_promotions')
    .select('*')
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
  }

  // Only allow editing upcoming promotions
  const status = getPromotionStatus(existing as InterestPromotion);
  if (status !== 'upcoming') {
    return NextResponse.json(
      { error: 'Only upcoming promotions can be edited' },
      { status: 422 }
    );
  }

  let body: UpdatePromotionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationErrors = validateUpdatePromotion(body, existing as InterestPromotion);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.bonus_rate_daily !== undefined) update.bonus_rate_daily = body.bonus_rate_daily;
  if (body.starts_at !== undefined) update.starts_at = body.starts_at;
  if (body.ends_at !== undefined) update.ends_at = body.ends_at;

  const { data: updated, error: updateError } = await supabase
    .from('interest_promotions')
    .update(update)
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating promotion:', updateError);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }

  const [annotated] = annotatePromotions([updated as InterestPromotion]);
  return NextResponse.json({ promotion: annotated });
}

// DELETE /api/promotions/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { error } = await supabase
    .from('interest_promotions')
    .delete()
    .eq('id', id)
    .eq('user_id', dbUser.id);

  if (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, id });
}
