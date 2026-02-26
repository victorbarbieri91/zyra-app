'use client'

import { useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

/**
 * Hook leve que retorna apenas a contagem de publicações pendentes.
 * Usado no sidebar para exibir o badge indicador.
 * Atualiza em tempo real via Supabase Realtime.
 */
export function usePublicacoesPendentesCount() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const queryKey = ['publicacoes', 'pendentes-count', escritorioAtivo]

  const { data: count = 0 } = useQuery({
    queryKey,
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
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })

  // Real-time: atualizar badge quando publicações mudam
  useEffect(() => {
    if (!escritorioAtivo) return

    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`publicacoes-pendentes-${escritorioAtivo}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publicacoes_publicacoes',
          filter: `escritorio_id=eq.${escritorioAtivo}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [escritorioAtivo, queryClient, queryKey])

  return count
}
