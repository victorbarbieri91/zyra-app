'use client'

// Hook utility usado pelo dashboard pra consolidar dados de todos os escritórios
// do GRUPO em que o usuário tem acesso real (`role !== 'readonly'`).
//
// Por que existe: os hooks de dashboard antes filtravam por `escritorioAtivo`
// único e o seletor "Todos os escritórios" era cosmético. Esse hook devolve a
// lista correta de IDs pra usar em `.in('escritorio_id', ids)`.
//
// Onde NÃO usar: ações de criação (nova tarefa/processo/timesheet) continuam
// usando `useEscritorioAtivo` — elas precisam de um alvo único.
//
// Fallback: se o grupo ainda não foi carregado ou o usuário não tem acesso real
// a nenhum, retorna `[escritorioAtivo]` pra manter o dashboard funcional.

import { useEffect, useState } from 'react'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import {
  getEscritoriosDoGrupo,
  type EscritorioComRole,
} from '@/lib/supabase/escritorio-helpers'

interface UseEscritoriosDoGrupoUsuarioReturn {
  /** IDs dos escritórios do grupo onde o user tem acesso real. Use em `.in()`. */
  escritoriosIds: string[]
  /** Lista completa (com role) — útil pra UI que queira mostrar nome do escritório. */
  escritoriosDoGrupo: EscritorioComRole[]
  loading: boolean
}

export function useEscritoriosDoGrupoUsuario(): UseEscritoriosDoGrupoUsuarioReturn {
  const { escritorioAtivo } = useEscritorioAtivo()
  const [escritoriosDoGrupo, setEscritoriosDoGrupo] = useState<EscritorioComRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!escritorioAtivo) {
      setEscritoriosDoGrupo([])
      setLoading(false)
      return
    }

    let cancelado = false
    setLoading(true)

    getEscritoriosDoGrupo()
      .then((lista) => {
        if (cancelado) return
        setEscritoriosDoGrupo(lista)
      })
      .catch((err) => {
        console.error('[useEscritoriosDoGrupoUsuario] erro:', err)
        if (!cancelado) setEscritoriosDoGrupo([])
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [escritorioAtivo])

  // Filtra escritórios em que o user tem acesso REAL (não readonly). A função
  // `getEscritoriosDoGrupo` devolve todos do grupo, marcando como readonly os
  // que o user não tem entrada em `escritorios_usuarios`. RLS já protegeria,
  // mas filtrar client-side dá UX previsível (sem "fantasmas" na lista).
  const idsComAcessoReal = escritoriosDoGrupo
    .filter((e) => e.role !== 'readonly')
    .map((e) => e.id)

  // Fallback: enquanto a lista não carregou, ou se o user não tem acesso real
  // a nenhum, recai no escritorioAtivo único pra manter o dashboard funcional.
  const escritoriosIds =
    idsComAcessoReal.length > 0
      ? idsComAcessoReal
      : escritorioAtivo
        ? [escritorioAtivo]
        : []

  return {
    escritoriosIds,
    escritoriosDoGrupo,
    loading,
  }
}
