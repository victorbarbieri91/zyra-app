'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureOperationError } from '@/lib/logger';
import {
  TimerAtivo,
  TimerAtivoComDetalhes,
  NovoTimerData,
  FinalizarTimerData,
  calcularTempoAtual,
} from '@/types/timer';

interface UseTimersReturn {
  timers: TimerAtivoComDetalhes[];
  loading: boolean;
  error: Error | null;
  iniciarTimer: (dados: NovoTimerData) => Promise<string>;
  pausarTimer: (timerId: string) => Promise<void>;
  retomarTimer: (timerId: string) => Promise<void>;
  finalizarTimer: (timerId: string, dados?: FinalizarTimerData) => Promise<string>;
  descartarTimer: (timerId: string) => Promise<void>;
  refreshTimers: () => Promise<void>;
  timersRodando: number;
  tempoTotalRodando: number;
}

export function useTimers(escritorioId: string | null): UseTimersReturn {
  const [timers, setTimers] = useState<TimerAtivoComDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar timers do banco
  const loadTimers = useCallback(async () => {
    if (!escritorioId) {
      setTimers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTimers([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('v_timers_ativos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Adicionar tempo_atual calculado
      const timersComTempo = (data || []).map((timer: Record<string, any>) => ({
        ...timer,
        tempo_atual: calcularTempoAtual(timer as TimerAtivo),
      }));

      setTimers(timersComTempo);
    } catch (err) {
      captureOperationError(err, { module: 'Timers', operation: 'buscar', table: 'v_timers_ativos' });
      setError(err instanceof Error ? err : new Error('Erro ao carregar timers'));
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  // Iniciar timer
  const iniciarTimer = useCallback(async (dados: NovoTimerData): Promise<string> => {
    if (!escritorioId) throw new Error('Escritório não selecionado');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error: rpcError } = await supabase.rpc('iniciar_timer', {
      p_escritorio_id: escritorioId,
      p_user_id: user.id,
      p_titulo: dados.titulo,
      p_processo_id: dados.processo_id || null,
      p_consulta_id: dados.consulta_id || null,
      p_tarefa_id: dados.tarefa_id || null,
      p_faturavel: dados.faturavel ?? true,
      p_descricao: dados.descricao || null,
    });

    if (rpcError) throw rpcError;

    await loadTimers();
    return data as string;
  }, [escritorioId, supabase, loadTimers]);

  // Pausar timer
  const pausarTimer = useCallback(async (timerId: string): Promise<void> => {
    const { error: rpcError } = await supabase.rpc('pausar_timer', {
      p_timer_id: timerId,
    });

    if (rpcError) throw rpcError;

    await loadTimers();
  }, [supabase, loadTimers]);

  // Retomar timer
  const retomarTimer = useCallback(async (timerId: string): Promise<void> => {
    const { error: rpcError } = await supabase.rpc('retomar_timer', {
      p_timer_id: timerId,
    });

    if (rpcError) throw rpcError;

    await loadTimers();
  }, [supabase, loadTimers]);

  // Finalizar timer
  const finalizarTimer = useCallback(async (
    timerId: string,
    dados?: FinalizarTimerData
  ): Promise<string> => {
    const { data, error: rpcError } = await supabase.rpc('finalizar_timer', {
      p_timer_id: timerId,
      p_descricao: dados?.descricao || null,
      p_ajuste_minutos: dados?.ajuste_minutos || 0,
    });

    if (rpcError) throw rpcError;

    await loadTimers();
    return data as string;
  }, [supabase, loadTimers]);

  // Descartar timer
  const descartarTimer = useCallback(async (timerId: string): Promise<void> => {
    const { error: rpcError } = await supabase.rpc('descartar_timer', {
      p_timer_id: timerId,
    });

    if (rpcError) throw rpcError;

    await loadTimers();
  }, [supabase, loadTimers]);

  // Carregar timers iniciais
  useEffect(() => {
    loadTimers();
  }, [loadTimers]);

  // Atualizar tempo_atual a cada segundo
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => ({
          ...timer,
          tempo_atual: calcularTempoAtual(timer),
        }))
      );
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Subscription para real-time
  useEffect(() => {
    if (!escritorioId) return;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('timers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timers_ativos',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Recarregar timers quando houver mudança
            loadTimers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [escritorioId, supabase, loadTimers]);

  // Calcular métricas
  const timersRodando = timers.filter((t) => t.status === 'rodando').length;
  const tempoTotalRodando = timers
    .filter((t) => t.status === 'rodando')
    .reduce((acc, t) => acc + t.tempo_atual, 0);

  return {
    timers,
    loading,
    error,
    iniciarTimer,
    pausarTimer,
    retomarTimer,
    finalizarTimer,
    descartarTimer,
    refreshTimers: loadTimers,
    timersRodando,
    tempoTotalRodando,
  };
}
