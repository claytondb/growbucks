'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { format, subDays, addDays } from 'date-fns';
import { formatMoney } from '@/lib/utils';
import { Transaction } from '@/types/database';

interface GrowthChartProps {
  transactions: Transaction[];
  currentBalance: number;
  interestRate?: number; // Daily rate for projections
  showProjection?: boolean;
  projectionDays?: number;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  balance: number | null;
  interest: number;
  projected?: number | null;
  isProjection?: boolean;
}

export default function GrowthChart({ 
  transactions, 
  currentBalance, 
  interestRate = 0.01,
  showProjection = true,
  projectionDays = 14,
  className 
}: GrowthChartProps) {
  const chartData = React.useMemo(() => {
    // Generate last 30 days of data
    const historyDays = 30;
    const data: ChartDataPoint[] = [];
    const today = new Date();
    
    // Sort transactions by date
    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Build daily balances
    let balance = 0;
    let txIndex = 0;

    for (let i = historyDays - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      let dailyInterest = 0;

      // Apply all transactions up to this date
      while (
        txIndex < sortedTx.length &&
        format(new Date(sortedTx[txIndex].created_at), 'yyyy-MM-dd') <= dateStr
      ) {
        const tx = sortedTx[txIndex];
        balance = tx.balance_after_cents;
        if (tx.type === 'interest') {
          dailyInterest += tx.amount_cents;
        }
        txIndex++;
      }

      data.push({
        date: format(date, 'MMM d'),
        balance: balance / 100,
        interest: dailyInterest / 100,
        projected: null,
        isProjection: false,
      });
    }

    // Use current balance for today if no transactions
    if (data.length > 0 && data[data.length - 1].balance === 0) {
      data[data.length - 1].balance = currentBalance / 100;
    }

    // Add today's balance as projected start point
    const currentBalanceDollars = currentBalance / 100;
    if (data.length > 0) {
      data[data.length - 1].projected = currentBalanceDollars;
    }

    // Add projection data if enabled
    if (showProjection && projectionDays > 0) {
      let projectedBalance = currentBalanceDollars;
      
      for (let i = 1; i <= projectionDays; i++) {
        const date = addDays(today, i);
        projectedBalance = projectedBalance * (1 + interestRate);
        
        data.push({
          date: format(date, 'MMM d'),
          balance: null, // No actual balance for future dates
          interest: 0,
          projected: Math.round(projectedBalance * 100) / 100,
          isProjection: true,
        });
      }
    }

    return data;
  }, [transactions, currentBalance, showProjection, projectionDays, interestRate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    const isProjection = dataPoint?.isProjection;
    const value = dataPoint?.balance ?? dataPoint?.projected;

    if (value === null || value === undefined) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-[#BDC3C7] p-3">
        <p className="text-sm font-medium text-[#2C3E50]">
          {label} {isProjection && <span className="text-[#9B59B6]">(projected)</span>}
        </p>
        <p className={`text-lg font-bold ${isProjection ? 'text-[#9B59B6]' : 'text-[#2ECC71]'}`}>
          {formatMoney(value * 100)}
        </p>
        {!isProjection && dataPoint?.interest > 0 && (
          <p className="text-xs text-[#F39C12]">
            +{formatMoney(dataPoint.interest * 100)} interest
          </p>
        )}
        {isProjection && (
          <p className="text-xs text-[#7F8C8D]">
            🔮 If you keep saving!
          </p>
        )}
      </div>
    );
  };

  // Find the transition point between actual and projected
  const todayIndex = chartData.findIndex(d => d.isProjection) - 1;

  return (
    <div className={className}>
      {/* Legend */}
      {showProjection && (
        <div className="flex items-center justify-end gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#2ECC71]" />
            <span className="text-[#7F8C8D]">Actual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#9B59B6]" style={{ borderStyle: 'dashed' }} />
            <span className="text-[#7F8C8D]">Projected Growth 🚀</span>
          </div>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9B59B6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#9B59B6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#BDC3C7"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7F8C8D', fontSize: 12 }}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7F8C8D', fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Today reference line */}
          {todayIndex >= 0 && showProjection && (
            <ReferenceLine 
              x={chartData[todayIndex]?.date} 
              stroke="#BDC3C7" 
              strokeDasharray="3 3"
              label={{ value: 'Today', position: 'top', fill: '#7F8C8D', fontSize: 10 }}
            />
          )}
          
          {/* Actual balance area */}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#2ECC71"
            strokeWidth={3}
            fill="url(#growthGradient)"
            dot={false}
            connectNulls={false}
            activeDot={{
              r: 6,
              fill: '#F1C40F',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
          
          {/* Projected balance line */}
          {showProjection && (
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#9B59B6"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#projectionGradient)"
              dot={false}
              connectNulls={true}
              activeDot={{
                r: 5,
                fill: '#9B59B6',
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Mini sparkline version for cards
interface SparklineProps {
  data: number[];
  className?: string;
}

export function GrowthSparkline({ data, className }: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#2ECC71"
            strokeWidth={2}
            fill="url(#sparklineGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
