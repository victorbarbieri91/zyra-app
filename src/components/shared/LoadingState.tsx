import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/design-system';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingState({ message = 'Carregando...', className, size = 'md' }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-[#34495e] mb-4')} />
      {message && (
        <p className={cn(typography.content, 'text-slate-600')}>{message}</p>
      )}
    </div>
  );
}
