import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForDB, formatDateTimeForDB } from '@/lib/timezone'

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
  responsavel_id?: string
  cor?: string
  // Vinculações (FK diretas)
  processo_id?: string | null
  consultivo_id?: string | null
  // Múltiplos responsáveis (carregado separadamente via useAgendaResponsaveis)
  responsaveis_ids?: string[]
  created_at?: string
  updated_at?: string
}

export interface EventoFormData extends Partial<Evento> {}

export function useEventos(escritorioId?: string) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

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
      // Formatar datas para o timezone de Brasília antes de enviar ao DB
      const eventoData = {
        ...data,
        data_inicio: data.data_inicio ? formatDateTimeForDB(new Date(data.data_inicio)) : undefined,
        data_fim: data.data_fim ? formatDateTimeForDB(new Date(data.data_fim)) : undefined,
      }

      const { data: novoEvento, error: eventoError } = await supabase
        .from('agenda_eventos')
        .insert(eventoData)
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
      // Formatar datas para o timezone de Brasília antes de enviar ao DB
      const eventoData = {
        ...data,
        data_inicio: data.data_inicio ? formatDateTimeForDB(new Date(data.data_inicio)) : undefined,
        data_fim: data.data_fim ? formatDateTimeForDB(new Date(data.data_fim)) : undefined,
      }

      const { error } = await supabase
        .from('agenda_eventos')
        .update(eventoData)
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
    // Só carrega se tiver escritorioId definido
    if (escritorioId) {
      loadEventos()
    } else {
      setLoading(false)
      setEventos([])
    }
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
