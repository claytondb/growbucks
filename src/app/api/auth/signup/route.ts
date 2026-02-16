import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password } = body;

  // Validate inputs
  if (!name || typeof name !== 'string' || name.length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  // Password requirements: 8+ chars, 1 letter, 1 number
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/[a-zA-Z]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one letter' }, { status: 400 });
  }
  if (!/\d/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  if (existingUser) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user, error } = await (supabase as any)
    .from('users')
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      name: name.trim(),
      auth_provider: 'email',
      email_verified: false,
      timezone: 'UTC',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  // TODO: Send verification email

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  }, { status: 201 });
}
