'use client';

import { projectBalance, formatCurrency } from '@/lib/interest';

interface GrowthChartProps {
  currentBalance: number;
  interestRate: number;
  daysToShow?: number;
}

export default function GrowthChart({ 
  currentBalance, 
  interestRate, 
  daysToShow = 30 
}: GrowthChartProps) {
  // Generate projected balances
  const projections = Array.from({ length: daysToShow + 1 }, (_, i) => ({
    day: i,
    balance: projectBalance(currentBalance, interestRate, i)
  }));

  const maxBalance = projections[projections.length - 1].balance;
  const minBalance = currentBalance;
  const range = maxBalance - minBalance;

  // Calculate bar heights as percentages
  const getBarHeight = (balance: number) => {
    if (range === 0) return 50;
    return 10 + ((balance - minBalance) / range) * 80;
  };

  // Show every Nth day for cleaner display
  const step = daysToShow <= 7 ? 1 : daysToShow <= 14 ? 2 : 5;
  const displayedDays = projections.filter((_, i) => i % step === 0 || i === daysToShow);

  return (
    <div className="card">
      <h3 className="font-bold mb-4" style={{ color: 'var(--midnight)' }}>
        📈 Growth Projection ({daysToShow} days)
      </h3>
      
      <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--cloud)' }}>
        <p className="text-sm" style={{ color: 'var(--slate)' }}>
          In {daysToShow} days, you&apos;ll have:
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
          {formatCurrency(maxBalance)}
        </p>
        <p className="text-sm" style={{ color: 'var(--success)' }}>
          +{formatCurrency(maxBalance - currentBalance)} in interest! ✨
        </p>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end justify-between gap-1 h-40">
        {displayedDays.map((point, i) => (
          <div key={point.day} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full rounded-t transition-all duration-500"
              style={{ 
                height: `${getBarHeight(point.balance)}%`,
                background: i === 0 
                  ? 'var(--sky-blue)' 
                  : 'var(--gradient-growth)',
                minHeight: '20px'
              }}
            />
            <span className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
              {point.day === 0 ? 'Now' : `${point.day}d`}
            </span>
          </div>
        ))}
      </div>

      {/* Projection cards */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[7, 30, 90].map(days => (
          <div 
            key={days}
            className="text-center p-2 rounded-lg"
            style={{ background: 'var(--cloud)' }}
          >
            <p className="text-xs" style={{ color: 'var(--slate)' }}>{days} days</p>
            <p className="font-bold text-sm" style={{ color: 'var(--midnight)' }}>
              {formatCurrency(projectBalance(currentBalance, interestRate, days))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
