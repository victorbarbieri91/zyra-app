'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AgendaItem } from './useAgendaConsolidada';
import { formatDateForDB } from '@/lib/timezone';

export interface TarefaDoDia extends AgendaItem {
  // Adiciona campos úteis para o timer
  temTimerAtivo?: boolean;
}

interface UseTarefasDoDiaReturn {
  tarefas: TarefaDoDia[];
  loading: boolean;
  error: Error | null;
  refreshTarefas: () => Promise<void>;
}

export function useTarefasDoDia(escritorioId: string | null): UseTarefasDoDiaReturn {
  const [tarefas, setTarefas] = useState<TarefaDoDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const loadTarefas = useCallback(async () => {
    if (!escritorioId) {
      setTarefas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obter usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTarefas([]);
        setLoading(false);
        return;
      }

      // Data de hoje
      const hoje = new Date();
      const hojeStr = formatDateForDB(hoje);

      // Buscar tarefas do dia da view consolidada - APENAS do usuário logado
      const { data, error: queryError } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .eq('tipo_entidade', 'tarefa')
        .contains('responsaveis_ids', [user.id]) // Filtrar tarefas onde o usuário é responsável
        .in('status', ['pendente', 'em_andamento'])
        .or(`data_inicio.gte.${hojeStr}T00:00:00,data_inicio.lte.${hojeStr}T23:59:59,prazo_data_limite.gte.${hojeStr}T00:00:00,prazo_data_limite.lte.${hojeStr}T23:59:59`)
        .order('prioridade', { ascending: true }) // alta primeiro
        .order('data_inicio', { ascending: true });

      if (queryError) throw queryError;

      // Verificar quais tarefas já têm timer ativo
      const { data: timersAtivos } = await supabase
        .from('timers_ativos')
        .select('tarefa_id')
        .not('tarefa_id', 'is', null);

      const tarefasComTimerIds = new Set(timersAtivos?.map((t) => t.tarefa_id) || []);

      // Marcar tarefas com timer ativo
      const tarefasComFlag = (data || []).map((tarefa) => ({
        ...tarefa,
        temTimerAtivo: tarefasComTimerIds.has(tarefa.id),
      }));

      setTarefas(tarefasComFlag);
    } catch (err) {
      console.error('Erro ao carregar tarefas do dia:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar tarefas'));
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  useEffect(() => {
    loadTarefas();
  }, [loadTarefas]);

  return {
    tarefas,
    loading,
    error,
    refreshTarefas: loadTarefas,
  };
}
