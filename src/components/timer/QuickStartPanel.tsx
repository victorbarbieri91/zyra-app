'use client';

import { useState } from 'react';
import { Play, AlertCircle, Clock, FileText, CheckSquare, Loader2 } from 'lucide-react';
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

  // Prioridade visual
  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
            Alta
          </span>
        );
      case 'media':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
            Média
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
            Baixa
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-6 h-6 text-slate-400 mx-auto mb-2 animate-spin" />
        <p className="text-sm text-slate-500">Carregando tarefas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600">Erro ao carregar tarefas</p>
        <button
          onClick={refreshTarefas}
          className="mt-2 text-xs text-[#34495e] hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (tarefas.length === 0) {
    return (
      <div className="p-6 text-center">
        <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nenhuma tarefa para hoje</p>
        <p className="text-xs text-slate-400 mt-1">
          Crie tarefas na agenda ou use &quot;Novo Timer&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs text-slate-500 mb-2">
        Tarefas do dia ({tarefas.length})
      </p>

      {tarefas.map((tarefa) => (
        <div
          key={tarefa.id}
          className={`p-3 rounded-lg border transition-colors ${
            tarefa.temTimerAtivo
              ? 'border-emerald-200 bg-emerald-50/50 opacity-60'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-1.5 mb-1">
                {getPrioridadeBadge(tarefa.prioridade)}
                {tarefa.temTimerAtivo && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                    Timer ativo
                  </span>
                )}
              </div>

              {/* Título */}
              <h4 className="text-sm font-medium text-slate-700 truncate">{tarefa.titulo}</h4>

              {/* Vínculo */}
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                {tarefa.processo_id ? (
                  <>
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{tarefa.processo_numero || 'Processo'}</span>
                  </>
                ) : tarefa.consultivo_id ? (
                  <>
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{tarefa.consultivo_titulo || 'Consulta'}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Sem vínculo</span>
                )}
              </div>

              {/* Data/Hora planejada */}
              {tarefa.horario_planejado_dia && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    {tarefa.horario_planejado_dia}
                    {tarefa.duracao_planejada_minutos && ` (${tarefa.duracao_planejada_minutos}min)`}
                  </span>
                </div>
              )}
            </div>

            {/* Botão de iniciar */}
            <button
              onClick={() => handleIniciarTimer(tarefa)}
              disabled={tarefa.temTimerAtivo || loadingTarefaId === tarefa.id || !tarefa.processo_id && !tarefa.consultivo_id}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                tarefa.temTimerAtivo || (!tarefa.processo_id && !tarefa.consultivo_id)
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
              }`}
              title={
                tarefa.temTimerAtivo
                  ? 'Timer já ativo'
                  : !tarefa.processo_id && !tarefa.consultivo_id
                  ? 'Tarefa sem vínculo com processo/consulta'
                  : 'Iniciar timer'
              }
            >
              {loadingTarefaId === tarefa.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
