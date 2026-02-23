'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// TIPOS
// =====================================================

export interface AlertaCobranca {
  id: string;
  escritorio_id: string;
  processo_id: string;
  movimentacao_id: string | null;
  ato_tipo_id: string | null;
  tipo_alerta: 'ato_processual' | 'prazo_vencido' | 'mensal' | 'manual';
  titulo: string;
  descricao: string | null;
  valor_sugerido: number | null;
  status: 'pendente' | 'cobrado' | 'ignorado';
  created_at: string;
  // Campos da view
  processo_numero?: string;
  processo_pasta?: string;
  processo_area?: string;
  cliente_id?: string;
  cliente_nome?: string;
  ato_codigo?: string;
  ato_nome?: string;
  movimentacao_tipo?: string;
  movimentacao_descricao?: string;
  movimentacao_data?: string;
}

export interface AtoDisponivel {
  id: string;
  codigo: string;
  nome: string;
  percentual_padrao: number | null;
  valor_fixo_padrao: number | null;
  // Valores configurados no contrato
  percentual_contrato?: number | null;
  valor_minimo_contrato?: number | null; // Valor mínimo configurado no contrato
  valor_calculado?: number | null;
  // Campos para exibição detalhada do cálculo
  valor_percentual?: number | null; // Valor calculado pelo percentual
  valor_minimo?: number | null; // Valor mínimo aplicável
  usou_minimo?: boolean; // true se o valor mínimo foi aplicado
  // Base de cálculo padrão (valor da causa)
  base_calculo_padrao?: number | null;
  // Tracking de cobrança
  jaCobrado?: boolean;
  receitaId?: string;
  receitaStatus?: string;
  receitaValor?: number;
  receitaCriadaEm?: string;
}

// =====================================================
// FUNÇÃO UTILITÁRIA - CÁLCULO DE ATO
// =====================================================

export interface ResultadoCalculoAto {
  valorCalculado: number;
  valorPercentual: number;
  usouMinimo: boolean;
}

/**
 * Calcula o valor de um ato baseado na base de cálculo
 * Lógica: MAX(percentual × base, valor_minimo)
 */
export function calcularValorAto(
  percentual: number | null,
  valorMinimo: number | null,
  baseCalculo: number
): ResultadoCalculoAto {
  const valorPercentual = percentual && baseCalculo > 0
    ? (percentual / 100) * baseCalculo
    : 0;

  const valorMinFinal = valorMinimo || 0;
  const valorCalculado = Math.max(valorPercentual, valorMinFinal);

  return {
    valorCalculado,
    valorPercentual,
    usouMinimo: valorMinFinal > 0 && valorPercentual < valorMinFinal,
  };
}

export interface ReceitaHonorario {
  id: string;
  escritorio_id: string;
  processo_id: string;
  cliente_id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  created_at: string;
  processo_numero?: string;
  processo_pasta?: string;
  cliente_nome?: string;
}

export interface UseCobrancaAtosReturn {
  loading: boolean;
  error: string | null;
  // Alertas
  loadAlertasPendentes: (processoId: string) => Promise<AlertaCobranca[]>;
  loadTodosAlertasPendentes: () => Promise<AlertaCobranca[]>;
  confirmarAlerta: (alertaId: string, valor?: number, descricao?: string) => Promise<string>;
  ignorarAlerta: (alertaId: string, justificativa?: string) => Promise<boolean>;
  // Cobranca manual
  loadAtosDisponiveis: (processoId: string) => Promise<AtoDisponivel[]>;
  cobrarAto: (processoId: string, atoTipoId: string, valor: number, titulo?: string, descricao?: string) => Promise<string>;
  // Historico
  loadHistoricoCobrancas: (processoId: string) => Promise<ReceitaHonorario[]>;
  // Contadores
  countAlertasPendentes: (processoId?: string) => Promise<number>;
}

// =====================================================
// HOOK
// =====================================================

export function useCobrancaAtos(escritorioId: string | null): UseCobrancaAtosReturn {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // ALERTAS
  // =====================================================

  /**
   * Carrega alertas pendentes de um processo específico
   */
  const loadAlertasPendentes = useCallback(async (processoId: string): Promise<AlertaCobranca[]> => {
    if (!escritorioId) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('v_alertas_cobranca_pendentes')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .eq('processo_id', processoId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return (data || []) as AlertaCobranca[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar alertas';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  /**
   * Carrega todos os alertas pendentes do escritório
   */
  const loadTodosAlertasPendentes = useCallback(async (): Promise<AlertaCobranca[]> => {
    if (!escritorioId) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('v_alertas_cobranca_pendentes')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return (data || []) as AlertaCobranca[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar alertas';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  /**
   * Confirma um alerta e gera receita de honorário
   */
  const confirmarAlerta = useCallback(async (
    alertaId: string,
    valor?: number,
    descricao?: string
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: rpcError } = await supabase.rpc('converter_alerta_em_receita', {
        p_alerta_id: alertaId,
        p_valor: valor || null,
        p_descricao: descricao || null,
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;
      return data as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao confirmar alerta';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Ignora um alerta com justificativa opcional
   */
  const ignorarAlerta = useCallback(async (
    alertaId: string,
    justificativa?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: rpcError } = await supabase.rpc('ignorar_alerta_cobranca', {
        p_alerta_id: alertaId,
        p_justificativa: justificativa || null,
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;
      return data as boolean;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao ignorar alerta';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // =====================================================
  // COBRANÇA MANUAL
  // =====================================================

  /**
   * Carrega atos disponíveis para cobrança em um processo
   * (baseado no contrato vinculado)
   */
  const loadAtosDisponiveis = useCallback(async (processoId: string): Promise<AtoDisponivel[]> => {
    if (!escritorioId) return [];

    setLoading(true);
    setError(null);

    try {
      // Buscar processo com contrato
      const { data: processo, error: processoError } = await supabase
        .from('processos_processos')
        .select('contrato_id, valor_causa')
        .eq('id', processoId)
        .single();

      if (processoError) throw processoError;
      if (!processo?.contrato_id) {
        return []; // Sem contrato, sem atos disponíveis
      }

      // Buscar contrato com atos configurados (estão em config.atos_configurados)
      const { data: contrato, error: contratoError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('forma_cobranca, config')
        .eq('id', processo.contrato_id)
        .single();

      if (contratoError) throw contratoError;

      // Extrair atos configurados do campo config.atos_configurados
      const configData = contrato?.config as { atos_configurados?: Array<{
        ato_tipo_id: string;
        ato_nome?: string;
        percentual_valor_causa?: number;
        valor_fixo?: number;
        ativo?: boolean;
      }> } | null;

      const atosContrato = (configData?.atos_configurados || [])
        .filter(a => a.ativo !== false) // Apenas atos ativos
        .map(a => ({
          ato_tipo_id: a.ato_tipo_id,
          percentual_valor_causa: a.percentual_valor_causa,
          valor_fixo: a.valor_fixo,
        }));

      // Se não há atos configurados no contrato, retornar vazio
      if (atosContrato.length === 0) {
        return [];
      }

      // Buscar apenas os tipos de atos que estão configurados no contrato
      const atosTipoIds = atosContrato.map(a => a.ato_tipo_id);

      const { data: tiposAtos, error: atosError } = await supabase
        .from('financeiro_atos_processuais_tipos')
        .select('id, codigo, nome, percentual_padrao, valor_fixo_padrao')
        .eq('escritorio_id', escritorioId)
        .eq('ativo', true)
        .in('id', atosTipoIds)
        .order('ordem');

      if (atosError) throw atosError;

      const valorCausa = processo.valor_causa || 0;

      // Buscar alertas já cobrados para este processo (atos já enviados ao financeiro)
      const { data: alertasCobrados } = await supabase
        .from('financeiro_alertas_cobranca')
        .select('id, ato_tipo_id, receita_id, status, created_at')
        .eq('processo_id', processoId)
        .eq('escritorio_id', escritorioId)
        .eq('status', 'cobrado');

      // Verificar quais receitas vinculadas são válidas (não canceladas)
      const receitaIds = (alertasCobrados || [])
        .filter((a: { receita_id: string | null }) => a.receita_id)
        .map((a: { receita_id: string | null }) => a.receita_id as string);

      const receitasValidas = new Map<string, { id: string; status: string; valor: number; created_at: string }>();
      if (receitaIds.length > 0) {
        const { data: receitasData } = await supabase
          .from('financeiro_receitas')
          .select('id, status, valor, created_at')
          .in('id', receitaIds)
          .neq('status', 'cancelado');

        (receitasData || []).forEach((r: { id: string; status: string; valor: number; created_at: string }) => {
          receitasValidas.set(r.id, r);
        });
      }

      // Montar mapa de ato_tipo_id → info da receita cobrada
      const atosJaCobrados = new Map<string, { receitaId: string; receitaStatus: string; receitaValor: number; receitaCriadaEm: string }>();
      (alertasCobrados || []).forEach((alerta: { ato_tipo_id: string | null; receita_id: string | null }) => {
        if (alerta.ato_tipo_id && alerta.receita_id && receitasValidas.has(alerta.receita_id)) {
          const recInfo = receitasValidas.get(alerta.receita_id)!;
          atosJaCobrados.set(alerta.ato_tipo_id, {
            receitaId: alerta.receita_id,
            receitaStatus: recInfo.status,
            receitaValor: recInfo.valor,
            receitaCriadaEm: recInfo.created_at,
          });
        }
      });

      // Mapear apenas atos que estão configurados no contrato
      // Lógica: valorCalculado = MAX(percentual × valor_causa, valor_minimo)
      // O valor_fixo no contrato é tratado como VALOR MÍNIMO, não valor fixo
      return (tiposAtos || []).map((ato: { id: string; codigo: string; nome: string; percentual_padrao: number | null; valor_fixo_padrao: number | null }) => {
        const configContrato = atosContrato.find(a => a.ato_tipo_id === ato.id);

        // Calcular valor baseado no percentual
        const percentualUsado = configContrato?.percentual_valor_causa ?? ato.percentual_padrao ?? 0;
        const valorPercentual = percentualUsado && valorCausa > 0
          ? (percentualUsado / 100) * valorCausa
          : 0;

        // Valor mínimo (do contrato ou padrão do ato)
        const valorMinimo = configContrato?.valor_fixo ?? ato.valor_fixo_padrao ?? 0;

        // Valor final = MAX(valor_percentual, valor_minimo)
        let valorCalculado: number | null = null;
        if (valorPercentual > 0 || valorMinimo > 0) {
          valorCalculado = Math.max(valorPercentual, valorMinimo);
        }

        // Verificar se este ato já foi cobrado
        const cobradoInfo = atosJaCobrados.get(ato.id);

        return {
          id: ato.id,
          codigo: ato.codigo,
          nome: ato.nome,
          percentual_padrao: ato.percentual_padrao,
          valor_fixo_padrao: ato.valor_fixo_padrao,
          percentual_contrato: configContrato?.percentual_valor_causa || null,
          valor_minimo_contrato: configContrato?.valor_fixo || null, // Renomeado para clareza
          valor_calculado: valorCalculado,
          // Novos campos para mostrar na UI
          valor_percentual: valorPercentual > 0 ? valorPercentual : null,
          valor_minimo: valorMinimo > 0 ? valorMinimo : null,
          usou_minimo: valorMinimo > 0 && valorPercentual < valorMinimo, // Indica se aplicou o mínimo
          // Base de cálculo padrão (valor da causa do processo)
          base_calculo_padrao: valorCausa > 0 ? valorCausa : null,
          // Tracking de cobrança
          jaCobrado: !!cobradoInfo,
          receitaId: cobradoInfo?.receitaId,
          receitaStatus: cobradoInfo?.receitaStatus,
          receitaValor: cobradoInfo?.receitaValor,
          receitaCriadaEm: cobradoInfo?.receitaCriadaEm,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar atos';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  /**
   * Cria cobrança manual de ato processual
   */
  const cobrarAto = useCallback(async (
    processoId: string,
    atoTipoId: string,
    valor: number,
    titulo?: string,
    descricao?: string
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar alerta manual
      const { data: alertaId, error: alertaError } = await supabase.rpc('criar_alerta_cobranca_manual', {
        p_processo_id: processoId,
        p_ato_tipo_id: atoTipoId,
        p_valor_sugerido: valor,
        p_titulo: titulo || null,
        p_descricao: descricao || null,
      });

      if (alertaError) throw alertaError;

      // Converter imediatamente em receita
      const { data: receitaId, error: receitaError } = await supabase.rpc('converter_alerta_em_receita', {
        p_alerta_id: alertaId,
        p_valor: valor,
        p_descricao: descricao || titulo || null,
        p_user_id: user.id,
      });

      if (receitaError) throw receitaError;
      return receitaId as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cobrar ato';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // =====================================================
  // HISTÓRICO
  // =====================================================

  /**
   * Carrega histórico de cobranças de um processo
   */
  const loadHistoricoCobrancas = useCallback(async (processoId: string): Promise<ReceitaHonorario[]> => {
    if (!escritorioId) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('v_historico_cobrancas_processo')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .eq('processo_id', processoId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return (data || []) as ReceitaHonorario[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  // =====================================================
  // CONTADORES
  // =====================================================

  /**
   * Conta alertas pendentes (do processo ou do escritório)
   */
  const countAlertasPendentes = useCallback(async (processoId?: string): Promise<number> => {
    if (!escritorioId) return 0;

    try {
      let query = supabase
        .from('financeiro_alertas_cobranca')
        .select('id', { count: 'exact', head: true })
        .eq('escritorio_id', escritorioId)
        .eq('status', 'pendente');

      if (processoId) {
        query = query.eq('processo_id', processoId);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    } catch {
      return 0;
    }
  }, [escritorioId, supabase]);

  return {
    loading,
    error,
    loadAlertasPendentes,
    loadTodosAlertasPendentes,
    confirmarAlerta,
    ignorarAlerta,
    loadAtosDisponiveis,
    cobrarAto,
    loadHistoricoCobrancas,
    countAlertasPendentes,
  };
}
