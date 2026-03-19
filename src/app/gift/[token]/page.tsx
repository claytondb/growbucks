'use client';

/**
 * Public Gift Page — /gift/[token]
 *
 * This page is accessible without logging in. A relative visits this URL
 * after a parent shares a gift link, enters their name, an optional message,
 * and an amount, then submits. The gift becomes a *pending* deposit that the
 * parent approves in their dashboard.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gift, Heart, Loader2, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatGiftAmount, GIFT_MIN_CENTS, GIFT_MAX_CENTS } from '@/lib/gift-links';

interface GiftInfo {
  child_name: string;
  label: string;
  message?: string | null;
  max_amount_per_gift_cents?: number | null;
  is_active: boolean;
  usable: boolean;
  status_reason: string;
}

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'unavailable';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000]; // cents

export default function GiftPage() {
  const { token } = useParams<{ token: string }>();

  const [giftInfo, setGiftInfo] = useState<GiftInfo | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [giverName, setGiverName] = useState('');
  const [giverMessage, setGiverMessage] = useState('');
  const [amountCents, setAmountCents] = useState<number | ''>('');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`/api/gift-links/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPageState('unavailable');
          setErrorMsg(data.error);
          return;
        }
        const gift = data.gift as GiftInfo;
        setGiftInfo(gift);
        if (!gift.usable) {
          setPageState('unavailable');
          const reasonMap: Record<string, string> = {
            deactivated: 'This gift link has been deactivated.',
            expired: 'This gift link has expired.',
            max_uses_reached: 'This gift link has reached its maximum number of uses.',
          };
          setErrorMsg(reasonMap[gift.status_reason] ?? 'This gift link is no longer available.');
        } else {
          setPageState('ready');
        }
      })
      .catch(() => {
        setPageState('error');
        setErrorMsg('Could not load gift link. Please check the URL and try again.');
      });
  }, [token]);

  const handleAmountInput = (value: string) => {
    setAmountInput(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setAmountCents(Math.round(num * 100));
    } else {
      setAmountCents('');
    }
  };

  const handleQuickAmount = (cents: number) => {
    setAmountCents(cents);
    setAmountInput((cents / 100).toFixed(2));
  };

  const maxCents = giftInfo?.max_amount_per_gift_cents ?? GIFT_MAX_CENTS;

  const isFormValid =
    giverName.trim().length > 0 &&
    typeof amountCents === 'number' &&
    amountCents >= GIFT_MIN_CENTS &&
    amountCents <= maxCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || pageState === 'submitting') return;

    setPageState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/gift-links/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giver_name: giverName.trim(),
          giver_message: giverMessage.trim() || undefined,
          amount_cents: amountCents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setPageState('ready');
        return;
      }

      setSuccessMsg(data.message ?? 'Your gift has been sent!');
      setPageState('success');
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setPageState('ready');
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FFF4] to-[#E8F5E9]">
        <Loader2 className="animate-spin text-[#2ECC71]" size={40} />
      </div>
    );
  }

  // ─── Unavailable / Error ────────────────────────────────────────────────────

  if (pageState === 'unavailable' || pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FFF4] to-[#E8F5E9] p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="mx-auto text-red-500" size={48} />
            <h1 className="text-xl font-bold text-gray-800">Gift Link Unavailable</h1>
            <p className="text-gray-600">{errorMsg}</p>
            <p className="text-sm text-gray-400">
              If you think this is a mistake, please ask the person who shared the link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FFF4] to-[#E8F5E9] p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
        >
          <Card className="max-w-md w-full shadow-xl text-center">
            <CardContent className="pt-10 pb-10 space-y-4">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <CheckCircle2 className="mx-auto text-[#2ECC71]" size={64} />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-800">Gift Sent! 🎁</h1>
              <p className="text-gray-600">{successMsg}</p>
              <p className="text-sm text-gray-400 mt-2">
                The parent will review and approve your gift. Thank you for your generosity!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Gift Form ──────────────────────────────────────────────────────────────

  const childName = giftInfo?.child_name ?? 'your recipient';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FFF4] to-[#E8F5E9] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-2"
        >
          <div className="flex justify-center">
            <div className="bg-[#2ECC71] rounded-full p-4 shadow-lg">
              <Gift className="text-white" size={36} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {giftInfo?.label ?? 'Send a Gift'}
          </h1>
          <p className="text-gray-500 text-sm">
            Send money to <span className="font-semibold text-[#2ECC71]">{childName}</span>
            {`'s GrowBucks savings`}
          </p>
          {giftInfo?.message && (
            <div className="bg-white/70 rounded-xl px-4 py-3 text-sm text-gray-600 italic border border-[#2ECC71]/20">
              &ldquo;{giftInfo.message}&rdquo;
            </div>
          )}
          {giftInfo?.max_amount_per_gift_cents && (
            <p className="text-xs text-gray-400">
              Max per gift: {formatGiftAmount(giftInfo.max_amount_per_gift_cents)}
            </p>
          )}
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-xl">
            <CardContent className="pt-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Giver name */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="giverName">
                    Your Name *
                  </label>
                  <input
                    id="giverName"
                    type="text"
                    value={giverName}
                    onChange={(e) => setGiverName(e.target.value)}
                    placeholder="e.g. Grandma Jo"
                    maxLength={100}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/50"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="amount">
                    Gift Amount *
                  </label>
                  {/* Quick amount buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {QUICK_AMOUNTS.filter((c) => c <= maxCents).map((cents) => (
                      <button
                        key={cents}
                        type="button"
                        onClick={() => handleQuickAmount(cents)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          amountCents === cents
                            ? 'bg-[#2ECC71] text-white border-[#2ECC71]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#2ECC71]'
                        }`}
                      >
                        {formatGiftAmount(cents)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="amount"
                      type="number"
                      min="1"
                      max={maxCents / 100}
                      step="0.01"
                      value={amountInput}
                      onChange={(e) => handleAmountInput(e.target.value)}
                      placeholder="or enter custom amount"
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/50"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Min: {formatGiftAmount(GIFT_MIN_CENTS)} · Max: {formatGiftAmount(maxCents)}
                  </p>
                </div>

                {/* Optional message */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="giverMessage">
                    Message (optional)
                  </label>
                  <textarea
                    id="giverMessage"
                    value={giverMessage}
                    onChange={(e) => setGiverMessage(e.target.value)}
                    placeholder="Happy birthday! Save it for something special 🎉"
                    maxLength={300}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/50 resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right">
                    {giverMessage.length}/300
                  </p>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={16} />
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={!isFormValid || pageState === 'submitting'}
                  className="w-full bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {pageState === 'submitting' ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Sending gift…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Heart size={16} />
                      Send Gift
                      {typeof amountCents === 'number' && amountCents >= GIFT_MIN_CENTS
                        ? ` · ${formatGiftAmount(amountCents)}`
                        : ''}
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-[#2ECC71]">GrowBucks</span> — teaching kids about saving 🌱
        </p>
      </div>
    </div>
  );
}
