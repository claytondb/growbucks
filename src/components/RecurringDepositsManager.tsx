'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  RefreshCw,
  Pause,
  Play,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Frequency,
  FREQUENCY_LABELS,
  DAY_OF_WEEK_LABELS,
  formatSchedule,
  formatAmountCents,
} from '@/lib/recurring-deposits';

interface Child {
  id: string;
  name: string;
  avatar?: string;
}

interface RecurringDeposit {
  id: string;
  child_id: string;
  amount_cents: number;
  frequency: Frequency;
  day_of_week?: number | null;
  day_of_month?: number | null;
  description: string;
  is_active: boolean;
  next_deposit_at: string;
  children?: { id: string; name: string };
}

interface RecurringDepositsManagerProps {
  childAccounts: Child[];
}

const AVATARS: Record<string, string> = {
  bear: '🐻',
  bunny: '🐰',
  fox: '🦊',
  panda: '🐼',
  cat: '🐱',
  dog: '🐶',
  lion: '🦁',
  unicorn: '🦄',
};

export default function RecurringDepositsManager({ childAccounts }: RecurringDepositsManagerProps) {
  const [deposits, setDeposits] = useState<RecurringDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<RecurringDeposit | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formChildId, setFormChildId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState<Frequency>('weekly');
  const [formDayOfWeek, setFormDayOfWeek] = useState(1); // Monday
  const [formDayOfMonth, setFormDayOfMonth] = useState(1);
  const [formDescription, setFormDescription] = useState('Allowance');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/recurring-deposits');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDeposits(data);
    } catch (err) {
      setError('Failed to load recurring deposits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormChildId(childAccounts[0]?.id || '');
    setFormAmount('');
    setFormFrequency('weekly');
    setFormDayOfWeek(1);
    setFormDayOfMonth(1);
    setFormDescription('Allowance');
    setEditingDeposit(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (deposit: RecurringDeposit) => {
    setEditingDeposit(deposit);
    setFormChildId(deposit.child_id);
    setFormAmount((deposit.amount_cents / 100).toFixed(2));
    setFormFrequency(deposit.frequency);
    setFormDayOfWeek(deposit.day_of_week ?? 1);
    setFormDayOfMonth(deposit.day_of_month ?? 1);
    setFormDescription(deposit.description);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const amountCents = Math.round(parseFloat(formAmount) * 100);

    const body: Record<string, unknown> = {
      child_id: formChildId,
      amount_cents: amountCents,
      frequency: formFrequency,
      description: formDescription,
    };

    if (formFrequency === 'monthly') {
      body.day_of_month = formDayOfMonth;
    } else {
      body.day_of_week = formDayOfWeek;
    }

    try {
      if (editingDeposit) {
        // Update
        const res = await fetch('/api/recurring-deposits', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingDeposit.id, ...body }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update');
        }
      } else {
        // Create
        const res = await fetch('/api/recurring-deposits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create');
        }
      }

      await fetchDeposits();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (deposit: RecurringDeposit) => {
    try {
      const res = await fetch('/api/recurring-deposits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deposit.id, is_active: !deposit.is_active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchDeposits();
    } catch (err) {
      setError('Failed to update deposit');
      console.error(err);
    }
  };

  const handleDelete = async (deposit: RecurringDeposit) => {
    if (!confirm(`Delete "${deposit.description}" for ${deposit.children?.name || 'this child'}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/recurring-deposits?id=${deposit.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchDeposits();
    } catch (err) {
      setError('Failed to delete deposit');
      console.error(err);
    }
  };

  const getChildName = (childId: string) => {
    return childAccounts.find((c) => c.id === childId)?.name || 'Unknown';
  };

  const getChildAvatar = (childId: string) => {
    const child = childAccounts.find((c) => c.id === childId);
    return child?.avatar ? AVATARS[child.avatar] || '👤' : '👤';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Group deposits by child
  const depositsByChild = childAccounts.map((child) => ({
    child,
    deposits: deposits.filter((d) => d.child_id === child.id),
  }));

  return (
    <div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
        >
          {error}
          <button onClick={() => setError(null)} className="float-right">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#2C3E50]">Recurring Deposits</h2>
        <Button variant="primary" size="sm" onClick={openAddModal} disabled={childAccounts.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Add Allowance
        </Button>
      </div>

      {childAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-[#7F8C8D]">
            <p>Add a child first to set up recurring deposits.</p>
          </CardContent>
        </Card>
      ) : deposits.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="w-12 h-12 text-[#BDC3C7] mx-auto mb-3" />
            <p className="text-[#7F8C8D] mb-4">No recurring deposits yet</p>
            <p className="text-sm text-[#BDC3C7]">
              Set up automatic allowances for your kids!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {depositsByChild.map(({ child, deposits: childDeposits }) => (
            childDeposits.length > 0 && (
              <div key={child.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{AVATARS[child.avatar || ''] || '👤'}</span>
                  <h3 className="font-semibold text-[#2C3E50]">{child.name}</h3>
                </div>
                <div className="space-y-3">
                  {childDeposits.map((deposit) => (
                    <motion.div
                      key={deposit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className={deposit.is_active ? '' : 'opacity-60'}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-[#2ECC71]">
                                  {formatAmountCents(deposit.amount_cents)}
                                </span>
                                <span className="text-[#7F8C8D]">•</span>
                                <span className="text-sm text-[#7F8C8D]">
                                  {deposit.description}
                                </span>
                                {!deposit.is_active && (
                                  <span className="text-xs bg-[#ECF0F1] text-[#7F8C8D] px-2 py-0.5 rounded-full">
                                    Paused
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-[#7F8C8D]">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatSchedule(deposit.frequency, deposit.day_of_week, deposit.day_of_month)}
                                </span>
                                <span className="text-xs">
                                  Next: {new Date(deposit.next_deposit_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActive(deposit)}
                                title={deposit.is_active ? 'Pause' : 'Resume'}
                              >
                                {deposit.is_active ? (
                                  <Pause className="w-4 h-4 text-[#F39C12]" />
                                ) : (
                                  <Play className="w-4 h-4 text-[#2ECC71]" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(deposit)}
                              >
                                <Edit2 className="w-4 h-4 text-[#3498DB]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(deposit)}
                              >
                                <Trash2 className="w-4 h-4 text-[#E74C3C]" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={closeModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#2C3E50]">
                    {editingDeposit ? 'Edit Allowance ✏️' : 'New Allowance 💰'}
                  </h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Child Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-[#2C3E50]">
                      For which child?
                    </label>
                    <select
                      value={formChildId}
                      onChange={(e) => setFormChildId(e.target.value)}
                      className="w-full p-3 border border-[#BDC3C7] rounded-xl focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/20 outline-none"
                      required
                      disabled={!!editingDeposit}
                    >
                      <option value="">Select a child...</option>
                      {childAccounts.map((child) => (
                        <option key={child.id} value={child.id}>
                          {AVATARS[child.avatar || ''] || '👤'} {child.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-[#2C3E50]">
                      Amount
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7F8C8D]" />
                      <input
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="5.00"
                        className="w-full pl-10 p-3 border border-[#BDC3C7] rounded-xl focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/20 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-[#2C3E50]">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Allowance"
                      className="w-full p-3 border border-[#BDC3C7] rounded-xl focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/20 outline-none"
                      maxLength={50}
                    />
                  </div>

                  {/* Frequency */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-[#2C3E50]">
                      How often?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['weekly', 'biweekly', 'monthly'] as Frequency[]).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFormFrequency(freq)}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            formFrequency === freq
                              ? 'border-[#2ECC71] bg-[#2ECC71]/10 text-[#2ECC71]'
                              : 'border-[#ECF0F1] text-[#7F8C8D] hover:border-[#BDC3C7]'
                          }`}
                        >
                          {FREQUENCY_LABELS[freq]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day Selection */}
                  <div className="mb-6">
                    {formFrequency === 'monthly' ? (
                      <>
                        <label className="block text-sm font-medium mb-2 text-[#2C3E50]">
                          Day of month
                        </label>
                        <select
                          value={formDayOfMonth}
                          onChange={(e) => setFormDayOfMonth(parseInt(e.target.value))}
                          className="w-full p-3 border border-[#BDC3C7] rounded-xl focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/20 outline-none"
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day}>
                              {day}
                              {getOrdinalSuffix(day)}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium mb-2 text-[#2C3E50]">
                          Day of week
                        </label>
                        <div className="grid grid-cols-7 gap-1">
                          {DAY_OF_WEEK_LABELS.map((day, index) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setFormDayOfWeek(index)}
                              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                formDayOfWeek === index
                                  ? 'bg-[#2ECC71] text-white'
                                  : 'bg-[#ECF0F1] text-[#7F8C8D] hover:bg-[#BDC3C7]'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1" loading={saving}>
                      <Check className="w-4 h-4 mr-2" />
                      {editingDeposit ? 'Save Changes' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
