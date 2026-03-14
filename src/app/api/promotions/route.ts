/**
 * GET  /api/promotions  — List all promotions for the authenticated parent
 * POST /api/promotions  — Create a new promotion
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  validateCreatePromotion,
  annotatePromotions,
  type CreatePromotionInput,
} from '@/lib/promotions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// GET /api/promotions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Resolve parent's DB user id
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('interest_promotions')
    .select('*')
    .eq('user_id', dbUser.id)
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }

  const promotions = annotatePromotions(data ?? []);
  return NextResponse.json({ promotions });
}

// POST /api/promotions
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreatePromotionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const errors = validateCreatePromotion(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const supabase = getSupabase();

  // Resolve parent's DB user id
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // If child_id provided, verify it belongs to this parent
  if (body.child_id) {
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', body.child_id)
      .eq('user_id', dbUser.id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
  }

  const { data, error } = await supabase
    .from('interest_promotions')
    .insert({
      user_id: dbUser.id,
      child_id: body.child_id ?? null,
      name: body.name.trim(),
      bonus_rate_daily: body.bonus_rate_daily,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }

  return NextResponse.json({ promotion: data }, { status: 201 });
}
