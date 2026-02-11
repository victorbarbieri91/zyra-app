/**
 * Hook para carregar regras de recorrência e expandir instâncias virtuais.
 *
 * Busca as regras ativas de agenda_recorrencias e expõe uma função `expandir()`
 * que gera AgendaItem[] virtuais para qualquer range de datas.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgendaItem } from '@/hooks/useAgendaConsolidada'
import { expandirRecorrencias, type RecorrenciaRegra } from '@/lib/recorrencia-utils'

interface InstanciaExistente {
  recorrencia_id: string
  data_inicio: string
}

export function useRecorrenciaExpansion(escritorioId: string | undefined) {
  const [regras, setRegras] = useState<RecorrenciaRegra[]>([])
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchRegras = useCallback(async () => {
    if (!escritorioId) {
      setRegras([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agenda_recorrencias')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .eq('ativo', true)

      if (error) {
        console.error('Erro ao buscar regras de recorrência:', error)
        return
      }

      setRegras(data || [])
    } catch (err) {
      console.error('Erro ao buscar regras de recorrência:', err)
    } finally {
      setLoading(false)
    }
  }, [escritorioId])

  useEffect(() => {
    fetchRegras()
  }, [fetchRegras])

  /**
   * Expande as regras de recorrência para um range de datas,
   * excluindo datas que já possuem instância real no banco.
   */
  const expandir = useCallback(
    (rangeInicio: Date, rangeFim: Date, instanciasExistentes: InstanciaExistente[]): AgendaItem[] => {
      if (regras.length === 0) return []
      return expandirRecorrencias(regras, rangeInicio, rangeFim, instanciasExistentes)
    },
    [regras]
  )

  return {
    regras,
    loading,
    expandir,
    refreshRegras: fetchRegras,
  }
}
