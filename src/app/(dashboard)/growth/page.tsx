'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function GrowthPage() {
  const { status } = useSession();
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--midnight)' }}>
        Growth Overview 📈
      </h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--sprout-green)' }} />
          <p className="text-2xl font-bold" style={{ color: 'var(--sprout-green)' }}>+$12.50</p>
          <p className="text-sm" style={{ color: 'var(--slate)' }}>This Month</p>
        </div>
        <div className="card text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--sky-blue)' }} />
          <p className="text-2xl font-bold" style={{ color: 'var(--sky-blue)' }}>30</p>
          <p className="text-sm" style={{ color: 'var(--slate)' }}>Days Growing</p>
        </div>
        <div className="card text-center">
          <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--sunny-gold)' }} />
          <p className="text-2xl font-bold" style={{ color: 'var(--sunny-gold)' }}>$45.00</p>
          <p className="text-sm" style={{ color: 'var(--slate)' }}>Total Interest Earned</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--midnight)' }}>
          Growth Chart
        </h2>
        <div className="h-64 flex items-center justify-center rounded-lg" style={{ background: 'var(--cloud)' }}>
          <p style={{ color: 'var(--slate)' }}>📊 Detailed growth charts coming soon!</p>
        </div>
      </div>
    </div>
  );
}
