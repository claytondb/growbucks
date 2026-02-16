'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, Mail, Calendar, Edit2 } from 'lucide-react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-4xl">🌱</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--midnight)' }}>
        Your Profile 👤
      </h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
            style={{ background: 'var(--gradient-trust)' }}
          >
            {session?.user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--midnight)' }}>
              {session?.user?.name || 'User'}
            </h2>
            <p style={{ color: 'var(--slate)' }}>{session?.user?.email}</p>
          </div>
          <button 
            className="ml-auto p-2 rounded-lg hover:bg-gray-100"
            style={{ color: 'var(--sky-blue)' }}
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--cloud)' }}>
            <User className="w-5 h-5" style={{ color: 'var(--slate)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>Name</p>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>
                {session?.user?.name || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--cloud)' }}>
            <Mail className="w-5 h-5" style={{ color: 'var(--slate)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>Email</p>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>
                {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--cloud)' }}>
            <Calendar className="w-5 h-5" style={{ color: 'var(--slate)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>Member Since</p>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>
                February 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
