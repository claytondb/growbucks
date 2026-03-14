import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { toDateString } from '@/lib/streaks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

/**
 * POST /api/activity
 *
 * Record today's login activity for the authenticated child.
 * Idempotent — safe to call on every page load; it upserts the row.
 * Only works for child sessions (isChild: true).
 */
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const childId = session.user.id;
  const today = toDateString(new Date());
  const supabase = getSupabase();

  // Upsert: insert today's row, or increment login_count if it already exists
  const { error } = await supabase
    .from('child_activity')
    .upsert(
      {
        child_id: childId,
        activity_date: today,
        login_count: 1,
      },
      {
        onConflict: 'child_id,activity_date',
        // Supabase upsert with ignoreDuplicates=false will UPDATE on conflict
        ignoreDuplicates: false,
      }
    );

  if (error) {
    console.error('Error recording activity:', error);
    // Non-fatal — streak tracking is best-effort
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, date: today });
}
