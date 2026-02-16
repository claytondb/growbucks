'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, ArrowUpRight, Settings2 } from 'lucide-react';
import { formatMoney, formatDate, cn } from '@/lib/utils';
import { Transaction } from '@/types/database';

interface TransactionListProps {
  transactions: Transaction[];
  className?: string;
  limit?: number;
}

const transactionConfig = {
  deposit: {
    icon: Coins,
    iconBg: 'bg-[#2ECC71]/10',
    iconColor: 'text-[#2ECC71]',
    label: 'Added',
    amountColor: 'text-[#2ECC71]',
    sign: '+',
  },
  interest: {
    icon: Sparkles,
    iconBg: 'bg-[#F1C40F]/10',
    iconColor: 'text-[#F1C40F]',
    label: 'Interest earned!',
    amountColor: 'text-[#F39C12]',
    sign: '+',
  },
  withdrawal: {
    icon: ArrowUpRight,
    iconBg: 'bg-[#E74C3C]/10',
    iconColor: 'text-[#E74C3C]',
    label: 'Withdrawn',
    amountColor: 'text-[#E74C3C]',
    sign: '-',
  },
  adjustment: {
    icon: Settings2,
    iconBg: 'bg-[#7F8C8D]/10',
    iconColor: 'text-[#7F8C8D]',
    label: 'Adjustment',
    amountColor: 'text-[#7F8C8D]',
    sign: '',
  },
};

export default function TransactionList({ transactions, className, limit }: TransactionListProps) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  if (transactions.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Coins className="w-12 h-12 mx-auto text-[#BDC3C7] mb-3" />
        <p className="text-[#7F8C8D]">No transactions yet</p>
        <p className="text-sm text-[#BDC3C7]">Deposits and interest will appear here</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <AnimatePresence initial={false}>
        {displayTransactions.map((tx, index) => {
          const config = transactionConfig[tx.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFE] transition-colors"
            >
              {/* Icon */}
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', config.iconBg)}>
                <Icon className={cn('w-5 h-5', config.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#2C3E50] truncate">
                  {tx.description || config.label}
                </p>
                <p className="text-sm text-[#7F8C8D]">
                  {formatDate(tx.created_at)}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={cn('font-mono font-bold', config.amountColor)}>
                  {config.sign}{formatMoney(Math.abs(tx.amount_cents))}
                </p>
                {tx.status === 'pending' && (
                  <span className="text-xs text-[#E67E22] bg-[#E67E22]/10 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Compact version for quick view
export function TransactionListCompact({ transactions, limit = 3 }: TransactionListProps) {
  const displayTransactions = transactions.slice(0, limit);

  return (
    <div className="space-y-2">
      {displayTransactions.map((tx) => {
        const config = transactionConfig[tx.type];
        const Icon = config.icon;

        return (
          <div
            key={tx.id}
            className="flex items-center gap-2 text-sm"
          >
            <Icon className={cn('w-4 h-4', config.iconColor)} />
            <span className="text-[#7F8C8D] flex-1 truncate">
              {tx.description || config.label}
            </span>
            <span className={cn('font-mono font-medium', config.amountColor)}>
              {config.sign}{formatMoney(Math.abs(tx.amount_cents))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
