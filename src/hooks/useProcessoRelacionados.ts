'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface ProcessoRelacionado {
  /**
   * Para filhos: ID do processo filho.
   * Para o pai: ID do processo pai.
   * Usado como chave de remoção — basta fazer UPDATE no filho setando processo_principal_id = null.
   */
  relacionamentoId: string
  tipo: 'recurso' | 'incidente'
  direcao: 'pai' | 'filho'
  processo: {
    id: string
    numero_cnj: string
    numero_pasta: string
    autor: string
    reu: string
    area: string
    instancia: string
    status: string
    responsavel_nome: string
  }
}

export interface ProcessoPrincipalInfo {
  id: string
  numero_cnj: string
  numero_pasta: string
  cliente_id: string
  polo_cliente: string
  parte_contraria?: string
  area: string
  instancia: string
  comarca?: string
  responsavel_id: string
  colaboradores_ids?: string[]
  tags?: string[]
  contrato_id?: string
  modalidade_cobranca?: string
  valor_causa?: number
  objeto_acao?: string
}

export interface CriarRelacionadoParams {
  tipo: 'recurso' | 'incidente'
  dadosProcesso: Record<string, unknown>
  suspenderPrincipal: 'suspenso' | 'arquivado' | null
}

interface UseProcessoRelacionadosReturn {
  principal: ProcessoRelacionado | null
  recursos: ProcessoRelacionado[]
  incidentes: ProcessoRelacionado[]
  totalRelacionados: number
  loading: boolean
  saving: boolean
  error: string | null
  loadRelacionados: () => Promise<void>
  criarProcessoRelacionado: (params: CriarRelacionadoParams) => Promise<string | null>
  vincularProcessoExistente: (processoFilhoId: string, tipo: 'recurso' | 'incidente') => Promise<boolean>
  removerRelacionamento: (processoFilhoId: string) => Promise<boolean>
}

type ProcessoRow = {
  id: string
  numero_cnj: string | null
  numero_pasta: string | null
  autor: string | null
  reu: string | null
  area: string
  instancia: string
  status: string
  tipo_derivado: string | null
  responsavel: { nome_completo: string } | null
}

function toRelacionado(row: ProcessoRow, direcao: 'pai' | 'filho'): ProcessoRelacionado {
  return {
    relacionamentoId: row.id,
    tipo: (row.tipo_derivado ?? 'recurso') as 'recurso' | 'incidente',
    direcao,
    processo: {
      id: row.id,
      numero_cnj: row.numero_cnj ?? '',
      numero_pasta: row.numero_pasta ?? '',
      autor: row.autor ?? '',
      reu: row.reu ?? '',
      area: row.area,
      instancia: row.instancia,
      status: row.status,
      responsavel_nome: row.responsavel?.nome_completo ?? '',
    },
  }
}

export function useProcessoRelacionados(processoId: string): UseProcessoRelacionadosReturn {
  const supabase = createClient()
  const [principal, setPrincipal] = useState<ProcessoRelacionado | null>(null)
  const [recursos, setRecursos] = useState<ProcessoRelacionado[]>([])
  const [incidentes, setIncidentes] = useState<ProcessoRelacionado[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRelacionados = useCallback(async () => {
    if (!processoId) return
    setLoading(true)
    setError(null)
    try {
      // 1. Verificar se este processo é filho de algum outro (busca o pai)
      const { data: thisRow } = await supabase
        .from('processos_processos')
        .select('processo_principal_id, tipo_derivado')
        .eq('id', processoId)
        .single()

      if (thisRow?.processo_principal_id) {
        const { data: paiRow } = await supabase
          .from('processos_processos')
          .select(`
            id, numero_cnj, numero_pasta, autor, reu, area, instancia, status,
            tipo_derivado,
            responsavel:profiles!processos_processos_responsavel_id_fkey(nome_completo)
          `)
          .eq('id', thisRow.processo_principal_id)
          .single()

        if (paiRow) {
          const row = paiRow as unknown as ProcessoRow
          // tipo_derivado do PAI não existe; pegamos do filho (thisRow)
          row.tipo_derivado = thisRow.tipo_derivado
          setPrincipal(toRelacionado(row, 'pai'))
        } else {
          setPrincipal(null)
        }
      } else {
        setPrincipal(null)
      }

      // 2. Buscar filhos (processos derivados deste)
      const { data: filhos } = await supabase
        .from('processos_processos')
        .select(`
          id, numero_cnj, numero_pasta, autor, reu, area, instancia, status,
          tipo_derivado,
          responsavel:profiles!processos_processos_responsavel_id_fkey(nome_completo)
        `)
        .eq('processo_principal_id', processoId)

      const filhosMapped: ProcessoRelacionado[] = (filhos ?? []).map((f: Record<string, unknown>) =>
        toRelacionado(f as unknown as ProcessoRow, 'filho')
      )
      setRecursos(filhosMapped.filter((r) => r.tipo === 'recurso'))
      setIncidentes(filhosMapped.filter((r) => r.tipo === 'incidente'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relacionamentos')
    } finally {
      setLoading(false)
    }
  }, [processoId])

  const criarProcessoRelacionado = useCallback(
    async (params: CriarRelacionadoParams): Promise<string | null> => {
      setSaving(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error('Usuário não autenticado'); return null }

        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (!profile?.escritorio_id) { toast.error('Escritório não encontrado'); return null }

        // INSERT novo processo já com o vínculo embutido nas colunas
        const { data: novoProcesso, error: createError } = await supabase
          .from('processos_processos')
          .insert({
            ...params.dadosProcesso,
            processo_principal_id: processoId,
            tipo_derivado: params.tipo,
            escritorio_id: profile.escritorio_id,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (createError || !novoProcesso) {
          if (createError?.code === '23505') {
            toast.error('Já existe um processo com este número CNJ neste escritório')
          } else {
            toast.error(createError?.message || 'Erro ao criar processo')
          }
          return null
        }

        // Opcionalmente suspender/arquivar o principal
        if (params.suspenderPrincipal) {
          await supabase
            .from('processos_processos')
            .update({ status: params.suspenderPrincipal })
            .eq('id', processoId)
        }

        await loadRelacionados()
        return novoProcesso.id
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar processo relacionado')
        return null
      } finally {
        setSaving(false)
      }
    },
    [processoId, loadRelacionados]
  )

  const vincularProcessoExistente = useCallback(
    async (processoFilhoId: string, tipo: 'recurso' | 'incidente'): Promise<boolean> => {
      setSaving(true)
      try {
        const { error } = await supabase
          .from('processos_processos')
          .update({
            processo_principal_id: processoId,
            tipo_derivado: tipo,
          })
          .eq('id', processoFilhoId)

        if (error) {
          toast.error(error.message || 'Erro ao vincular processo')
          return false
        }

        await loadRelacionados()
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao vincular processo')
        return false
      } finally {
        setSaving(false)
      }
    },
    [processoId, loadRelacionados]
  )

  const removerRelacionamento = useCallback(
    async (processoFilhoId: string): Promise<boolean> => {
      setSaving(true)
      try {
        // Desvincular: limpar as colunas do processo filho
        const { error } = await supabase
          .from('processos_processos')
          .update({
            processo_principal_id: null,
            tipo_derivado: null,
          })
          .eq('id', processoFilhoId)

        if (error) {
          toast.error(error.message || 'Erro ao remover vínculo')
          return false
        }

        await loadRelacionados()
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao remover vínculo')
        return false
      } finally {
        setSaving(false)
      }
    },
    [loadRelacionados]
  )

  const totalRelacionados = (principal ? 1 : 0) + recursos.length + incidentes.length

  return {
    principal,
    recursos,
    incidentes,
    totalRelacionados,
    loading,
    saving,
    error,
    loadRelacionados,
    criarProcessoRelacionado,
    vincularProcessoExistente,
    removerRelacionamento,
  }
}
