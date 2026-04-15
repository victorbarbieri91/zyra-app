'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  LancamentoDetalhes,
  LancamentoEditFormData,
  LancamentoRef,
  LancamentoTipo,
} from './lancamento-types'

const supabase = createClient()

function tipoFromRef(ref: LancamentoRef): LancamentoTipo | null {
  if (ref.tipo_movimento === 'despesa') return 'despesa'
  if (ref.tipo_movimento === 'receita') return 'receita'
  return null
}

/**
 * Carrega detalhes completos de um lançamento para edição, incluindo
 * os metadados da regra de recorrência (quando houver) e contagem de
 * instâncias pendentes.
 */
export function useLancamentoMutations() {
  const carregarDetalhes = useCallback(
    async (ref: LancamentoRef): Promise<LancamentoDetalhes | null> => {
      const tipo = tipoFromRef(ref)
      if (!tipo || !ref.origem_id) return null

      const tabela = tipo === 'despesa' ? 'financeiro_despesas' : 'financeiro_receitas'
      const colunas =
        tipo === 'despesa'
          ? 'id, descricao, valor, data_vencimento, data_pagamento, status, categoria, fornecedor, observacoes_financeiro, conta_bancaria_id, forma_pagamento, pago_por_id, regra_recorrencia_id'
          : 'id, descricao, valor, data_vencimento, data_pagamento, status, categoria, observacoes, conta_bancaria_id, forma_pagamento, pago_por_id, regra_recorrencia_id'

      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .eq('id', ref.origem_id)
        .single()

      if (error || !data) {
        console.error('Erro ao carregar lançamento:', error)
        return null
      }

      const raw = data as Record<string, unknown>

      // Busca metadados da regra se houver
      let regra: LancamentoDetalhes['regra'] = null
      const regraId = raw.regra_recorrencia_id as string | null
      if (regraId) {
        const { data: regraData } = await supabase
          .from('financeiro_regras_recorrencia')
          .select('id, is_parcelamento, parcela_total, dia_vencimento, frequencia, ativo')
          .eq('id', regraId)
          .single()

        if (regraData) {
          // Conta pendentes futuras (incluindo a atual se for pendente)
          const { count } = await supabase
            .from(tabela)
            .select('id', { count: 'exact', head: true })
            .eq('regra_recorrencia_id', regraId)
            .eq('status', 'pendente')

          regra = {
            id: regraData.id as string,
            is_parcelamento: Boolean(regraData.is_parcelamento),
            parcela_total: (regraData.parcela_total as number | null) ?? null,
            dia_vencimento: regraData.dia_vencimento as number,
            frequencia: regraData.frequencia as string,
            pendentes_futuras: count ?? 0,
          }
        }
      }

      return {
        id: raw.id as string,
        tipo,
        descricao: (raw.descricao as string) ?? '',
        valor: Number(raw.valor ?? 0),
        data_vencimento: (raw.data_vencimento as string) ?? '',
        data_pagamento: (raw.data_pagamento as string | null) ?? null,
        status: (raw.status as string) ?? 'pendente',
        categoria: (raw.categoria as string) ?? '',
        fornecedor: tipo === 'despesa' ? ((raw.fornecedor as string | null) ?? null) : null,
        observacoes:
          tipo === 'despesa'
            ? ((raw.observacoes_financeiro as string | null) ?? null)
            : ((raw.observacoes as string | null) ?? null),
        conta_bancaria_id: (raw.conta_bancaria_id as string | null) ?? null,
        forma_pagamento: (raw.forma_pagamento as string | null) ?? null,
        pago_por_id: (raw.pago_por_id as string | null) ?? null,
        regra_recorrencia_id: regraId,
        regra,
      }
    },
    [],
  )

  /**
   * Atualiza apenas a instância clicada (financeiro_despesas ou financeiro_receitas).
   * Não propaga para outras ocorrências da série.
   */
  const atualizarInstancia = useCallback(
    async (
      detalhes: LancamentoDetalhes,
      form: LancamentoEditFormData,
    ): Promise<boolean> => {
      const tabela =
        detalhes.tipo === 'despesa' ? 'financeiro_despesas' : 'financeiro_receitas'

      const efetivado = detalhes.status === 'pago'

      const payload: Record<string, unknown> = {
        descricao: form.descricao,
        categoria: form.categoria,
        data_vencimento: form.data_vencimento,
        conta_bancaria_id: form.conta_bancaria_id || null,
        pago_por_id: form.pago_por_id || null,
        forma_pagamento: form.forma_pagamento || null,
        updated_at: new Date().toISOString(),
      }

      // Valor só muda se não estiver pago
      if (!efetivado) {
        payload.valor = form.valor
      }

      // Campos específicos por tipo
      if (detalhes.tipo === 'despesa') {
        payload.fornecedor = form.fornecedor || null
        payload.observacoes_financeiro = form.observacoes || null
      } else {
        payload.observacoes = form.observacoes || null
      }

      // Se estiver pago, pode editar data_pagamento também
      if (efetivado && form.data_pagamento) {
        payload.data_pagamento = form.data_pagamento
      }

      const { error } = await supabase.from(tabela).update(payload).eq('id', detalhes.id)

      if (error) {
        console.error('Erro ao atualizar instância:', error)
        return false
      }

      // Recalcular saldo se houver conta bancária vinculada
      if (form.conta_bancaria_id) {
        await supabase.rpc('recalcular_saldo_conta', {
          p_conta_id: form.conta_bancaria_id,
        })
      }

      return true
    },
    [],
  )

  /**
   * Atualiza a regra de recorrência e todas as instâncias pendentes da série.
   * Pagas e canceladas ficam intactas (preserva histórico).
   */
  const atualizarSerie = useCallback(
    async (
      detalhes: LancamentoDetalhes,
      form: LancamentoEditFormData,
    ): Promise<number | null> => {
      if (!detalhes.regra) return null

      const { data, error } = await supabase.rpc('atualizar_regra_em_serie', {
        p_regra_id: detalhes.regra.id,
        p_descricao: form.descricao || null,
        p_valor: form.valor || null,
        p_categoria: form.categoria || null,
        p_fornecedor: detalhes.tipo === 'despesa' ? form.fornecedor || null : null,
        p_dia_vencimento: form.dia_vencimento || null,
        p_conta_bancaria_id: form.conta_bancaria_id || null,
        p_observacoes: detalhes.tipo === 'receita' ? form.observacoes || null : null,
      })

      if (error) {
        console.error('Erro ao atualizar série:', error)
        return null
      }

      return typeof data === 'number' ? data : 0
    },
    [],
  )

  /**
   * Hard delete da instância única (remove do banco).
   */
  const excluirInstancia = useCallback(
    async (detalhes: LancamentoDetalhes): Promise<boolean> => {
      const tabela =
        detalhes.tipo === 'despesa' ? 'financeiro_despesas' : 'financeiro_receitas'

      const contaId = detalhes.conta_bancaria_id

      const { error } = await supabase.from(tabela).delete().eq('id', detalhes.id)

      if (error) {
        console.error('Erro ao excluir instância:', error)
        return false
      }

      // Recalcular saldo se a despesa/receita estava vinculada a uma conta
      if (contaId) {
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId })
      }

      return true
    },
    [],
  )

  /**
   * Hard delete da série: inativa a regra + apaga instâncias pendentes.
   * Pagas e canceladas ficam intactas (histórico preservado).
   */
  const excluirSerie = useCallback(
    async (
      detalhes: LancamentoDetalhes,
    ): Promise<{ removidas: number; contaId: string | null } | null> => {
      if (!detalhes.regra) return null

      const { data, error } = await supabase.rpc('excluir_regra_em_serie', {
        p_regra_id: detalhes.regra.id,
      })

      if (error) {
        console.error('Erro ao excluir série:', error)
        return null
      }

      const removidas =
        Array.isArray(data) && data.length > 0
          ? ((data[0] as { instancias_removidas?: number }).instancias_removidas ?? 0)
          : 0

      const contaId = detalhes.conta_bancaria_id

      if (contaId) {
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId })
      }

      return { removidas, contaId }
    },
    [],
  )

  return {
    carregarDetalhes,
    atualizarInstancia,
    atualizarSerie,
    excluirInstancia,
    excluirSerie,
  }
}
