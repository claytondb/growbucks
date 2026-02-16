'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Moon,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile',
          description: 'Manage your account details',
          href: '/settings/profile',
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Email and push notification preferences',
          href: '/settings/notifications',
        },
        {
          icon: Shield,
          label: 'Security',
          description: 'Password and login settings',
          href: '/settings/security',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Moon,
          label: 'Appearance',
          description: 'Theme and display settings',
          href: '/settings/appearance',
        },
        {
          icon: Smartphone,
          label: 'Connected Devices',
          description: 'Manage logged-in devices',
          href: '/settings/devices',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFE]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECF0F1] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-bold text-lg text-[#2C3E50]">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar
                  name={session?.user?.name || 'User'}
                  src={session?.user?.image}
                  size="xl"
                />
                <div>
                  <h2 className="text-xl font-bold text-[#2C3E50]">
                    {session?.user?.name}
                  </h2>
                  <p className="text-[#7F8C8D]">{session?.user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (sectionIndex + 1) }}
            className="mb-6"
          >
            <h3 className="text-sm font-medium text-[#7F8C8D] mb-2 px-1">
              {section.title}
            </h3>
            <Card>
              <div className="divide-y divide-[#ECF0F1]">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center gap-4 p-4 hover:bg-[#F8FAFE] transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-[#3498DB]/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-[#3498DB]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#2C3E50]">{item.label}</p>
                        <p className="text-sm text-[#7F8C8D]">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#BDC3C7]" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 hover:bg-[#E74C3C]/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E74C3C]/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-[#E74C3C]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#E74C3C]">Sign Out</p>
                <p className="text-sm text-[#7F8C8D]">Log out of your account</p>
              </div>
            </button>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[#BDC3C7]">
            GrowBucks v1.0.0
          </p>
          <p className="text-xs text-[#BDC3C7] mt-1">
            Teaching kids about money, one cent at a time.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
