'use client';

import { useState } from 'react';
import { TimerAtivoComDetalhes } from '@/types/timer';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';

interface TimerCardProps {
  timer: TimerAtivoComDetalhes;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
  compact?: boolean;
}

export function TimerCard({
  timer,
  onPause,
  onResume,
  onStop,
  onDiscard,
  compact = false,
}: TimerCardProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => void | Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  // Nome do vínculo
  const vinculoNome = timer.processo_numero || timer.consulta_titulo || null;

  if (compact) {
    return (
      <div className="px-2.5 py-2 rounded border border-slate-100 bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  timer.status === 'rodando' ? 'bg-[#89bcbe]' : 'bg-slate-300'
                }`}
              />
              <span className="text-[11px] text-slate-600 truncate">{timer.titulo}</span>
            </div>
          </div>
          <TimerDisplay segundos={timer.tempo_atual} size="sm" className="text-[#34495e]" />
          <TimerControls
            status={timer.status}
            onPlay={() => handleAction(onResume)}
            onPause={() => handleAction(onPause)}
            onStop={onStop}
            onDiscard={onDiscard}
            showDiscard={false}
            size="sm"
            disabled={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-2.5 rounded border border-slate-100 bg-white"
      style={timer.cor ? { borderLeftColor: timer.cor, borderLeftWidth: 2 } : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                timer.status === 'rodando' ? 'bg-[#89bcbe]' : 'bg-slate-300'
              }`}
            />
            <span className="text-[10px] text-slate-400">
              {timer.status === 'rodando' ? 'Rodando' : 'Pausado'}
            </span>
          </div>
          <h4 className="text-xs font-medium text-[#34495e] truncate">{timer.titulo}</h4>
        </div>
        <TimerDisplay
          segundos={timer.tempo_atual}
          size="sm"
          className={timer.status === 'rodando' ? 'text-[#34495e]' : 'text-slate-500'}
        />
      </div>

      {/* Vínculo */}
      {(vinculoNome || timer.cliente_nome) && (
        <div className="text-[10px] text-slate-400 truncate mb-2">
          {vinculoNome && <span>{vinculoNome}</span>}
          {vinculoNome && timer.cliente_nome && <span className="mx-1">•</span>}
          {timer.cliente_nome && <span>{timer.cliente_nome}</span>}
        </div>
      )}

      {/* Descrição */}
      {timer.descricao && (
        <p className="text-[10px] text-slate-400 mb-2 line-clamp-1">{timer.descricao}</p>
      )}

      {/* Controles */}
      <div className="flex items-center justify-end">
        <TimerControls
          status={timer.status}
          onPlay={() => handleAction(onResume)}
          onPause={() => handleAction(onPause)}
          onStop={onStop}
          onDiscard={onDiscard}
          size="sm"
          disabled={loading}
        />
      </div>
    </div>
  );
}
