'use client'

import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

/**
 * Hook leve que retorna apenas a contagem de publicações pendentes.
 * Usado no sidebar para exibir o badge indicador.
 */
export function usePublicacoesPendentesCount() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())

  const { data: count = 0 } = useQuery({
    queryKey: ['publicacoes', 'pendentes-count', escritorioAtivo],
    queryFn: async () => {
      const { count, error } = await supabaseRef.current
        .from('publicacoes_publicacoes')
        .select('*', { count: 'exact', head: true })
        .eq('escritorio_id', escritorioAtivo!)
        .eq('status', 'pendente')

      if (error) throw error
      return count ?? 0
    },
    enabled: !!escritorioAtivo,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // refetch a cada 10 minutos
  })

  return count
}
