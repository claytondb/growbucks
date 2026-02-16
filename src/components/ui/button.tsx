'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[#2ECC71] text-white shadow-[0_4px_0_#27AE60] hover:bg-[#27AE60] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#1e8449] active:translate-y-0.5 active:shadow-[0_2px_0_#27AE60] focus-visible:ring-[#2ECC71]',
        secondary:
          'bg-white text-[#2ECC71] border-2 border-[#2ECC71] hover:bg-[#ECF0F1] focus-visible:ring-[#2ECC71]',
        deposit:
          'bg-[#F1C40F] text-[#2C3E50] shadow-[0_4px_0_#F39C12] hover:bg-[#F39C12] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_#F39C12] focus-visible:ring-[#F1C40F]',
        withdraw:
          'bg-white text-[#E74C3C] border-2 border-[#E74C3C] hover:bg-red-50 focus-visible:ring-[#E74C3C]',
        ghost:
          'hover:bg-[#ECF0F1] focus-visible:ring-[#3498DB]',
        link:
          'text-[#3498DB] underline-offset-4 hover:underline focus-visible:ring-[#3498DB]',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-13 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
