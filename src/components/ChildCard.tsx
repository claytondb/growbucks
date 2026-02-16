'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, Eye } from 'lucide-react';
import { GradientCard } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { formatMoney, formatPercent, getDisplayBalance } from '@/lib/utils';
import { Child } from '@/types/database';

interface ChildCardProps {
  child: Child;
  interestEarnedThisMonth?: number;
}

export default function ChildCard({ child, interestEarnedThisMonth = 0 }: ChildCardProps) {
  const [displayBalance, setDisplayBalance] = React.useState(child.balance_cents);

  // Real-time balance interpolation
  React.useEffect(() => {
    if (child.interest_paused) return;

    const updateBalance = () => {
      const balance = getDisplayBalance(
        child.balance_cents,
        child.interest_rate_daily,
        new Date(child.last_interest_at)
      );
      setDisplayBalance(balance);
    };

    updateBalance();
    const interval = setInterval(updateBalance, 1000); // Update every second

    return () => clearInterval(interval);
  }, [child]);

  const growthPercent = child.balance_cents > 0
    ? ((interestEarnedThisMonth / child.balance_cents) * 100).toFixed(1)
    : '0.0';

  return (
    <Link href={`/dashboard/child/${child.id}`}>
      <GradientCard interactive className="group">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar name={child.name} src={child.avatar_url} size="lg" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#2C3E50] truncate">
                {child.name}&apos;s Garden
              </h3>
              {child.interest_paused && (
                <span className="px-2 py-0.5 text-xs bg-[#E67E22]/10 text-[#E67E22] rounded-full">
                  Paused
                </span>
              )}
            </div>

            {/* Balance */}
            <motion.div
              className="mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-3xl font-mono font-bold text-[#2ECC71]">
                {formatMoney(Math.floor(displayBalance))}
              </span>
            </motion.div>

            {/* Growth indicator */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-[#27AE60]" />
                <span className="text-[#27AE60] font-medium">
                  {formatMoney(interestEarnedThisMonth, { showSign: true })} this month
                </span>
              </div>
              <span className="text-xs text-[#7F8C8D]">
                {formatPercent(child.interest_rate_daily)}/day
              </span>
            </div>
          </div>

          {/* View indicator */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-5 h-5 text-[#7F8C8D]" />
          </div>
        </div>
      </GradientCard>
    </Link>
  );
}
