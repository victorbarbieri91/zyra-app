'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface AlertaEncerramento {
  id: string
  processo_id: string
  codigo_cnj_detectado: number
  nome_evento: string
  data_evento: string
  created_at: string
  // joined
  numero_cnj?: string
  numero_pasta?: string
}

/**
 * Hook que carrega alertas pendentes de encerramento detectados pelo DataJud.
 * Quando o cron detecta movimentações com códigos CNJ terminais (Baixa Definitiva,
 * Trânsito em Julgado, Arquivamento), gera entradas em `processos_alertas_encerramento`
 * que aparecem no card "Atenção Imediata" do dashboard.
 *
 * Ações:
 *   - confirmar: marca alerta como confirmado E arquiva o processo
 *   - ignorar: marca como ignorado (com justificativa opcional)
 */
export function useProcessosEncerramentoAlertas() {
  const [alertas, setAlertas] = useState<AlertaEncerramento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const load = useCallback(async () => {
    if (!escritorioAtivo) {
      setAlertas([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: queryErr } = await supabase
        .from('processos_alertas_encerramento')
        .select(`
          id,
          processo_id,
          codigo_cnj_detectado,
          nome_evento,
          data_evento,
          created_at,
          processos_processos!inner (
            numero_cnj,
            numero_pasta
          )
        `)
        .eq('escritorio_id', escritorioAtivo)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })

      if (queryErr) throw queryErr

      const flat: AlertaEncerramento[] = (data || []).map((row: any) => ({
        id: row.id,
        processo_id: row.processo_id,
        codigo_cnj_detectado: row.codigo_cnj_detectado,
        nome_evento: row.nome_evento,
        data_evento: row.data_evento,
        created_at: row.created_at,
        numero_cnj: row.processos_processos?.numero_cnj,
        numero_pasta: row.processos_processos?.numero_pasta,
      }))

      setAlertas(flat)
    } catch (err) {
      console.error('[useProcessosEncerramentoAlertas] erro:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  const confirmar = useCallback(async (alertaId: string) => {
    const { error: rpcErr } = await supabase.rpc('confirmar_alerta_encerramento', {
      p_alerta_id: alertaId
    })
    if (rpcErr) throw rpcErr
    await load()
  }, [supabase, load])

  const ignorar = useCallback(async (alertaId: string, justificativa?: string) => {
    const { error: rpcErr } = await supabase.rpc('ignorar_alerta_encerramento', {
      p_alerta_id: alertaId,
      p_justificativa: justificativa || null
    })
    if (rpcErr) throw rpcErr
    await load()
  }, [supabase, load])

  useEffect(() => {
    load()
  }, [load])

  return {
    alertas,
    total: alertas.length,
    loading,
    error,
    refresh: load,
    confirmar,
    ignorar,
  }
}
