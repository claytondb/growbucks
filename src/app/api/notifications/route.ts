import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRead = searchParams.get('include_read') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

    const supabase = getSupabase();

    // Build query — optionally include read notifications for history view
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeRead) {
      query = query.is('read_at', null);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array if table doesn't exist yet
      return NextResponse.json({ 
        notifications: [], 
        unreadCount: 0 
      });
    }

    // Always return unread count separately (used for badge)
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .is('read_at', null);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: count || 0,
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ 
      notifications: [], 
      unreadCount: 0 
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { childId, type, title, message, emoji, amountCents } = body;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        child_id: childId,
        type,
        title,
        message,
        emoji,
        amount_cents: amountCents,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
