'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronRight, X, Sparkles } from 'lucide-react';

// Financial tips for kids - age-appropriate and educational
const FINANCIAL_TIPS = [
  {
    title: "The Power of Patience",
    tip: "If you save $1 today and let it grow, it could become $2 without you doing anything! That's the magic of compound interest.",
    emoji: "⏰"
  },
  {
    title: "Needs vs. Wants",
    tip: "Before buying something, ask yourself: 'Do I NEED this, or do I just WANT it?' Saving for needs first is super smart!",
    emoji: "🤔"
  },
  {
    title: "The Rule of 72",
    tip: "Want to know when your money will double? Divide 72 by your interest rate! At 2% daily, your money doubles fast!",
    emoji: "✖️"
  },
  {
    title: "Pay Yourself First",
    tip: "When you get money, save some BEFORE spending. Even saving 10% adds up to big savings over time!",
    emoji: "🥇"
  },
  {
    title: "Small Amounts Add Up",
    tip: "Saving just $1 a day means $365 a year! Small, consistent saving beats big, rare deposits.",
    emoji: "🐢"
  },
  {
    title: "Goals Make Saving Fun",
    tip: "Set a savings goal for something you really want. Watching your progress bar fill up is exciting!",
    emoji: "🎯"
  },
  {
    title: "Money Grows While You Sleep",
    tip: "Your GrowBucks account earns interest even when you're asleep! That's why saving early is powerful.",
    emoji: "😴"
  },
  {
    title: "The Waiting Game Wins",
    tip: "If you want something, try waiting 24 hours before buying. Often, you'll realize you didn't need it!",
    emoji: "⏳"
  },
  {
    title: "Celebrate Small Wins",
    tip: "Every time you save instead of spend, you're winning! Those small wins lead to big achievements.",
    emoji: "🎉"
  },
  {
    title: "Your Future Self",
    tip: "When you save money today, you're giving a gift to your future self. Future You will be grateful!",
    emoji: "🎁"
  },
  {
    title: "Compare Before You Buy",
    tip: "The same toy or game might cost different amounts at different stores. Looking around can save you money!",
    emoji: "🔍"
  },
  {
    title: "Money Can Grow Forever",
    tip: "Interest earns interest! This is called compound interest, and it's like a snowball that keeps getting bigger.",
    emoji: "⛄"
  },
  {
    title: "Saving is a Superpower",
    tip: "Saving money gives you choices. The more you save, the more options you'll have in the future!",
    emoji: "🦸"
  },
  {
    title: "Don't Keep All Eggs in One Basket",
    tip: "When you're older, you might want to save in different ways. For now, your GrowBucks is a great start!",
    emoji: "🥚"
  },
  {
    title: "Track Your Progress",
    tip: "Looking at how much you've saved helps you stay motivated. Check your growth chart regularly!",
    emoji: "📈"
  },
  {
    title: "The More You Save, The More You Earn",
    tip: "A bigger balance earns more interest. It's like having more seeds—they all grow at the same time!",
    emoji: "🌱"
  },
  {
    title: "Impulse vs. Planned",
    tip: "Planned purchases are usually better than impulse buys. Give yourself time to think about big purchases.",
    emoji: "📝"
  },
  {
    title: "Money Doesn't Grow on Trees",
    tip: "But in your GrowBucks account, it kind of does! Your interest is like tiny leaves growing every day.",
    emoji: "🌳"
  },
  {
    title: "Be a Smart Spender",
    tip: "It's okay to spend money! The trick is spending on things that really make you happy, not just anything.",
    emoji: "🧠"
  },
  {
    title: "Start Early, Win Big",
    tip: "Starting to save when you're young gives your money more time to grow. You have a head start!",
    emoji: "🏃"
  }
];

// Get a consistent tip based on the date (changes daily)
function getTipOfTheDay(): typeof FINANCIAL_TIPS[0] {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return FINANCIAL_TIPS[dayOfYear % FINANCIAL_TIPS.length];
}

interface FinancialTipProps {
  className?: string;
  dismissible?: boolean;
  compact?: boolean;
}

export default function FinancialTip({ className = '', dismissible = true, compact = false }: FinancialTipProps) {
  const [visible, setVisible] = useState(true);
  const [tip, setTip] = useState<typeof FINANCIAL_TIPS[0] | null>(null);

  useEffect(() => {
    // Get tip on client side to avoid hydration mismatch
    setTip(getTipOfTheDay());
  }, []);

  if (!visible || !tip) {
    return null;
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-[#F1C40F]/10 to-[#E67E22]/10 rounded-lg p-3 ${className}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">{tip.emoji}</span>
          <p className="text-sm text-[#2C3E50]">
            <span className="font-medium">{tip.title}:</span>{' '}
            {tip.tip}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-gradient-to-br from-[#FEF9E7] to-[#FCF3CF] rounded-xl p-4 border border-[#F1C40F]/30 ${className}`}
    >
      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 p-1 text-[#7F8C8D] hover:text-[#2C3E50] transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#F1C40F] flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-[#B7950B]">Tip of the Day</span>
          <Sparkles className="w-3 h-3 text-[#F1C40F]" />
        </div>
      </div>

      {/* Tip content */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
        <div>
          <h3 className="font-bold text-[#2C3E50] mb-1">{tip.title}</h3>
          <p className="text-sm text-[#5D6D7E] leading-relaxed">{tip.tip}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Mini version for dashboard cards
export function FinancialTipMini() {
  const [tip, setTip] = useState<typeof FINANCIAL_TIPS[0] | null>(null);

  useEffect(() => {
    setTip(getTipOfTheDay());
  }, []);

  if (!tip) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{tip.emoji}</span>
      <span className="text-[#7F8C8D] truncate">{tip.title}</span>
    </div>
  );
}
