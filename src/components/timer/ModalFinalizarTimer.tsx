'use client';

import { useState } from 'react';
import { X, Clock, DollarSign, FileText, Trash2, Loader2, Plus, Minus } from 'lucide-react';
import { TimerAtivoComDetalhes, formatarTempo, segundosParaHorasDecimais } from '@/types/timer';
import { TimerDisplay } from './TimerDisplay';

interface ModalFinalizarTimerProps {
  timer: TimerAtivoComDetalhes;
  onConfirm: (descricao: string, ajusteMinutos: number) => Promise<void>;
  onCancel: () => void;
  onDiscard: () => void;
}

export function ModalFinalizarTimer({
  timer,
  onConfirm,
  onCancel,
  onDiscard,
}: ModalFinalizarTimerProps) {
  const [descricao, setDescricao] = useState(timer.descricao || timer.titulo);
  const [ajusteMinutos, setAjusteMinutos] = useState(0);
  const [loading, setLoading] = useState(false);

  const tempoFinal = Math.max(0, timer.tempo_atual + ajusteMinutos * 60);
  const horasDecimais = segundosParaHorasDecimais(tempoFinal);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(descricao, ajusteMinutos);
    } finally {
      setLoading(false);
    }
  };

  const handleAjuste = (minutos: number) => {
    setAjusteMinutos((prev) => prev + minutos);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-base font-semibold text-[#34495e]">Finalizar Timer</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-4">
          {/* Info do Timer */}
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{timer.titulo}</span>
              <div className="flex items-center gap-2">
                {timer.faturavel && (
                  <span className="text-emerald-500" title="Faturável">
                    <DollarSign className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="w-3 h-3" />
              <span>{timer.processo_numero || timer.consulta_titulo || 'Sem vínculo'}</span>
              {timer.cliente_nome && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{timer.cliente_nome}</span>
                </>
              )}
            </div>
          </div>

          {/* Tempo */}
          <div className="text-center py-4">
            <p className="text-xs text-slate-500 mb-1">Tempo total</p>
            <TimerDisplay segundos={tempoFinal} size="lg" />
            <p className="text-sm text-slate-500 mt-1">
              {horasDecimais.toFixed(2)} horas
            </p>
          </div>

          {/* Ajuste de Tempo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Ajustar tempo (minutos)
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleAjuste(-15)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-slate-600" />
                <span className="sr-only">-15</span>
              </button>
              <button
                onClick={() => handleAjuste(-5)}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
              >
                -5
              </button>
              <span className={`w-20 text-center text-sm font-medium ${
                ajusteMinutos > 0 ? 'text-emerald-600' : ajusteMinutos < 0 ? 'text-red-600' : 'text-slate-600'
              }`}>
                {ajusteMinutos > 0 ? `+${ajusteMinutos}` : ajusteMinutos} min
              </span>
              <button
                onClick={() => handleAjuste(5)}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
              >
                +5
              </button>
              <button
                onClick={() => handleAjuste(15)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-600" />
                <span className="sr-only">+15</span>
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Atividade realizada
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34495e] focus:border-transparent resize-none"
              placeholder="Descreva a atividade realizada..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <button
            onClick={onDiscard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Descartar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || tempoFinal <= 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-[#34495e] rounded-lg hover:bg-[#46627f] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
