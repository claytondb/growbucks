'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, Tablet, Trash2, Check, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Device {
  id: string;
  name: string;
  type: 'phone' | 'desktop' | 'tablet';
  location: string;
  lastActive: string;
  isCurrent: boolean;
  browser: string;
}

const devices: Device[] = [
  {
    id: '1',
    name: 'Chrome on Windows',
    type: 'desktop',
    location: 'Chicago, IL',
    lastActive: 'Active now',
    isCurrent: true,
    browser: 'Chrome 120',
  },
  {
    id: '2',
    name: 'Safari on iPhone',
    type: 'phone',
    location: 'Chicago, IL',
    lastActive: '2 hours ago',
    isCurrent: false,
    browser: 'Safari 17',
  },
  {
    id: '3',
    name: 'Chrome on iPad',
    type: 'tablet',
    location: 'Chicago, IL',
    lastActive: '3 days ago',
    isCurrent: false,
    browser: 'Chrome 120',
  },
];

const deviceIcons = {
  phone: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
};

export default function DevicesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [deviceList, setDeviceList] = useState(devices);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const removeDevice = (id: string) => {
    setDeviceList(deviceList.filter(d => d.id !== id));
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">Connected Devices</h1>
        <p className="text-[#7F8C8D] mb-6">Manage devices that have access to your account</p>

        {/* Current Device */}
        <Card className="mb-6 border-[#2ECC71]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="w-5 h-5 text-[#2ECC71]" />
              This Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-[#2ECC71]/5 rounded-xl">
              <div className="w-12 h-12 bg-[#2ECC71]/10 rounded-xl flex items-center justify-center">
                <Monitor className="w-6 h-6 text-[#2ECC71]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[#2C3E50]">Chrome on Windows</p>
                  <span className="px-2 py-0.5 bg-[#2ECC71] text-white text-xs rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Current
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#7F8C8D] mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Chicago, IL
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Active now
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Other Devices</CardTitle>
            <CardDescription>
              {deviceList.filter(d => !d.isCurrent).length} device(s) connected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deviceList.filter(d => !d.isCurrent).length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 text-[#BDC3C7] mx-auto mb-2" />
                <p className="text-[#7F8C8D]">No other devices connected</p>
              </div>
            ) : (
              deviceList.filter(d => !d.isCurrent).map((device, index) => {
                const Icon = deviceIcons[device.type];
                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-[#F8FAFE] rounded-xl"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-[#7F8C8D]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#2C3E50]">{device.name}</p>
                      <div className="flex items-center gap-3 text-sm text-[#7F8C8D]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {device.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {device.lastActive}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDevice(device.id)}
                      className="text-[#E74C3C] hover:bg-[#E74C3C]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Sign Out All */}
        {deviceList.filter(d => !d.isCurrent).length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="secondary" className="w-full md:w-auto bg-[#E74C3C] hover:bg-[#C0392B] text-white">
              Sign Out of All Other Devices
            </Button>
          </div>
        )}

        {/* Tips */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#3498DB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-[#3498DB]" />
              </div>
              <div>
                <p className="font-medium text-[#2C3E50]">Security Tip</p>
                <p className="text-sm text-[#7F8C8D]">
                  Regularly review connected devices and remove any you don&apos;t recognize. 
                  If you see unfamiliar devices, change your password immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
