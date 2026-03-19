'use client';

/**
 * ChoresManager – parent-facing component for managing a child's chores.
 *
 * Features:
 *  - View active/paused chores
 *  - Create new chores with title, emoji, reward, frequency
 *  - Approve or reject pending completion submissions
 *  - Archive/delete chores
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  X,
  Check,
  Clock,
  DollarSign,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Chore,
  ChoreCompletion,
  CHORE_EMOJI_SUGGESTIONS,
  CHORE_REWARD_MIN_CENTS,
  CHORE_REWARD_MAX_CENTS,
  CHORE_TITLE_MAX_LENGTH,
  formatReward,
  CHORE_FREQUENCY_LABELS,
  countByStatus,
} from '@/lib/chores';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompletionWithChore extends ChoreCompletion {
  chores: {
    id: string;
    title: string;
    description?: string | null;
    reward_cents: number;
    frequency: 'one_time' | 'recurring';
    emoji?: string | null;
  };
}

interface ChoresManagerProps {
  childId: string;
  childName: string;
  onEarningsChange?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dollarsToCents(value: string): number {
  const n = parseFloat(value);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChoresManager({ childId, childName, onEarningsChange }: ChoresManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [chores, setChores] = useState<Chore[]>([]);
  const [pendingCompletions, setPendingCompletions] = useState<CompletionWithChore[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [newReward, setNewReward] = useState('');
  const [newFrequency, setNewFrequency] = useState<'one_time' | 'recurring'>('recurring');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Per-completion approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [choresRes, completionsRes] = await Promise.all([
        fetch(`/api/chores?childId=${childId}`),
        fetch(`/api/chores/completions?childId=${childId}&status=pending`),
      ]);

      if (choresRes.ok) {
        const d = await choresRes.json();
        setChores(d.chores ?? []);
      }
      if (completionsRes.ok) {
        const d = await completionsRes.json();
        setPendingCompletions(d.completions ?? []);
      }
    } catch {
      setError('Failed to load chores data.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, fetchData]);

  // ─── Toast helpers ──────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }

  // ─── Create chore ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const rewardCents = dollarsToCents(newReward);
    if (!newTitle.trim()) return showError('Title is required.');
    if (newTitle.length > CHORE_TITLE_MAX_LENGTH) return showError(`Title too long (max ${CHORE_TITLE_MAX_LENGTH} chars).`);
    if (rewardCents < CHORE_REWARD_MIN_CENTS || rewardCents > CHORE_REWARD_MAX_CENTS)
      return showError('Reward must be between $0.01 and $999.99.');

    setIsCreating(true);
    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          reward_cents: rewardCents,
          frequency: newFrequency,
          emoji: newEmoji,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create chore');
      }
      showSuccess(`Chore "${newTitle.trim()}" created!`);
      setNewTitle('');
      setNewDescription('');
      setNewReward('');
      setNewEmoji('⭐');
      setNewFrequency('recurring');
      setShowCreateForm(false);
      await fetchData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to create chore.');
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Approve completion ─────────────────────────────────────────────────────

  const handleApprove = async (completionId: string, choreName: string) => {
    setApprovingId(completionId);
    try {
      const res = await fetch(`/api/chores/completions/${completionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to approve');
      }
      showSuccess(`"${choreName}" approved! Reward deposited 💰`);
      await fetchData();
      onEarningsChange?.();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to approve completion.');
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Reject completion ──────────────────────────────────────────────────────

  const handleReject = async (completionId: string, choreName: string) => {
    setRejectingId(completionId);
    try {
      const res = await fetch(`/api/chores/completions/${completionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectReason[completionId] || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to reject');
      }
      showSuccess(`"${choreName}" rejected.`);
      setRejectReason((prev) => { const n = { ...prev }; delete n[completionId]; return n; });
      await fetchData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to reject completion.');
    } finally {
      setRejectingId(null);
    }
  };

  // ─── Archive chore ──────────────────────────────────────────────────────────

  const handleArchive = async (choreId: string, title: string) => {
    if (!confirm(`Archive "${title}"? It won't appear for new completions.`)) return;
    try {
      const res = await fetch(`/api/chores/${choreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) throw new Error('Failed to archive');
      showSuccess(`"${title}" archived.`);
      await fetchData();
    } catch {
      showError('Failed to archive chore.');
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const activeChores = chores.filter((c) => c.status === 'active');
  const completionCounts = countByStatus(pendingCompletions);
  const pendingCount = pendingCompletions.length;
  const hasActivity = activeChores.length > 0 || pendingCount > 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card className="mb-6">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#9B59B6]" />
            <span>Chores &amp; Jobs</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[#E67E22] text-white rounded-full text-xs font-bold">
                {pendingCount} pending
              </span>
            )}
            {!isExpanded && activeChores.length > 0 && pendingCount === 0 && (
              <span className="ml-1 text-sm font-normal text-[#7F8C8D]">
                {activeChores.length} active
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#7F8C8D]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#7F8C8D]" />
          )}
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              {/* Status messages */}
              <AnimatePresence>
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-3 px-3 py-2 bg-[#2ECC71]/10 text-[#27AE60] rounded-lg text-sm flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> {successMsg}
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-3 px-3 py-2 bg-[#E74C3C]/10 text-[#E74C3C] rounded-lg text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="flex items-center justify-center py-6 text-[#7F8C8D]">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (
                <>
                  {/* ── Pending completions ─────────────────────────────── */}
                  {pendingCompletions.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-[#E67E22] mb-2 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Awaiting Approval ({pendingCompletions.length})
                      </h4>
                      <div className="space-y-3">
                        {pendingCompletions.map((comp) => (
                          <div
                            key={comp.id}
                            className="border border-[#E67E22]/30 rounded-xl p-3 bg-[#FFF9F0]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{comp.chores.emoji ?? '⭐'}</span>
                                <div>
                                  <p className="font-medium text-[#2C3E50] text-sm">{comp.chores.title}</p>
                                  <p className="text-xs text-[#7F8C8D]">
                                    Reward: <span className="text-[#27AE60] font-semibold">{formatReward(comp.chores.reward_cents)}</span>
                                  </p>
                                  {comp.notes && (
                                    <p className="text-xs text-[#7F8C8D] mt-0.5 italic">&ldquo;{comp.notes}&rdquo;</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-[#27AE60] hover:bg-[#2ECC71]/10"
                                  onClick={() => handleApprove(comp.id, comp.chores.title)}
                                  disabled={approvingId === comp.id}
                                  title="Approve"
                                >
                                  {approvingId === comp.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-[#E74C3C] hover:bg-[#E74C3C]/10"
                                  onClick={() => handleReject(comp.id, comp.chores.title)}
                                  disabled={rejectingId === comp.id}
                                  title="Reject"
                                >
                                  {rejectingId === comp.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            {/* Optional rejection reason inline */}
                            <div className="mt-2">
                              <input
                                type="text"
                                placeholder="Rejection reason (optional)"
                                value={rejectReason[comp.id] ?? ''}
                                onChange={(e) =>
                                  setRejectReason((prev) => ({ ...prev, [comp.id]: e.target.value }))
                                }
                                className="w-full text-xs border border-[#ECF0F1] rounded-lg px-2 py-1.5 text-[#2C3E50] placeholder-[#BDC3C7] focus:outline-none focus:ring-1 focus:ring-[#E74C3C]/40"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Active chores list ──────────────────────────────── */}
                  {activeChores.length > 0 ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-[#7F8C8D] mb-2">
                        Active Chores ({activeChores.length})
                      </h4>
                      <div className="space-y-2">
                        {activeChores.map((chore) => (
                          <div
                            key={chore.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 bg-[#F8FAFE] rounded-xl border border-[#ECF0F1]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl shrink-0">{chore.emoji ?? '⭐'}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#2C3E50] truncate">{chore.title}</p>
                                <p className="text-xs text-[#7F8C8D]">
                                  {formatReward(chore.reward_cents)} &middot; {CHORE_FREQUENCY_LABELS[chore.frequency]}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-[#BDC3C7] hover:text-[#E74C3C] shrink-0"
                              onClick={() => handleArchive(chore.id, chore.title)}
                              title="Archive chore"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    !showCreateForm && (
                      <div className="text-center py-4 text-[#BDC3C7] text-sm">
                        No active chores yet. Add one for {childName}!
                      </div>
                    )
                  )}

                  {/* ── Create form ─────────────────────────────────────── */}
                  <AnimatePresence>
                    {showCreateForm && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="border border-[#9B59B6]/30 rounded-xl p-4 bg-[#FAF5FF] mb-4"
                      >
                        <h4 className="text-sm font-semibold text-[#9B59B6] mb-3">New Chore</h4>

                        {/* Emoji picker */}
                        <div className="mb-3">
                          <label className="block text-xs text-[#7F8C8D] mb-1">Emoji</label>
                          <div className="flex flex-wrap gap-1.5">
                            {CHORE_EMOJI_SUGGESTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setNewEmoji(emoji)}
                                className={`text-xl w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  newEmoji === emoji
                                    ? 'bg-[#9B59B6]/20 ring-2 ring-[#9B59B6]'
                                    : 'hover:bg-[#ECF0F1]'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title */}
                        <div className="mb-3">
                          <label className="block text-xs text-[#7F8C8D] mb-1">Title *</label>
                          <input
                            type="text"
                            maxLength={CHORE_TITLE_MAX_LENGTH}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g. Clean bedroom"
                            className="w-full border border-[#ECF0F1] rounded-xl px-3 py-2 text-sm text-[#2C3E50] placeholder-[#BDC3C7] focus:outline-none focus:ring-2 focus:ring-[#9B59B6]/40"
                          />
                        </div>

                        {/* Description */}
                        <div className="mb-3">
                          <label className="block text-xs text-[#7F8C8D] mb-1">Description (optional)</label>
                          <input
                            type="text"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="More details…"
                            className="w-full border border-[#ECF0F1] rounded-xl px-3 py-2 text-sm text-[#2C3E50] placeholder-[#BDC3C7] focus:outline-none focus:ring-2 focus:ring-[#9B59B6]/40"
                          />
                        </div>

                        {/* Reward + Frequency */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="block text-xs text-[#7F8C8D] mb-1">Reward ($) *</label>
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7F8C8D]" />
                              <input
                                type="number"
                                min="0.01"
                                max="999.99"
                                step="0.25"
                                value={newReward}
                                onChange={(e) => setNewReward(e.target.value)}
                                placeholder="0.00"
                                className="w-full border border-[#ECF0F1] rounded-xl pl-7 pr-3 py-2 text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#9B59B6]/40"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[#7F8C8D] mb-1">Frequency</label>
                            <select
                              value={newFrequency}
                              onChange={(e) => setNewFrequency(e.target.value as 'one_time' | 'recurring')}
                              className="w-full border border-[#ECF0F1] rounded-xl px-3 py-2 text-sm text-[#2C3E50] bg-white focus:outline-none focus:ring-2 focus:ring-[#9B59B6]/40"
                            >
                              <option value="recurring">Recurring</option>
                              <option value="one_time">One-time</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => setShowCreateForm(false)}
                            disabled={isCreating}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-[#9B59B6] hover:bg-[#8E44AD] text-white"
                            onClick={handleCreate}
                            disabled={isCreating}
                          >
                            {isCreating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckSquare className="w-4 h-4 mr-1" /> Add Chore
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Add button ──────────────────────────────────────── */}
                  {!showCreateForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full border border-dashed border-[#9B59B6]/40 text-[#9B59B6] hover:bg-[#9B59B6]/5"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Chore for {childName}
                    </Button>
                  )}

                  {/* ── Empty + no pending ──────────────────────────────── */}
                  {!hasActivity && !loading && !showCreateForm && (
                    <p className="text-center text-xs text-[#BDC3C7] mt-2">
                      Chores you create here will show up for {childName} in their app.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
