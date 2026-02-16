'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Trash2, Clock } from 'lucide-react';

export default function DevicesPage() {
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

  const devices = [
    { 
      id: 1, 
      name: 'Chrome on Windows', 
      icon: Monitor, 
      location: 'Illinois, USA',
      lastActive: 'Active now',
      current: true 
    },
    { 
      id: 2, 
      name: 'Safari on iPhone', 
      icon: Smartphone, 
      location: 'Illinois, USA',
      lastActive: '2 hours ago',
      current: false 
    },
    { 
      id: 3, 
      name: 'Chrome on iPad', 
      icon: Tablet, 
      location: 'Illinois, USA',
      lastActive: '3 days ago',
      current: false 
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--midnight)' }}>
        Connected Devices 📱
      </h1>

      <p className="mb-6" style={{ color: 'var(--slate)' }}>
        These devices have logged into your GrowBucks account. Remove any you don&apos;t recognize.
      </p>

      <div className="space-y-4">
        {devices.map((device) => {
          const Icon = device.icon;
          return (
            <div key={device.id} className="card">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--cloud)' }}
                >
                  <Icon className="w-6 h-6" style={{ color: 'var(--midnight)' }} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold" style={{ color: 'var(--midnight)' }}>{device.name}</p>
                    {device.current && (
                      <span 
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{ background: 'var(--success)', color: 'white' }}
                      >
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--slate)' }}>{device.location}</p>
                  <p className="text-sm flex items-center gap-1" style={{ color: 'var(--slate)' }}>
                    <Clock className="w-3 h-3" />
                    {device.lastActive}
                  </p>
                </div>

                {!device.current && (
                  <button 
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        className="mt-6 w-full py-3 rounded-xl font-medium"
        style={{ background: 'var(--cloud)', color: 'var(--error)' }}
      >
        Sign Out All Other Devices
      </button>
    </div>
  );
}
