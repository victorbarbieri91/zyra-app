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
}

export interface UseCobrancaFixaReturn {
  loading: boolean;
  error: string | null;
  valoresDisponiveis: ValorFixoDisponivel[];
  contratoTitulo: string | null;
  contratoNumero: string | null;
  formaCobranca: string | null;
  formasDisponiveis: string[];  // Todas as formas do contrato
  loadValoresFixos: (processoId: string) => Promise<void>;
  lancarValorFixo: (
    processoId: string,
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
   * Carrega valores fixos disponíveis para um processo
   */
  const loadValoresFixos = useCallback(async (processoId: string): Promise<void> => {
    if (!escritorioId) return;

    setLoading(true);
    setError(null);
    setValoresDisponiveis([]);
    setContratoTitulo(null);
    setContratoNumero(null);
    setFormaCobranca(null);
    setFormasDisponiveis([]);

    try {
      // Buscar processo com contrato
      const { data: processo, error: processoError } = await supabase
        .from('processos_processos')
        .select('contrato_id, cliente_id')
        .eq('id', processoId)
        .single();

      if (processoError) throw processoError;
      if (!processo?.contrato_id) {
        return; // Sem contrato, sem valores
      }

      // Buscar contrato com formas_pagamento
      const { data: contrato, error: contratoError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('id, titulo, numero_contrato, forma_cobranca, config, formas_pagamento')
        .eq('id', processo.contrato_id)
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

      const valores: ValorFixoDisponivel[] = [];

      // Se tem array de valores_fixos
      if (configData?.valores_fixos && Array.isArray(configData.valores_fixos)) {
        configData.valores_fixos.forEach((item, index) => {
          valores.push({
            id: item.id || `fixo_${index}`,
            descricao: item.descricao || 'Honorário Fixo',
            valor: item.valor || 0,
            atualizacao_monetaria: item.atualizacao_monetaria,
            indice: item.atualizacao_indice,
          });
        });
      }
      // Se tem valor_fixo único
      else if (configData?.valor_fixo) {
        valores.push({
          id: 'default',
          descricao: 'Honorário Fixo',
          valor: configData.valor_fixo,
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
    processoId: string,
    valorId: string,
    valorFinal: number,
    descricao?: string
  ): Promise<string> => {
    if (!escritorioId) throw new Error('Escritório não selecionado');

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar dados do processo
      const { data: processo, error: processoError } = await supabase
        .from('processos_processos')
        .select('cliente_id, contrato_id')
        .eq('id', processoId)
        .single();

      if (processoError) throw processoError;
      if (!processo?.cliente_id) {
        throw new Error('Processo não tem cliente vinculado');
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
          cliente_id: processo.cliente_id,
          processo_id: processoId,
          contrato_id: processo.contrato_id,
          tipo: 'honorario',
          categoria: 'honorarios',
          descricao: descricaoFinal,
          valor: valorFinal,
          data_competencia: dataCompetencia,
          data_vencimento: dataVencimento,
          status: 'pendente',
          created_by: user.id,
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
