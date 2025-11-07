import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Evento {
  id: string
  escritorio_id: string
  titulo: string
  tipo?: string
  data_inicio: string
  data_fim?: string | null
  dia_inteiro?: boolean
  local?: string | null
  descricao?: string | null
  participantes?: string | null
  recorrencia_id?: string | null
  created_at?: string
  updated_at?: string
}

export function useEventos(escritorioId?: string) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const loadEventos = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('agenda_eventos')
        .select('*')
        .order('data_inicio', { ascending: true })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setEventos(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const createEvento = async (data: Partial<Evento>): Promise<Evento> => {
    try {
      const { data: novoEvento, error: eventoError } = await supabase
        .from('agenda_eventos')
        .insert(data)
        .select()
        .single()

      if (eventoError) throw eventoError

      await loadEventos()

      return novoEvento
    } catch (err) {
      console.error('Erro ao criar evento:', err)
      throw err
    }
  }

  const updateEvento = async (id: string, data: Partial<Evento>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_eventos')
        .update(data)
        .eq('id', id)

      if (error) throw error

      await loadEventos()
    } catch (err) {
      console.error('Erro ao atualizar evento:', err)
      throw err
    }
  }

  const deleteEvento = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_eventos')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadEventos()
    } catch (err) {
      console.error('Erro ao deletar evento:', err)
      throw err
    }
  }

  useEffect(() => {
    loadEventos()
  }, [escritorioId])

  return {
    eventos,
    loading,
    error,
    createEvento,
    updateEvento,
    deleteEvento,
    refreshEventos: loadEventos,
  }
}
