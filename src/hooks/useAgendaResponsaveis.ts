'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TipoAgenda = 'tarefa' | 'audiencia' | 'evento'

export interface Responsavel {
  id: string
  user_id: string
  nome_completo: string
  email?: string
  avatar_url?: string
  atribuido_em: string
  atribuido_por?: string
}

interface UseAgendaResponsaveisReturn {
  loading: boolean
  error: string | null
  getResponsaveis: (tipo: TipoAgenda, itemId: string) => Promise<Responsavel[]>
  addResponsavel: (tipo: TipoAgenda, itemId: string, userId: string) => Promise<boolean>
  removeResponsavel: (tipo: TipoAgenda, itemId: string, userId: string) => Promise<boolean>
  setResponsaveis: (tipo: TipoAgenda, itemId: string, userIds: string[]) => Promise<boolean>
}

// Mapeia tipo para tabela principal (todos usam array direto agora)
const TABLE_CONFIG: Record<TipoAgenda, string> = {
  tarefa: 'agenda_tarefas',
  audiencia: 'agenda_audiencias',
  evento: 'agenda_eventos',
}

export function useAgendaResponsaveis(): UseAgendaResponsaveisReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  /**
   * Carrega os responsáveis de um item da agenda
   * Todos os tipos usam array direto responsaveis_ids
   */
  const getResponsaveis = useCallback(async (tipo: TipoAgenda, itemId: string): Promise<Responsavel[]> => {
    setLoading(true)
    setError(null)

    try {
      const tableName = TABLE_CONFIG[tipo]

      const { data: item, error: queryError } = await supabase
        .from(tableName)
        .select('responsaveis_ids, created_at')
        .eq('id', itemId)
        .single()

      if (queryError) throw queryError

      const responsaveisIds = item?.responsaveis_ids || []

      if (responsaveisIds.length === 0) {
        return []
      }

      // Buscar dados dos perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome_completo, email, avatar_url')
        .in('id', responsaveisIds)

      if (profilesError) throw profilesError

      return (profiles || []).map((profile: any) => ({
        id: profile.id,
        user_id: profile.id,
        nome_completo: profile.nome_completo || 'Usuário',
        email: profile.email,
        avatar_url: profile.avatar_url,
        atribuido_em: item.created_at,
        atribuido_por: undefined,
      }))
    } catch (err: any) {
      console.error('Erro ao carregar responsáveis:', err)
      setError(err.message || 'Erro ao carregar responsáveis')
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * Adiciona um responsável a um item da agenda
   * Todos os tipos usam array direto responsaveis_ids
   */
  const addResponsavel = useCallback(async (
    tipo: TipoAgenda,
    itemId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const tableName = TABLE_CONFIG[tipo]

      // Buscar array atual
      const { data: item, error: fetchError } = await supabase
        .from(tableName)
        .select('responsaveis_ids')
        .eq('id', itemId)
        .single()

      if (fetchError) throw fetchError

      const currentIds = item?.responsaveis_ids || []

      // Se já existe, não faz nada
      if (currentIds.includes(userId)) {
        return true
      }

      // Adicionar ao array
      const newIds = [...currentIds, userId]

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          responsaveis_ids: newIds,
          responsavel_id: newIds[0] // Manter compatibilidade
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao adicionar responsável:', err)
      setError(err.message || 'Erro ao adicionar responsável')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * Remove um responsável de um item da agenda
   * Todos os tipos usam array direto responsaveis_ids
   */
  const removeResponsavel = useCallback(async (
    tipo: TipoAgenda,
    itemId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const tableName = TABLE_CONFIG[tipo]

      // Buscar array atual
      const { data: item, error: fetchError } = await supabase
        .from(tableName)
        .select('responsaveis_ids')
        .eq('id', itemId)
        .single()

      if (fetchError) throw fetchError

      const currentIds = item?.responsaveis_ids || []
      const newIds = currentIds.filter((id: string) => id !== userId)

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          responsaveis_ids: newIds,
          responsavel_id: newIds[0] || null // Manter compatibilidade
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao remover responsável:', err)
      setError(err.message || 'Erro ao remover responsável')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * Define a lista completa de responsáveis (substitui todos)
   * Todos os tipos usam array direto responsaveis_ids
   */
  const setResponsaveis = useCallback(async (
    tipo: TipoAgenda,
    itemId: string,
    userIds: string[]
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const tableName = TABLE_CONFIG[tipo]

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          responsaveis_ids: userIds,
          responsavel_id: userIds[0] || null // Manter compatibilidade
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao definir responsáveis:', err)
      setError(err.message || 'Erro ao definir responsáveis')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    loading,
    error,
    getResponsaveis,
    addResponsavel,
    removeResponsavel,
    setResponsaveis,
  }
}
