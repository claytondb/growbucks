'use client';

/**
 * SplitSavingsCard – parent-facing component for configuring auto-split savings.
 *
 * Shows:
 *  - Current spend/save balance breakdown for a child
 *  - Controls to change the auto-split percentage
 *  - A "Release savings" button so parents can move savings → spending
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Unlock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SPLIT_PRESETS,
  getSpendSaveBalances,
  formatCents,
  savingsMilestone,
  isValidSplitPercent,
} from '@/lib/split-savings';

interface SplitSavingsCardProps {
  childId: string;
  childName: string;
  balanceCents: number;
  saveBalanceCents: number;
  currentSplitPercent: number;
  onSplitChange?: (newPercent: number) => void;
  onSavingsRelease?: (amountCents: number) => void;
}

export default function SplitSavingsCard({
  childId,
  childName,
  balanceCents,
  saveBalanceCents,
  currentSplitPercent,
  onSplitChange,
  onSavingsRelease,
}: SplitSavingsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPercent, setSelectedPercent] = useState(currentSplitPercent);
  const [isSaving, setIsSaving] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState('');
  const [showReleaseInput, setShowReleaseInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const balances = getSpendSaveBalances({ balance_cents: balanceCents, save_balance_cents: saveBalanceCents });
  const milestone = savingsMilestone(saveBalanceCents);

  const handleSaveSplit = async () => {
    if (!isValidSplitPercent(selectedPercent)) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/children/${childId}/split-savings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ split_save_percent: selectedPercent }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update split');
      }
      setSuccessMsg('Split settings saved!');
      onSplitChange?.(selectedPercent);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRelease = async () => {
    const amountDollars = parseFloat(releaseAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      setError('Enter a valid amount to release');
      return;
    }
    const amountCents = Math.round(amountDollars * 100);
    if (amountCents > saveBalanceCents) {
      setError(`Can't release more than ${formatCents(saveBalanceCents)}`);
      return;
    }
    setIsReleasing(true);
    setError(null);
    try {
      const res = await fetch(`/api/children/${childId}/split-savings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release_cents: amountCents }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to release savings');
      }
      setSuccessMsg(`${formatCents(amountCents)} moved to spending!`);
      setReleaseAmount('');
      setShowReleaseInput(false);
      onSavingsRelease?.(amountCents);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <Card className="border-[#2ECC71]/30 bg-[#1a2a1e]">
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(v => !v)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-[#2ECC71]" />
            <span className="text-white">Split Savings</span>
            {currentSplitPercent > 0 && (
              <span className="text-xs bg-[#2ECC71]/20 text-[#2ECC71] px-2 py-0.5 rounded-full font-normal">
                {currentSplitPercent}% auto-save
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Balance Breakdown — always visible */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#2ECC71]/10 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">💳 Spending</div>
            <div className="text-lg font-bold text-white">
              {formatCents(balances.spend_balance_cents)}
            </div>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">🔒 Savings</div>
            <div className="text-lg font-bold text-blue-400">
              {formatCents(balances.save_balance_cents)}
            </div>
          </div>
        </div>

        {/* Savings bar */}
        {balanceCents > 0 && (
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${balances.save_percent_of_total}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        )}
        {milestone && (
          <p className="text-xs text-blue-400 text-center mb-3">{milestone}</p>
        )}

        {/* Feedback messages */}
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}
        {successMsg && (
          <p className="text-xs text-green-400 bg-green-900/20 rounded-lg px-3 py-2 mb-3">
            ✓ {successMsg}
          </p>
        )}

        {/* Expanded controls */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Split preset selector */}
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Auto-route a portion of each deposit to {childName}&apos;s savings:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPLIT_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedPercent(preset.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-left transition-all border ${
                      selectedPercent === preset.value
                        ? 'border-[#2ECC71] bg-[#2ECC71]/20 text-[#2ECC71]'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveSplit}
              disabled={isSaving || selectedPercent === currentSplitPercent}
              className="w-full bg-[#2ECC71] hover:bg-[#27AE60] text-black font-semibold"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : selectedPercent === currentSplitPercent ? (
                'No changes'
              ) : (
                `Save (${SPLIT_PRESETS.find(p => p.value === selectedPercent)?.label ?? selectedPercent + '%'})`
              )}
            </Button>

            {/* Release savings */}
            {saveBalanceCents > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">
                    Release savings to spending:
                  </p>
                  <button
                    onClick={() => setShowReleaseInput(v => !v)}
                    className="text-xs text-[#2ECC71] hover:underline flex items-center gap-1"
                  >
                    <Unlock className="w-3 h-3" />
                    Unlock funds
                  </button>
                </div>
                {showReleaseInput && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={(saveBalanceCents / 100).toFixed(2)}
                        value={releaseAmount}
                        onChange={e => { setReleaseAmount(e.target.value); setError(null); }}
                        placeholder={`Max ${formatCents(saveBalanceCents)}`}
                        className="w-full bg-white/10 border border-white/20 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#2ECC71]"
                      />
                    </div>
                    <Button
                      onClick={handleRelease}
                      disabled={isReleasing || !releaseAmount}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isReleasing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Release'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
