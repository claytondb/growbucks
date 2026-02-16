'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trophy, Calendar, TrendingUp, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Goal {
  id: string;
  childId: string;
  childName: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
  createdAt: string;
  achieved: boolean;
  emoji: string;
}

// Mock data
const mockGoals: Goal[] = [
  {
    id: '1',
    childId: 'c1',
    childName: 'Emma',
    name: 'New Bicycle',
    targetCents: 15000,
    currentCents: 8750,
    targetDate: '2026-04-01',
    createdAt: '2026-01-15',
    achieved: false,
    emoji: '🚲',
  },
  {
    id: '2',
    childId: 'c1',
    childName: 'Emma',
    name: 'Video Game',
    targetCents: 6000,
    currentCents: 6000,
    targetDate: null,
    createdAt: '2026-01-01',
    achieved: true,
    emoji: '🎮',
  },
  {
    id: '3',
    childId: 'c2',
    childName: 'Jake',
    name: 'Basketball',
    targetCents: 3500,
    currentCents: 2100,
    targetDate: '2026-03-15',
    createdAt: '2026-02-01',
    achieved: false,
    emoji: '🏀',
  },
];

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export default function GoalsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const filteredGoals = goals.filter(g => {
    if (filter === 'active') return !g.achieved;
    if (filter === 'achieved') return g.achieved;
    return true;
  });

  const activeGoals = goals.filter(g => !g.achieved);
  const achievedGoals = goals.filter(g => g.achieved);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#2C3E50]">Savings Goals</h1>
            <p className="text-[#7F8C8D]">Track progress toward family goals</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <Target className="w-8 h-8 text-[#3498DB] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#2C3E50]">{activeGoals.length}</p>
              <p className="text-sm text-[#7F8C8D]">Active Goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="w-8 h-8 text-[#F39C12] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#2C3E50]">{achievedGoals.length}</p>
              <p className="text-sm text-[#7F8C8D]">Achieved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingUp className="w-8 h-8 text-[#2ECC71] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#2C3E50]">
                {Math.round(activeGoals.reduce((acc, g) => acc + (g.currentCents / g.targetCents * 100), 0) / (activeGoals.length || 1))}%
              </p>
              <p className="text-sm text-[#7F8C8D]">Avg Progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'achieved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-[#2ECC71] text-white'
                  : 'bg-[#ECF0F1] text-[#7F8C8D] hover:bg-[#BDC3C7]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredGoals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="w-16 h-16 text-[#BDC3C7] mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#2C3E50] mb-2">No goals yet</p>
                  <p className="text-[#7F8C8D] mb-4">Create a savings goal to help kids stay motivated!</p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredGoals.map((goal, index) => {
                const progress = Math.min((goal.currentCents / goal.targetCents) * 100, 100);
                const daysLeft = goal.targetDate 
                  ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : null;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={goal.achieved ? 'border-[#F39C12] bg-[#F39C12]/5' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                            goal.achieved ? 'bg-[#F39C12]/10' : 'bg-[#3498DB]/10'
                          }`}>
                            {goal.achieved ? '🏆' : goal.emoji}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-[#2C3E50]">{goal.name}</h3>
                              {goal.achieved && (
                                <span className="px-2 py-0.5 bg-[#F39C12] text-white text-xs rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Achieved!
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#7F8C8D] mb-3">
                              {goal.childName}&apos;s goal
                              {daysLeft !== null && !goal.achieved && (
                                <span className="ml-2 text-[#E67E22]">
                                  • {daysLeft} days left
                                </span>
                              )}
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="relative h-4 bg-[#ECF0F1] rounded-full overflow-hidden mb-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className={`absolute inset-y-0 left-0 rounded-full ${
                                  goal.achieved 
                                    ? 'bg-gradient-to-r from-[#F39C12] to-[#E67E22]'
                                    : 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60]'
                                }`}
                              />
                              {progress >= 50 && (
                                <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white" />
                              )}
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="font-mono text-[#2ECC71]">{formatMoney(goal.currentCents)}</span>
                              <span className="text-[#7F8C8D]">{progress.toFixed(0)}%</span>
                              <span className="font-mono text-[#7F8C8D]">{formatMoney(goal.targetCents)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Tips */}
        <Card className="mt-6 bg-gradient-to-br from-[#F8FAFE] to-white">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-[#9B59B6]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-[#9B59B6]" />
              </div>
              <div>
                <p className="font-bold text-[#2C3E50] mb-1">Goal-Setting Tips</p>
                <p className="text-sm text-[#7F8C8D]">
                  Kids are more motivated when they pick their own goals! Let them choose something 
                  they really want, set a realistic target date, and celebrate the small wins along the way. 🎉
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Goal Modal (simplified) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2C3E50]">New Savings Goal</h2>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-[#7F8C8D]" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Goal Name</label>
                  <input
                    type="text"
                    placeholder="e.g., New Bicycle"
                    className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Target Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7F8C8D]">$</span>
                    <input
                      type="number"
                      placeholder="100.00"
                      className="w-full pl-8 pr-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Target Date (optional)</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                  />
                </div>
                
                <Button className="w-full" onClick={() => setShowAddModal(false)}>
                  Create Goal 🎯
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
