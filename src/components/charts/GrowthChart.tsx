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
} from 'recharts';
import { format, subDays } from 'date-fns';
import { formatMoney } from '@/lib/utils';
import { Transaction } from '@/types/database';

interface GrowthChartProps {
  transactions: Transaction[];
  currentBalance: number;
  interestRate?: number; // Daily rate for projections
  showProjection?: boolean;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  balance: number;
  interest: number;
}

export default function GrowthChart({ transactions, currentBalance, className }: GrowthChartProps) {
  const chartData = React.useMemo(() => {
    // Generate last 30 days of data
    const days = 30;
    const data: ChartDataPoint[] = [];
    const today = new Date();
    
    // Sort transactions by date
    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Build daily balances
    let balance = 0;
    let txIndex = 0;

    for (let i = days - 1; i >= 0; i--) {
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
      });
    }

    // Use current balance for today if no transactions
    if (data.length > 0 && data[data.length - 1].balance === 0) {
      data[data.length - 1].balance = currentBalance / 100;
    }

    return data;
  }, [transactions, currentBalance]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-[#BDC3C7] p-3">
        <p className="text-sm font-medium text-[#2C3E50]">{label}</p>
        <p className="text-lg font-bold text-[#2ECC71]">
          {formatMoney(payload[0].value * 100)}
        </p>
        {payload[0].payload.interest > 0 && (
          <p className="text-xs text-[#F39C12]">
            +{formatMoney(payload[0].payload.interest * 100)} interest
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.05} />
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
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7F8C8D', fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#2ECC71"
            strokeWidth={3}
            fill="url(#growthGradient)"
            dot={false}
            activeDot={{
              r: 6,
              fill: '#F1C40F',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
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
