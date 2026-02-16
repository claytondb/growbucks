'use client';

import * as React from 'react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, src, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const showFallback = !src || imageError;

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center justify-center rounded-full overflow-hidden font-bold text-white',
          sizeClasses[size],
          showFallback && getAvatarColor(name),
          className
        )}
        {...props}
      >
        {showFallback ? (
          <span>{getInitials(name)}</span>
        ) : (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

// Avatar with selection ring (for child login)
export interface SelectableAvatarProps extends AvatarProps {
  selected?: boolean;
  onSelect?: () => void;
}

const SelectableAvatar = React.forwardRef<HTMLDivElement, SelectableAvatarProps>(
  ({ selected, onSelect, className, ...props }, ref) => {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'relative rounded-full transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[#3498DB] focus:ring-offset-2',
          selected && 'ring-4 ring-[#2ECC71] ring-offset-2 scale-110',
          !selected && 'hover:scale-105 opacity-70 hover:opacity-100'
        )}
      >
        <Avatar ref={ref} className={className} {...props} />
        {selected && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2ECC71] rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>
    );
  }
);
SelectableAvatar.displayName = 'SelectableAvatar';

export { Avatar, SelectableAvatar };
