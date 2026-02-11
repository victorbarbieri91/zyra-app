import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// TYPES
// =============================================================================

export interface ProcessoFechamento {
  id: string
  numero_cnj: string | null
  numero_pasta: string | null
  titulo: string
  cliente_nome: string | null
}

export interface FechamentoPasta {
  id: string
  escritorio_id: string
  contrato_id: string
  cliente_id: string
  competencia: string // YYYY-MM-DD
  qtd_processos: number
  valor_unitario: number
  valor_total: number
  processos: ProcessoFechamento[]
  status: 'pendente' | 'aprovado' | 'faturado' | 'cancelado'
  fatura_id: string | null
  created_at: string
  updated_at: string
  aprovado_em: string | null
  aprovado_por: string | null
  faturado_em: string | null
  // Dados relacionados
  cliente_nome?: string
  numero_contrato?: string
  contrato_config?: {
    valor_por_processo?: number
    limite_meses?: number
    meses_cobrados?: number
  }
}

export interface AlertaLimiteContrato {
  id: string
  escritorio_id: string
  contrato_id: string
  cliente_id: string
  limite_meses: number
  meses_cobrados: number
  titulo: string
  mensagem: string
  status: 'pendente' | 'renovado' | 'encerrado'
  created_at: string
  resolvido_em: string | null
  resolvido_por: string | null
  // Dados relacionados
  cliente_nome?: string
  numero_contrato?: string
}

export interface ResumoFechamentos {
  totalPendentes: number
  totalAprovados: number
  valorPendente: number
  valorAprovado: number
  alertasLimite: number
}

// =============================================================================
// HOOK
// =============================================================================

export function useFechamentosPasta(escritorioIds: string[] | null) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ids = escritorioIds || []

  // ============================================
  // CARREGAR FECHAMENTOS PENDENTES E APROVADOS
  // ============================================

  const loadFechamentos = useCallback(async (): Promise<FechamentoPasta[]> => {
    if (ids.length === 0) return []

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_fechamentos_pasta')
        .select(`
          *,
          cliente:crm_pessoas(nome_completo),
          contrato:financeiro_contratos_honorarios(numero_contrato, config)
        `)
        .in('escritorio_id', ids)
        .in('status', ['pendente', 'aprovado'])
        .order('competencia', { ascending: false })

      if (queryError) throw queryError

      return (data || []).map((f: any) => ({
        ...f,
        cliente_nome: f.cliente?.nome_completo || 'Cliente não encontrado',
        numero_contrato: f.contrato?.numero_contrato,
        contrato_config: f.contrato?.config,
      }))
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar fechamentos:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [ids, supabase])

  // ============================================
  // CARREGAR ALERTAS DE LIMITE PENDENTES
  // ============================================

  const loadAlertasLimite = useCallback(async (): Promise<AlertaLimiteContrato[]> => {
    if (ids.length === 0) return []

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_alertas_limite_contrato')
        .select(`
          *,
          cliente:crm_pessoas(nome_completo),
          contrato:financeiro_contratos_honorarios(numero_contrato)
        `)
        .in('escritorio_id', ids)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      return (data || []).map((a: any) => ({
        ...a,
        cliente_nome: a.cliente?.nome_completo || 'Cliente não encontrado',
        numero_contrato: a.contrato?.numero_contrato,
      }))
    } catch (err: any) {
      console.error('Erro ao carregar alertas:', err)
      return []
    }
  }, [ids, supabase])

  // ============================================
  // CARREGAR RESUMO
  // ============================================

  const loadResumo = useCallback(async (): Promise<ResumoFechamentos> => {
    if (ids.length === 0) {
      return {
        totalPendentes: 0,
        totalAprovados: 0,
        valorPendente: 0,
        valorAprovado: 0,
        alertasLimite: 0,
      }
    }

    try {
      // Buscar fechamentos pendentes e aprovados
      const { data: fechamentos } = await supabase
        .from('financeiro_fechamentos_pasta')
        .select('status, valor_total')
        .in('escritorio_id', ids)
        .in('status', ['pendente', 'aprovado'])

      // Buscar alertas pendentes
      const { count: alertasCount } = await supabase
        .from('financeiro_alertas_limite_contrato')
        .select('id', { count: 'exact', head: true })
        .in('escritorio_id', ids)
        .eq('status', 'pendente')

      const pendentes = (fechamentos || []).filter((f: { status: string; valor_total: number | null }) => f.status === 'pendente')
      const aprovados = (fechamentos || []).filter((f: { status: string; valor_total: number | null }) => f.status === 'aprovado')

      return {
        totalPendentes: pendentes.length,
        totalAprovados: aprovados.length,
        valorPendente: pendentes.reduce((sum: number, f: { status: string; valor_total: number | null }) => sum + (f.valor_total || 0), 0),
        valorAprovado: aprovados.reduce((sum: number, f: { status: string; valor_total: number | null }) => sum + (f.valor_total || 0), 0),
        alertasLimite: alertasCount || 0,
      }
    } catch (err: any) {
      console.error('Erro ao carregar resumo:', err)
      return {
        totalPendentes: 0,
        totalAprovados: 0,
        valorPendente: 0,
        valorAprovado: 0,
        alertasLimite: 0,
      }
    }
  }, [ids, supabase])

  // ============================================
  // REMOVER PROCESSO DO FECHAMENTO
  // ============================================

  const removerProcesso = useCallback(async (
    fechamentoId: string,
    processoId: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('remover_processo_fechamento', {
        p_fechamento_id: fechamentoId,
        p_processo_id: processoId,
      })

      if (rpcError) throw rpcError
      return data === true
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao remover processo:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // APROVAR FECHAMENTO
  // ============================================

  const aprovarFechamento = useCallback(async (fechamentoId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Buscar user atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error: rpcError } = await supabase.rpc('aprovar_fechamento_pasta', {
        p_fechamento_id: fechamentoId,
        p_user_id: user.id,
      })

      if (rpcError) throw rpcError
      return data === true
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao aprovar fechamento:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // GERAR FATURA A PARTIR DO FECHAMENTO
  // ============================================

  const gerarFatura = useCallback(async (fechamentoId: string): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error: rpcError } = await supabase.rpc('gerar_fatura_fechamento_pasta', {
        p_fechamento_id: fechamentoId,
        p_user_id: user.id,
      })

      if (rpcError) throw rpcError
      return data // UUID da fatura gerada
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao gerar fatura:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // CANCELAR FECHAMENTO
  // ============================================

  const cancelarFechamento = useCallback(async (fechamentoId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('financeiro_fechamentos_pasta')
        .update({ status: 'cancelado' })
        .eq('id', fechamentoId)
        .eq('status', 'pendente')

      if (updateError) throw updateError
      return true
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao cancelar fechamento:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // RENOVAR CONTRATO (ZERAR CONTADOR)
  // ============================================

  const renovarContrato = useCallback(async (
    contratoId: string,
    novoLimite?: number
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error: rpcError } = await supabase.rpc('renovar_contrato_pasta', {
        p_contrato_id: contratoId,
        p_user_id: user.id,
        p_novo_limite: novoLimite || null,
      })

      if (rpcError) throw rpcError
      return data === true
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao renovar contrato:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // ENCERRAR CONTRATO
  // ============================================

  const encerrarContrato = useCallback(async (contratoId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error: rpcError } = await supabase.rpc('encerrar_contrato_limite', {
        p_contrato_id: contratoId,
        p_user_id: user.id,
      })

      if (rpcError) throw rpcError
      return data === true
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao encerrar contrato:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // EXECUTAR FECHAMENTO MANUAL (ADMIN)
  // ============================================

  const executarFechamentoManual = useCallback(async (
    competencia?: string
  ): Promise<{ success: boolean; fechamentos_criados?: number }> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('executar_fechamento_mensal_pasta', {
        p_competencia: competencia || null,
      })

      if (rpcError) throw rpcError

      // Também executar verificação de limites
      await supabase.rpc('verificar_limites_contratos_pasta')

      return data || { success: false }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao executar fechamento:', err)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    loading,
    error,
    loadFechamentos,
    loadAlertasLimite,
    loadResumo,
    removerProcesso,
    aprovarFechamento,
    gerarFatura,
    cancelarFechamento,
    renovarContrato,
    encerrarContrato,
    executarFechamentoManual,
  }
}
