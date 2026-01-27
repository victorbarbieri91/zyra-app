// =====================================================
// HOOK: Busca Global do Sistema
// =====================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ResultadoBusca, RespostaBuscaGlobal, TipoResultadoBusca } from '@/types/search'

interface UseGlobalSearchOptions {
  debounceMs?: number
  minChars?: number
  tipos?: TipoResultadoBusca[]
}

interface UseGlobalSearchReturn {
  query: string
  setQuery: (query: string) => void
  resultados: ResultadoBusca[]
  isLoading: boolean
  error: string | null
  total: number
  tempoBusca: number
  buscar: (termo?: string) => Promise<void>
  limpar: () => void
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}): UseGlobalSearchReturn {
  const {
    debounceMs = 300,
    minChars = 2,
    tipos
  } = options

  const [query, setQueryState] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [tempoBusca, setTempoBusca] = useState(0)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const buscar = useCallback(async (termo?: string) => {
    const termoBusca = termo ?? query

    // Validar tamanho mínimo
    if (termoBusca.trim().length < minChars) {
      setResultados([])
      setTotal(0)
      setError(null)
      return
    }

    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      // Construir URL com parâmetros
      const params = new URLSearchParams({ q: termoBusca.trim() })
      if (tipos && tipos.length > 0) {
        params.set('tipos', tipos.join(','))
      }

      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Erro ao realizar busca')
      }

      const data: RespostaBuscaGlobal = await response.json()

      if (data.sucesso) {
        setResultados(data.resultados)
        setTotal(data.total)
        setTempoBusca(data.tempo_busca_ms)
        setError(null)
      } else {
        setError(data.erro || 'Erro desconhecido')
        setResultados([])
        setTotal(0)
      }
    } catch (err: any) {
      // Ignorar erros de abort (usuário digitou novamente)
      if (err.name === 'AbortError') {
        return
      }
      console.error('[useGlobalSearch] Erro:', err)
      setError('Erro ao realizar busca')
      setResultados([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [query, minChars, tipos])

  const setQuery = useCallback((novaQuery: string) => {
    setQueryState(novaQuery)

    // Debounce da busca
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (novaQuery.trim().length >= minChars) {
      debounceRef.current = setTimeout(() => {
        buscar(novaQuery)
      }, debounceMs)
    } else {
      setResultados([])
      setTotal(0)
      setError(null)
    }
  }, [debounceMs, minChars, buscar])

  const limpar = useCallback(() => {
    setQueryState('')
    setResultados([])
    setTotal(0)
    setError(null)
    setTempoBusca(0)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    query,
    setQuery,
    resultados,
    isLoading,
    error,
    total,
    tempoBusca,
    buscar,
    limpar
  }
}

// =====================================================
// HOOK: Histórico de Buscas Recentes
// =====================================================

const STORAGE_KEY = 'zyra_search_history'
const MAX_HISTORICO = 10

interface BuscaRecente {
  termo: string
  timestamp: number
}

export function useSearchHistory() {
  const [historico, setHistorico] = useState<BuscaRecente[]>([])

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setHistorico(JSON.parse(stored))
      }
    } catch (e) {
      console.error('[useSearchHistory] Erro ao carregar histórico:', e)
    }
  }, [])

  const adicionarBusca = useCallback((termo: string) => {
    if (!termo.trim()) return

    setHistorico(prev => {
      // Remover duplicata se existir
      const filtrado = prev.filter(h => h.termo.toLowerCase() !== termo.toLowerCase())

      // Adicionar no início
      const novo: BuscaRecente[] = [
        { termo: termo.trim(), timestamp: Date.now() },
        ...filtrado
      ].slice(0, MAX_HISTORICO)

      // Salvar no localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(novo))
      } catch (e) {
        console.error('[useSearchHistory] Erro ao salvar histórico:', e)
      }

      return novo
    })
  }, [])

  const removerBusca = useCallback((termo: string) => {
    setHistorico(prev => {
      const novo = prev.filter(h => h.termo !== termo)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(novo))
      } catch (e) {
        console.error('[useSearchHistory] Erro ao salvar histórico:', e)
      }
      return novo
    })
  }, [])

  const limparHistorico = useCallback(() => {
    setHistorico([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('[useSearchHistory] Erro ao limpar histórico:', e)
    }
  }, [])

  return {
    historico,
    adicionarBusca,
    removerBusca,
    limparHistorico
  }
}
