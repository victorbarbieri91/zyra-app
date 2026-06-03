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
  status?: 'agendado' | 'realizado' | 'cancelado' | 'remarcado'
  // Vinculações (FK diretas)
  processo_id?: string | null
  consultivo_id?: string | null
  // Múltiplos responsáveis (array direto na coluna)
  responsaveis_ids: string[]
  // Privacidade: quando true, só criador/responsáveis veem (via RLS)
  pessoal?: boolean
  created_at?: string
  updated_at?: string
}

export interface EventoFormData extends Partial<Evento> {}

/**
 * Filtros opcionais de leitura. Omitidos = comportamento antigo (todos os
 * eventos não-cancelados do escritório). Usados pelo Kanban para pedir só a
 * janela visível + o responsável (evita o teto de 1.000 linhas).
 */
export interface UseEventosOptions {
  responsavelId?: string
  dataInicio?: string // YYYY-MM-DD
  dataFim?: string // YYYY-MM-DD
}

export function useEventos(escritorioId?: string, options?: UseEventosOptions) {
  const { responsavelId, dataInicio, dataFim } = options || {}
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
        .neq('status', 'cancelado')
        .order('data_inicio', { ascending: true })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      if (responsavelId) {
        query = query.or(`responsaveis_ids.cs.{${responsavelId}},responsaveis_ids.eq.{}`)
      }

      // data_inicio é timestamp → fecha o dia final com T23:59:59
      if (dataInicio) query = query.gte('data_inicio', dataInicio)
      if (dataFim) query = query.lte('data_inicio', `${dataFim}T23:59:59`)

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
        // Responsáveis: usa array direto, mantém responsavel_id para compatibilidade
        responsaveis_ids: data.responsaveis_ids || [],
        responsavel_id: data.responsaveis_ids?.[0] || data.responsavel_id,
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
        // Responsáveis: usa array direto, mantém responsavel_id para compatibilidade
        responsaveis_ids: data.responsaveis_ids,
        responsavel_id: data.responsaveis_ids?.[0] || data.responsavel_id,
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

  // Cancelar evento via RPC (registra motivo + entrada no histórico de auditoria do processo).
  // escopo='instancia' cancela só o evento indicado
  // escopo='serie' cancela todas as ocorrências não-realizadas da recorrência + desativa a regra
  const cancelarEvento = async (
    id: string,
    motivo: string,
    escopo: 'instancia' | 'serie' = 'instancia',
  ): Promise<void> => {
    const motivoLimpo = motivo.trim()
    if (motivoLimpo.length === 0) {
      throw new Error('Motivo do cancelamento é obrigatório.')
    }
    try {
      if (escopo === 'instancia') {
        const { error } = await supabase.rpc('cancelar_agenda_instancia', {
          p_tabela: 'agenda_eventos',
          p_id: id,
          p_motivo: motivoLimpo,
        })
        if (error) throw error
      } else {
        const evento = eventos.find((e) => e.id === id)
        if (!evento?.recorrencia_id) throw new Error('Evento não pertence a uma série')
        const { error } = await supabase.rpc('cancelar_agenda_serie', {
          p_tabela: 'agenda_eventos',
          p_recorrencia_id: evento.recorrencia_id,
          p_motivo: motivoLimpo,
        })
        if (error) throw error
      }

      await loadEventos()
    } catch (err) {
      console.error('Erro ao cancelar evento:', err)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escritorioId, responsavelId, dataInicio, dataFim])

  return {
    eventos,
    loading,
    error,
    createEvento,
    updateEvento,
    deleteEvento,
    cancelarEvento,
    refreshEventos: loadEventos,
  }
}
