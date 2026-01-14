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
    sm: 'text-sm font-medium',
    md: 'text-lg font-semibold',
    lg: 'text-2xl font-bold',
  };

  return (
    <span
      className={`font-mono tabular-nums tracking-wider ${sizeClasses[size]} ${className}`}
    >
      {tempo}
    </span>
  );
}
