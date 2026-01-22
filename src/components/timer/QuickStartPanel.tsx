'use client';

import { useState } from 'react';
import { Play, AlertCircle, Clock, CheckSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useTimer } from '@/contexts/TimerContext';
import { useTarefasDoDia, TarefaDoDia } from '@/hooks/useTarefasDoDia';

export function QuickStartPanel() {
  const { escritorioAtivo } = useEscritorio();
  const { iniciarTimer } = useTimer();
  const { tarefas, loading, error, refreshTarefas } = useTarefasDoDia(escritorioAtivo?.id || null);
  const [loadingTarefaId, setLoadingTarefaId] = useState<string | null>(null);

  const handleIniciarTimer = async (tarefa: TarefaDoDia) => {
    setLoadingTarefaId(tarefa.id);
    try {
      await iniciarTimer({
        titulo: tarefa.titulo,
        processo_id: tarefa.processo_id,
        consulta_id: tarefa.consultivo_id,
        tarefa_id: tarefa.id,
        faturavel: true,
      });
      await refreshTarefas();
      toast.success('Timer iniciado!');
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao iniciar timer';
      toast.error(errorMessage);
      console.error('Erro ao iniciar timer:', err);
    } finally {
      setLoadingTarefaId(null);
    }
  };

  // Indicador de prioridade (apenas bolinha colorida)
  const getPrioridadeIndicator = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Alta prioridade" />;
      case 'media':
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Média prioridade" />;
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" title="Baixa prioridade" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="w-5 h-5 text-slate-400 mx-auto mb-1.5 animate-spin" />
        <p className="text-xs text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
        <p className="text-xs text-red-600">Erro ao carregar</p>
        <button
          onClick={refreshTarefas}
          className="mt-1.5 text-[10px] text-[#34495e] hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (tarefas.length === 0) {
    return (
      <div className="p-4 text-center">
        <CheckSquare className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
        <p className="text-xs text-slate-500">Nenhuma tarefa para hoje</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Use &quot;Novo Timer&quot; para iniciar
        </p>
      </div>
    );
  }

  return (
    <div className="p-2.5">
      <p className="text-[10px] text-slate-400 mb-2 px-0.5">
        Suas tarefas do dia ({tarefas.length})
      </p>

      <div className="space-y-1">
        {tarefas.map((tarefa) => (
          <div
            key={tarefa.id}
            className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
              tarefa.temTimerAtivo
                ? 'bg-slate-50 opacity-50'
                : 'hover:bg-slate-50'
            }`}
          >
            {/* Indicador de prioridade */}
            {getPrioridadeIndicator(tarefa.prioridade)}

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#34495e] truncate leading-tight">
                {tarefa.titulo}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {tarefa.processo_id
                  ? tarefa.processo_numero || 'Processo'
                  : tarefa.consultivo_id
                  ? tarefa.consultivo_titulo || 'Consulta'
                  : 'Sem vínculo'}
              </p>
            </div>

            {/* Timer ativo badge */}
            {tarefa.temTimerAtivo && (
              <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
                <Clock className="w-2.5 h-2.5" />
                Ativo
              </span>
            )}

            {/* Botão de iniciar */}
            <button
              onClick={() => handleIniciarTimer(tarefa)}
              disabled={tarefa.temTimerAtivo || loadingTarefaId === tarefa.id || (!tarefa.processo_id && !tarefa.consultivo_id)}
              className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
                tarefa.temTimerAtivo || (!tarefa.processo_id && !tarefa.consultivo_id)
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-[#34495e] hover:bg-slate-100'
              }`}
              title={
                tarefa.temTimerAtivo
                  ? 'Timer já ativo'
                  : !tarefa.processo_id && !tarefa.consultivo_id
                  ? 'Sem vínculo'
                  : 'Iniciar timer'
              }
            >
              {loadingTarefaId === tarefa.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
