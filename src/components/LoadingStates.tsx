'use client';

import { motion } from 'framer-motion';
import { Sprout, TrendingUp, Coins, Target } from 'lucide-react';

// Fun loading messages for kids
const LOADING_MESSAGES = [
  { emoji: '🌱', text: 'Growing your money...' },
  { emoji: '✨', text: 'Counting your savings...' },
  { emoji: '🚀', text: 'Launching calculator...' },
  { emoji: '💰', text: 'Stacking GrowBucks...' },
  { emoji: '🔢', text: 'Adding up the interest...' },
  { emoji: '🌟', text: 'Making magic happen...' },
];

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  showMessage?: boolean;
}

export function LoadingSpinner({ size = 'md', message, showMessage = true }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
  };

  const randomMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
  const displayMessage = message || randomMessage.text;
  const emoji = message ? '⏳' : randomMessage.emoji;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} border-[#2ECC71] border-t-transparent rounded-full animate-spin`} />
      {showMessage && (
        <p className="text-[#7F8C8D] text-sm flex items-center gap-2">
          <span>{emoji}</span>
          <span>{displayMessage}</span>
        </p>
      )}
    </div>
  );
}

// Full page loading state
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFE]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-20 h-20 bg-[#2ECC71] rounded-3xl mx-auto mb-6 flex items-center justify-center"
        >
          <Sprout className="w-10 h-10 text-white" />
        </motion.div>
        <LoadingSpinner size="lg" />
      </motion.div>
    </div>
  );
}

// Skeleton components for content loading
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#ECF0F1] animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#ECF0F1] rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-[#ECF0F1] rounded w-24 mb-2" />
          <div className="h-6 bg-[#ECF0F1] rounded w-32" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-[#ECF0F1] animate-pulse">
          <div className="w-10 h-10 bg-[#ECF0F1] rounded-xl mb-3" />
          <div className="h-3 bg-[#ECF0F1] rounded w-16 mb-2" />
          <div className="h-6 bg-[#ECF0F1] rounded w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#ECF0F1] animate-pulse">
      <div className="h-4 bg-[#ECF0F1] rounded w-32 mb-6" />
      <div className="h-48 bg-[#ECF0F1] rounded-xl" />
    </div>
  );
}

export function SkeletonTransactions() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-10 h-10 bg-[#ECF0F1] rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-[#ECF0F1] rounded w-24 mb-2" />
            <div className="h-3 bg-[#ECF0F1] rounded w-16" />
          </div>
          <div className="h-5 bg-[#ECF0F1] rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Oops! Something went wrong', 
  message = 'We couldn\'t load your data. Please try again.',
  onRetry 
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 bg-[#E74C3C]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
        <span className="text-4xl">😵</span>
      </div>
      <h3 className="text-lg font-bold text-[#2C3E50] mb-2">{title}</h3>
      <p className="text-[#7F8C8D] mb-6 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-[#2ECC71] text-white rounded-xl font-medium hover:bg-[#27AE60] transition-colors"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
}

// Empty states for different scenarios
interface EmptyStateProps {
  type: 'children' | 'transactions' | 'goals';
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const states = {
    children: {
      emoji: '👨‍👩‍👧‍👦',
      title: 'No children yet!',
      message: 'Add your first child to start teaching them about saving and compound interest.',
      actionText: 'Add Your First Child',
    },
    transactions: {
      emoji: '📝',
      title: 'No transactions yet',
      message: 'Deposits, withdrawals, and interest will appear here.',
      actionText: 'Make a Deposit',
    },
    goals: {
      emoji: '🎯',
      title: 'No savings goals',
      message: 'Set a goal to help motivate saving! What are you saving for?',
      actionText: 'Create a Goal',
    },
  };

  const state = states[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 bg-[#ECF0F1] rounded-full mx-auto mb-4 flex items-center justify-center">
        <span className="text-4xl">{state.emoji}</span>
      </div>
      <h3 className="text-lg font-bold text-[#2C3E50] mb-2">{state.title}</h3>
      <p className="text-[#7F8C8D] mb-6 max-w-sm mx-auto">{state.message}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-[#2ECC71] text-white rounded-xl font-medium hover:bg-[#27AE60] transition-colors"
        >
          {state.actionText}
        </button>
      )}
    </motion.div>
  );
}
