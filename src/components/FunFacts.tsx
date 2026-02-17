'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RefreshCw } from 'lucide-react';

interface FunFact {
  emoji: string;
  title: string;
  fact: string;
}

const FUN_FACTS: FunFact[] = [
  {
    emoji: '🚀',
    title: 'Rocket Growth',
    fact: 'At 1% daily interest, $100 becomes over $3,700 in just one year! That\'s the power of compound interest.',
  },
  {
    emoji: '⏰',
    title: 'Time is Money',
    fact: 'The earlier you start saving, the more your money grows. Even small amounts add up over time!',
  },
  {
    emoji: '🎯',
    title: 'Goal Power',
    fact: 'People who set savings goals are 42% more likely to reach them. What are you saving for?',
  },
  {
    emoji: '💎',
    title: 'Diamond Hands',
    fact: 'The hardest part of saving is not spending! Every day you keep your money saved, it grows more.',
  },
  {
    emoji: '🧮',
    title: 'Interest on Interest',
    fact: 'Compound interest means you earn interest on your interest! It\'s like your money making babies.',
  },
  {
    emoji: '🐢',
    title: 'Slow and Steady',
    fact: 'Warren Buffett made 99% of his wealth after age 50. Patience is the secret to growing rich!',
  },
  {
    emoji: '🎢',
    title: 'Rule of 72',
    fact: 'To know how fast your money doubles, divide 72 by the interest rate. At 1%/day, it doubles in about 72 days!',
  },
  {
    emoji: '🌊',
    title: 'Every Drop Counts',
    fact: 'Saving just $1 a day adds up to $365 a year. With interest, it\'s even more!',
  },
  {
    emoji: '🏆',
    title: 'Savers Win',
    fact: 'Kids who learn to save early are more likely to be financially successful adults.',
  },
  {
    emoji: '🎮',
    title: 'Level Up',
    fact: 'Think of saving like a video game - the longer you play (save), the higher your score (balance) gets!',
  },
];

interface FunFactCardProps {
  className?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
}

export default function FunFactCard({ 
  className, 
  autoRotate = false, 
  rotateInterval = 10000 
}: FunFactCardProps) {
  const [currentIndex, setCurrentIndex] = useState(() => 
    Math.floor(Math.random() * FUN_FACTS.length)
  );
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      nextFact();
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval]);

  const nextFact = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % FUN_FACTS.length);
      setIsAnimating(false);
    }, 150);
  };

  const fact = FUN_FACTS[currentIndex];

  return (
    <div className={`bg-gradient-to-r from-[#9B59B6]/5 to-[#3498DB]/5 rounded-2xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#9B59B6]/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-[#9B59B6]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#9B59B6] uppercase tracking-wide">
              Did You Know?
            </span>
            <button
              onClick={nextFact}
              className="p-1 hover:bg-[#9B59B6]/10 rounded-lg transition-colors"
              title="Show another fact"
            >
              <RefreshCw className={`w-4 h-4 text-[#7F8C8D] ${isAnimating ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{fact.emoji}</span>
                <h4 className="font-bold text-[#2C3E50]">{fact.title}</h4>
              </div>
              <p className="text-sm text-[#7F8C8D]">{fact.fact}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Simple inline fun fact for smaller spaces
export function InlineFunFact() {
  const [fact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);

  return (
    <div className="flex items-center gap-2 text-sm text-[#7F8C8D]">
      <span>{fact.emoji}</span>
      <span><strong className="text-[#2C3E50]">{fact.title}:</strong> {fact.fact}</span>
    </div>
  );
}
