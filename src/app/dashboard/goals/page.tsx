'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Target, Plus, Gift, Gamepad2, Bike } from 'lucide-react';

export default function GoalsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const [goals] = useState([
    { id: 1, name: 'New Video Game', target: 6000, current: 4500, icon: Gamepad2, emoji: '🎮' },
    { id: 2, name: 'Birthday Gift for Mom', target: 2500, current: 1800, icon: Gift, emoji: '🎁' },
    { id: 3, name: 'New Bike', target: 15000, current: 3200, icon: Bike, emoji: '🚲' },
  ]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-4xl">🌱</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--midnight)' }}>
          Savings Goals 🎯
        </h1>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = (goal.current / goal.target) * 100;
          return (
            <div key={goal.id} className="card">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: 'var(--cloud)' }}
                >
                  {goal.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--midnight)' }}>
                    {goal.name}
                  </h3>
                  <p className="text-sm mb-2" style={{ color: 'var(--slate)' }}>
                    ${(goal.current / 100).toFixed(2)} of ${(goal.target / 100).toFixed(2)}
                  </p>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--cloud)' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progress}%`,
                        background: 'var(--gradient-growth)'
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>
                    {progress.toFixed(0)}% complete • ~{Math.ceil((goal.target - goal.current) / 100)} days to go
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--silver)' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--midnight)' }}>
            No goals yet!
          </h3>
          <p className="mb-4" style={{ color: 'var(--slate)' }}>
            Set a savings goal to stay motivated!
          </p>
          <button className="btn-primary">Create Your First Goal</button>
        </div>
      )}
    </div>
  );
}
