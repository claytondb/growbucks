'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildSeasonalCalendar,
  getActiveChallenges,
  getUpcomingChallenges,
  evaluateAllChallenges,
  type ChallengeProgress,
  type TransactionSnapshot,
  type BalanceSnapshot,
  type ChallengeEvalInput,
} from '@/lib/seasonal-challenges';
import { Transaction } from '@/types/database';
import { Trophy, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface SeasonalChallengesCardProps {
  childId: string;
  childName: string;
  /** Current balance in cents */
  balanceCents: number;
  /** Full transaction history from child detail */
  transactions: Transaction[];
}

function ProgressBar({ percent, completed }: { percent: number; completed: boolean }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          completed ? 'bg-[#2ECC71]' : 'bg-[#9B59B6]'
        }`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function ChallengeRow({ progress }: { progress: ChallengeProgress }) {
  const { challenge, status, progressPercent, progressLabel, daysRemaining } = progress;
  const isCompleted = status === 'completed';

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isCompleted
          ? 'bg-[#2ECC71]/5 border-[#2ECC71]/20'
          : 'bg-white border-gray-100 hover:border-[#9B59B6]/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{challenge.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-semibold text-[#2C3E50] text-sm truncate">{challenge.title}</p>
            {isCompleted ? (
              <span className="text-xs font-medium text-[#2ECC71] bg-[#2ECC71]/10 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Done!
              </span>
            ) : (
              <span className="text-xs text-[#7F8C8D] whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysRemaining}d left
              </span>
            )}
          </div>
          <p className="text-xs text-[#7F8C8D] mb-2">{challenge.description}</p>
          <ProgressBar percent={progressPercent} completed={isCompleted} />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-[#9B59B6] font-medium">{progressLabel}</span>
            <span className="text-xs text-[#7F8C8D]">+{challenge.xpReward} XP</span>
          </div>
          {challenge.bonusCents && !isCompleted && (
            <p className="text-xs text-[#F39C12] mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Bonus: +${(challenge.bonusCents / 100).toFixed(2)} on completion
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeasonalChallengesCard({
  childId: _childId,
  childName,
  balanceCents,
  transactions,
}: SeasonalChallengesCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);

  const { activeChallenges, completedChallenges, upcomingChallenges } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const calendar = buildSeasonalCalendar(year);
    const active = getActiveChallenges(calendar, now);
    const upcomingList = getUpcomingChallenges(calendar, now).slice(0, 3);

    const txSnapshots: TransactionSnapshot[] = transactions.map(t => ({
      type: t.type,
      amount_cents: t.amount_cents,
      created_at: t.created_at,
    }));

    const balanceSnapshot: BalanceSnapshot = { balance_cents: balanceCents };

    const evalInput: ChallengeEvalInput = {
      transactions: txSnapshots,
      activities: [],
      balance: balanceSnapshot,
      now,
    };

    const summary = evaluateAllChallenges(active, evalInput);

    const upcomingInput: ChallengeEvalInput = {
      transactions: [],
      activities: [],
      balance: balanceSnapshot,
      now,
    };
    const upcomingSummary = evaluateAllChallenges(upcomingList, upcomingInput);

    return {
      activeChallenges: summary.active,
      completedChallenges: summary.completed,
      upcomingChallenges: upcomingSummary.upcoming,
    };
  }, [balanceCents, transactions]);

  const allDisplayed = [...activeChallenges, ...completedChallenges];
  const completedCount = completedChallenges.length;
  const activeCount = activeChallenges.length;

  if (allDisplayed.length === 0 && upcomingChallenges.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🏆 Seasonal Challenges
            {completedCount > 0 && (
              <span className="text-xs font-normal text-[#2ECC71] bg-[#2ECC71]/10 px-2 py-0.5 rounded-full">
                {completedCount} complete
              </span>
            )}
            {activeCount > 0 && (
              <span className="text-xs font-normal text-[#9B59B6] bg-[#9B59B6]/10 px-2 py-0.5 rounded-full">
                {activeCount} active
              </span>
            )}
          </CardTitle>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-[#7F8C8D]"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {!expanded && (
          <p className="text-sm text-[#7F8C8D] mt-1">
            {allDisplayed.length} challenge{allDisplayed.length !== 1 ? 's' : ''} this season for {childName}
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-2">
          {allDisplayed.length > 0 ? (
            <div className="space-y-3">
              {allDisplayed.map(p => (
                <ChallengeRow key={p.challenge.id} progress={p} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7F8C8D] text-center py-4">
              No active challenges right now — check back next season!
            </p>
          )}

          {/* Upcoming section */}
          {upcomingChallenges.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowUpcoming(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#7F8C8D] hover:text-[#9B59B6] transition"
              >
                {showUpcoming ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showUpcoming ? 'Hide' : 'Show'} upcoming challenges
              </button>
              {showUpcoming && (
                <div className="mt-3 space-y-2">
                  {upcomingChallenges.map(p => (
                    <div
                      key={p.challenge.id}
                      className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3"
                    >
                      <span className="text-xl">{p.challenge.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-[#2C3E50]">{p.challenge.title}</p>
                        <p className="text-xs text-[#7F8C8D]">
                          Starts {new Date(p.challenge.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}+{p.challenge.xpReward} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
