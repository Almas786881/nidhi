import React from 'react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div
        className={cn(
          'rounded-full animate-spin border-navy-900 border-t-transparent',
          sizeMap[size]
        )}
      />
      {message && <p className="mt-3 text-sm font-medium text-slate-600 animate-pulse">{message}</p>}
    </div>
  );
};
