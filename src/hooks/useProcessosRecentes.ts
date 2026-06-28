'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProcessoRecente {
  id: string
  numero_pasta: string | null
  numero_cnj: string | null
  cliente_nome: string | null
  parte_contraria: string | null
  area: string | null
  status: string | null
  responsavel_nome: string | null
  acessado_em: string
}

// Processos acessados recentemente PELO usuário (alimentado por processos_acessos).
export function useProcessosRecentes(userId: string | null, escritorioId: string | null, limit = 4) {
  const [recentes, setRecentes] = useState<ProcessoRecente[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const carregar = useCallback(async () => {
    if (!userId || !escritorioId) {
      setRecentes([])
      return
    }
    setLoading(true)
    try {
      const { data: acessos } = await supabase
        .from('processos_acessos')
        .select('processo_id, acessado_em')
        .eq('user_id', userId)
        .order('acessado_em', { ascending: false })
        .limit(limit)

      const acessosTyped = (acessos || []) as Array<{ processo_id: string; acessado_em: string }>
      const ids = acessosTyped.map(a => a.processo_id)
      if (ids.length === 0) {
        setRecentes([])
        return
      }
      const acessoMap = new Map<string, string>(
        acessosTyped.map(a => [a.processo_id, a.acessado_em] as [string, string])
      )

      const { data: procs } = await supabase
        .from('v_processos_com_movimentacoes')
        .select('id, numero_pasta, numero_cnj, cliente_nome, parte_contraria, area, status, responsavel_nome')
        .eq('escritorio_id', escritorioId)
        .in('id', ids)

      type ProcRow = {
        id: string | null
        numero_pasta: string | null
        numero_cnj: string | null
        cliente_nome: string | null
        parte_contraria: string | null
        area: string | null
        status: string | null
        responsavel_nome: string | null
      }
      const procsTyped = (procs || []) as ProcRow[]
      const lista: ProcessoRecente[] = procsTyped
        .filter(p => !!p.id)
        .map(p => ({
          id: p.id as string,
          numero_pasta: p.numero_pasta,
          numero_cnj: p.numero_cnj,
          cliente_nome: p.cliente_nome,
          parte_contraria: p.parte_contraria,
          area: p.area,
          status: p.status,
          responsavel_nome: p.responsavel_nome,
          acessado_em: acessoMap.get(p.id as string) || '',
        }))
        .sort((a, b) => b.acessado_em.localeCompare(a.acessado_em))

      setRecentes(lista)
    } finally {
      setLoading(false)
    }
  }, [userId, escritorioId, limit, supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  return { recentes, loading, refresh: carregar }
}
