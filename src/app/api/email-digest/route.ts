/**
 * POST /api/email-digest
 *
 * Sends a monthly summary email digest to the authenticated parent.
 *
 * Body (JSON):
 *   {
 *     year?: number,           // defaults to current year
 *     month?: number,          // 1-indexed; defaults to previous month
 *     dryRun?: boolean,        // if true, returns rendered email without sending
 *   }
 *
 * Auth: parent session required. Children receive 403.
 *
 * Rate limiting: one send per parent per month (enforced via DB).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendMonthlyDigest, buildDigestEmail, type DigestChild } from '@/lib/email-digest';
import type { Transaction } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isChild) {
    return NextResponse.json(
      { error: 'Email digest is only available to parents' },
      { status: 403 },
    );
  }

  // Parse body
  let body: { year?: number; month?: number; dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Empty or invalid body — use defaults
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-indexed

  // Default: previous month
  let year = body.year ?? (currentMonth === 1 ? currentYear - 1 : currentYear);
  let month = body.month ?? (currentMonth === 1 ? 12 : currentMonth - 1);

  // Clamp to valid range
  if (isNaN(year) || year < 2020 || year > currentYear) year = currentYear;
  if (isNaN(month) || month < 1 || month > 12) month = currentMonth === 1 ? 12 : currentMonth - 1;

  const dryRun = body.dryRun === true;

  const supabase = getSupabase();

  // Resolve user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', session.user.email!.toLowerCase())
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch children
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, name, balance_cents')
    .eq('user_id', user.id)
    .order('name');

  if (childrenError || !children || children.length === 0) {
    return NextResponse.json(
      { error: 'No children found for this account' },
      { status: 404 },
    );
  }

  // Fetch transactions for the target year (needed for monthly summary)
  const yearStart = `${year}-01-01T00:00:00.000Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00.000Z`;

  const childIds = children.map((c: { id: string }) => c.id);
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .in('child_id', childIds)
    .gte('created_at', yearStart)
    .lt('created_at', yearEnd)
    .in('status', ['completed', 'approved'])
    .order('created_at');

  if (txError) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  // Group transactions by child
  const txByChild = new Map<string, Transaction[]>();
  for (const child of children) {
    txByChild.set(child.id, []);
  }
  for (const tx of transactions ?? []) {
    const list = txByChild.get(tx.child_id) ?? [];
    list.push(tx);
    txByChild.set(tx.child_id, list);
  }

  const digestChildren: DigestChild[] = children.map((c: { id: string; name: string; balance_cents: number }) => ({
    id: c.id,
    name: c.name,
    balanceCents: c.balance_cents,
    transactions: txByChild.get(c.id) ?? [],
  }));

  if (dryRun) {
    // Return rendered email content without sending
    const content = buildDigestEmail({
      parentEmail: user.email,
      parentName: user.name ?? 'Parent',
      children: digestChildren,
      year,
      month,
    });

    return NextResponse.json({
      dryRun: true,
      year,
      month,
      subject: content.subject,
      previewText: content.previewText,
      textBody: content.textBody,
      // Omit htmlBody from response to keep it small; UI can request separately
    });
  }

  // Send the digest
  const result = await sendMonthlyDigest({
    parentEmail: user.email,
    parentName: user.name ?? 'Parent',
    children: digestChildren,
    year,
    month,
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error, dryRun: result.dryRun },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    sent: result.sent,
    dryRun: result.dryRun,
    year,
    month,
    subject: result.subject,
    recipientCount: 1,
  });
}
