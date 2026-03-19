'use client';

/**
 * GiftLinksManager — Parent UI Component
 *
 * Lets parents create and manage gift links for their children.
 * Renders as a collapsible card on the child detail page.
 *
 * Features:
 *   - Create a new gift link with label, optional message, caps, and expiry
 *   - Copy link to clipboard with one click
 *   - Toggle link active/inactive
 *   - View redemptions (pending gifts to approve/reject)
 *   - Delete links
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  ExternalLink,
  Loader2,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  sortGiftLinks,
  getLinkStatus,
  formatGiftAmount,
  formatExpiry,
  remainingUses,
  buildGiftUrl,
  GIFT_MIN_CENTS,
  GIFT_MAX_CENTS,
  type GiftLink,
  type GiftLinkRedemption,
} from '@/lib/gift-links';

interface GiftLinksManagerProps {
  childId: string;
  childName: string;
}

interface RedemptionWithLink extends GiftLinkRedemption {
  linkLabel?: string;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy gift link"
      className="p-1.5 rounded-lg text-gray-400 hover:text-[#2ECC71] hover:bg-[#2ECC71]/10 transition-colors"
    >
      {copied ? <Check size={15} className="text-[#2ECC71]" /> : <Copy size={15} />}
    </button>
  );
}

function LinkStatusBadge({ link }: { link: GiftLink }) {
  const status = getLinkStatus(link);
  if (status.usable) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-[#2ECC71]/10 text-[#27AE60] font-medium">
        Active
      </span>
    );
  }
  const colors: Record<string, string> = {
    deactivated: 'bg-gray-100 text-gray-500',
    expired: 'bg-orange-100 text-orange-600',
    max_uses_reached: 'bg-blue-100 text-blue-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status.reason] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.label}
    </span>
  );
}

export default function GiftLinksManager({ childId, childName }: GiftLinksManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [links, setLinks] = useState<GiftLink[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLabel, setCreateLabel] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [createMaxAmount, setCreateMaxAmount] = useState('');
  const [createMaxUses, setCreateMaxUses] = useState('');
  const [createExpiry, setCreateExpiry] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gift-links?child_id=${childId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load gift links');

      const sortedLinks: GiftLink[] = sortGiftLinks(data.links ?? []);
      setLinks(sortedLinks);

      // Also load redemptions for each link (flatten them)
      const allRedemptions: RedemptionWithLink[] = [];
      await Promise.all(
        sortedLinks.map(async (link) => {
          try {
            const r = await fetch(`/api/gift-links/${link.token}?redemptions=true`);
            const d = await r.json();
            if (d.redemptions) {
              const withLabel = (d.redemptions as GiftLinkRedemption[]).map((red) => ({
                ...red,
                linkLabel: link.label,
              }));
              allRedemptions.push(...withLabel);
            }
          } catch {
            // Skip if a single link fails
          }
        }),
      );
      // Sort: pending first
      allRedemptions.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime();
      });
      setRedemptions(allRedemptions);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [childId, loaded]);

  const handleToggle = () => {
    if (!isExpanded && !loaded) {
      loadData();
    }
    setIsExpanded((v) => !v);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const body: Record<string, unknown> = {
      child_id: childId,
      label: createLabel.trim() || `Gift for ${childName}`,
    };
    if (createMessage.trim()) body.message = createMessage.trim();
    if (createMaxAmount) body.max_amount_per_gift_cents = Math.round(parseFloat(createMaxAmount) * 100);
    if (createMaxUses) body.max_uses = parseInt(createMaxUses, 10);
    if (createExpiry) body.expires_at = new Date(createExpiry).toISOString();

    try {
      const res = await fetch('/api/gift-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create gift link');

      setLinks((prev) => sortGiftLinks([data.link, ...prev]));
      setShowCreateForm(false);
      setCreateLabel('');
      setCreateMessage('');
      setCreateMaxAmount('');
      setCreateMaxUses('');
      setCreateExpiry('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (link: GiftLink) => {
    const res = await fetch('/api/gift-links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: link.id, is_active: !link.is_active }),
    });
    const data = await res.json();
    if (res.ok) {
      setLinks((prev) => sortGiftLinks(prev.map((l) => (l.id === link.id ? data.link : l))));
    }
  };

  const handleDelete = async (link: GiftLink) => {
    if (!confirm(`Delete "${link.label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/gift-links?id=${link.id}`, { method: 'DELETE' });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      setRedemptions((prev) => prev.filter((r) => r.gift_link_id !== link.id));
    }
  };

  const handleReviewRedemption = async (redemption: RedemptionWithLink, approved: boolean) => {
    // Find the link token
    const link = links.find((l) => l.id === redemption.gift_link_id);
    if (!link) return;

    const res = await fetch(`/api/gift-links/${link.token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redemption_id: redemption.id, approved }),
    });
    if (res.ok) {
      setRedemptions((prev) =>
        prev.map((r) =>
          r.id === redemption.id
            ? { ...r, status: approved ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() }
            : r,
        ),
      );
    }
  };

  const pendingCount = redemptions.filter((r) => r.status === 'pending').length;
  const giftUrl = (token: string) =>
    buildGiftUrl(token, typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <Card className="border border-gray-100 shadow-sm">
      {/* Header / Toggle */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Gift size={18} className="text-[#2ECC71]" />
          <span className="font-semibold text-gray-700 text-sm">Gift Links</span>
          {pendingCount > 0 && (
            <span className="bg-[#F39C12] text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-[#2ECC71]" size={24} />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Pending redemptions */}
              {pendingCount > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#F39C12] uppercase tracking-wide">
                    Pending Gifts ({pendingCount})
                  </p>
                  {redemptions
                    .filter((r) => r.status === 'pending')
                    .map((r) => (
                      <div
                        key={r.id}
                        className="bg-[#FFF9EC] border border-[#F39C12]/20 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {formatGiftAmount(r.amount_cents)} from {r.giver_name}
                            </p>
                            {r.giver_message && (
                              <p className="text-xs text-gray-500 italic">&ldquo;{r.giver_message}&rdquo;</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              via &ldquo;{r.linkLabel}&rdquo; ·{' '}
                              {new Date(r.redeemed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewRedemption(r, true)}
                            className="flex-1 py-1.5 text-xs font-medium bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReviewRedemption(r, false)}
                            className="flex-1 py-1.5 text-xs font-medium bg-white text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Active gift links */}
              {!loading && links.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Your Gift Links
                  </p>
                  {links.map((link) => {
                    const url = giftUrl(link.token);
                    const remaining = remainingUses(link);
                    const expiry = formatExpiry(link);
                    return (
                      <div
                        key={link.id}
                        className="bg-gray-50 rounded-xl p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800 truncate">{link.label}</p>
                              <LinkStatusBadge link={link} />
                            </div>
                            {expiry && <p className="text-xs text-gray-400">{expiry}</p>}
                            {remaining !== null && (
                              <p className="text-xs text-gray-400">
                                {remaining} use{remaining !== 1 ? 's' : ''} remaining
                              </p>
                            )}
                            {link.use_count > 0 && (
                              <p className="text-xs text-gray-400">Used {link.use_count}×</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <CopyButton url={url} />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open gift page"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#3498DB] hover:bg-[#3498DB]/10 transition-colors"
                            >
                              <ExternalLink size={15} />
                            </a>
                            <button
                              onClick={() => handleToggleActive(link)}
                              title={link.is_active ? 'Deactivate' : 'Activate'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                link.is_active
                                  ? 'text-[#2ECC71] hover:bg-[#2ECC71]/10'
                                  : 'text-gray-300 hover:text-[#2ECC71] hover:bg-[#2ECC71]/10'
                              }`}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(link)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        {/* URL preview */}
                        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-2 py-1">
                          <ClipboardCheck size={12} className="text-gray-300 shrink-0" />
                          <p className="text-xs text-gray-400 truncate font-mono">{url}</p>
                          <CopyButton url={url} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && links.length === 0 && !showCreateForm && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No gift links yet. Create one to share with family!
                </p>
              )}

              {/* Create form */}
              <AnimatePresence>
                {showCreateForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    onSubmit={handleCreate}
                    className="bg-white border border-[#2ECC71]/20 rounded-xl p-3 space-y-3"
                  >
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      New Gift Link
                    </p>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Label</label>
                      <input
                        type="text"
                        value={createLabel}
                        onChange={(e) => setCreateLabel(e.target.value)}
                        placeholder={`Gift for ${childName}`}
                        maxLength={100}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Welcome message for givers (optional)</label>
                      <textarea
                        value={createMessage}
                        onChange={(e) => setCreateMessage(e.target.value)}
                        placeholder="e.g. Thank you for contributing to Emma's birthday savings!"
                        maxLength={500}
                        rows={2}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Max per gift ($)</label>
                        <input
                          type="number"
                          min="1"
                          max={GIFT_MAX_CENTS / 100}
                          step="0.01"
                          value={createMaxAmount}
                          onChange={(e) => setCreateMaxAmount(e.target.value)}
                          placeholder="no cap"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Max uses</label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={createMaxUses}
                          onChange={(e) => setCreateMaxUses(e.target.value)}
                          placeholder="unlimited"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Expires on (optional)</label>
                      <input
                        type="date"
                        value={createExpiry}
                        onChange={(e) => setCreateExpiry(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={creating}
                        size="sm"
                        className="flex-1 bg-[#2ECC71] hover:bg-[#27AE60] text-white"
                      >
                        {creating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          'Create Link'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Create button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-[#2ECC71] border border-dashed border-[#2ECC71]/40 rounded-xl hover:bg-[#2ECC71]/5 transition-colors"
                >
                  <Plus size={15} />
                  Create Gift Link
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
