'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

export default function AppearancePage() {
  const { status } = useSession();
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const [accentColor, setAccentColor] = useState('green');

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

  const themes = [
    { id: 'light', name: 'Light', icon: Sun, description: 'Bright and cheerful' },
    { id: 'dark', name: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { id: 'system', name: 'System', icon: Monitor, description: 'Match your device' },
  ];

  const colors = [
    { id: 'green', name: 'Sprout Green', color: '#2ECC71' },
    { id: 'blue', name: 'Sky Blue', color: '#3498DB' },
    { id: 'purple', name: 'Royal Purple', color: '#9B59B6' },
    { id: 'orange', name: 'Sunset Orange', color: '#E67E22' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--midnight)' }}>
        Appearance 🎨
      </h1>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <Sun className="w-5 h-5" /> Theme
        </h2>
        
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === t.id 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-8 h-8 mx-auto mb-2" style={{ color: theme === t.id ? 'var(--sprout-green)' : 'var(--slate)' }} />
                <p className="font-medium text-sm" style={{ color: 'var(--midnight)' }}>{t.name}</p>
                <p className="text-xs" style={{ color: 'var(--slate)' }}>{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--midnight)' }}>
          <Palette className="w-5 h-5" /> Accent Color
        </h2>
        
        <div className="grid grid-cols-4 gap-3">
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => setAccentColor(c.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                accentColor === c.id 
                  ? 'border-gray-800' 
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-full mx-auto mb-2"
                style={{ background: c.color }}
              />
              <p className="text-xs font-medium" style={{ color: 'var(--midnight)' }}>{c.name}</p>
            </button>
          ))}
        </div>

        <p className="text-sm mt-4" style={{ color: 'var(--slate)' }}>
          🚧 Theme customization coming soon!
        </p>
      </div>
    </div>
  );
}
