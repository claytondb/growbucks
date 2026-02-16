'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trophy, TrendingUp, X, Check, Sparkles, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface Goal {
  id: string;
  child_id: string;
  child_name: string;
  name: string;
  target_cents: number;
  current_cents: number;
  target_date: string | null;
  created_at: string;
  achieved_at: string | null;
  emoji: string;
}

interface Child {
  id: string;
  name: string;
  balance_cents: number;
}

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const GOAL_EMOJIS = ['🚲', '🎮', '🏀', '📱', '🎸', '🛹', '👟', '🎨', '📚', '🎪', '🎠', '🏕️'];

export default function GoalsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('all');
  
  // Form state
  const [newGoal, setNewGoal] = useState({
    child_id: '',
    name: '',
    target_cents: '',
    target_date: '',
    emoji: '🎯',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [childrenRes, goalsRes] = await Promise.all([
        fetch('/api/children'),
        fetch('/api/goals'),
      ]);
      
      if (childrenRes.ok) {
        const childrenData = await childrenRes.json();
        setChildren(childrenData);
      }
      
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.child_id || !newGoal.name || !newGoal.target_cents) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: newGoal.child_id,
          name: newGoal.name,
          target_cents: Math.round(parseFloat(newGoal.target_cents) * 100),
          target_date: newGoal.target_date || null,
          emoji: newGoal.emoji,
        }),
      });
      
      if (res.ok) {
        setShowAddModal(false);
        setNewGoal({ child_id: '', name: '', target_cents: '', target_date: '', emoji: '🎯' });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredGoals = goals.filter(g => {
    if (filter === 'active') return !g.achieved_at;
    if (filter === 'achieved') return !!g.achieved_at;
    return true;
  });

  const activeGoals = goals.filter(g => !g.achieved_at);
  const achievedGoals = goals.filter(g => g.achieved_at);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  // No children state
  if (children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">Savings Goals</h1>
          <p className="text-[#7F8C8D] mb-8">Track progress toward family goals</p>

          <Card className="text-center py-16">
            <PiggyBank className="w-16 h-16 text-[#BDC3C7] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#2C3E50] mb-2">Add a child first</h2>
            <p className="text-[#7F8C8D] mb-6 max-w-md mx-auto">
              Before creating savings goals, you need to add at least one child to your family.
            </p>
            <Link href="/dashboard">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Child
              </Button>
            </Link>
          </Card>
        </motion.div>
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
                {activeGoals.length > 0 
                  ? Math.round(activeGoals.reduce((acc, g) => acc + (g.current_cents / g.target_cents * 100), 0) / activeGoals.length)
                  : 0}%
              </p>
              <p className="text-sm text-[#7F8C8D]">Avg Progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        {goals.length > 0 && (
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
        )}

        {/* Goals List */}
        <div className="space-y-4">
          <AnimatePresence>
            {goals.length === 0 ? (
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
            ) : filteredGoals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-[#7F8C8D]">No {filter} goals found</p>
                </CardContent>
              </Card>
            ) : (
              filteredGoals.map((goal, index) => {
                const progress = Math.min((goal.current_cents / goal.target_cents) * 100, 100);
                const isAchieved = !!goal.achieved_at;
                const daysLeft = goal.target_date && !isAchieved
                  ? Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : null;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={isAchieved ? 'border-[#F39C12] bg-[#F39C12]/5' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                            isAchieved ? 'bg-[#F39C12]/10' : 'bg-[#3498DB]/10'
                          }`}>
                            {isAchieved ? '🏆' : goal.emoji}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-[#2C3E50]">{goal.name}</h3>
                              {isAchieved && (
                                <span className="px-2 py-0.5 bg-[#F39C12] text-white text-xs rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Achieved!
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#7F8C8D] mb-3">
                              {goal.child_name}&apos;s goal
                              {daysLeft !== null && (
                                <span className={`ml-2 ${daysLeft < 7 ? 'text-[#E74C3C]' : 'text-[#E67E22]'}`}>
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
                                  isAchieved 
                                    ? 'bg-gradient-to-r from-[#F39C12] to-[#E67E22]'
                                    : 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60]'
                                }`}
                              />
                              {progress >= 50 && (
                                <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white" />
                              )}
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="font-mono text-[#2ECC71]">{formatMoney(goal.current_cents)}</span>
                              <span className="text-[#7F8C8D]">{progress.toFixed(0)}%</span>
                              <span className="font-mono text-[#7F8C8D]">{formatMoney(goal.target_cents)}</span>
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

      {/* Add Goal Modal */}
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
              
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">For which child?</label>
                  <select
                    value={newGoal.child_id}
                    onChange={(e) => setNewGoal({ ...newGoal, child_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select a child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Goal Name</label>
                  <input
                    type="text"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="e.g., New Bicycle"
                    className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Choose an emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewGoal({ ...newGoal, emoji })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                          newGoal.emoji === emoji 
                            ? 'bg-[#2ECC71]/20 ring-2 ring-[#2ECC71]' 
                            : 'bg-[#ECF0F1] hover:bg-[#BDC3C7]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Target Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7F8C8D]">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={newGoal.target_cents}
                      onChange={(e) => setNewGoal({ ...newGoal, target_cents: e.target.value })}
                      placeholder="100.00"
                      className="w-full pl-8 pr-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#7F8C8D] mb-1">Target Date (optional)</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-[#ECF0F1] rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Goal 🎯'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
