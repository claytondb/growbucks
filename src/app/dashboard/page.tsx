'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Wallet, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ChildCard from '@/components/ChildCard';
import AddChildModal from '@/components/modals/AddChildModal';
import { formatMoney, getGreeting } from '@/lib/utils';
import { Child } from '@/types/database';

interface ChildWithStats extends Child {
  interest_earned_this_month: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<ChildWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [addChildOpen, setAddChildOpen] = useState(false);

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/children');
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchChildren();
    }
  }, [status, router, fetchChildren]);

  const handleAddChild = async (data: { name: string; pin: string; interest_rate_daily: number }) => {
    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Failed to add child');
    }

    await fetchChildren();
  };

  // Calculate totals
  const totalBalance = children.reduce((sum, child) => sum + child.balance_cents, 0);
  const totalInterestThisMonth = children.reduce((sum, child) => sum + child.interest_earned_this_month, 0);
  const pendingWithdrawals = 0; // TODO: Fetch from API

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#7F8C8D]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFE]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECF0F1] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#2C3E50]">
                {getGreeting()}, {session?.user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-[#7F8C8D]">Here&apos;s how your family is doing</p>
            </div>
            <Button onClick={() => setAddChildOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2ECC71]/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[#2ECC71]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#7F8C8D]">Total Balance</p>
                    <p className="text-2xl font-mono font-bold text-[#2ECC71]">
                      {formatMoney(totalBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F1C40F]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#F39C12]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#7F8C8D]">Interest This Month</p>
                    <p className="text-2xl font-mono font-bold text-[#F39C12]">
                      +{formatMoney(totalInterestThisMonth)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3498DB]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#3498DB]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#7F8C8D]">Children</p>
                    <p className="text-2xl font-bold text-[#2C3E50]">
                      {children.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pending withdrawals alert */}
        {pendingWithdrawals > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-[#E67E22] bg-[#E67E22]/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#E67E22]" />
                  <p className="text-[#2C3E50]">
                    You have <span className="font-bold">{pendingWithdrawals}</span> pending withdrawal request(s)
                  </p>
                  <Button variant="secondary" size="sm" className="ml-auto">
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Children list */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#2C3E50] mb-4">Your Children</h2>
          
          {children.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="text-center py-12">
                <div className="w-16 h-16 bg-[#ECF0F1] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-[#7F8C8D]" />
                </div>
                <h3 className="font-bold text-lg text-[#2C3E50] mb-2">No children yet</h3>
                <p className="text-[#7F8C8D] mb-6 max-w-sm mx-auto">
                  Add your first child to start teaching them about saving and compound interest!
                </p>
                <Button onClick={() => setAddChildOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Child
                </Button>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {children.map((child, index) => (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <ChildCard
                    child={child}
                    interestEarnedThisMonth={child.interest_earned_this_month}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gradient-to-r from-[#3498DB]/5 to-[#2ECC71]/5">
            <CardContent className="pt-4">
              <p className="text-sm text-[#7F8C8D]">
                💡 <span className="font-medium text-[#2C3E50]">Tip:</span> Kids learn best when they can see their money growing. 
                Encourage them to check their balance daily!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Add Child Modal */}
      <AddChildModal
        open={addChildOpen}
        onOpenChange={setAddChildOpen}
        onSubmit={handleAddChild}
      />
    </div>
  );
}
