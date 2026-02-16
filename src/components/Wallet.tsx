'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GrowBuck {
  id: string;
  value: number; // in cents
  isLocked: boolean;
}

interface WalletProps {
  balanceCents: number;
  lockedPercentage?: number; // 0-100
  interestRate: number; // daily rate as decimal (0.01 = 1%)
  lastInterestAt: Date;
  isPaused?: boolean;
  onWithdraw?: (amountCents: number) => void;
  isParent?: boolean;
}

// Generate GrowBucks from balance
function generateGrowBucks(balanceCents: number, lockedPercentage: number = 0): GrowBuck[] {
  const bucks: GrowBuck[] = [];
  let remaining = balanceCents;
  const lockedAmount = Math.floor(balanceCents * (lockedPercentage / 100));
  let lockedRemaining = lockedAmount;
  
  // Create bills in denominations
  const denominations = [10000, 5000, 2000, 1000, 500, 100]; // $100, $50, $20, $10, $5, $1
  
  for (const denom of denominations) {
    while (remaining >= denom && bucks.length < 12) { // Max 12 bills for visual clarity
      const isLocked = lockedRemaining >= denom;
      if (isLocked) lockedRemaining -= denom;
      
      bucks.push({
        id: `buck-${bucks.length}-${denom}`,
        value: denom,
        isLocked,
      });
      remaining -= denom;
    }
  }
  
  return bucks;
}

// Format cents to dollar string
function formatDollar(cents: number): string {
  return `$${Math.floor(cents / 100)}`;
}

export default function Wallet({
  balanceCents,
  lockedPercentage = 0,
  interestRate,
  lastInterestAt,
  isPaused = false,
  onWithdraw,
  isParent = false,
}: WalletProps) {
  const [growBucks, setGrowBucks] = useState<GrowBuck[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [interestFill, setInterestFill] = useState(0);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<string | null>(null);
  
  // Generate bills when balance changes
  useEffect(() => {
    setGrowBucks(generateGrowBucks(balanceCents, lockedPercentage));
  }, [balanceCents, lockedPercentage]);
  
  // Animate interest fill
  useEffect(() => {
    if (isPaused || interestRate <= 0) {
      setInterestFill(0);
      return;
    }
    
    const updateFill = () => {
      const now = new Date();
      const lastInterest = new Date(lastInterestAt);
      const msElapsed = now.getTime() - lastInterest.getTime();
      const msPerDay = 24 * 60 * 60 * 1000;
      
      // How much of the day has passed (for visual effect, not actual calculation)
      // Reset every "cycle" - let's say every 10 seconds for visual appeal
      const cycleMs = 10000;
      const cycleProgress = (msElapsed % cycleMs) / cycleMs;
      setInterestFill(cycleProgress * 100);
    };
    
    updateFill();
    const interval = setInterval(updateFill, 100);
    return () => clearInterval(interval);
  }, [isPaused, interestRate, lastInterestAt]);
  
  const handleBuckClick = (buck: GrowBuck) => {
    if (buck.isLocked && !isParent) return;
    setShowWithdrawConfirm(buck.id);
  };
  
  const confirmWithdraw = (buck: GrowBuck) => {
    if (onWithdraw) {
      onWithdraw(buck.value);
    }
    setShowWithdrawConfirm(null);
  };
  
  return (
    <div className="relative">
      {/* Wallet Container */}
      <div className="relative w-full max-w-sm mx-auto">
        {/* Wallet Back */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#8B4513] to-[#654321] rounded-3xl transform translate-y-2" />
        
        {/* Wallet Body */}
        <div className="relative bg-gradient-to-b from-[#A0522D] to-[#8B4513] rounded-3xl p-6 shadow-xl border-4 border-[#654321]">
          {/* Stitching Effect */}
          <div className="absolute inset-4 border-2 border-dashed border-[#D2691E]/30 rounded-2xl pointer-events-none" />
          
          {/* Wallet Label */}
          <div className="text-center mb-4">
            <span className="text-[#FFD700] font-bold text-sm tracking-wider">GROWBUCKS</span>
          </div>
          
          {/* Bills Container */}
          <div className="relative min-h-[200px] flex flex-col items-center justify-center gap-1">
            {growBucks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-2">🪹</div>
                <p className="text-[#FFD700]/60 text-sm">Empty wallet</p>
                <p className="text-[#FFD700]/40 text-xs mt-1">Add GrowBucks to start!</p>
              </div>
            ) : (
              <AnimatePresence>
                {growBucks.map((buck, index) => (
                  <motion.div
                    key={buck.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ 
                      opacity: 1, 
                      x: hoveredId === buck.id ? 30 : 0,
                      y: index * -2,
                      rotate: (index % 2 === 0 ? 1 : -1) * (index * 0.5),
                      scale: hoveredId === buck.id ? 1.05 : 1,
                    }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={cn(
                      "relative cursor-pointer select-none",
                      buck.isLocked && !isParent && "cursor-not-allowed"
                    )}
                    style={{ zIndex: growBucks.length - index }}
                    onMouseEnter={() => setHoveredId(buck.id)}
                    onMouseLeave={() => {
                      setHoveredId(null);
                      setShowWithdrawConfirm(null);
                    }}
                    onClick={() => handleBuckClick(buck)}
                  >
                    {/* Bill */}
                    <div className={cn(
                      "relative w-48 h-20 rounded-lg shadow-md transition-shadow",
                      "bg-gradient-to-r",
                      buck.value >= 10000 ? "from-[#228B22] to-[#2E8B57]" :
                      buck.value >= 5000 ? "from-[#2E8B57] to-[#3CB371]" :
                      buck.value >= 2000 ? "from-[#3CB371] to-[#90EE90]" :
                      "from-[#90EE90] to-[#98FB98]",
                      hoveredId === buck.id && "shadow-lg ring-2 ring-[#FFD700]"
                    )}>
                      {/* Bill Pattern */}
                      <div className="absolute inset-2 border border-white/20 rounded" />
                      
                      {/* Value */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-mono font-bold text-2xl drop-shadow-md">
                          {formatDollar(buck.value)}
                        </span>
                      </div>
                      
                      {/* Lock Icon */}
                      {buck.isLocked && (
                        <div className="absolute top-1 right-1 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center">
                          <Lock className="w-3 h-3 text-[#8B4513]" />
                        </div>
                      )}
                      
                      {/* Withdraw Tooltip */}
                      {showWithdrawConfirm === buck.id && !buck.isLocked && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#2C3E50] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmWithdraw(buck);
                            }}
                            className="hover:text-[#2ECC71] transition-colors"
                          >
                            Withdraw {formatDollar(buck.value)}?
                          </button>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#2C3E50]" />
                        </motion.div>
                      )}
                      
                      {/* Locked Tooltip */}
                      {hoveredId === buck.id && buck.isLocked && !isParent && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#E67E22] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg"
                        >
                          🔒 Locked by parent
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#E67E22]" />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          
          {/* Growing Interest Indicator */}
          {!isPaused && interestRate > 0 && balanceCents > 0 && (
            <div className="mt-4 relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#FFD700] animate-pulse" />
                <span className="text-[#FFD700] text-xs font-medium">Interest Growing...</span>
              </div>
              
              {/* Growing Bill */}
              <div className="relative w-32 h-14 mx-auto bg-[#654321] rounded-lg overflow-hidden border-2 border-[#FFD700]/30">
                {/* Fill Animation */}
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2ECC71] to-[#27AE60]"
                  style={{ height: `${interestFill}%` }}
                  transition={{ type: 'tween', ease: 'linear' }}
                />
                
                {/* Bill Pattern Overlay */}
                <div className="absolute inset-1 border border-white/10 rounded" />
                
                {/* Dollar Sign */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/50 font-mono font-bold text-xl">$</span>
                </div>
                
                {/* Sparkle Effect */}
                {interestFill > 50 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute top-1 right-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#FFD700]" />
                  </motion.div>
                )}
              </div>
              
              <p className="text-center text-[#FFD700]/60 text-xs mt-2">
                +{(interestRate * 100).toFixed(1)}% daily
              </p>
            </div>
          )}
        </div>
        
        {/* Wallet Shadow */}
        <div className="absolute -bottom-2 left-4 right-4 h-4 bg-black/20 rounded-full blur-md" />
      </div>
      
      {/* Balance Display */}
      <div className="text-center mt-6">
        <p className="text-[#7F8C8D] text-sm">Total Balance</p>
        <p className="text-3xl font-mono font-bold text-[#2ECC71]">
          ${(balanceCents / 100).toFixed(2)}
        </p>
        {lockedPercentage > 0 && (
          <p className="text-sm text-[#E67E22] mt-1">
            <Lock className="w-3 h-3 inline mr-1" />
            {lockedPercentage}% locked
          </p>
        )}
      </div>
    </div>
  );
}
