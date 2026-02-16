'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthData {
  totalBalance: number;
  totalInterestEarned: number;
  interestToday: number;
  interestThisWeek: number;
  interestThisMonth: number;
  averageRate: number;
  projectedMonthly: number;
  projectedYearly: number;
}

// Mock data - replace with API
const mockGrowthData: GrowthData = {
  totalBalance: 52347, // cents
  totalInterestEarned: 12847,
  interestToday: 523,
  interestThisWeek: 3567,
  interestThisMonth: 12847,
  averageRate: 0.01,
  projectedMonthly: 15678,
  projectedYearly: 188136,
};

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export default function GrowthPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<GrowthData>(mockGrowthData);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
            <h1 className="text-2xl font-bold text-[#2C3E50]">Growth Overview</h1>
            <p className="text-[#7F8C8D]">Track how your family&apos;s savings are growing</p>
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
                  <span className="text-sm opacity-80">Interest Earned</span>
                </div>
                <p className="text-3xl font-mono font-bold">{formatMoney(data.totalInterestEarned)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>All time</span>
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

        {/* Growth Chart Placeholder */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2ECC71]" />
              Growth Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-t from-[#2ECC71]/10 to-transparent rounded-xl flex items-end justify-center">
              {/* Simple bar chart visualization */}
              <div className="flex items-end gap-2 h-full pb-4">
                {[35, 42, 48, 45, 55, 62, 58, 70, 75, 72, 85, 90].map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.05 * i, duration: 0.5 }}
                    className="w-6 md:w-10 bg-gradient-to-t from-[#2ECC71] to-[#27AE60] rounded-t"
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm text-[#7F8C8D] mt-4">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </CardContent>
        </Card>

        {/* Period Breakdown */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interest Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-[#F8FAFE] rounded-xl">
                <span className="text-[#7F8C8D]">Today</span>
                <span className="font-mono font-bold text-[#2ECC71]">+{formatMoney(data.interestToday)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#F8FAFE] rounded-xl">
                <span className="text-[#7F8C8D]">This Week</span>
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
                <span className="font-mono font-bold text-[#3498DB]">+{formatMoney(data.projectedMonthly)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#9B59B6]/10 rounded-xl">
                <span className="text-[#7F8C8D]">Next Year</span>
                <span className="font-mono font-bold text-[#9B59B6]">+{formatMoney(data.projectedYearly)}</span>
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
