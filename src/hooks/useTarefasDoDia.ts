'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AgendaItem } from './useAgendaConsolidada';

export interface TarefaDoDia extends AgendaItem {
  // Adiciona campos úteis para o timer
  temTimerAtivo?: boolean;
  numero_pasta?: string;
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

      // Data de hoje em São Paulo (YYYY-MM-DD) via Intl API
      // formatDateForDB retorna ISO completo, não serve para concatenar
      const agora = new Date();
      const hojeStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      // Converter para range UTC: São Paulo = UTC-3
      // Meia-noite São Paulo = 03:00 UTC do mesmo dia
      const inicioHojeUTC = `${hojeStr}T03:00:00`;
      // 23:59:59 São Paulo = dia seguinte 02:59:59 UTC
      const [y, m, d] = hojeStr.split('-').map(Number);
      const amanhaStr = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
      const fimHojeUTC = `${amanhaStr}T02:59:59`;

      // Buscar tarefas do dia da view consolidada - APENAS do usuário logado
      // data_inicio é timestamptz → compara em UTC (meia-noite SP = 03:00 UTC)
      const { data, error: queryError } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .eq('tipo_entidade', 'tarefa')
        .contains('responsaveis_ids', [user.id])
        .in('status', ['pendente', 'em_andamento'])
        .gte('data_inicio', inicioHojeUTC)
        .lte('data_inicio', fimHojeUTC)
        .order('prioridade', { ascending: true }) // alta primeiro
        .order('data_inicio', { ascending: true });

      if (queryError) throw queryError;

      // Buscar numero_pasta dos processos vinculados
      const processoIds = [...new Set((data || []).filter((t) => t.processo_id).map((t) => t.processo_id!))];
      const numeroPastaMap = new Map<string, string>();
      if (processoIds.length > 0) {
        const { data: processos } = await supabase
          .from('processos_processos')
          .select('id, numero_pasta')
          .in('id', processoIds);
        (processos || []).forEach((p: any) => {
          if (p.numero_pasta) numeroPastaMap.set(p.id, p.numero_pasta);
        });
      }

      // Verificar quais tarefas já têm timer ativo
      const { data: timersAtivos } = await supabase
        .from('timers_ativos')
        .select('tarefa_id')
        .not('tarefa_id', 'is', null);

      const tarefasComTimerIds = new Set(timersAtivos?.map((t) => t.tarefa_id) || []);

      // Marcar tarefas com timer ativo e numero_pasta
      const tarefasComFlag = (data || []).map((tarefa) => ({
        ...tarefa,
        temTimerAtivo: tarefasComTimerIds.has(tarefa.id),
        numero_pasta: tarefa.processo_id ? numeroPastaMap.get(tarefa.processo_id) : undefined,
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
