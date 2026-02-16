'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield, Key, Smartphone, LogOut, AlertTriangle } from 'lucide-react';

export default function SecurityPage() {
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
        Security 🔒
      </h1>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <Key className="w-5 h-5" /> Password
        </h2>
        
        <p className="mb-4" style={{ color: 'var(--slate)' }}>
          {session?.user?.email?.includes('@gmail') 
            ? "You're signed in with Google. No password needed!"
            : "Change your password regularly to keep your account secure."}
        </p>

        {!session?.user?.email?.includes('@gmail') && (
          <button className="btn-secondary">Change Password</button>
        )}
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <Smartphone className="w-5 h-5" /> Two-Factor Authentication
        </h2>
        
        <p className="mb-4" style={{ color: 'var(--slate)' }}>
          Add an extra layer of security to your account.
        </p>

        <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--cloud)' }}>
          <Shield className="w-5 h-5" style={{ color: 'var(--slate)' }} />
          <span style={{ color: 'var(--slate)' }}>2FA is not enabled</span>
        </div>

        <button className="btn-primary">Enable 2FA</button>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <LogOut className="w-5 h-5" /> Active Sessions
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--cloud)' }}>
            <div>
              <p className="font-medium" style={{ color: 'var(--midnight)' }}>Current Session</p>
              <p className="text-sm" style={{ color: 'var(--slate)' }}>This device • Active now</p>
            </div>
            <span className="px-2 py-1 text-xs rounded-full" style={{ background: 'var(--success)', color: 'white' }}>
              Current
            </span>
          </div>
        </div>

        <button className="mt-4 text-sm font-medium" style={{ color: 'var(--error)' }}>
          Sign out all other devices
        </button>
      </div>

      <div className="card border-2" style={{ borderColor: 'var(--error)' }}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--error)' }}>
          <AlertTriangle className="w-5 h-5" /> Danger Zone
        </h2>
        
        <p className="mb-4" style={{ color: 'var(--slate)' }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>

        <button 
          className="px-4 py-2 rounded-lg font-medium"
          style={{ background: 'var(--error)', color: 'white' }}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
