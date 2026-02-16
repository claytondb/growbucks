'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, Clock } from 'lucide-react';

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState({
    dailyGrowth: true,
    goalMilestones: true,
    withdrawalRequests: true,
    weeklyReport: false,
    emailNotifications: true,
    pushNotifications: false,
  });

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

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative ${
        checked ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--midnight)' }}>
        Notifications 🔔
      </h1>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <Bell className="w-5 h-5" /> Alert Types
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>Daily Growth Updates</p>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>Get notified when interest is added</p>
            </div>
            <Toggle 
              checked={settings.dailyGrowth} 
              onChange={() => setSettings(s => ({ ...s, dailyGrowth: !s.dailyGrowth }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>Goal Milestones</p>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>Celebrate when kids hit savings goals</p>
            </div>
            <Toggle 
              checked={settings.goalMilestones} 
              onChange={() => setSettings(s => ({ ...s, goalMilestones: !s.goalMilestones }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>Withdrawal Requests</p>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>When a child requests money</p>
            </div>
            <Toggle 
              checked={settings.withdrawalRequests} 
              onChange={() => setSettings(s => ({ ...s, withdrawalRequests: !s.withdrawalRequests }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>Weekly Summary</p>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>Weekly report of all growth</p>
            </div>
            <Toggle 
              checked={settings.weeklyReport} 
              onChange={() => setSettings(s => ({ ...s, weeklyReport: !s.weeklyReport }))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <Smartphone className="w-5 h-5" /> Delivery Method
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5" style={{ color: 'var(--slate)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--midnight)' }}>Email</p>
                <p className="text-sm" style={{ color: 'var(--slate)' }}>Send to your email address</p>
              </div>
            </div>
            <Toggle 
              checked={settings.emailNotifications} 
              onChange={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5" style={{ color: 'var(--slate)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--midnight)' }}>Push Notifications</p>
                <p className="text-sm" style={{ color: 'var(--slate)' }}>Browser notifications</p>
              </div>
            </div>
            <Toggle 
              checked={settings.pushNotifications} 
              onChange={() => setSettings(s => ({ ...s, pushNotifications: !s.pushNotifications }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
