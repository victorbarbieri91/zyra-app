'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { getEscritorioAtivo } from '@/lib/supabase/escritorio-helpers'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import type { MembroCompleto } from '@/types/escritorio'

/**
 * Filtro inteligente por responsável da Agenda.
 *
 * A agenda já mostra apenas os itens do usuário logado (filtro por responsável
 * no servidor). Este contexto adiciona, por cima disso, um filtro puramente
 * visual e client-side: silenciar colegas para "limpar" a visualização.
 *
 * Regra (definida com o usuário): um item é ocultado quando QUALQUER um de seus
 * responsáveis está desmarcado. Itens públicos (sem responsáveis) nunca são
 * ocultados. Nada de liga/desliga separado: desmarcar esconde, remarcar volta.
 *
 * O estado ({ ocultos }) persiste por conta em profiles.preferencias.
 */
interface AgendaRespFilterValue {
  membros: MembroCompleto[]
  userId: string | null
  loading: boolean
  ocultos: string[]
  togglePessoa: (userId: string) => void
  marcarTodos: () => void
  desmarcarTodos: () => void
  /** true quando o item deve ser escondido pelo filtro atual. */
  isOculto: (responsaveisIds?: string[] | null) => boolean
}

const AgendaRespFilterContext = createContext<AgendaRespFilterValue | null>(null)

export function AgendaRespFilterProvider({ children }: { children: React.ReactNode }) {
  const [escritorioId, setEscritorioId] = useState<string | undefined>(undefined)
  const [userId, setUserId] = useState<string | null>(null)

  const { membros } = useEscritorioMembros(escritorioId)
  const { preferences, loading: prefsLoading, updatePreferences } = useUserPreferences()

  const [ocultos, setOcultos] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Referência do último valor persistido, para não regravar o mesmo dado
  // (evita write redundante ao hidratar e no primeiro render).
  const lastPersistedRef = useRef<string | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolver escritório ativo + usuário logado.
  useEffect(() => {
    let cancelado = false
    async function resolver() {
      const escritorio = await getEscritorioAtivo()
      if (!cancelado && escritorio) setEscritorioId(escritorio.id)
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!cancelado) setUserId(data.user?.id ?? null)
    }
    resolver()
    return () => {
      cancelado = true
    }
  }, [])

  // Hidratar a partir das preferências salvas (uma vez).
  useEffect(() => {
    if (prefsLoading || hydrated) return
    const salvo = preferences.agenda_filtro_responsaveis?.ocultos
    const lista = Array.isArray(salvo) ? salvo : []
    setOcultos(lista)
    lastPersistedRef.current = JSON.stringify(lista)
    setHydrated(true)
  }, [prefsLoading, hydrated, preferences])

  // Persistir mudanças (debounced), pulando valores idênticos ao já salvo.
  useEffect(() => {
    if (!hydrated) return
    const atual = JSON.stringify(ocultos)
    if (atual === lastPersistedRef.current) return

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      lastPersistedRef.current = atual
      updatePreferences({ agenda_filtro_responsaveis: { ocultos } })
    }, 500)

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [ocultos, hydrated, updatePreferences])

  const togglePessoa = useCallback(
    (id: string) => {
      // O próprio usuário nunca entra na lista de ocultos (silenciaria tudo).
      if (id === userId) return
      setOcultos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    },
    [userId],
  )

  const marcarTodos = useCallback(() => setOcultos([]), [])

  const desmarcarTodos = useCallback(() => {
    // Esconde todos os colegas ativos (menos o próprio usuário).
    setOcultos(membros.filter((m) => m.ativo && m.user_id !== userId).map((m) => m.user_id))
  }, [membros, userId])

  const ocultosSet = useMemo(() => new Set(ocultos), [ocultos])

  const isOculto = useCallback(
    (responsaveisIds?: string[] | null) => {
      if (ocultosSet.size === 0) return false
      if (!responsaveisIds || responsaveisIds.length === 0) return false
      return responsaveisIds.some((id) => ocultosSet.has(id))
    },
    [ocultosSet],
  )

  const value = useMemo<AgendaRespFilterValue>(
    () => ({
      membros,
      userId,
      loading: prefsLoading || !hydrated,
      ocultos,
      togglePessoa,
      marcarTodos,
      desmarcarTodos,
      isOculto,
    }),
    [membros, userId, prefsLoading, hydrated, ocultos, togglePessoa, marcarTodos, desmarcarTodos, isOculto],
  )

  return <AgendaRespFilterContext.Provider value={value}>{children}</AgendaRespFilterContext.Provider>
}

export function useAgendaRespFilter(): AgendaRespFilterValue {
  const ctx = useContext(AgendaRespFilterContext)
  if (!ctx) {
    // Fallback seguro: fora do provider, o filtro é neutro (nada é ocultado).
    // Evita quebrar views renderizadas isoladamente em testes/storybook.
    return {
      membros: [],
      userId: null,
      loading: false,
      ocultos: [],
      togglePessoa: () => {},
      marcarTodos: () => {},
      desmarcarTodos: () => {},
      isOculto: () => false,
    }
  }
  return ctx
}
