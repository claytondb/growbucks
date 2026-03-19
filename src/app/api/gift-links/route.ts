import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  validateCreateGiftLink,
  generateGiftToken,
  sortGiftLinks,
  type GiftLink,
} from '@/lib/gift-links';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * GET /api/gift-links
 *
 * Returns all gift links created by the logged-in parent, with redemption
 * counts. Optionally filter by child_id.
 *
 * Query params:
 *   child_id=<uuid>  — filter to links for a specific child
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filterChildId = searchParams.get('child_id');

  const supabase = getSupabase();

  // Look up parent user row
  const { data: parentUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!parentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let query = supabase
    .from('gift_links')
    .select('*')
    .eq('created_by', parentUser.id)
    .order('created_at', { ascending: false });

  if (filterChildId) {
    query = query.eq('child_id', filterChildId);
  }

  const { data: links, error } = await query;

  if (error) {
    console.error('Error fetching gift links:', error);
    return NextResponse.json({ error: 'Failed to fetch gift links' }, { status: 500 });
  }

  const sorted = sortGiftLinks(links ?? []);

  return NextResponse.json({ links: sorted });
}

/**
 * POST /api/gift-links
 *
 * Create a new gift link for one of the parent's children.
 *
 * Body (JSON):
 *   child_id              string   required
 *   label                 string   optional, default "Gift"
 *   message               string   optional welcome message shown to givers
 *   max_uses              number   optional, null = unlimited
 *   max_amount_per_gift_cents  number   optional per-gift cap in cents
 *   expires_at            string   optional ISO-8601 date
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate
  const validation = validateCreateGiftLink(body);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const supabase = getSupabase();

  // Look up parent user row
  const { data: parentUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!parentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Verify the child belongs to this parent
  const { data: child } = await supabase
    .from('children')
    .select('id, name, user_id')
    .eq('id', body.child_id)
    .single();

  if (!child || child.user_id !== parentUser.id) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Generate a unique token (retry once on collision, astronomically rare)
  let token = generateGiftToken();
  const { data: existing } = await supabase
    .from('gift_links')
    .select('id')
    .eq('token', token)
    .single();

  if (existing) {
    token = generateGiftToken();
  }

  const insertData: Partial<GiftLink> = {
    token,
    child_id: body.child_id,
    created_by: parentUser.id,
    label: body.label ?? 'Gift',
    message: body.message ?? null,
    max_uses: body.max_uses ?? null,
    max_amount_per_gift_cents: body.max_amount_per_gift_cents ?? null,
    expires_at: body.expires_at ?? null,
    is_active: true,
  };

  const { data: link, error } = await supabase
    .from('gift_links')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating gift link:', error);
    return NextResponse.json({ error: 'Failed to create gift link' }, { status: 500 });
  }

  return NextResponse.json({ link }, { status: 201 });
}

/**
 * PATCH /api/gift-links
 *
 * Update a gift link (toggle is_active, change label/message).
 *
 * Body (JSON):
 *   id          string   required
 *   is_active   boolean  optional
 *   label       string   optional
 *   message     string   optional (null to clear)
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: parentUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!parentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Ensure this link belongs to this parent
  const { data: existingLink } = await supabase
    .from('gift_links')
    .select('id, created_by')
    .eq('id', body.id)
    .single();

  if (!existingLink || existingLink.created_by !== parentUser.id) {
    return NextResponse.json({ error: 'Gift link not found' }, { status: 404 });
  }

  // Build safe update patch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
  if (typeof body.label === 'string') {
    if (body.label.trim() === '') {
      return NextResponse.json({ error: 'label cannot be blank' }, { status: 400 });
    }
    patch.label = body.label;
  }
  if ('message' in body) patch.message = body.message ?? null;

  const { data: link, error } = await supabase
    .from('gift_links')
    .update(patch)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating gift link:', error);
    return NextResponse.json({ error: 'Failed to update gift link' }, { status: 500 });
  }

  return NextResponse.json({ link });
}

/**
 * DELETE /api/gift-links?id=<uuid>
 *
 * Permanently delete a gift link (and all its redemptions via cascade).
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get('id');

  if (!linkId) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: parentUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (!parentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: existingLink } = await supabase
    .from('gift_links')
    .select('id, created_by')
    .eq('id', linkId)
    .single();

  if (!existingLink || existingLink.created_by !== parentUser.id) {
    return NextResponse.json({ error: 'Gift link not found' }, { status: 404 });
  }

  const { error } = await supabase.from('gift_links').delete().eq('id', linkId);

  if (error) {
    console.error('Error deleting gift link:', error);
    return NextResponse.json({ error: 'Failed to delete gift link' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
