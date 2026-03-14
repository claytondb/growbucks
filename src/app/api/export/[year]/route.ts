import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  computeAnnualReport,
  familyAnnualReportToCSV,
  childAnnualReportToCSV,
} from '@/lib/annual-report';
import type { Transaction } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * GET /api/export/[year]
 *
 * Returns a tax-year export for all children belonging to the authenticated parent.
 *
 * Query params:
 *   format=json   (default) — full structured JSON
 *   format=csv    — combined family CSV download
 *   child_id=<uuid> — limit to one child (JSON or CSV)
 *
 * Response JSON shape:
 *   { year, generatedAt, children: [...], totalFamilyInterestCents }
 *
 * Auth: parent session only (no child logins allowed).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isChild) {
    return NextResponse.json(
      { error: 'Tax year exports are only available to parents' },
      { status: 403 },
    );
  }

  // Resolve year
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2020 || year > new Date().getUTCFullYear() + 1) {
    return NextResponse.json(
      { error: 'Invalid year. Must be between 2020 and next year.' },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'json';
  const filterChildId = searchParams.get('child_id') ?? null;

  if (!['json', 'csv'].includes(format)) {
    return NextResponse.json(
      { error: "Invalid format. Use 'json' or 'csv'." },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Get parent user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email!)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all children for this parent
  let childrenQuery = supabase
    .from('children')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name');

  if (filterChildId) {
    childrenQuery = childrenQuery.eq('id', filterChildId);
  }

  const { data: children, error: childrenError } = await childrenQuery;

  if (childrenError) {
    console.error('Error fetching children:', childrenError);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }

  if (!children || children.length === 0) {
    return NextResponse.json({ error: 'No children found' }, { status: 404 });
  }

  // Verify the specific child belongs to this parent (if filter applied)
  if (filterChildId && children.length === 0) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Fetch all transactions for these children
  // We fetch all-time (not just the year) so we can compute starting balance from prior year.
  const childIds = children.map((c: { id: string }) => c.id);

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .in('child_id', childIds)
    .order('created_at', { ascending: true });

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  // Build per-child transaction map
  const txsByChild = new Map<string, Transaction[]>();
  for (const child of children) {
    txsByChild.set(child.id, []);
  }
  for (const tx of transactions ?? []) {
    const bucket = txsByChild.get(tx.child_id);
    if (bucket) bucket.push(tx as Transaction);
  }

  // Compute report
  const report = computeAnnualReport(year, children, txsByChild);

  // Return format
  if (format === 'csv') {
    let csvContent: string;
    let filename: string;

    if (filterChildId && report.children.length === 1) {
      const child = report.children[0];
      csvContent = childAnnualReportToCSV(child);
      const safeName = child.childName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      filename = `growbucks_${safeName}_${year}_tax_report.csv`;
    } else {
      csvContent = familyAnnualReportToCSV(report);
      filename = `growbucks_family_${year}_tax_report.csv`;
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // Default: JSON
  return NextResponse.json(report);
}
