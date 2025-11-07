import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'

export interface DisponibilidadeSlot {
  data_hora_inicio: string
  data_hora_fim: string
}

export interface ConflitosAgenda {
  evento_id: string
  titulo: string
  data_inicio: string
  data_fim: string
}

export function useAgenda() {
  const [feriados, setFeriados] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadFeriados = async () => {
    try {
      const { data, error } = await supabase
        .from('feriados')
        .select('data')
        .order('data', { ascending: true })

      if (error) throw error

      setFeriados(data?.map(f => new Date(f.data)) || [])
    } catch (err) {
      console.error('Erro ao carregar feriados:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkConflitos = async (
    userId: string,
    dataInicio: Date,
    dataFim: Date,
    eventoId?: string
  ): Promise<ConflitosAgenda[]> => {
    try {
      const { data, error } = await supabase.rpc('check_conflitos', {
        p_user_id: userId,
        p_data_inicio: dataInicio.toISOString(),
        p_data_fim: dataFim.toISOString(),
        p_evento_id: eventoId
      })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erro ao verificar conflitos:', err)
      return []
    }
  }

  const sugerirHorarios = async (
    userId: string,
    duracaoMinutos: number,
    dataPreferencia: Date,
    horaInicio = '08:00:00',
    horaFim = '18:00:00'
  ): Promise<DisponibilidadeSlot[]> => {
    try {
      const { data, error } = await supabase.rpc('sugerir_horarios', {
        p_user_id: userId,
        p_duracao_minutos: duracaoMinutos,
        p_data_preferencia: dataPreferencia.toISOString().split('T')[0],
        p_hora_inicio: horaInicio,
        p_hora_fim: horaFim
      })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erro ao sugerir horários:', err)
      return []
    }
  }

  const getDisponibilidadeEquipe = async (dataInicio: Date, dataFim: Date) => {
    try {
      const { data, error } = await supabase
        .from('v_disponibilidade_equipe')
        .select('*')
        .gte('data', dataInicio.toISOString().split('T')[0])
        .lte('data', dataFim.toISOString().split('T')[0])
        .order('data', { ascending: true })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erro ao buscar disponibilidade da equipe:', err)
      return []
    }
  }

  const isFeriado = (date: Date): boolean => {
    return feriados.some(feriado =>
      feriado.toDateString() === date.toDateString()
    )
  }

  const getFeriadosDoMes = (date: Date): Date[] => {
    const inicio = startOfMonth(date)
    const fim = endOfMonth(date)

    return feriados.filter(feriado =>
      feriado >= inicio && feriado <= fim
    )
  }

  useEffect(() => {
    loadFeriados()
  }, [])

  return {
    feriados,
    loading,
    isFeriado,
    getFeriadosDoMes,
    checkConflitos,
    sugerirHorarios,
    getDisponibilidadeEquipe,
    refreshFeriados: loadFeriados,
  }
}
