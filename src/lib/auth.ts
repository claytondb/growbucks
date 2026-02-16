import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from './supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createServerSupabaseClient() as any;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const supabase = getSupabase();
        
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email.toLowerCase())
          .single();

        if (error || !user) {
          throw new Error('No account found with this email');
        }

        if (!user.password_hash) {
          throw new Error('Please sign in with Google');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        
        if (!isValid) {
          throw new Error('Invalid password');
        }

        // Update last login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    // Child PIN login provider
    CredentialsProvider({
      id: 'child-pin',
      name: 'Child PIN',
      credentials: {
        childId: { label: 'Child ID', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.childId || !credentials?.pin) {
          throw new Error('Please select your profile and enter your PIN');
        }

        const supabase = getSupabase();
        
        const { data: child, error } = await supabase
          .from('children')
          .select('*')
          .eq('id', credentials.childId)
          .single();

        if (error || !child) {
          throw new Error('Profile not found');
        }

        const isValid = await bcrypt.compare(credentials.pin, child.pin_hash);
        
        if (!isValid) {
          throw new Error('Wrong PIN');
        }

        return {
          id: child.id,
          name: child.name,
          email: `child_${child.id}@growbucks.internal`,
          isChild: true,
          parentId: child.user_id,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const supabase = getSupabase();
        
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email!.toLowerCase())
          .single();

        if (!existingUser) {
          // Create new user
          const { error } = await supabase.from('users').insert({
            email: user.email!.toLowerCase(),
            name: user.name || 'Parent',
            auth_provider: 'google' as const,
            google_id: account.providerAccountId,
            email_verified: true,
            timezone: 'UTC',
          } as any);

          if (error) {
            console.error('Error creating user:', error);
            return false;
          }
        } else {
          // Update last login
          await supabase
            .from('users')
            .update({ 
              last_login_at: new Date().toISOString(),
              google_id: account.providerAccountId,
            })
            .eq('id', existingUser.id);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore - custom property
        token.isChild = user.isChild || false;
        // @ts-ignore - custom property
        token.parentId = user.parentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // @ts-ignore - custom property
        session.user.isChild = token.isChild || false;
        // @ts-ignore - custom property
        session.user.parentId = token.parentId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days for parents
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Type augmentation for custom session properties
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isChild?: boolean;
      parentId?: string;
    };
  }
  interface User {
    isChild?: boolean;
    parentId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    isChild?: boolean;
    parentId?: string;
  }
}
