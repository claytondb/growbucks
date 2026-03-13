import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

// ---------------------------------------------------------------------------
// GET /api/lesson-progress
//
// - Child users: returns their own progress array
// - Parent users: returns progress for all their children, keyed by child_id
//   (pass ?childId=UUID to get a single child's progress)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    if (session.user.isChild) {
      // Child: fetch own progress
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, quiz_score, completed_at, updated_at')
        .eq('child_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching lesson progress:', error);
        return NextResponse.json({ progress: [] });
      }

      return NextResponse.json({ progress: data ?? [] });
    }

    // Parent: resolve user id from email, then fetch children
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email!)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Optional: filter by a specific child
    const childId = searchParams.get('childId');

    let childIds: string[];
    if (childId) {
      // Verify this child belongs to the parent
      const { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('id', childId)
        .eq('user_id', user.id)
        .single();

      if (!child) {
        return NextResponse.json({ error: 'Child not found' }, { status: 404 });
      }
      childIds = [child.id];
    } else {
      const { data: children } = await supabase
        .from('children')
        .select('id, name')
        .eq('user_id', user.id);

      childIds = (children ?? []).map((c: { id: string }) => c.id);
    }

    if (childIds.length === 0) {
      return NextResponse.json({ progress: [] });
    }

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('child_id, lesson_id, completed, quiz_score, completed_at, updated_at')
      .in('child_id', childIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching lesson progress for children:', error);
      return NextResponse.json({ progress: [] });
    }

    return NextResponse.json({ progress: data ?? [] });
  } catch (err) {
    console.error('Lesson progress GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/lesson-progress
//
// Upserts a single lesson completion record. Only children can write progress.
// Body: { lessonId: string; completed: boolean; quizScore: number | null }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isChild) {
      return NextResponse.json(
        { error: 'Only child users can update lesson progress' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lessonId, completed, quizScore } = body as {
      lessonId: string;
      completed: boolean;
      quizScore: number | null;
    };

    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }
    if (typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'completed must be a boolean' }, { status: 400 });
    }
    if (quizScore !== null && (typeof quizScore !== 'number' || quizScore < 0 || quizScore > 100)) {
      return NextResponse.json({ error: 'quizScore must be 0-100 or null' }, { status: 400 });
    }

    const supabase = getSupabase();

    const payload = {
      child_id: session.user.id,
      lesson_id: lessonId,
      completed,
      quiz_score: quizScore,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'child_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting lesson progress:', error);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    return NextResponse.json({ progress: data }, { status: 200 });
  } catch (err) {
    console.error('Lesson progress POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
