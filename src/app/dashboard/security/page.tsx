'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Smartphone, Clock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SecurityPage() {
  const { status } = useSession();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    // TODO: Implement password change API
    setTimeout(() => {
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password updated successfully!');
    }, 1000);
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
        <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">Security</h1>
        <p className="text-[#7F8C8D] mb-6">Manage your account security settings</p>

        {/* Security Status */}
        <Card className="mb-6 border-[#2ECC71]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#2ECC71]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#2ECC71]" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#2C3E50]">Your account is secure</p>
                <p className="text-sm text-[#7F8C8D]">All security features are enabled</p>
              </div>
              <Check className="w-6 h-6 text-[#2ECC71]" />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-[#F39C12]" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password regularly for better security</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#7F8C8D] mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#7F8C8D] mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#7F8C8D] mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                  placeholder="Confirm new password"
                />
              </div>

              <Button type="submit" disabled={changingPassword} className="w-full">
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#3498DB]" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div>
                <p className="font-medium text-[#2C3E50]">Authenticator App</p>
                <p className="text-sm text-[#7F8C8D]">Use an app like Google Authenticator</p>
              </div>
              <Button variant="secondary" size="sm">
                Set Up
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#9B59B6]" />
              Recent Login Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { device: 'Chrome on Windows', location: 'Chicago, IL', time: 'Just now', current: true },
              { device: 'Safari on iPhone', location: 'Chicago, IL', time: '2 hours ago', current: false },
              { device: 'Chrome on Windows', location: 'Chicago, IL', time: 'Yesterday', current: false },
            ].map((login, index) => (
              <div 
                key={index}
                className={`flex items-center gap-4 p-3 rounded-xl ${login.current ? 'bg-[#2ECC71]/10' : 'bg-[#F8FAFE]'}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-[#2C3E50]">
                    {login.device}
                    {login.current && (
                      <span className="ml-2 text-xs bg-[#2ECC71] text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[#7F8C8D]">
                    {login.location} • {login.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-6 border-[#E74C3C]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-[#E74C3C]">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-[#E74C3C]/5 rounded-xl">
              <div>
                <p className="font-medium text-[#2C3E50]">Delete Account</p>
                <p className="text-sm text-[#7F8C8D]">Permanently delete your account and all data</p>
              </div>
              <Button variant="secondary" size="sm" className="bg-[#E74C3C] hover:bg-[#C0392B] text-white">
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
