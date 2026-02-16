'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#2C3E50] mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex w-full rounded-xl border-2 border-[#BDC3C7] bg-white px-4 py-3.5 text-base font-medium text-[#2C3E50] transition-all duration-200',
            'placeholder:text-[#7F8C8D]',
            'focus:outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-[#3498DB]/15',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#ECF0F1]',
            error && 'border-[#E74C3C] focus:border-[#E74C3C] focus:ring-[#E74C3C]/15',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-[#E74C3C]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Money Input with $ prefix
export interface MoneyInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: number; // Value in cents
  onChange: (cents: number) => void;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, error, label, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(
      value > 0 ? (value / 100).toFixed(2) : ''
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      
      // Handle decimal input
      const parts = raw.split('.');
      let formatted = parts[0];
      if (parts.length > 1) {
        formatted += '.' + parts[1].slice(0, 2);
      }
      
      setDisplayValue(formatted);
      
      const cents = Math.round(parseFloat(formatted || '0') * 100);
      onChange(isNaN(cents) ? 0 : cents);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#2C3E50] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-[#7F8C8D]">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            className={cn(
              'flex w-full rounded-xl border-2 border-[#BDC3C7] bg-white pl-10 pr-4 py-5 text-2xl font-mono font-medium text-center text-[#2C3E50] transition-all duration-200',
              'placeholder:text-[#7F8C8D]',
              'focus:outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-[#3498DB]/15',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-[#E74C3C] focus:border-[#E74C3C] focus:ring-[#E74C3C]/15',
              className
            )}
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            placeholder="0.00"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[#E74C3C]">{error}</p>
        )}
      </div>
    );
  }
);
MoneyInput.displayName = 'MoneyInput';

// PIN Input with masked display
export interface PinInputProps {
  value: string;
  onChange: (pin: string) => void;
  length?: number;
  error?: string;
  label?: string;
}

const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(
  ({ value, onChange, length = 4, error, label }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
      onChange(pin);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#2C3E50] mb-1.5">
            {label}
          </label>
        )}
        <div 
          className="flex gap-2 justify-center cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {Array.from({ length }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200',
                i < value.length 
                  ? 'border-[#2ECC71] bg-[#2ECC71]/10 text-[#2C3E50]' 
                  : 'border-[#BDC3C7] bg-white text-[#7F8C8D]',
                error && 'border-[#E74C3C]'
              )}
            >
              {value[i] ? '●' : ''}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleChange}
          className="sr-only"
          maxLength={6}
          autoComplete="one-time-code"
        />
        {error && (
          <p className="mt-2 text-sm text-[#E74C3C] text-center">{error}</p>
        )}
      </div>
    );
  }
);
PinInput.displayName = 'PinInput';

export { Input, MoneyInput, PinInput };
