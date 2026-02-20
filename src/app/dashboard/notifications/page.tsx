'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, Smartphone, TrendingUp, PiggyBank, Target, ToggleLeft, ToggleRight, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: typeof Bell;
  color: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

interface SavedSettings {
  email_enabled?: boolean;
  push_enabled?: boolean;
  interest_email?: boolean;
  interest_push?: boolean;
  deposits_email?: boolean;
  deposits_push?: boolean;
  withdrawals_email?: boolean;
  withdrawals_push?: boolean;
  goals_email?: boolean;
  goals_push?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'interest',
      title: 'Daily Interest',
      description: 'Get notified when interest is added to accounts',
      icon: TrendingUp,
      color: '#2ECC71',
      emailEnabled: true,
      pushEnabled: true,
    },
    {
      id: 'deposits',
      title: 'Deposits',
      description: 'Notifications when GrowBucks are added',
      icon: PiggyBank,
      color: '#3498DB',
      emailEnabled: true,
      pushEnabled: true,
    },
    {
      id: 'withdrawals',
      title: 'Withdrawal Requests',
      description: 'Get alerted when a child requests a withdrawal',
      icon: Bell,
      color: '#E74C3C',
      emailEnabled: true,
      pushEnabled: true,
    },
    {
      id: 'goals',
      title: 'Goals Achieved',
      description: 'Celebrate when savings goals are reached',
      icon: Target,
      color: '#F39C12',
      emailEnabled: true,
      pushEnabled: false,
    },
  ]);

  // Load settings on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/notification-settings')
        .then(res => res.json())
        .then(data => {
          if (data.settings) {
            const s = data.settings as SavedSettings;
            setEmailEnabled(s.email_enabled ?? true);
            setPushEnabled(s.push_enabled ?? true);
            setQuietHours(s.quiet_hours_enabled ?? false);
            setSettings(prev => prev.map(setting => ({
              ...setting,
              emailEnabled: s[`${setting.id}_email` as keyof SavedSettings] as boolean ?? setting.emailEnabled,
              pushEnabled: s[`${setting.id}_push` as keyof SavedSettings] as boolean ?? setting.pushEnabled,
            })));
          }
        })
        .catch(console.error);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Save settings to API
  const saveSettings = useCallback(async (updates: SavedSettings) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleSetting = (id: string, type: 'email' | 'push') => {
    setSettings(settings.map(s => {
      if (s.id === id) {
        const newValue = type === 'email' ? !s.emailEnabled : !s.pushEnabled;
        // Save to API
        saveSettings({ [`${id}_${type}`]: newValue });
        return {
          ...s,
          [type === 'email' ? 'emailEnabled' : 'pushEnabled']: newValue,
        };
      }
      return s;
    }));
  };

  const toggleGlobalEmail = () => {
    const newValue = !emailEnabled;
    setEmailEnabled(newValue);
    saveSettings({ email_enabled: newValue });
  };

  const toggleGlobalPush = () => {
    const newValue = !pushEnabled;
    setPushEnabled(newValue);
    saveSettings({ push_enabled: newValue });
  };

  const toggleQuietHours = () => {
    const newValue = !quietHours;
    setQuietHours(newValue);
    saveSettings({ quiet_hours_enabled: newValue });
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#2C3E50]">Notifications</h1>
          {saved && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-sm text-[#2ECC71]"
            >
              <CheckCircle className="w-4 h-4" /> Saved
            </motion.span>
          )}
          {saving && (
            <span className="text-sm text-[#7F8C8D]">Saving...</span>
          )}
        </div>
        <p className="text-[#7F8C8D] mb-6">Choose how you want to be notified about activity</p>

        {/* Channel Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#2ECC71]" />
              Notification Channels
            </CardTitle>
            <CardDescription>Enable or disable notification methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3498DB]/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#3498DB]" />
                </div>
                <div>
                  <p className="font-medium text-[#2C3E50]">Email Notifications</p>
                  <p className="text-sm text-[#7F8C8D]">Receive updates via email</p>
                </div>
              </div>
              <button onClick={toggleGlobalEmail} className={emailEnabled ? "text-[#2ECC71]" : "text-[#7F8C8D]"}>
                {emailEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#9B59B6]/10 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-[#9B59B6]" />
                </div>
                <div>
                  <p className="font-medium text-[#2C3E50]">Push Notifications</p>
                  <p className="text-sm text-[#7F8C8D]">Receive push notifications on your device</p>
                </div>
              </div>
              <button onClick={toggleGlobalPush} className={pushEnabled ? "text-[#2ECC71]" : "text-[#7F8C8D]"}>
                {pushEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Per-Event Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Notifications</CardTitle>
            <CardDescription>Customize notifications for each type of event</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-[#ECF0F1]">
            {settings.map((setting, index) => (
              <motion.div
                key={setting.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${setting.color}15` }}
                  >
                    <setting.icon className="w-5 h-5" style={{ color: setting.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2C3E50]">{setting.title}</p>
                    <p className="text-sm text-[#7F8C8D]">{setting.description}</p>
                    
                    <div className="flex gap-4 mt-3">
                      <button
                        onClick={() => toggleSetting(setting.id, 'email')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          setting.emailEnabled 
                            ? 'bg-[#2ECC71]/10 text-[#2ECC71]' 
                            : 'bg-[#ECF0F1] text-[#7F8C8D]'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                      <button
                        onClick={() => toggleSetting(setting.id, 'push')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          setting.pushEnabled 
                            ? 'bg-[#2ECC71]/10 text-[#2ECC71]' 
                            : 'bg-[#ECF0F1] text-[#7F8C8D]'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        Push
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Quiet Hours</CardTitle>
            <CardDescription>Pause notifications during specific times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div>
                <p className="font-medium text-[#2C3E50]">Enable Quiet Hours</p>
                <p className="text-sm text-[#7F8C8D]">9:00 PM - 7:00 AM</p>
              </div>
              <button onClick={toggleQuietHours} className={quietHours ? "text-[#2ECC71]" : "text-[#7F8C8D]"}>
                {quietHours ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
