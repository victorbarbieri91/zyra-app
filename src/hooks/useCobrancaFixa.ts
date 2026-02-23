'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// TIPOS
// =====================================================

export interface ValorFixoDisponivel {
  id: string;
  descricao: string;
  valor: number;
  atualizacao_monetaria?: boolean;
  indice?: string;
  valor_atualizado?: number;
  // Tracking de cobrança
  jaCobrado?: boolean;
  receitaId?: string;
  receitaStatus?: string;
  receitaValor?: number;
  receitaCriadaEm?: string;
}

export interface UseCobrancaFixaReturn {
  loading: boolean;
  error: string | null;
  valoresDisponiveis: ValorFixoDisponivel[];
  contratoTitulo: string | null;
  contratoNumero: string | null;
  formaCobranca: string | null;
  formasDisponiveis: string[];  // Todas as formas do contrato
  loadValoresFixos: (opts: { processoId?: string; consultivoId?: string }) => Promise<void>;
  lancarValorFixo: (
    opts: { processoId?: string; consultivoId?: string },
    valorId: string,
    valorFinal: number,
    descricao?: string
  ) => Promise<string>;
}

// =====================================================
// HOOK
// =====================================================

export function useCobrancaFixa(escritorioId: string | null): UseCobrancaFixaReturn {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valoresDisponiveis, setValoresDisponiveis] = useState<ValorFixoDisponivel[]>([]);
  const [contratoTitulo, setContratoTitulo] = useState<string | null>(null);
  const [contratoNumero, setContratoNumero] = useState<string | null>(null);
  const [formaCobranca, setFormaCobranca] = useState<string | null>(null);
  const [formasDisponiveis, setFormasDisponiveis] = useState<string[]>([]);

  /**
   * Carrega valores fixos disponíveis para um processo ou consultivo
   */
  const loadValoresFixos = useCallback(async (opts: { processoId?: string; consultivoId?: string }): Promise<void> => {
    if (!escritorioId) return;
    const { processoId, consultivoId } = opts;
    if (!processoId && !consultivoId) return;

    setLoading(true);
    setError(null);
    setValoresDisponiveis([]);
    setContratoTitulo(null);
    setContratoNumero(null);
    setFormaCobranca(null);
    setFormasDisponiveis([]);

    try {
      // Buscar contrato_id e cliente_id da origem (processo ou consultivo)
      let contratoId: string | null = null;

      if (consultivoId) {
        const { data: consulta, error: consultaError } = await supabase
          .from('consultivo_consultas')
          .select('contrato_id, cliente_id')
          .eq('id', consultivoId)
          .single();
        if (consultaError) throw consultaError;
        contratoId = consulta?.contrato_id || null;
      } else if (processoId) {
        const { data: processo, error: processoError } = await supabase
          .from('processos_processos')
          .select('contrato_id, cliente_id')
          .eq('id', processoId)
          .single();
        if (processoError) throw processoError;
        contratoId = processo?.contrato_id || null;
      }

      if (!contratoId) {
        return; // Sem contrato, sem valores
      }

      // Buscar contrato com formas_pagamento
      const { data: contrato, error: contratoError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('id, titulo, numero_contrato, forma_cobranca, config, formas_pagamento')
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;
      if (!contrato) return;

      setContratoTitulo(contrato.titulo);
      setContratoNumero(contrato.numero_contrato);
      setFormaCobranca(contrato.forma_cobranca);

      // Extrair formas disponíveis do contrato
      const formas = contrato.formas_pagamento
        ? (contrato.formas_pagamento as Array<{ forma?: string; forma_cobranca?: string }>)
            .map(f => f.forma || f.forma_cobranca)
            .filter(Boolean) as string[]
        : [contrato.forma_cobranca];
      setFormasDisponiveis(formas);

      // Processar se fixo está nas formas disponíveis
      const temFixo = formas.includes('fixo') || contrato.forma_cobranca === 'fixo';
      if (!temFixo) {
        return;
      }

      // Extrair valores fixos do campo config
      const configData = contrato.config as {
        valor_fixo?: number;
        valores_fixos?: Array<{
          id?: string;
          descricao: string;
          valor: number;
          atualizacao_monetaria?: boolean;
          atualizacao_indice?: string;
        }>;
      } | null;

      // Buscar receitas já lançadas para este processo/consultivo + contrato
      let queryReceitas = supabase
        .from('financeiro_receitas')
        .select('id, descricao, valor, status, created_at')
        .eq('contrato_id', contratoId)
        .eq('tipo', 'honorario')
        .eq('categoria', 'honorarios')
        .neq('status', 'cancelado');

      if (processoId) {
        queryReceitas = queryReceitas.eq('processo_id', processoId);
      } else if (consultivoId) {
        queryReceitas = queryReceitas.eq('consultivo_id', consultivoId);
      }

      const { data: receitasExistentes } = await queryReceitas;
      const receitas = (receitasExistentes || []) as Array<{
        id: string; descricao: string; valor: number; status: string; created_at: string;
      }>;

      const valores: ValorFixoDisponivel[] = [];

      // Se tem array de valores_fixos
      if (configData?.valores_fixos && Array.isArray(configData.valores_fixos)) {
        configData.valores_fixos.forEach((item, index) => {
          const descItem = item.descricao || 'Honorário Fixo';
          const receitaMatch = receitas.find(r => r.descricao === descItem);
          valores.push({
            id: item.id || `fixo_${index}`,
            descricao: descItem,
            valor: item.valor || 0,
            atualizacao_monetaria: item.atualizacao_monetaria,
            indice: item.atualizacao_indice,
            jaCobrado: !!receitaMatch,
            receitaId: receitaMatch?.id,
            receitaStatus: receitaMatch?.status,
            receitaValor: receitaMatch?.valor,
            receitaCriadaEm: receitaMatch?.created_at,
          });
        });
      }
      // Se tem valor_fixo único
      else if (configData?.valor_fixo) {
        const descItem = 'Honorário Fixo';
        const receitaMatch = receitas.find(r => r.descricao === descItem);
        valores.push({
          id: 'default',
          descricao: descItem,
          valor: configData.valor_fixo,
          jaCobrado: !!receitaMatch,
          receitaId: receitaMatch?.id,
          receitaStatus: receitaMatch?.status,
          receitaValor: receitaMatch?.valor,
          receitaCriadaEm: receitaMatch?.created_at,
        });
      }

      setValoresDisponiveis(valores);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar valores fixos';
      setError(message);
      console.error('Erro ao carregar valores fixos:', err);
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase]);

  /**
   * Lança um valor fixo como receita de honorário
   */
  const lancarValorFixo = useCallback(async (
    opts: { processoId?: string; consultivoId?: string },
    valorId: string,
    valorFinal: number,
    descricao?: string
  ): Promise<string> => {
    if (!escritorioId) throw new Error('Escritório não selecionado');
    const { processoId, consultivoId } = opts;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar dados da origem (processo ou consultivo)
      let clienteId: string | null = null;
      let contratoId: string | null = null;

      if (consultivoId) {
        const { data: consulta, error: consultaError } = await supabase
          .from('consultivo_consultas')
          .select('cliente_id, contrato_id')
          .eq('id', consultivoId)
          .single();
        if (consultaError) throw consultaError;
        clienteId = consulta?.cliente_id || null;
        contratoId = consulta?.contrato_id || null;
      } else if (processoId) {
        const { data: processo, error: processoError } = await supabase
          .from('processos_processos')
          .select('cliente_id, contrato_id')
          .eq('id', processoId)
          .single();
        if (processoError) throw processoError;
        clienteId = processo?.cliente_id || null;
        contratoId = processo?.contrato_id || null;
      }

      if (!clienteId) {
        throw new Error('Caso não tem cliente vinculado');
      }

      // Encontrar o valor selecionado para pegar a descrição
      const valorSelecionado = valoresDisponiveis.find(v => v.id === valorId);
      const descricaoFinal = descricao || valorSelecionado?.descricao || 'Honorário Fixo';

      // Calcular datas
      const hoje = new Date();
      const dataCompetencia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString().split('T')[0];
      const dataVencimento = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      // Criar receita
      const { data: receita, error: receitaError } = await supabase
        .from('financeiro_receitas')
        .insert({
          escritorio_id: escritorioId,
          cliente_id: clienteId,
          ...(processoId ? { processo_id: processoId } : {}),
          ...(consultivoId ? { consultivo_id: consultivoId } : {}),
          contrato_id: contratoId,
          tipo: 'honorario',
          categoria: 'honorarios',
          descricao: descricaoFinal,
          valor: valorFinal,
          data_competencia: dataCompetencia,
          data_vencimento: dataVencimento,
          status: 'pendente',
          created_by: user.id,
          responsavel_id: user.id,
        })
        .select('id')
        .single();

      if (receitaError) throw receitaError;
      return receita.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao lançar valor fixo';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escritorioId, supabase, valoresDisponiveis]);

  return {
    loading,
    error,
    valoresDisponiveis,
    contratoTitulo,
    contratoNumero,
    formaCobranca,
    formasDisponiveis,
    loadValoresFixos,
    lancarValorFixo,
  };
}
