'use client';

import { formatarTempo, formatarTempoHorasMinutos } from '@/types/timer';

interface TimerDisplayProps {
  segundos: number;
  showSeconds?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TimerDisplay({
  segundos,
  showSeconds = true,
  size = 'md',
  className = '',
}: TimerDisplayProps) {
  const tempo = showSeconds ? formatarTempo(segundos) : formatarTempoHorasMinutos(segundos);

  const sizeClasses = {
    sm: 'text-xs font-medium',
    md: 'text-sm font-semibold',
    lg: 'text-base font-semibold',
  };

  return (
    <span
      className={`font-mono tabular-nums tracking-wide ${sizeClasses[size]} ${className}`}
    >
      {tempo}
    </span>
  );
}
