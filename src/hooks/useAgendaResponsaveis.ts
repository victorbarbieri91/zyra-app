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

// Mapeia tipo para nome da tabela e coluna FK
const TABLE_CONFIG = {
  tarefa: {
    table: 'agenda_tarefas_responsaveis',
    fkColumn: 'tarefa_id',
  },
  audiencia: {
    table: 'agenda_audiencias_responsaveis',
    fkColumn: 'audiencia_id',
  },
  evento: {
    table: 'agenda_eventos_responsaveis',
    fkColumn: 'evento_id',
  },
}

export function useAgendaResponsaveis(): UseAgendaResponsaveisReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  /**
   * Carrega os responsáveis de um item da agenda
   */
  const getResponsaveis = useCallback(async (tipo: TipoAgenda, itemId: string): Promise<Responsavel[]> => {
    setLoading(true)
    setError(null)

    try {
      const config = TABLE_CONFIG[tipo]

      const { data, error: queryError } = await supabase
        .from(config.table)
        .select(`
          id,
          user_id,
          atribuido_em,
          atribuido_por,
          profile:profiles!user_id(
            nome_completo,
            email,
            avatar_url
          )
        `)
        .eq(config.fkColumn, itemId)
        .order('atribuido_em', { ascending: true })

      if (queryError) throw queryError

      return (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        nome_completo: item.profile?.nome_completo || 'Usuário',
        email: item.profile?.email,
        avatar_url: item.profile?.avatar_url,
        atribuido_em: item.atribuido_em,
        atribuido_por: item.atribuido_por,
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
   */
  const addResponsavel = useCallback(async (
    tipo: TipoAgenda,
    itemId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const config = TABLE_CONFIG[tipo]

      // Obtém o usuário atual para registrar quem fez a atribuição
      const { data: { user } } = await supabase.auth.getUser()

      const { error: insertError } = await supabase
        .from(config.table)
        .insert({
          [config.fkColumn]: itemId,
          user_id: userId,
          atribuido_por: user?.id,
        })

      if (insertError) {
        // Ignora erro de duplicata (já é responsável)
        if (insertError.code === '23505') {
          return true
        }
        throw insertError
      }

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
   */
  const removeResponsavel = useCallback(async (
    tipo: TipoAgenda,
    itemId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const config = TABLE_CONFIG[tipo]

      const { error: deleteError } = await supabase
        .from(config.table)
        .delete()
        .eq(config.fkColumn, itemId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError

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
   */
  const setResponsaveis = useCallback(async (
    tipo: TipoAgenda,
    itemId: string,
    userIds: string[]
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const config = TABLE_CONFIG[tipo]

      // Obtém o usuário atual para registrar quem fez a atribuição
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Remove todos os responsáveis atuais
      const { error: deleteError } = await supabase
        .from(config.table)
        .delete()
        .eq(config.fkColumn, itemId)

      if (deleteError) throw deleteError

      // 2. Se não há novos responsáveis, apenas retorna
      if (userIds.length === 0) {
        return true
      }

      // 3. Insere os novos responsáveis
      const insertData = userIds.map(userId => ({
        [config.fkColumn]: itemId,
        user_id: userId,
        atribuido_por: user?.id,
      }))

      const { error: insertError } = await supabase
        .from(config.table)
        .insert(insertData)

      if (insertError) throw insertError

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
