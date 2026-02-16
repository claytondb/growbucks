'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Edit2, Camera, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [status, router, session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (res.ok) {
        await update({ name });
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  const memberSince = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-[#2C3E50] mb-6">Your Profile</h1>

        {/* Avatar Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2ECC71] to-[#27AE60] flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {session?.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-[#ECF0F1] transition-colors">
                  <Camera className="w-4 h-4 text-[#7F8C8D]" />
                </button>
              </div>
              
              {editing ? (
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3 py-2 border border-[#ECF0F1] rounded-lg focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none text-center"
                    autoFocus
                  />
                  <Button size="icon" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditing(false);
                    setName(session?.user?.name || '');
                  }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#2C3E50]">
                    {session?.user?.name || 'User'}
                  </h2>
                  <button 
                    onClick={() => setEditing(true)}
                    className="p-1 rounded hover:bg-[#ECF0F1]"
                  >
                    <Edit2 className="w-4 h-4 text-[#7F8C8D]" />
                  </button>
                </div>
              )}
              
              <p className="text-[#7F8C8D]">{session?.user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-[#F8FAFE] rounded-xl">
              <div className="w-10 h-10 bg-[#3498DB]/10 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-[#3498DB]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#7F8C8D]">Display Name</p>
                <p className="font-medium text-[#2C3E50]">{session?.user?.name || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#F8FAFE] rounded-xl">
              <div className="w-10 h-10 bg-[#9B59B6]/10 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#9B59B6]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#7F8C8D]">Email Address</p>
                <p className="font-medium text-[#2C3E50]">{session?.user?.email}</p>
              </div>
              <span className="px-2 py-1 bg-[#2ECC71]/10 text-[#2ECC71] text-xs rounded-full">
                Verified
              </span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#F8FAFE] rounded-xl">
              <div className="w-10 h-10 bg-[#F39C12]/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#F39C12]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#7F8C8D]">Member Since</p>
                <p className="font-medium text-[#2C3E50]">{memberSince}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Your GrowBucks Family</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-[#2ECC71]/10 rounded-xl">
                <p className="text-2xl font-bold text-[#2ECC71]">0</p>
                <p className="text-sm text-[#7F8C8D]">Children</p>
              </div>
              <div className="p-4 bg-[#F39C12]/10 rounded-xl">
                <p className="text-2xl font-bold text-[#F39C12]">$0</p>
                <p className="text-sm text-[#7F8C8D]">Total Saved</p>
              </div>
              <div className="p-4 bg-[#3498DB]/10 rounded-xl">
                <p className="text-2xl font-bold text-[#3498DB]">$0</p>
                <p className="text-sm text-[#7F8C8D]">Interest Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
