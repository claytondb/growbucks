'use client';

import * as React from 'react';
import { ArrowUpRight, AlertTriangle, Check } from 'lucide-react';
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

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child;
  isParent?: boolean; // If true, process immediately. If false, create pending request.
  onSubmit: (data: { amount_cents: number; description?: string }) => Promise<void>;
}

export default function WithdrawModal({ open, onOpenChange, child, isParent = true, onSubmit }: WithdrawModalProps) {
  const [amountCents, setAmountCents] = React.useState(0);
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Calculate what they'd lose by withdrawing
  const opportunityCost = React.useMemo(() => {
    if (amountCents <= 0) return { week: 0, month: 0 };
    
    const afterWithdraw = child.balance_cents - amountCents;
    const keepAll30Days = calculateCompoundInterest(child.balance_cents, child.interest_rate_daily, 30);
    const withdraw30Days = calculateCompoundInterest(afterWithdraw, child.interest_rate_daily, 30);
    
    return {
      week: Math.floor((keepAll30Days - withdraw30Days) / 4),
      month: keepAll30Days - withdraw30Days - (keepAll30Days - child.balance_cents - (withdraw30Days - afterWithdraw)),
    };
  }, [amountCents, child]);

  const isFullWithdrawal = amountCents >= child.balance_cents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const validation = validateAmount(amountCents, child.balance_cents);
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
      setError('Failed to process withdrawal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
                className="w-20 h-20 mx-auto mb-4 bg-[#3498DB] rounded-full flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-[#2C3E50]">
                {isParent ? 'Withdrawal Complete!' : 'Request Sent!'}
              </h3>
              <p className="text-[#7F8C8D] mt-2">
                {isParent
                  ? `${formatMoney(amountCents)} withdrawn from ${child.name}'s account`
                  : `Your parent will review your request for ${formatMoney(amountCents)}`
                }
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-[#E74C3C]/10 flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6 text-[#E74C3C]" />
                  </div>
                  <div>
                    <ModalTitle>
                      {isParent ? 'Withdraw Money' : 'Request Withdrawal'}
                    </ModalTitle>
                    <ModalDescription>
                      {isParent
                        ? `Take money out of ${child.name}'s account`
                        : 'Ask your parent to let you take out some money'
                      }
                    </ModalDescription>
                  </div>
                </div>
              </ModalHeader>

              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* Child preview */}
                  <div className="flex items-center gap-3 p-3 bg-[#F8FAFE] rounded-xl">
                    <Avatar name={child.name} src={child.avatar_url} size="md" />
                    <div className="flex-1">
                      <p className="font-medium text-[#2C3E50]">{child.name}</p>
                      <p className="text-sm text-[#7F8C8D]">
                        Available: <span className="font-mono font-bold text-[#2ECC71]">{formatMoney(child.balance_cents)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <MoneyInput
                    value={amountCents}
                    onChange={setAmountCents}
                    error={error}
                    label="Amount to withdraw"
                    autoFocus
                  />

                  {/* Quick withdraw all */}
                  <button
                    type="button"
                    onClick={() => setAmountCents(child.balance_cents)}
                    className="w-full py-2 text-sm text-[#7F8C8D] hover:text-[#2C3E50] transition-colors"
                  >
                    Withdraw all ({formatMoney(child.balance_cents)})
                  </button>

                  {/* Description */}
                  <Input
                    label="Reason (optional)"
                    placeholder="e.g., Buying a toy, Saving for something"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={255}
                  />

                  {/* Warning about lost interest */}
                  {amountCents > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-[#E67E22]/5 border border-[#E67E22]/20 rounded-xl"
                    >
                      <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-[#2C3E50]">
                            {isFullWithdrawal
                              ? 'This will empty the account!'
                              : 'Think before you withdraw'
                            }
                          </p>
                          <p className="text-xs text-[#7F8C8D] mt-1">
                            If you keep this money saved, it could grow by{' '}
                            <span className="font-mono font-bold text-[#E67E22]">
                              {formatMoney(opportunityCost.month)}
                            </span>{' '}
                            in the next month!
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
                    variant="withdraw"
                    loading={loading}
                    disabled={amountCents <= 0}
                  >
                    {isParent ? 'Withdraw' : 'Request'} {amountCents > 0 ? formatMoney(amountCents) : ''}
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
