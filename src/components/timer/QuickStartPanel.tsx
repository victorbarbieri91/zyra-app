'use client';

import { useState } from 'react';
import { Play, AlertCircle, Clock, CheckSquare, Loader2, Gavel, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useTimer } from '@/contexts/TimerContext';
import { useTarefasDoDia, TarefaDoDia } from '@/hooks/useTarefasDoDia';

export function QuickStartPanel() {
  const { escritorioAtivo } = useEscritorio();
  const { iniciarTimer } = useTimer();
  const { tarefas, loading, error, refreshTarefas } = useTarefasDoDia(escritorioAtivo?.id || null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const handleIniciarTimer = async (item: TarefaDoDia) => {
    setLoadingItemId(item.id);
    try {
      await iniciarTimer({
        titulo: item.titulo,
        processo_id: item.processo_id || undefined,
        consulta_id: item.consultivo_id || undefined,
        tarefa_id: item.tipo_entidade === 'tarefa' ? item.id : undefined,
        evento_id: item.tipo_entidade === 'evento' ? item.id : undefined,
        audiencia_id: item.tipo_entidade === 'audiencia' ? item.id : undefined,
        faturavel: true,
      });
      await refreshTarefas();
      toast.success('Timer iniciado!');
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao iniciar timer';
      toast.error(errorMessage);
      console.error('Erro ao iniciar timer:', err);
    } finally {
      setLoadingItemId(null);
    }
  };

  // Indicador por tipo de entidade
  const getTipoIndicator = (item: TarefaDoDia) => {
    switch (item.tipo_entidade) {
      case 'audiencia':
        return (
          <span className="w-4 h-4 rounded flex items-center justify-center bg-emerald-100 flex-shrink-0" title="Audiência">
            <Gavel className="w-2.5 h-2.5 text-emerald-600" />
          </span>
        );
      case 'evento':
        return (
          <span className="w-4 h-4 rounded flex items-center justify-center bg-[#aacfd0]/30 flex-shrink-0" title="Compromisso">
            <Video className="w-2.5 h-2.5 text-[#46627f]" />
          </span>
        );
      default: // tarefa
        return getPrioridadeIndicator(item.prioridade);
    }
  };

  // Indicador de prioridade (apenas bolinha colorida) - para tarefas
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

  // Subtítulo contextual do item
  const getSubtitulo = (item: TarefaDoDia) => {
    if (item.tipo_entidade === 'evento') {
      return item.processo_id
        ? item.numero_pasta || item.caso_titulo || 'Processo'
        : item.consultivo_id
        ? item.consultivo_titulo || 'Consulta'
        : 'Sem vínculo';
    }
    if (item.tipo_entidade === 'audiencia') {
      return item.processo_id
        ? item.numero_pasta || item.caso_titulo || 'Processo'
        : item.consultivo_id
        ? item.consultivo_titulo || 'Consulta'
        : 'Sem vínculo';
    }
    // tarefa
    return item.processo_id
      ? item.numero_pasta || item.caso_titulo || item.processo_numero || 'Processo'
      : item.consultivo_id
      ? item.consultivo_titulo || 'Consulta'
      : 'Sem vínculo';
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
        <p className="text-xs text-slate-500">Nenhum item para hoje</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Use &quot;Novo Timer&quot; para iniciar
        </p>
      </div>
    );
  }

  return (
    <div className="p-2.5">
      <p className="text-[10px] text-slate-400 mb-2 px-0.5">
        Seus itens do dia ({tarefas.length})
      </p>

      <div className="space-y-1">
        {tarefas.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
              item.temTimerAtivo
                ? 'bg-slate-50 opacity-50'
                : 'hover:bg-slate-50'
            }`}
          >
            {/* Indicador de tipo */}
            {getTipoIndicator(item)}

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#34495e] truncate leading-tight">
                {item.titulo}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {getSubtitulo(item)}
              </p>
            </div>

            {/* Timer ativo badge */}
            {item.temTimerAtivo && (
              <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
                <Clock className="w-2.5 h-2.5" />
                Ativo
              </span>
            )}

            {/* Botão de iniciar */}
            <button
              onClick={() => handleIniciarTimer(item)}
              disabled={item.temTimerAtivo || loadingItemId === item.id || (!item.processo_id && !item.consultivo_id)}
              className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
                item.temTimerAtivo || (!item.processo_id && !item.consultivo_id)
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-[#34495e] hover:bg-slate-100'
              }`}
              title={
                item.temTimerAtivo
                  ? 'Timer já ativo'
                  : !item.processo_id && !item.consultivo_id
                  ? 'Sem vínculo'
                  : 'Iniciar timer'
              }
            >
              {loadingItemId === item.id ? (
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
