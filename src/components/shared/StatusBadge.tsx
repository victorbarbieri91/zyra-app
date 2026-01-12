import React from 'react';
import { cn } from '@/lib/utils';
import { typography, colorVariants, type ColorVariant } from '@/lib/design-system';

interface StatusBadgeProps {
  variant: ColorVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  const colors = colorVariants[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded border',
        typography.badge,
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {children}
    </span>
  );
}
