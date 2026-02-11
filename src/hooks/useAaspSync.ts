'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SyncLog {
  id: string;
  escritorio_id: string;
  associado_id: string | null;
  tipo: 'automatica' | 'manual';
  data_inicio: string;
  data_fim: string | null;
  publicacoes_novas: number;
  publicacoes_atualizadas: number;
  sucesso: boolean;
  erro_mensagem: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface SyncResult {
  sucesso: boolean;
  mensagem: string;
  publicacoes_novas?: number;
  publicacoes_atualizadas?: number;
  erros?: string[];
}

export interface DebugResult {
  sucesso: boolean;
  mensagem: string;
  diagnostico?: any;
}

interface UseAaspSyncReturn {
  sincronizando: boolean;
  ultimaSync: SyncLog | null;
  historicoSync: SyncLog[];
  carregandoHistorico: boolean;
  sincronizarTodos: () => Promise<SyncResult>;
  sincronizarAssociado: (associadoId: string) => Promise<SyncResult>;
  diagnosticarAPI: (associadoId: string) => Promise<DebugResult>;
  getHistorico: (limit?: number) => Promise<SyncLog[]>;
}

export function useAaspSync(escritorioId: string | undefined): UseAaspSyncReturn {
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<SyncLog | null>(null);
  const [historicoSync, setHistoricoSync] = useState<SyncLog[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const getHistorico = useCallback(async (limit: number = 10): Promise<SyncLog[]> => {
    if (!escritorioId) return [];

    setCarregandoHistorico(true);

    try {
      const { data, error } = await supabase
        .from('publicacoes_sincronizacoes')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar histórico AASP:', error);
        return [];
      }

      const logs = data || [];
      setHistoricoSync(logs);

      if (logs.length > 0) {
        setUltimaSync(logs[0]);
      }

      return logs;
    } finally {
      setCarregandoHistorico(false);
    }
  }, [escritorioId, supabase]);

  const sincronizarTodos = useCallback(async (): Promise<SyncResult> => {
    console.log('[useAaspSync] sincronizarTodos chamado')
    console.log('[useAaspSync] escritorioId:', escritorioId)

    if (!escritorioId) {
      console.log('[useAaspSync] Erro: escritorioId não definido')
      return {
        sucesso: false,
        mensagem: 'Escritório não identificado'
      };
    }

    setSincronizando(true);
    console.log('[useAaspSync] Chamando Edge Function aasp-sync...')

    try {
      const { data, error } = await supabase.functions.invoke('aasp-sync', {
        body: {
          action: 'sync_all',
          escritorio_id: escritorioId
        }
      });

      console.log('[useAaspSync] Resposta da Edge Function:', { data, error });

      if (error) {
        return {
          sucesso: false,
          mensagem: error.message || 'Erro na sincronização'
        };
      }

      // Recarregar histórico após sync
      await getHistorico();

      return {
        sucesso: data?.sucesso ?? false,
        mensagem: data?.mensagem || 'Sincronização concluída',
        publicacoes_novas: data?.publicacoes_novas,
        publicacoes_atualizadas: data?.publicacoes_atualizadas,
        erros: data?.erros
      };
    } catch (err: any) {
      return {
        sucesso: false,
        mensagem: err.message || 'Erro de conexão'
      };
    } finally {
      setSincronizando(false);
    }
  }, [escritorioId, supabase, getHistorico]);

  const sincronizarAssociado = useCallback(async (associadoId: string): Promise<SyncResult> => {
    if (!escritorioId) {
      return {
        sucesso: false,
        mensagem: 'Escritório não identificado'
      };
    }

    setSincronizando(true);

    try {
      const { data, error } = await supabase.functions.invoke('aasp-sync', {
        body: {
          action: 'sync_one',
          escritorio_id: escritorioId,
          associado_id: associadoId
        }
      });

      if (error) {
        return {
          sucesso: false,
          mensagem: error.message || 'Erro na sincronização'
        };
      }

      // Recarregar histórico após sync
      await getHistorico();

      return {
        sucesso: data?.sucesso ?? false,
        mensagem: data?.mensagem || 'Sincronização concluída',
        publicacoes_novas: data?.publicacoes_novas,
        publicacoes_atualizadas: data?.publicacoes_atualizadas
      };
    } catch (err: any) {
      return {
        sucesso: false,
        mensagem: err.message || 'Erro de conexão'
      };
    } finally {
      setSincronizando(false);
    }
  }, [escritorioId, supabase, getHistorico]);

  const diagnosticarAPI = useCallback(async (associadoId: string): Promise<DebugResult> => {
    if (!escritorioId) {
      return { sucesso: false, mensagem: 'Escritório não identificado' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('aasp-sync', {
        body: {
          action: 'debug',
          escritorio_id: escritorioId,
          associado_id: associadoId
        }
      });

      if (error) {
        return { sucesso: false, mensagem: error.message || 'Erro no diagnóstico' };
      }

      return {
        sucesso: data?.sucesso ?? false,
        mensagem: data?.mensagem || 'Diagnóstico concluído',
        diagnostico: data?.diagnostico
      };
    } catch (err: any) {
      return { sucesso: false, mensagem: err.message || 'Erro de conexão' };
    }
  }, [escritorioId, supabase]);

  // Carregar histórico automaticamente quando escritorioId estiver disponível
  useEffect(() => {
    if (escritorioId) {
      getHistorico(10);
    }
  }, [escritorioId, getHistorico]);

  return {
    sincronizando,
    ultimaSync,
    historicoSync,
    carregandoHistorico,
    sincronizarTodos,
    sincronizarAssociado,
    diagnosticarAPI,
    getHistorico,
  };
}
