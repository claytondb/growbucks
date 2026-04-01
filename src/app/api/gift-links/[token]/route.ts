import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  validateRedeemGiftLink,
  isValidTokenFormat,
  getLinkStatus,
  sortRedemptions,
  type GiftLink,
} from '@/lib/gift-links';
import { sendGiftNotification } from '@/lib/gift-notification';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

interface RouteParams {
  params: { token: string };
}

/**
 * GET /api/gift-links/[token]
 *
 * Public endpoint — no auth required. Returns enough info to render the gift
 * page for a giver. Does NOT expose sensitive parent/child details.
 *
 * Also used by parents to fetch redemptions for a specific link when the
 * `redemptions=true` query param is passed (requires auth).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = params;

  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const includeRedemptions = searchParams.get('redemptions') === 'true';

  const supabase = getSupabase();

  const { data: link, error } = await supabase
    .from('gift_links')
    .select('*, children(name)')
    .eq('token', token)
    .single();

  if (error || !link) {
    return NextResponse.json({ error: 'Gift link not found' }, { status: 404 });
  }

  const status = getLinkStatus(link as GiftLink);

  // Build the public-safe response for the giver
  const publicInfo = {
    child_name: link.children?.name ?? 'your recipient',
    label: link.label,
    message: link.message,
    max_amount_per_gift_cents: link.max_amount_per_gift_cents,
    is_active: link.is_active,
    usable: status.usable,
    status_reason: status.reason,
  };

  // If parent is requesting redemptions, return the full data
  if (includeRedemptions) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.isChild) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: parentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single();

    if (!parentUser || link.created_by !== parentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: redemptions } = await supabase
      .from('gift_link_redemptions')
      .select('*')
      .eq('gift_link_id', link.id)
      .order('redeemed_at', { ascending: false });

    const sorted = sortRedemptions(redemptions ?? []);

    return NextResponse.json({
      link,
      redemptions: sorted,
      public: publicInfo,
    });
  }

  return NextResponse.json({ gift: publicInfo });
}

/**
 * POST /api/gift-links/[token]
 *
 * Public endpoint — no auth required. Redeem a gift link by submitting a gift.
 * Creates a *pending* deposit transaction that requires parent approval.
 *
 * Body (JSON):
 *   giver_name      string  required
 *   giver_message   string  optional
 *   amount_cents    number  required, 100–100000
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = params;

  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch link with child info
  const { data: link, error: linkError } = await supabase
    .from('gift_links')
    .select('*, children(id, name, balance_cents, user_id)')
    .eq('token', token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: 'Gift link not found' }, { status: 404 });
  }

  // Check link usability
  const status = getLinkStatus(link as GiftLink);
  if (!status.usable) {
    return NextResponse.json(
      { error: `This gift link is no longer active: ${status.label}` },
      { status: 409 },
    );
  }

  // Validate input
  const validation = validateRedeemGiftLink(body, link as GiftLink);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const child = link.children;
  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Create a pending deposit transaction (does NOT change balance yet)
  const description = `Gift from ${body.giver_name}${body.giver_message ? `: "${body.giver_message}"` : ''}`;

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      child_id: child.id,
      type: 'deposit',
      amount_cents: body.amount_cents,
      balance_after_cents: child.balance_cents, // will be updated on approval
      description,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (txError || !transaction) {
    console.error('Error creating gift transaction:', txError);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }

  // Record the redemption
  const { data: redemption, error: redemptionError } = await supabase
    .from('gift_link_redemptions')
    .insert({
      gift_link_id: link.id,
      child_id: child.id,
      giver_name: body.giver_name,
      giver_message: body.giver_message ?? null,
      amount_cents: body.amount_cents,
      transaction_id: transaction.id,
      status: 'pending',
    })
    .select()
    .single();

  if (redemptionError) {
    console.error('Error recording redemption:', redemptionError);
    // Don't fail the response — the transaction was created
  }

  // Increment use count on the link
  await supabase
    .from('gift_links')
    .update({
      use_count: link.use_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', link.id);

  // Send email notification to parent (best-effort — don't fail the request)
  try {
    // Fetch parent's email and name
    const { data: parentUser } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', child.user_id)
      .single();

    if (parentUser?.email) {
      // Fire-and-forget: intentionally not awaited to keep response fast
      sendGiftNotification({
        parentEmail: parentUser.email,
        parentName: parentUser.name ?? 'there',
        childName: child.name,
        amountCents: body.amount_cents,
        giverName: body.giver_name,
        giverMessage: body.giver_message ?? null,
        linkLabel: link.label,
        appBaseUrl: process.env.NEXT_PUBLIC_APP_URL,
      }).catch((err) => {
        console.error('[GiftNotification] Failed to send parent notification:', err);
      });
    }
  } catch (err) {
    // Never block the response if notification lookup/send fails
    console.error('[GiftNotification] Unexpected error during notification setup:', err);
  }

  return NextResponse.json(
    {
      success: true,
      message: `Your gift of $${(body.amount_cents / 100).toFixed(2)} for ${child.name} is pending parent approval!`,
      redemption_id: redemption?.id,
    },
    { status: 201 },
  );
}

/**
 * PATCH /api/gift-links/[token]?redemption_id=<uuid>
 *
 * Parent-only: approve or reject a pending redemption.
 * On approval, updates the child's balance.
 *
 * Body (JSON):
 *   redemption_id   string   required
 *   approved        boolean  required
 *   rejection_reason string  optional (when approved=false)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { token } = params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.isChild) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.redemption_id || typeof body.approved !== 'boolean') {
    return NextResponse.json({ error: 'redemption_id and approved are required' }, { status: 400 });
  }

  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
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

  // Fetch link to verify ownership
  const { data: link } = await supabase
    .from('gift_links')
    .select('id, created_by, child_id')
    .eq('token', token)
    .single();

  if (!link || link.created_by !== parentUser.id) {
    return NextResponse.json({ error: 'Gift link not found' }, { status: 404 });
  }

  // Fetch the redemption
  const { data: redemption } = await supabase
    .from('gift_link_redemptions')
    .select('*')
    .eq('id', body.redemption_id)
    .eq('gift_link_id', link.id)
    .single();

  if (!redemption) {
    return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
  }
  if (redemption.status !== 'pending') {
    return NextResponse.json({ error: 'Redemption already reviewed' }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (body.approved) {
    // Fetch child's current balance
    const { data: child } = await supabase
      .from('children')
      .select('balance_cents')
      .eq('id', link.child_id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const newBalance = child.balance_cents + redemption.amount_cents;

    // Update balance
    await supabase
      .from('children')
      .update({ balance_cents: newBalance, updated_at: now })
      .eq('id', link.child_id);

    // Complete the transaction with correct balance_after_cents
    if (redemption.transaction_id) {
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          balance_after_cents: newBalance,
          processed_at: now,
          processed_by: session.user.email,
        })
        .eq('id', redemption.transaction_id);
    }

    // Update redemption
    await supabase
      .from('gift_link_redemptions')
      .update({ status: 'approved', reviewed_at: now, reviewed_by: session.user.email })
      .eq('id', redemption.id);

    return NextResponse.json({
      success: true,
      approved: true,
      new_balance_cents: newBalance,
    });
  } else {
    // Reject: update redemption and transaction
    if (redemption.transaction_id) {
      await supabase
        .from('transactions')
        .update({ status: 'rejected', processed_at: now, processed_by: session.user.email })
        .eq('id', redemption.transaction_id);
    }

    await supabase
      .from('gift_link_redemptions')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: session.user.email,
      })
      .eq('id', redemption.id);

    return NextResponse.json({ success: true, approved: false });
  }
}
