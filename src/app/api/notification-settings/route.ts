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

    // Fetch notification settings
    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching notification settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Return defaults if no settings exist
    const defaultSettings = {
      email_enabled: true,
      push_enabled: true,
      interest_email: true,
      interest_push: true,
      deposits_email: true,
      deposits_push: true,
      withdrawals_email: true,
      withdrawals_push: true,
      goals_email: true,
      goals_push: false,
      quiet_hours_enabled: false,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
    };

    return NextResponse.json({
      settings: settings || defaultSettings,
    });
  } catch (error) {
    console.error('Notification settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getSupabase();

    // Prepare settings object with only allowed fields
    const allowedFields = [
      'email_enabled', 'push_enabled',
      'interest_email', 'interest_push',
      'deposits_email', 'deposits_push',
      'withdrawals_email', 'withdrawals_push',
      'goals_email', 'goals_push',
      'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
    ];

    const settingsUpdate: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        settingsUpdate[field] = body[field];
      }
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: session.user.id,
        ...settingsUpdate,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
