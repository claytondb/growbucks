'use client';

/**
 * LeaderboardCard – shows a fun sibling rivalry leaderboard on the parent dashboard.
 *
 * Only renders when there are 2+ children and at least one meaningful leaderboard.
 * Cycles through leaderboard categories via tabs.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Leaderboard, RankedEntry, rankMedal } from '@/lib/leaderboard';

interface ApiLeaderboard {
  category: string;
  label: string;
  emoji: string;
  entries: RankedEntry[];
  allTied: boolean;
}

function EntryRow({ entry, index }: { entry: RankedEntry; index: number }) {
  const medal = rankMedal(entry.rank);
  return (
    <motion.div
      key={entry.childId}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-3 py-2"
    >
      {/* Rank / Medal */}
      <div className="w-8 text-center">
        {medal ? (
          <span className="text-xl">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-[#7F8C8D]">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar placeholder or initials */}
      <div className="w-9 h-9 rounded-full bg-[#2ECC71]/15 flex items-center justify-center flex-shrink-0">
        {entry.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.avatarUrl} alt={entry.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-[#2ECC71]">
            {entry.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 font-semibold text-[#2C3E50] text-sm truncate">
        {entry.name}
        {entry.tied && (
          <span className="ml-1 text-xs font-normal text-[#7F8C8D]">(tied)</span>
        )}
      </span>

      {/* Score */}
      <span className="font-mono text-sm font-bold text-[#27AE60]">{entry.display}</span>
    </motion.div>
  );
}

export default function LeaderboardCard() {
  const [leaderboards, setLeaderboards] = useState<ApiLeaderboard[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        setLeaderboards(data.leaderboards ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || leaderboards.length === 0) return null;

  const active = leaderboards[activeIdx];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-5 h-5 text-[#F39C12]" />
          Family Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Category tabs */}
        {leaderboards.length > 1 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {leaderboards.map((lb, idx) => (
              <button
                key={lb.category}
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  idx === activeIdx
                    ? 'bg-[#2ECC71] text-white'
                    : 'bg-[#ECF0F1] text-[#7F8C8D] hover:bg-[#D5DBDB]'
                }`}
              >
                <span>{lb.emoji}</span>
                <span>{lb.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Active leaderboard */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-xs text-[#7F8C8D] mb-2 font-medium uppercase tracking-wide">
              {active.emoji} {active.label}
            </p>
            <div className="divide-y divide-[#F0F0F0]">
              {active.entries.map((entry, idx) => (
                <EntryRow key={entry.childId} entry={entry} index={idx} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
