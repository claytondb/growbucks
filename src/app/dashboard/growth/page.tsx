'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, DollarSign, Percent, ArrowUpRight, Sparkles, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface GrowthData {
  totalBalance: number;
  totalInterestEarned: number;
  interestToday: number;
  interestThisWeek: number;
  interestThisMonth: number;
  averageRate: number;
  childCount: number;
}

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export default function GrowthPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  const fetchGrowthData = useCallback(async () => {
    try {
      const res = await fetch('/api/children');
      if (res.ok) {
        const children = await res.json();
        
        if (children.length === 0) {
          setData(null);
        } else {
          // Calculate totals from children data
          const totalBalance = children.reduce((sum: number, c: any) => sum + c.balance_cents, 0);
          const totalInterestEarned = children.reduce((sum: number, c: any) => sum + (c.total_interest_earned || 0), 0);
          const interestThisMonth = children.reduce((sum: number, c: any) => sum + (c.interest_earned_this_month || 0), 0);
          const avgRate = children.length > 0 
            ? children.reduce((sum: number, c: any) => sum + c.interest_rate_daily, 0) / children.length 
            : 0;
          
          setData({
            totalBalance,
            totalInterestEarned,
            interestToday: Math.round(totalBalance * avgRate), // Estimate
            interestThisWeek: Math.round(interestThisMonth / 4), // Estimate
            interestThisMonth,
            averageRate: avgRate,
            childCount: children.length,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching growth data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchGrowthData();
    }
  }, [status, router, fetchGrowthData]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">Growth Overview</h1>
          <p className="text-[#7F8C8D] mb-8">Track how your family&apos;s savings are growing</p>

          <Card className="text-center py-16">
            <TrendingUp className="w-16 h-16 text-[#BDC3C7] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#2C3E50] mb-2">No growth data yet</h2>
            <p className="text-[#7F8C8D] mb-6 max-w-md mx-auto">
              Add a child and make your first deposit to start tracking growth. 
              Watch the magic of compound interest unfold!
            </p>
            <Link href="/dashboard">
              <Button>
                <PiggyBank className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </Card>

          {/* Educational content even when empty */}
          <Card className="mt-6 bg-gradient-to-br from-[#F8FAFE] to-white">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-[#F39C12]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#F39C12]" />
                </div>
                <div>
                  <p className="font-bold text-[#2C3E50] mb-1">The Magic of Compound Interest</p>
                  <p className="text-sm text-[#7F8C8D]">
                    At 1% daily interest, $100 becomes $137 in one month, and $3,778 in one year! 
                    That&apos;s the power of earning interest on your interest. The longer you save, 
                    the faster your money grows. 🌱
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Calculate projections based on current data
  const projectedMonthly = Math.round(data.totalBalance * data.averageRate * 30);
  const projectedYearly = Math.round(data.totalBalance * Math.pow(1 + data.averageRate, 365) - data.totalBalance);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#2C3E50]">Growth Overview</h1>
            <p className="text-[#7F8C8D]">Tracking {data.childCount} {data.childCount === 1 ? 'child' : 'children'}</p>
          </div>
          
          {/* Timeframe Toggle */}
          <div className="flex bg-[#ECF0F1] rounded-xl p-1">
            {(['week', 'month', 'year'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-white text-[#2ECC71] shadow-sm'
                    : 'text-[#7F8C8D] hover:text-[#2C3E50]'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-[#2ECC71] to-[#27AE60] text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 opacity-80" />
                  <span className="text-sm opacity-80">Total Balance</span>
                </div>
                <p className="text-3xl font-mono font-bold">{formatMoney(data.totalBalance)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+{formatMoney(data.interestToday)} today</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-[#F39C12] to-[#E67E22] text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 opacity-80" />
                  <span className="text-sm opacity-80">Interest This Month</span>
                </div>
                <p className="text-3xl font-mono font-bold">{formatMoney(data.interestThisMonth)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Growing daily</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-[#3498DB] to-[#2980B9] text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-5 h-5 opacity-80" />
                  <span className="text-sm opacity-80">Average Rate</span>
                </div>
                <p className="text-3xl font-mono font-bold">{(data.averageRate * 100).toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>per day</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Period Breakdown */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interest Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-[#F8FAFE] rounded-xl">
                <span className="text-[#7F8C8D]">Today (estimated)</span>
                <span className="font-mono font-bold text-[#2ECC71]">+{formatMoney(data.interestToday)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#F8FAFE] rounded-xl">
                <span className="text-[#7F8C8D]">This Week (estimated)</span>
                <span className="font-mono font-bold text-[#2ECC71]">+{formatMoney(data.interestThisWeek)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#F8FAFE] rounded-xl">
                <span className="text-[#7F8C8D]">This Month</span>
                <span className="font-mono font-bold text-[#2ECC71]">+{formatMoney(data.interestThisMonth)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-[#3498DB]/10 rounded-xl">
                <span className="text-[#7F8C8D]">Next Month</span>
                <span className="font-mono font-bold text-[#3498DB]">+{formatMoney(projectedMonthly)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#9B59B6]/10 rounded-xl">
                <span className="text-[#7F8C8D]">Next Year</span>
                <span className="font-mono font-bold text-[#9B59B6]">+{formatMoney(projectedYearly)}</span>
              </div>
              <p className="text-xs text-[#7F8C8D] text-center">
                Based on current balance and interest rates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Compound Interest Explainer */}
        <Card className="bg-gradient-to-br from-[#F8FAFE] to-white">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-[#F39C12]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-[#F39C12]" />
              </div>
              <div>
                <p className="font-bold text-[#2C3E50] mb-1">The Magic of Compound Interest</p>
                <p className="text-sm text-[#7F8C8D]">
                  At 1% daily interest, $100 becomes $137 in one month, and $3,778 in one year! 
                  That&apos;s the power of earning interest on your interest. The longer you save, 
                  the faster your money grows. 🌱
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
