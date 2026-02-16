'use client';

import { useState } from 'react';

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (child: { name: string; avatar: string; interestRate: number; initialDeposit: number }) => void;
}

const avatars = [
  { id: 'bear', emoji: '🐻', name: 'Bear' },
  { id: 'bunny', emoji: '🐰', name: 'Bunny' },
  { id: 'fox', emoji: '🦊', name: 'Fox' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'cat', emoji: '🐱', name: 'Cat' },
  { id: 'dog', emoji: '🐶', name: 'Dog' },
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
];

export default function AddChildModal({ isOpen, onClose, onAdd }: AddChildModalProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('bear');
  const [interestRate, setInterestRate] = useState(1.0); // 1% daily
  const [initialDeposit, setInitialDeposit] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      avatar,
      interestRate: interestRate / 100, // Convert to decimal
      initialDeposit
    });
    // Reset form
    setName('');
    setAvatar('bear');
    setInterestRate(1.0);
    setInitialDeposit(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--midnight)' }}>
              Add a Child 👶
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--midnight)' }}>
                Child&apos;s Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--midnight)' }}>
                Pick an Avatar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {avatars.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatar(a.id)}
                    className={`p-3 rounded-xl text-2xl transition-all ${
                      avatar === a.id 
                        ? 'ring-2 ring-offset-2 scale-110' 
                        : 'hover:bg-gray-100'
                    }`}
                    style={{ 
                      background: avatar === a.id ? 'var(--cloud)' : 'transparent',
                      // Ring color handled by Tailwind class
                      ...(avatar === a.id ? { '--tw-ring-color': 'var(--sprout-green)' } as React.CSSProperties : {})
                    }}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--midnight)' }}>
                Daily Interest Rate: {interestRate.toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--slate)' }}>
                <span>0.1% (slow)</span>
                <span>1% (default)</span>
                <span>5% (fast)</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--midnight)' }}>
                Initial Deposit (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate)' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialDeposit || ''}
                  onChange={(e) => setInitialDeposit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ background: 'var(--cloud)', color: 'var(--midnight)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                Add Child 🌱
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
