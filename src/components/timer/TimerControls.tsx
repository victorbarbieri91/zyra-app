'use client';

import { Play, Pause, Square, Trash2 } from 'lucide-react';
import { TimerStatus } from '@/types/timer';

interface TimerControlsProps {
  status: TimerStatus;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onDiscard?: () => void;
  showDiscard?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function TimerControls({
  status,
  onPlay,
  onPause,
  onStop,
  onDiscard,
  showDiscard = true,
  size = 'md',
  disabled = false,
}: TimerControlsProps) {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const buttonBase = `rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="flex items-center gap-1.5">
      {/* Play / Pause */}
      {status === 'pausado' ? (
        <button
          onClick={onPlay}
          disabled={disabled}
          className={`${buttonBase} ${sizeClasses[size]} bg-emerald-100 text-emerald-600 hover:bg-emerald-200 focus:ring-emerald-500`}
          title="Retomar"
        >
          <Play className={iconSizes[size]} />
        </button>
      ) : (
        <button
          onClick={onPause}
          disabled={disabled}
          className={`${buttonBase} ${sizeClasses[size]} bg-amber-100 text-amber-600 hover:bg-amber-200 focus:ring-amber-500`}
          title="Pausar"
        >
          <Pause className={iconSizes[size]} />
        </button>
      )}

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={disabled}
        className={`${buttonBase} ${sizeClasses[size]} bg-slate-100 text-slate-600 hover:bg-slate-200 focus:ring-slate-500`}
        title="Parar e salvar"
      >
        <Square className={iconSizes[size]} />
      </button>

      {/* Discard */}
      {showDiscard && (
        <button
          onClick={onDiscard}
          disabled={disabled}
          className={`${buttonBase} ${sizeClasses[size]} bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-500`}
          title="Descartar"
        >
          <Trash2 className={iconSizes[size]} />
        </button>
      )}
    </div>
  );
}
