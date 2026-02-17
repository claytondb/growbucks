import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Fetch unread notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array if table doesn't exist yet
      return NextResponse.json({ 
        notifications: [], 
        unreadCount: 0 
      });
    }

    // Count unread
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
