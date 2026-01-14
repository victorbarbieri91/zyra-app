'use client';

import { useState } from 'react';
import { DollarSign, FileText, MessageSquare, CheckSquare } from 'lucide-react';
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

  // Badge de status
  const statusBadge = timer.status === 'rodando' ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
      Rodando
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
      Pausado
    </span>
  );

  // Ícone de vínculo
  const vinculoIcon = timer.processo_id ? (
    <FileText className="w-3 h-3 text-slate-400" />
  ) : timer.consulta_id ? (
    <MessageSquare className="w-3 h-3 text-slate-400" />
  ) : null;

  // Nome do vínculo
  const vinculoNome = timer.processo_numero || timer.consulta_titulo || 'Sem vínculo';

  if (compact) {
    return (
      <div
        className={`px-3 py-2 rounded-lg border transition-colors ${
          timer.status === 'rodando'
            ? 'border-emerald-200 bg-emerald-50/50'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {statusBadge}
              <span className="text-xs text-slate-500 truncate">{timer.titulo}</span>
            </div>
          </div>
          <TimerDisplay segundos={timer.tempo_atual} size="sm" />
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
      className={`p-3 rounded-lg border transition-colors ${
        timer.status === 'rodando'
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-slate-200 bg-white'
      }`}
      style={timer.cor ? { borderLeftColor: timer.cor, borderLeftWidth: 3 } : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {statusBadge}
            {timer.faturavel && (
              <span className="text-emerald-500" title="Faturável">
                <DollarSign className="w-3 h-3" />
              </span>
            )}
            {timer.tarefa_id && (
              <span className="text-[#89bcbe]" title="Vinculado a tarefa">
                <CheckSquare className="w-3 h-3" />
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-slate-700 truncate">{timer.titulo}</h4>
        </div>
        <TimerDisplay
          segundos={timer.tempo_atual}
          size="md"
          className={timer.status === 'rodando' ? 'text-emerald-600' : 'text-slate-600'}
        />
      </div>

      {/* Vínculo */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        {vinculoIcon}
        <span className="truncate">{vinculoNome}</span>
        {timer.cliente_nome && (
          <>
            <span className="text-slate-300">|</span>
            <span className="truncate">{timer.cliente_nome}</span>
          </>
        )}
      </div>

      {/* Descrição */}
      {timer.descricao && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{timer.descricao}</p>
      )}

      {/* Controles */}
      <div className="flex items-center justify-end">
        <TimerControls
          status={timer.status}
          onPlay={() => handleAction(onResume)}
          onPause={() => handleAction(onPause)}
          onStop={onStop}
          onDiscard={onDiscard}
          size="md"
          disabled={loading}
        />
      </div>
    </div>
  );
}
