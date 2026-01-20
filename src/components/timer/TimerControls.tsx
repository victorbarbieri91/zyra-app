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
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const buttonBase = `rounded flex items-center justify-center transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="flex items-center gap-1">
      {/* Play / Pause */}
      {status === 'pausado' ? (
        <button
          onClick={onPlay}
          disabled={disabled}
          className={`${buttonBase} ${sizeClasses[size]} bg-slate-100 text-[#34495e] hover:bg-slate-200`}
          title="Retomar"
        >
          <Play className={iconSizes[size]} />
        </button>
      ) : (
        <button
          onClick={onPause}
          disabled={disabled}
          className={`${buttonBase} ${sizeClasses[size]} bg-slate-100 text-[#46627f] hover:bg-slate-200`}
          title="Pausar"
        >
          <Pause className={iconSizes[size]} />
        </button>
      )}

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={disabled}
        className={`${buttonBase} ${sizeClasses[size]} bg-slate-100 text-slate-500 hover:bg-slate-200`}
        title="Parar e salvar"
      >
        <Square className={iconSizes[size]} />
      </button>

      {/* Discard */}
      {showDiscard && (
        <button
          onClick={onDiscard}
          disabled={disabled}
          className={`${buttonBase} ${sizeClasses[size]} text-slate-400 hover:text-slate-500 hover:bg-slate-100`}
          title="Descartar"
        >
          <Trash2 className={iconSizes[size]} />
        </button>
      )}
    </div>
  );
}
