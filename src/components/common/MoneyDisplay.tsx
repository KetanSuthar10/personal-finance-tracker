import React from 'react';
import { formatRupees } from '../../domain/money';
import { cn } from '../../lib/utils';

export interface MoneyDisplayProps {
  paise: number;
  showSign?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'auto' | 'neutral' | 'success' | 'danger';
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  paise,
  showSign = false,
  className,
  size = 'md',
  variant = 'auto',
}) => {
  const formatted = formatRupees(paise, { showSign });

  let colorClass = 'text-slate-900';
  if (variant === 'success') {
    colorClass = 'text-emerald-600';
  } else if (variant === 'danger') {
    colorClass = 'text-rose-600';
  } else if (variant === 'auto') {
    if (paise > 0 && showSign) {
      colorClass = 'text-emerald-600';
    } else if (paise < 0) {
      colorClass = 'text-rose-600';
    }
  }

  const sizes = {
    sm: 'text-xs font-medium',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-bold tracking-tight',
  };

  return (
    <span className={cn('tabular-nums tracking-tight', sizes[size], colorClass, className)}>
      {formatted}
    </span>
  );
};
