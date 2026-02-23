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
      const agora = new Date();
      const hojeStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      // Converter para range UTC: São Paulo = UTC-3
      const inicioHojeUTC = `${hojeStr}T03:00:00`;
      const [y, m, d] = hojeStr.split('-').map(Number);
      const amanhaStr = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
      const fimHojeUTC = `${amanhaStr}T02:59:59`;

      // Buscar itens do dia: tarefas, eventos e audiências (em paralelo)
      const [tarefasResult, eventosResult, audienciasResult] = await Promise.all([
        // Tarefas: pendentes ou em andamento
        supabase
          .from('v_agenda_consolidada')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('tipo_entidade', 'tarefa')
          .contains('responsaveis_ids', [user.id])
          .in('status', ['pendente', 'em_andamento'])
          .gte('data_inicio', inicioHojeUTC)
          .lte('data_inicio', fimHojeUTC)
          .order('prioridade', { ascending: true })
          .order('data_inicio', { ascending: true }),
        // Eventos (compromissos): agendados
        supabase
          .from('v_agenda_consolidada')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('tipo_entidade', 'evento')
          .contains('responsaveis_ids', [user.id])
          .eq('status', 'agendado')
          .gte('data_inicio', inicioHojeUTC)
          .lte('data_inicio', fimHojeUTC)
          .order('data_inicio', { ascending: true }),
        // Audiências: agendadas
        supabase
          .from('v_agenda_consolidada')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('tipo_entidade', 'audiencia')
          .contains('responsaveis_ids', [user.id])
          .eq('status', 'agendada')
          .gte('data_inicio', inicioHojeUTC)
          .lte('data_inicio', fimHojeUTC)
          .order('data_inicio', { ascending: true }),
      ]);

      if (tarefasResult.error) throw tarefasResult.error;
      if (eventosResult.error) throw eventosResult.error;
      if (audienciasResult.error) throw audienciasResult.error;

      const allItems = [
        ...(tarefasResult.data || []),
        ...(eventosResult.data || []),
        ...(audienciasResult.data || []),
      ];

      // Buscar numero_pasta dos processos vinculados
      const processoIds = [...new Set(allItems.filter((t: Record<string, any>) => t.processo_id).map((t: Record<string, any>) => t.processo_id as string))];
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

      // Verificar quais itens já têm timer ativo (tarefas, eventos, audiências)
      const { data: timersAtivos } = await supabase
        .from('timers_ativos')
        .select('tarefa_id, evento_id, audiencia_id')
        .or('tarefa_id.not.is.null,evento_id.not.is.null,audiencia_id.not.is.null');

      const tarefasComTimerIds = new Set(
        timersAtivos?.filter((t: Record<string, any>) => t.tarefa_id).map((t: Record<string, any>) => t.tarefa_id) || []
      );
      const eventosComTimerIds = new Set(
        timersAtivos?.filter((t: Record<string, any>) => t.evento_id).map((t: Record<string, any>) => t.evento_id) || []
      );
      const audienciasComTimerIds = new Set(
        timersAtivos?.filter((t: Record<string, any>) => t.audiencia_id).map((t: Record<string, any>) => t.audiencia_id) || []
      );

      // Marcar itens com timer ativo e numero_pasta
      const itensComFlag = allItems.map((item: Record<string, any>) => ({
        ...item,
        temTimerAtivo:
          (item.tipo_entidade === 'tarefa' && tarefasComTimerIds.has(item.id)) ||
          (item.tipo_entidade === 'evento' && eventosComTimerIds.has(item.id)) ||
          (item.tipo_entidade === 'audiencia' && audienciasComTimerIds.has(item.id)),
        numero_pasta: item.processo_id ? numeroPastaMap.get(item.processo_id) : undefined,
      })) as TarefaDoDia[];

      setTarefas(itensComFlag);
    } catch (err) {
      console.error('Erro ao carregar itens do dia:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar itens'));
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
