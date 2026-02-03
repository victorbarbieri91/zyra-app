'use client'

import { useState, useEffect, useCallback } from 'react'

// ============================================
// TIPOS
// ============================================

export interface TermoEscavador {
  id: string
  escritorio_id: string
  termo: string
  descricao: string | null
  variacoes: string[]
  termos_auxiliares: string[][] | null
  origens_ids: number[]
  escavador_monitoramento_id: string | null
  escavador_status: 'pendente' | 'ativo' | 'pausado' | 'erro' | 'removido'
  escavador_erro: string | null
  total_aparicoes: number
  ultima_aparicao: string | null
  ultima_sync: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CriarTermoData {
  termo: string
  descricao?: string
  variacoes?: string[]
  origens_ids?: number[]
}

export interface EditarTermoData {
  variacoes?: string[]
  descricao?: string
}

export interface SyncResult {
  sucesso: boolean
  mensagem: string
  publicacoes_novas: number
  publicacoes_duplicadas: number
  publicacoes_vinculadas: number
  erros?: string[]
}

export interface HistoricoSync {
  id: string
  tipo: 'manual' | 'automatica' | 'callback'
  data_inicio: string
  data_fim: string | null
  publicacoes_novas: number
  publicacoes_duplicadas: number
  publicacoes_vinculadas: number
  sucesso: boolean | null
  erro_mensagem: string | null
  termo?: { termo: string } | null
}

// ============================================
// HOOK
// ============================================

export function useEscavadorTermos(escritorioId?: string) {
  const [termos, setTermos] = useState<TermoEscavador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [historicoSync, setHistoricoSync] = useState<HistoricoSync[]>([])

  /**
   * Carrega lista de termos
   */
  const carregarTermos = useCallback(async () => {
    if (!escritorioId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/escavador/publicacoes/termos')
      const data = await response.json()

      if (!data.sucesso) {
        throw new Error(data.error || 'Erro ao carregar termos')
      }

      setTermos(data.termos || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEscavadorTermos] Erro ao carregar:', message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [escritorioId])

  /**
   * Adiciona novo termo
   */
  const adicionarTermo = useCallback(async (dados: CriarTermoData): Promise<{
    sucesso: boolean
    termo?: TermoEscavador
    erro?: string
  }> => {
    try {
      const response = await fetch('/api/escavador/publicacoes/termos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      })

      const data = await response.json()

      if (!data.sucesso) {
        return { sucesso: false, erro: data.error }
      }

      // Recarrega lista
      await carregarTermos()

      return { sucesso: true, termo: data.termo }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEscavadorTermos] Erro ao adicionar:', message)
      return { sucesso: false, erro: message }
    }
  }, [carregarTermos])

  /**
   * Remove termo
   */
  const removerTermo = useCallback(async (termoId: string): Promise<{
    sucesso: boolean
    erro?: string
  }> => {
    try {
      const response = await fetch('/api/escavador/publicacoes/termos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termo_id: termoId })
      })

      const data = await response.json()

      if (!data.sucesso) {
        return { sucesso: false, erro: data.error }
      }

      // Recarrega lista
      await carregarTermos()

      return { sucesso: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEscavadorTermos] Erro ao remover:', message)
      return { sucesso: false, erro: message }
    }
  }, [carregarTermos])

  /**
   * Edita um termo existente (variações e descrição)
   */
  const editarTermo = useCallback(async (termoId: string, dados: { variacoes?: string[], descricao?: string }): Promise<{
    sucesso: boolean
    termo?: TermoEscavador
    erro?: string
  }> => {
    try {
      const response = await fetch('/api/escavador/publicacoes/termos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termo_id: termoId, ...dados })
      })

      const data = await response.json()

      if (!data.sucesso) {
        return { sucesso: false, erro: data.error }
      }

      // Recarrega lista
      await carregarTermos()

      return { sucesso: true, termo: data.termo }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEscavadorTermos] Erro ao editar:', message)
      return { sucesso: false, erro: message }
    }
  }, [carregarTermos])

  /**
   * Ativa/Registra um termo no Escavador (para termos sem monitoramento_id)
   */
  const ativarTermo = useCallback(async (termoId: string): Promise<{
    sucesso: boolean
    erro?: string
  }> => {
    try {
      const response = await fetch('/api/escavador/publicacoes/termos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termo_id: termoId })
      })

      const data = await response.json()

      if (!data.sucesso) {
        return { sucesso: false, erro: data.error }
      }

      // Recarrega lista
      await carregarTermos()

      return { sucesso: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEscavadorTermos] Erro ao ativar:', message)
      return { sucesso: false, erro: message }
    }
  }, [carregarTermos])

  /**
   * Sincroniza publicações de todos os termos ou de um específico
   */
  const sincronizar = useCallback(async (termoId?: string): Promise<SyncResult> => {
    setSincronizando(true)

    try {
      const response = await fetch('/api/escavador/publicacoes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termoId ? { termo_id: termoId } : {})
      })

      const data = await response.json()

      if (!data.sucesso && !data.mensagem) {
        return {
          sucesso: false,
          mensagem: data.error || 'Erro ao sincronizar',
          publicacoes_novas: 0,
          publicacoes_duplicadas: 0,
          publicacoes_vinculadas: 0
        }
      }

      // Recarrega termos para atualizar estatísticas
      await carregarTermos()
      await carregarHistoricoSync()

      return {
        sucesso: data.sucesso,
        mensagem: data.mensagem,
        publicacoes_novas: data.publicacoes_novas || 0,
        publicacoes_duplicadas: data.publicacoes_duplicadas || 0,
        publicacoes_vinculadas: data.publicacoes_vinculadas || 0,
        erros: data.erros
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEscavadorTermos] Erro ao sincronizar:', message)
      return {
        sucesso: false,
        mensagem: message,
        publicacoes_novas: 0,
        publicacoes_duplicadas: 0,
        publicacoes_vinculadas: 0
      }
    } finally {
      setSincronizando(false)
    }
  }, [carregarTermos])

  /**
   * Carrega histórico de sincronizações
   */
  const carregarHistoricoSync = useCallback(async () => {
    if (!escritorioId) return

    try {
      const response = await fetch('/api/escavador/publicacoes/sync?limite=10')
      const data = await response.json()

      if (data.sucesso) {
        setHistoricoSync(data.historico || [])
      }
    } catch (err) {
      console.error('[useEscavadorTermos] Erro ao carregar historico:', err)
    }
  }, [escritorioId])

  // Carrega dados iniciais
  useEffect(() => {
    if (escritorioId) {
      carregarTermos()
      carregarHistoricoSync()
    }
  }, [escritorioId, carregarTermos, carregarHistoricoSync])

  return {
    // Estado
    termos,
    loading,
    error,
    sincronizando,
    historicoSync,

    // Ações
    carregarTermos,
    adicionarTermo,
    editarTermo,
    removerTermo,
    ativarTermo,
    sincronizar,
    carregarHistoricoSync,

    // Computed
    termosAtivos: termos.filter(t => t.ativo),
    termosPendentes: termos.filter(t => t.ativo && !t.escavador_monitoramento_id),
    totalAparicoes: termos.reduce((acc, t) => acc + (t.total_aparicoes || 0), 0),
    temErros: termos.some(t => t.escavador_status === 'erro'),
    temPendentes: termos.some(t => t.ativo && !t.escavador_monitoramento_id)
  }
}
