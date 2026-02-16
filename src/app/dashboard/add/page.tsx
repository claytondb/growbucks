'use client';

import { useState } from 'react';
import { ArrowLeft, Wallet, PiggyBank, Gift, Sparkles } from 'lucide-react';
import Link from 'next/link';

const transactionTypes = [
  { id: 'deposit', label: 'Deposit', icon: Wallet, color: 'bg-[#2ECC71]', description: 'Add money to savings' },
  { id: 'allowance', label: 'Allowance', icon: PiggyBank, color: 'bg-[#3498DB]', description: 'Weekly allowance' },
  { id: 'gift', label: 'Gift', icon: Gift, color: 'bg-[#9B59B6]', description: 'Birthday or special gift' },
  { id: 'bonus', label: 'Bonus', icon: Sparkles, color: 'bg-[#F39C12]', description: 'Extra reward' },
];

export default function AddTransactionPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F8F5] to-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#ECF0F1] z-10">
        <div className="flex items-center justify-between p-4">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-[#ECF0F1]">
            <ArrowLeft className="w-6 h-6 text-[#2C3E50]" />
          </Link>
          <h1 className="text-lg font-bold text-[#2C3E50]">Add Transaction</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Transaction Type */}
        <section>
          <h2 className="text-sm font-semibold text-[#7F8C8D] uppercase tracking-wide mb-3">
            What type?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {transactionTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${
                  selectedType === type.id
                    ? 'border-[#2ECC71] bg-[#2ECC71]/5'
                    : 'border-[#ECF0F1] bg-white hover:border-[#BDC3C7]'
                }`}
              >
                <div className={`w-10 h-10 ${type.color} rounded-xl flex items-center justify-center mb-2`}>
                  <type.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-[#2C3E50]">{type.label}</p>
                <p className="text-xs text-[#7F8C8D]">{type.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Amount */}
        <section>
          <h2 className="text-sm font-semibold text-[#7F8C8D] uppercase tracking-wide mb-3">
            How much?
          </h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#2C3E50]">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-[#2C3E50] bg-white border-2 border-[#ECF0F1] rounded-2xl focus:border-[#2ECC71] focus:outline-none"
            />
          </div>
        </section>

        {/* Note */}
        <section>
          <h2 className="text-sm font-semibold text-[#7F8C8D] uppercase tracking-wide mb-3">
            Add a note (optional)
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's this for?"
            rows={3}
            className="w-full p-4 text-[#2C3E50] bg-white border-2 border-[#ECF0F1] rounded-2xl focus:border-[#2ECC71] focus:outline-none resize-none"
          />
        </section>

        {/* Submit */}
        <button
          disabled={!selectedType || !amount}
          className="w-full py-4 bg-[#2ECC71] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#2ECC71]/30 hover:bg-[#27AE60] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Add to Savings 🌱
        </button>
      </main>
    </div>
  );
}
