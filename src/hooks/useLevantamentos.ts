'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'

export interface Levantamento {
  id: string
  escritorio_id: string
  processo_id: string | null
  consulta_id: string | null
  cliente_id: string | null
  descricao: string
  origem: string
  valor_total: number
  valor_retido: number
  valor_cliente: number
  conta_bancaria_id: string | null
  forma_pagamento: string | null
  receita_id: string | null
  retencao_recebida: boolean
  retencao_categoria: string
  repasse_realizado: boolean
  data_repasse: string | null
  conta_repasse_id: string | null
  forma_pagamento_repasse: string | null
  status: string
  observacoes: string | null
  data_levantamento: string
  created_at: string
}

export interface CriarLevantamentoInput {
  processo_id?: string | null
  consulta_id?: string | null
  cliente_id?: string | null
  descricao: string
  origem: string
  valor_total: number
  valor_retido: number
  valor_cliente: number
  data_levantamento: string
  // Retenção
  retencao_recebida: boolean
  retencao_categoria: string
  conta_bancaria_id?: string | null
  forma_pagamento?: string | null
  // Repasse
  repasse_realizado: boolean
  data_repasse?: string | null
  conta_repasse_id?: string | null
  forma_pagamento_repasse?: string | null
  observacoes?: string | null
}

export function useLevantamentos() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [levantamentos, setLevantamentos] = useState<Levantamento[]>([])
  const [loading, setLoading] = useState(false)

  const carregarLevantamentos = useCallback(async () => {
    if (!escritorioAtivo) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('financeiro_levantamentos')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)
        .neq('status', 'cancelado')
        .order('data_levantamento', { ascending: false })

      if (error) throw error
      setLevantamentos(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar levantamentos:', err)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  const criarLevantamento = useCallback(async (input: CriarLevantamentoInput) => {
    if (!escritorioAtivo) {
      toast.error('Nenhum escritório ativo')
      return null
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Usuário não autenticado')
        return null
      }

      // Determinar status
      let status = 'pendente'
      if (input.retencao_recebida && input.repasse_realizado) {
        status = 'concluido'
      } else if (input.retencao_recebida || input.repasse_realizado) {
        status = 'parcial'
      }

      // 1. Criar a receita (honorários retidos) — sem conta_bancaria_id para não duplicar no saldo
      const dataComp = input.data_levantamento.substring(0, 7) + '-01'
      const { data: receita, error: receitaError } = await supabase
        .from('financeiro_receitas')
        .insert({
          escritorio_id: escritorioAtivo,
          tipo: 'avulso',
          categoria: input.retencao_categoria || 'honorarios',
          descricao: `Honorários - ${input.descricao}`,
          valor: input.valor_retido,
          data_competencia: dataComp,
          data_vencimento: input.data_levantamento,
          status: input.retencao_recebida ? 'pago' : 'pendente',
          valor_pago: input.retencao_recebida ? input.valor_retido : 0,
          data_pagamento: input.retencao_recebida ? input.data_levantamento : null,
          // conta_bancaria_id = NULL — saldo do banco é calculado via financeiro_levantamentos
          conta_bancaria_id: null,
          forma_pagamento: input.retencao_recebida ? input.forma_pagamento : null,
          processo_id: input.processo_id || null,
          consulta_id: input.consulta_id || null,
          cliente_id: input.cliente_id || null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (receitaError) throw receitaError

      // 2. Criar o levantamento
      const { data: levantamento, error: levError } = await supabase
        .from('financeiro_levantamentos')
        .insert({
          escritorio_id: escritorioAtivo,
          processo_id: input.processo_id || null,
          consulta_id: input.consulta_id || null,
          cliente_id: input.cliente_id || null,
          descricao: input.descricao,
          origem: input.origem,
          valor_total: input.valor_total,
          valor_retido: input.valor_retido,
          valor_cliente: input.valor_cliente,
          conta_bancaria_id: input.conta_bancaria_id || null,
          forma_pagamento: input.forma_pagamento || null,
          receita_id: receita.id,
          retencao_recebida: input.retencao_recebida,
          retencao_categoria: input.retencao_categoria || 'honorarios',
          repasse_realizado: input.repasse_realizado,
          data_repasse: input.repasse_realizado ? input.data_repasse : null,
          conta_repasse_id: input.repasse_realizado ? input.conta_repasse_id : null,
          forma_pagamento_repasse: input.repasse_realizado ? input.forma_pagamento_repasse : null,
          status,
          observacoes: input.observacoes || null,
          data_levantamento: input.data_levantamento,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (levError) throw levError

      // 3. Recalcular saldos das contas afetadas
      if (input.retencao_recebida && input.conta_bancaria_id) {
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: input.conta_bancaria_id })
      }
      if (input.repasse_realizado && input.conta_repasse_id) {
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: input.conta_repasse_id })
      }

      toast.success('Levantamento registrado com sucesso!')
      return levantamento.id
    } catch (err: any) {
      console.error('Erro ao criar levantamento:', err)
      toast.error(err?.message || 'Erro ao criar levantamento')
      return null
    }
  }, [escritorioAtivo, supabase])

  const cancelarLevantamento = useCallback(async (id: string) => {
    try {
      // Buscar dados do levantamento
      const { data: lev } = await supabase
        .from('financeiro_levantamentos')
        .select('receita_id, conta_bancaria_id, conta_repasse_id, retencao_recebida, repasse_realizado')
        .eq('id', id)
        .single()

      if (!lev) throw new Error('Levantamento não encontrado')

      // Cancelar o levantamento
      await supabase
        .from('financeiro_levantamentos')
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', id)

      // Cancelar a receita vinculada
      if (lev.receita_id) {
        await supabase
          .from('financeiro_receitas')
          .update({ status: 'cancelado' })
          .eq('id', lev.receita_id)
      }

      // Recalcular saldos
      if (lev.retencao_recebida && lev.conta_bancaria_id) {
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: lev.conta_bancaria_id })
      }
      if (lev.repasse_realizado && lev.conta_repasse_id) {
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: lev.conta_repasse_id })
      }

      toast.success('Levantamento cancelado')
    } catch (err: any) {
      console.error('Erro ao cancelar levantamento:', err)
      toast.error(err?.message || 'Erro ao cancelar levantamento')
    }
  }, [supabase])

  return {
    levantamentos,
    loading,
    carregarLevantamentos,
    criarLevantamento,
    cancelarLevantamento,
  }
}
