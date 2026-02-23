import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.isChild) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  // Validate inputs
  if (!currentPassword || typeof currentPassword !== 'string') {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'New password is required' }, { status: 400 });
  }

  // Password requirements: 8+ chars, 1 letter, 1 number
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/[a-zA-Z]/.test(newPassword)) {
    return NextResponse.json({ error: 'Password must contain at least one letter' }, { status: 400 });
  }
  if (!/\d/.test(newPassword)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get user with password hash
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, password_hash, auth_provider')
    .eq('email', session.user.email!.toLowerCase())
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if user signed up with Google (no password)
  if (!user.password_hash) {
    return NextResponse.json(
      { error: 'Cannot change password for Google sign-in accounts. Please use Google to sign in.' },
      { status: 400 }
    );
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating password:', updateError);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Password updated successfully' });
}
