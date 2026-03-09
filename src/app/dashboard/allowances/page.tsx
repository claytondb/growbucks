'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import RecurringDepositsManager from '@/components/RecurringDepositsManager';

interface Child {
  id: string;
  name: string;
  avatar?: string;
}

export default function AllowancesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChildren();
    }
  }, [status]);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/children');
      if (!res.ok) throw new Error('Failed to fetch children');
      const data = await res.json();
      setChildren(data);
    } catch (err) {
      setError('Failed to load children');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFE]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Block children from accessing
  if (session?.user?.isChild) {
    return (
      <div className="min-h-screen bg-[#F8FAFE] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-[#E74C3C] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#2C3E50] mb-2">Parents Only</h2>
            <p className="text-[#7F8C8D] mb-4">
              This page is for parents to manage allowances.
            </p>
            <Link href="/dashboard">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <div>
              <h1 className="font-bold text-lg text-[#2C3E50]">Allowances</h1>
              <p className="text-sm text-[#7F8C8D]">Recurring deposits for your kids</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-[#E74C3C] mx-auto mb-3" />
                <p className="text-[#E74C3C] mb-4">{error}</p>
                <Button variant="secondary" onClick={fetchChildren}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <RecurringDepositsManager childAccounts={children} />
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="bg-[#3498DB]/5 border-[#3498DB]/20">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-[#2C3E50] mb-2">💡 How Allowances Work</h3>
              <ul className="text-sm text-[#7F8C8D] space-y-1">
                <li>• Set up recurring deposits that happen automatically</li>
                <li>• Choose weekly, biweekly, or monthly schedules</li>
                <li>• Pause anytime without losing your settings</li>
                <li>• Kids get notified when deposits arrive</li>
                <li>• Maximum 5 recurring deposits per child</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
