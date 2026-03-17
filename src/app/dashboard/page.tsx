'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Wallet, Users, AlertCircle, ArrowDownCircle, CheckSquare, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ChildCard from '@/components/ChildCard';
import AddChildModal from '@/components/modals/AddChildModal';
import FunFactCard from '@/components/FunFacts';
import LeaderboardCard from '@/components/LeaderboardCard';
import { formatMoney, getGreeting } from '@/lib/utils';
import { Child } from '@/types/database';
import {
  type PendingActionsData,
  emptyPendingActions,
  pendingActionsSummary,
  actionReviewPath,
} from '@/lib/pending-actions';

interface ChildWithStats extends Child {
  interest_earned_this_month: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<ChildWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingActionsData>(emptyPendingActions());

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

  const fetchPendingActions = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-actions');
      if (res.ok) {
        const data = await res.json();
        setPendingActions(data);
      }
    } catch (error) {
      console.error('Error fetching pending actions:', error);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchChildren();
      fetchPendingActions();
    }
  }, [status, router, fetchChildren, fetchPendingActions]);

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
            <div className="flex items-center gap-2">
              <Button onClick={() => setAddChildOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Child
              </Button>
            </div>
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

        {/* Pending actions alert — withdrawals, chores, donations */}
        {pendingActions.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-[#E67E22] bg-[#E67E22]/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#E67E22] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#2C3E50] font-semibold mb-2">
                      {pendingActions.total} item{pendingActions.total !== 1 ? 's' : ''} need{pendingActions.total === 1 ? 's' : ''} your review
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pendingActions.withdrawals.length > 0 && (
                        <button
                          onClick={() => router.push(actionReviewPath('withdrawal'))}
                          className="flex items-center gap-1.5 text-xs bg-[#E67E22]/10 hover:bg-[#E67E22]/20 text-[#E67E22] px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          {pendingActions.withdrawals.length} withdrawal{pendingActions.withdrawals.length !== 1 ? 's' : ''}
                        </button>
                      )}
                      {pendingActions.choreCompletions.length > 0 && (
                        <button
                          onClick={() => router.push(
                            pendingActions.choreCompletions.length === 1
                              ? actionReviewPath('chore_completion', pendingActions.choreCompletions[0].childId)
                              : '/dashboard'
                          )}
                          className="flex items-center gap-1.5 text-xs bg-[#9B59B6]/10 hover:bg-[#9B59B6]/20 text-[#9B59B6] px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          {pendingActions.choreCompletions.length} chore{pendingActions.choreCompletions.length !== 1 ? 's' : ''}
                        </button>
                      )}
                      {pendingActions.donations.length > 0 && (
                        <button
                          onClick={() => router.push(
                            pendingActions.donations.length === 1
                              ? actionReviewPath('donation', pendingActions.donations[0].childId)
                              : '/dashboard'
                          )}
                          className="flex items-center gap-1.5 text-xs bg-[#E91E8C]/10 hover:bg-[#E91E8C]/20 text-[#E91E8C] px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <Heart className="w-3.5 h-3.5" />
                          {pendingActions.donations.length} donation{pendingActions.donations.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#7F8C8D] mt-2">
                      {pendingActionsSummary(pendingActions)} — tap to review
                    </p>
                  </div>
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
              <Card className="text-center py-8 sm:py-12 px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#ECF0F1] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 text-[#7F8C8D]" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-[#2C3E50] mb-2">No children yet</h3>
                <p className="text-sm sm:text-base text-[#7F8C8D] mb-6 max-w-sm mx-auto">
                  Add your first child to start teaching them about saving and compound interest!
                </p>
                <Button onClick={() => setAddChildOpen(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Child
                </Button>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
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

        {/* Sibling Leaderboard (only shows when 2+ children with different scores) */}
        {children.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <LeaderboardCard />
          </motion.div>
        )}

        {/* Fun Fact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <FunFactCard autoRotate={true} rotateInterval={20000} />
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
