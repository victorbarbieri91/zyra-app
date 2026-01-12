// ============================================
// HOOK PARA MONITORAR JOB DE MIGRAÇÃO
// ============================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MigracaoJob } from '@/types/migracao'

interface UseMigracaoJobResult {
  job: MigracaoJob | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMigracaoJob(jobId: string | null): UseMigracaoJobResult {
  const [job, setJob] = useState<MigracaoJob | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!jobId) {
      setJob(null)
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('migracao_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (fetchError) throw fetchError

      setJob(data as MigracaoJob)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar job')
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  // Buscar inicialmente
  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  // Subscription para atualizações em tempo real
  useEffect(() => {
    if (!jobId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`migracao-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'migracao_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('Real-time update:', payload.new)
          setJob(payload.new as MigracaoJob)
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId])

  // Polling fallback - verifica a cada 2 segundos se o job ainda está processando
  useEffect(() => {
    if (!jobId || !job) return

    // Só fazer polling se estiver em estado de processamento
    const statusProcessando = ['pendente', 'processando', 'validando']
    if (!statusProcessando.includes(job.status)) return

    const interval = setInterval(() => {
      console.log('Polling job status...')
      fetchJob()
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, job?.status, fetchJob])

  return { job, isLoading, error, refetch: fetchJob }
}
