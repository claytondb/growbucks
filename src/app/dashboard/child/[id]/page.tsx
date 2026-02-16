'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Minus,
  TrendingUp,
  Sparkles,
  Settings,
  Pause,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import GrowthChart from '@/components/charts/GrowthChart';
import TransactionList from '@/components/TransactionList';
import DepositModal from '@/components/modals/DepositModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import Wallet from '@/components/Wallet';
import { formatMoney, formatPercent, getDisplayBalance } from '@/lib/utils';
import { Child, Transaction } from '@/types/database';

interface ChildWithDetails extends Child {
  transactions: Transaction[];
  interest_earned_today: number;
  interest_earned_this_month: number;
}

export default function ChildDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const childId = params.id as string;

  const [child, setChild] = useState<ChildWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const fetchChild = useCallback(async () => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      if (res.ok) {
        const data = await res.json();
        setChild(data);
        setDisplayBalance(data.balance_cents);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching child:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [childId, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchChild();
    }
  }, [status, router, fetchChild]);

  // Real-time balance animation
  useEffect(() => {
    if (!child || child.interest_paused) return;

    const updateBalance = () => {
      const balance = getDisplayBalance(
        child.balance_cents,
        child.interest_rate_daily,
        new Date(child.last_interest_at)
      );
      setDisplayBalance(balance);
    };

    updateBalance();
    const interval = setInterval(updateBalance, 100);

    return () => clearInterval(interval);
  }, [child]);

  const handleDeposit = async (data: { amount_cents: number; description?: string }) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        type: 'deposit',
        ...data,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to deposit');
    }

    await fetchChild();
  };

  const handleWithdraw = async (data: { amount_cents: number; description?: string }) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        type: 'withdrawal',
        ...data,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to withdraw');
    }

    await fetchChild();
  };

  const toggleInterestPause = async () => {
    if (!child) return;

    const res = await fetch(`/api/children/${childId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interest_paused: !child.interest_paused }),
    });

    if (res.ok) {
      await fetchChild();
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#7F8C8D]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFE]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECF0F1] sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <Avatar name={child.name} src={child.avatar_url} size="md" />
              <div>
                <h1 className="font-bold text-lg text-[#2C3E50]">{child.name}&apos;s Garden</h1>
                <div className="flex items-center gap-2 text-sm text-[#7F8C8D]">
                  <span>{formatPercent(child.interest_rate_daily)}/day</span>
                  {child.interest_paused && (
                    <span className="px-2 py-0.5 bg-[#E67E22]/10 text-[#E67E22] rounded-full text-xs">
                      Paused
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/dashboard/child/${childId}/settings`}>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Visual Wallet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Wallet
            balanceCents={child.balance_cents}
            lockedPercentage={child.locked_percentage || 0}
            interestRate={child.interest_rate_daily}
            lastInterestAt={new Date(child.last_interest_at)}
            isPaused={child.interest_paused}
            onWithdraw={async (amountCents) => {
              await handleWithdraw({ amount_cents: amountCents, description: 'Quick withdrawal from wallet' });
            }}
            isParent={true}
          />
        </motion.div>

        {/* Interest Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[#F39C12]/10 rounded-xl">
                  <p className="text-sm text-[#7F8C8D]">Today&apos;s Interest</p>
                  <p className="text-xl font-mono font-bold text-[#F39C12]">
                    +{formatMoney(child.interest_earned_today)}
                  </p>
                </div>
                <div className="text-center p-3 bg-[#27AE60]/10 rounded-xl">
                  <p className="text-sm text-[#7F8C8D]">This Month</p>
                  <p className="text-xl font-mono font-bold text-[#27AE60]">
                    +{formatMoney(child.interest_earned_this_month)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Button
            variant="deposit"
            className="h-auto py-4 flex-col"
            onClick={() => setDepositOpen(true)}
          >
            <Plus className="w-6 h-6 mb-1" />
            <span>Deposit</span>
          </Button>
          <Button
            variant="withdraw"
            className="h-auto py-4 flex-col"
            onClick={() => setWithdrawOpen(true)}
            disabled={child.balance_cents <= 0}
          >
            <Minus className="w-6 h-6 mb-1" />
            <span>Withdraw</span>
          </Button>
          <Button
            variant="secondary"
            className="h-auto py-4 flex-col"
            onClick={toggleInterestPause}
          >
            {child.interest_paused ? (
              <>
                <Play className="w-6 h-6 mb-1" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-6 h-6 mb-1" />
                <span>Pause</span>
              </>
            )}
          </Button>
        </motion.div>

        {/* Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#2ECC71]" />
                Growth Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GrowthChart
                transactions={child.transactions}
                currentBalance={child.balance_cents}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionList
                transactions={child.transactions}
                limit={20}
              />
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Modals */}
      <DepositModal
        open={depositOpen}
        onOpenChange={setDepositOpen}
        child={child}
        onSubmit={handleDeposit}
      />

      <WithdrawModal
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        child={child}
        isParent={true}
        onSubmit={handleWithdraw}
      />
    </div>
  );
}
