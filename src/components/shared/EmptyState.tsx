import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/design-system';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-surface-2 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className={cn(typography.cardTitle, 'text-[#34495e] dark:text-slate-200 mb-2')}>{title}</h3>
      <p className={cn(typography.content, 'text-slate-600 dark:text-slate-400 text-center max-w-sm mb-6')}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-gradient-to-r from-[#34495e] to-[#46627f] dark:from-[#89bcbe] dark:to-[#6ba9ab] hover:opacity-90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
