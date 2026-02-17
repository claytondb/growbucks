'use client';

import { motion } from 'framer-motion';
import { Trophy, Lock, Sparkles, TrendingUp, Target, Coins, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'savings' | 'growth' | 'goals' | 'streaks';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

// Achievement definitions
export const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  // Savings milestones
  {
    id: 'first_dollar',
    name: 'First GrowBuck!',
    description: 'Reach $1 in savings',
    emoji: '🌱',
    category: 'savings',
    maxProgress: 100, // cents
  },
  {
    id: 'ten_dollars',
    name: 'Double Digits',
    description: 'Save $10 or more',
    emoji: '💵',
    category: 'savings',
    maxProgress: 1000,
  },
  {
    id: 'fifty_dollars',
    name: 'Halfway Hero',
    description: 'Save $50 or more',
    emoji: '🌟',
    category: 'savings',
    maxProgress: 5000,
  },
  {
    id: 'hundred_dollars',
    name: 'Century Saver',
    description: 'Save $100 or more',
    emoji: '💯',
    category: 'savings',
    maxProgress: 10000,
  },
  {
    id: 'five_hundred',
    name: 'Money Mountain',
    description: 'Save $500 or more',
    emoji: '🏔️',
    category: 'savings',
    maxProgress: 50000,
  },

  // Growth achievements
  {
    id: 'first_interest',
    name: 'Interest Earned',
    description: 'Earn your first interest payment',
    emoji: '✨',
    category: 'growth',
  },
  {
    id: 'dollar_from_interest',
    name: 'Free Money!',
    description: 'Earn $1 from interest alone',
    emoji: '🎁',
    category: 'growth',
    maxProgress: 100,
  },
  {
    id: 'ten_from_interest',
    name: 'Interest Machine',
    description: 'Earn $10 from interest',
    emoji: '🤖',
    category: 'growth',
    maxProgress: 1000,
  },

  // Goals
  {
    id: 'first_goal',
    name: 'Dream Setter',
    description: 'Create your first savings goal',
    emoji: '🎯',
    category: 'goals',
  },
  {
    id: 'goal_achieved',
    name: 'Goal Getter',
    description: 'Achieve a savings goal',
    emoji: '🏆',
    category: 'goals',
  },
  {
    id: 'five_goals',
    name: 'Dream Big',
    description: 'Achieve 5 savings goals',
    emoji: '🌈',
    category: 'goals',
    maxProgress: 5,
  },

  // Streaks
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Check your balance 7 days in a row',
    emoji: '📅',
    category: 'streaks',
    maxProgress: 7,
  },
  {
    id: 'month_no_withdraw',
    name: 'Diamond Hands',
    description: "Go a month without withdrawing",
    emoji: '💎',
    category: 'streaks',
    maxProgress: 30,
  },
];

// Calculate achievements based on child data
export function calculateAchievements(data: {
  balanceCents: number;
  totalInterestEarned: number;
  goalsCreated: number;
  goalsAchieved: number;
  hasEarnedInterest: boolean;
  daysSinceLastWithdraw: number;
  daysActive: number;
}): Achievement[] {
  return ACHIEVEMENTS.map((achievement) => {
    let unlocked = false;
    let progress: number | undefined;

    switch (achievement.id) {
      case 'first_dollar':
        unlocked = data.balanceCents >= 100;
        progress = Math.min(data.balanceCents, 100);
        break;
      case 'ten_dollars':
        unlocked = data.balanceCents >= 1000;
        progress = Math.min(data.balanceCents, 1000);
        break;
      case 'fifty_dollars':
        unlocked = data.balanceCents >= 5000;
        progress = Math.min(data.balanceCents, 5000);
        break;
      case 'hundred_dollars':
        unlocked = data.balanceCents >= 10000;
        progress = Math.min(data.balanceCents, 10000);
        break;
      case 'five_hundred':
        unlocked = data.balanceCents >= 50000;
        progress = Math.min(data.balanceCents, 50000);
        break;
      case 'first_interest':
        unlocked = data.hasEarnedInterest;
        break;
      case 'dollar_from_interest':
        unlocked = data.totalInterestEarned >= 100;
        progress = Math.min(data.totalInterestEarned, 100);
        break;
      case 'ten_from_interest':
        unlocked = data.totalInterestEarned >= 1000;
        progress = Math.min(data.totalInterestEarned, 1000);
        break;
      case 'first_goal':
        unlocked = data.goalsCreated > 0;
        break;
      case 'goal_achieved':
        unlocked = data.goalsAchieved > 0;
        break;
      case 'five_goals':
        unlocked = data.goalsAchieved >= 5;
        progress = Math.min(data.goalsAchieved, 5);
        break;
      case 'week_streak':
        unlocked = data.daysActive >= 7;
        progress = Math.min(data.daysActive, 7);
        break;
      case 'month_no_withdraw':
        unlocked = data.daysSinceLastWithdraw >= 30;
        progress = Math.min(data.daysSinceLastWithdraw, 30);
        break;
    }

    return {
      ...achievement,
      unlocked,
      progress,
    };
  });
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function AchievementBadge({ achievement, size = 'md', showProgress = true }: AchievementBadgeProps) {
  const sizes = {
    sm: { badge: 'w-12 h-12', emoji: 'text-xl', text: 'text-xs' },
    md: { badge: 'w-16 h-16', emoji: 'text-2xl', text: 'text-sm' },
    lg: { badge: 'w-20 h-20', emoji: 'text-3xl', text: 'text-base' },
  };

  const progressPercent = achievement.progress && achievement.maxProgress
    ? Math.min((achievement.progress / achievement.maxProgress) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative">
        {/* Badge */}
        <div
          className={cn(
            sizes[size].badge,
            'rounded-full flex items-center justify-center transition-all duration-300',
            achievement.unlocked
              ? 'bg-gradient-to-br from-[#F1C40F] to-[#E67E22] shadow-lg shadow-[#F1C40F]/30'
              : 'bg-[#ECF0F1]'
          )}
        >
          {achievement.unlocked ? (
            <span className={sizes[size].emoji}>{achievement.emoji}</span>
          ) : (
            <Lock className="w-1/2 h-1/2 text-[#BDC3C7]" />
          )}
        </div>

        {/* Progress ring for locked achievements */}
        {!achievement.unlocked && showProgress && progressPercent > 0 && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 36 36"
          >
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#2ECC71"
              strokeWidth="2"
              strokeDasharray={`${progressPercent} 100`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <div className="text-center">
        <p className={cn(
          sizes[size].text,
          'font-medium',
          achievement.unlocked ? 'text-[#2C3E50]' : 'text-[#7F8C8D]'
        )}>
          {achievement.name}
        </p>
      </div>
    </motion.div>
  );
}

interface AchievementsGridProps {
  achievements: Achievement[];
  className?: string;
}

export function AchievementsGrid({ achievements, className }: AchievementsGridProps) {
  const categories = [
    { id: 'savings', name: 'Savings', icon: Coins },
    { id: 'growth', name: 'Growth', icon: TrendingUp },
    { id: 'goals', name: 'Goals', icon: Target },
    { id: 'streaks', name: 'Streaks', icon: Calendar },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#F1C40F]" />
          <h2 className="text-xl font-bold text-[#2C3E50]">Achievements</h2>
        </div>
        <span className="text-sm text-[#7F8C8D]">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#ECF0F1] rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          className="h-full bg-gradient-to-r from-[#F1C40F] to-[#E67E22] rounded-full"
        />
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {categories.map((category) => {
          const categoryAchievements = achievements.filter(a => a.category === category.id);
          const CategoryIcon = category.icon;

          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-4">
                <CategoryIcon className="w-4 h-4 text-[#7F8C8D]" />
                <h3 className="text-sm font-medium text-[#7F8C8D] uppercase tracking-wide">
                  {category.name}
                </h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                {categoryAchievements.map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
