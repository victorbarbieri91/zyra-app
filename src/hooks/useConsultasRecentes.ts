'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ConsultaRecente {
  id: string
  numero: string | null
  titulo: string | null
  cliente_nome: string | null
  tipo: string | null
  area: string | null
  status: string | null
  responsavel_nome: string | null
  acessado_em: string
}

// Consultas acessadas recentemente PELO usuário (alimentado por consultivo_acessos).
export function useConsultasRecentes(userId: string | null, escritorioId: string | null, limit = 4) {
  const [recentes, setRecentes] = useState<ConsultaRecente[]>([])
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
        .from('consultivo_acessos')
        .select('consulta_id, acessado_em')
        .eq('user_id', userId)
        .order('acessado_em', { ascending: false })
        .limit(limit)

      const acessosTyped = (acessos || []) as Array<{ consulta_id: string; acessado_em: string }>
      const ids = acessosTyped.map(a => a.consulta_id)
      if (ids.length === 0) {
        setRecentes([])
        return
      }
      const acessoMap = new Map<string, string>(
        acessosTyped.map(a => [a.consulta_id, a.acessado_em] as [string, string])
      )

      const { data: cons } = await supabase
        .from('v_consultivo_consultas')
        .select('id, numero, titulo, cliente_nome, tipo, area, status, responsavel_nome')
        .in('id', ids)

      type ConsRow = {
        id: string | null
        numero: string | null
        titulo: string | null
        cliente_nome: string | null
        tipo: string | null
        area: string | null
        status: string | null
        responsavel_nome: string | null
      }
      const consTyped = (cons || []) as ConsRow[]
      const lista: ConsultaRecente[] = consTyped
        .filter(c => !!c.id)
        .map(c => ({
          id: c.id as string,
          numero: c.numero,
          titulo: c.titulo,
          cliente_nome: c.cliente_nome,
          tipo: c.tipo,
          area: c.area,
          status: c.status,
          responsavel_nome: c.responsavel_nome,
          acessado_em: acessoMap.get(c.id as string) || '',
        }))
        .sort((a, b) => b.acessado_em.localeCompare(a.acessado_em))

      setRecentes(lista)
    } finally {
      setLoading(false)
    }
  }, [userId, escritorioId, limit, supabase])

  useEffect(() => { carregar() }, [carregar])

  return { recentes, loading, refresh: carregar }
}
