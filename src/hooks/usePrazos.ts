import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Prazo {
  id: string
  escritorio_id: string
  titulo: string
  data_inicio: string
  responsavel_id: string
  tipo_prazo: string
  data_limite: string
  cumprido: boolean
  perdido: boolean
  dias_uteis: boolean
  dias_restantes: number
  criticidade: 'vencido' | 'hoje' | 'critico' | 'urgente' | 'atencao' | 'normal'
  numero_processo?: string
  processo_id?: string
  cliente_nome?: string
  cliente_id?: string
  responsavel_nome?: string
}

export function usePrazos(escritorioId?: string) {
  const [prazos, setPrazos] = useState<Prazo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const loadPrazos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Query usando a view de prazos vencendo
      const { data, error: queryError } = await supabase
        .from('v_prazos_vencendo')
        .select('*')
        .order('data_limite', { ascending: true })

      if (queryError) throw queryError

      setPrazos(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar prazos:', err)
    } finally {
      setLoading(false)
    }
  }

  const calcularPrazo = async (
    dataBase: Date,
    quantidadeDias: number,
    usarDiasUteis: boolean,
    escritorioUf?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('calcular_prazo', {
        data_base: dataBase.toISOString().split('T')[0],
        quantidade_dias: quantidadeDias,
        usar_dias_uteis: usarDiasUteis,
        escritorio_uf: escritorioUf
      })

      if (error) throw error

      return data[0]
    } catch (err) {
      console.error('Erro ao calcular prazo:', err)
      throw err
    }
  }

  const marcarCumprido = async (prazoId: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('marcar_prazo_cumprido', {
        p_prazo_id: prazoId
      })

      if (error) throw error

      await loadPrazos()
    } catch (err) {
      console.error('Erro ao marcar prazo como cumprido:', err)
      throw err
    }
  }

  const getPrazosPorCriticidade = (criticidade: Prazo['criticidade']) => {
    return prazos.filter(p => p.criticidade === criticidade)
  }

  const getPrazosVencidos = () => {
    return prazos.filter(p => p.criticidade === 'vencido')
  }

  const getPrazosHoje = () => {
    return prazos.filter(p => p.criticidade === 'hoje')
  }

  const getPrazosCriticos = () => {
    return prazos.filter(p => p.criticidade === 'critico')
  }

  useEffect(() => {
    loadPrazos()

    // Subscribe to changes
    const channel = supabase
      .channel('prazos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos_prazos'
        },
        () => {
          loadPrazos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [escritorioId])

  return {
    prazos,
    loading,
    error,
    calcularPrazo,
    marcarCumprido,
    getPrazosPorCriticidade,
    getPrazosVencidos,
    getPrazosHoje,
    getPrazosCriticos,
    refreshPrazos: loadPrazos,
  }
}
