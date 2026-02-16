'use client';

import * as React from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MoneyInput, Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { formatMoney, validateAmount, calculateCompoundInterest } from '@/lib/utils';
import { Child } from '@/types/database';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child;
  onSubmit: (data: { amount_cents: number; description?: string }) => Promise<void>;
}

export default function DepositModal({ open, onOpenChange, child, onSubmit }: DepositModalProps) {
  const [amountCents, setAmountCents] = React.useState(0);
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Calculate projected growth
  const projectedGrowth = React.useMemo(() => {
    const totalBalance = child.balance_cents + amountCents;
    const after7Days = calculateCompoundInterest(totalBalance, child.interest_rate_daily, 7);
    const after30Days = calculateCompoundInterest(totalBalance, child.interest_rate_daily, 30);
    return {
      week: after7Days - totalBalance,
      month: after30Days - totalBalance,
    };
  }, [amountCents, child]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const validation = validateAmount(amountCents);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        amount_cents: amountCents,
        description: description.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setAmountCents(0);
        setDescription('');
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError('Failed to deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000]; // $5, $10, $20, $50

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-4 bg-[#2ECC71] rounded-full flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-[#2C3E50]">Money Added!</h3>
              <p className="text-[#7F8C8D] mt-2">
                {formatMoney(amountCents)} added to {child.name}&apos;s account
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-[#F1C40F]/10 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-[#F1C40F]" />
                  </div>
                  <div>
                    <ModalTitle>Add Money</ModalTitle>
                    <ModalDescription>
                      Deposit to {child.name}&apos;s savings
                    </ModalDescription>
                  </div>
                </div>
              </ModalHeader>

              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* Child preview */}
                  <div className="flex items-center gap-3 p-3 bg-[#F8FAFE] rounded-xl">
                    <Avatar name={child.name} src={child.avatar_url} size="md" />
                    <div>
                      <p className="font-medium text-[#2C3E50]">{child.name}</p>
                      <p className="text-sm text-[#7F8C8D]">
                        Current balance: {formatMoney(child.balance_cents)}
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <MoneyInput
                    value={amountCents}
                    onChange={setAmountCents}
                    error={error}
                    label="Amount to deposit"
                    autoFocus
                  />

                  {/* Quick amounts */}
                  <div className="flex gap-2">
                    {quickAmounts.map((cents) => (
                      <button
                        key={cents}
                        type="button"
                        onClick={() => setAmountCents(cents)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          amountCents === cents
                            ? 'bg-[#2ECC71] text-white'
                            : 'bg-[#ECF0F1] text-[#2C3E50] hover:bg-[#BDC3C7]'
                        }`}
                      >
                        {formatMoney(cents)}
                      </button>
                    ))}
                  </div>

                  {/* Description */}
                  <Input
                    label="Note (optional)"
                    placeholder="e.g., Birthday money, Chores payment"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={255}
                  />

                  {/* Projection */}
                  {amountCents > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-gradient-to-r from-[#2ECC71]/5 to-[#F1C40F]/5 rounded-xl"
                    >
                      <p className="text-sm font-medium text-[#2C3E50] mb-2">
                        💰 Growth projection
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#7F8C8D]">After 1 week</p>
                          <p className="font-mono font-bold text-[#27AE60]">
                            +{formatMoney(projectedGrowth.week)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#7F8C8D]">After 1 month</p>
                          <p className="font-mono font-bold text-[#27AE60]">
                            +{formatMoney(projectedGrowth.month)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <ModalFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="deposit"
                    loading={loading}
                    disabled={amountCents <= 0}
                  >
                    Add {amountCents > 0 ? formatMoney(amountCents) : 'Money'}
                  </Button>
                </ModalFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalContent>
    </Modal>
  );
}
