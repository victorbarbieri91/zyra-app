// ============================================
// HOOK: useConsultaCNJ
// Consulta dados de processo via API DataJud
// ============================================

import { useState, useCallback } from 'react'
import type { ProcessoDataJud } from '@/types/datajud'

interface UseConsultaCNJReturn {
  /** Estado de carregamento da consulta */
  consultando: boolean
  /** Dados do processo retornado */
  dados: ProcessoDataJud | null
  /** Mensagem de erro, se houver */
  erro: string | null
  /** Fonte dos dados ('api' ou 'cache') */
  fonte: 'api' | 'cache' | null
  /** Funcao para executar a consulta */
  consultar: (numeroCNJ: string) => Promise<ProcessoDataJud | null>
  /** Limpa os dados e erros */
  limpar: () => void
}

/**
 * Hook para consultar dados de processo judicial na API DataJud (CNJ)
 *
 * @example
 * ```tsx
 * const { consultando, dados, erro, consultar, limpar } = useConsultaCNJ()
 *
 * const handleBuscar = async () => {
 *   const processo = await consultar('1234567-89.2024.8.26.0100')
 *   if (processo) {
 *     console.log('Encontrado:', processo.tribunal)
 *   }
 * }
 * ```
 */
export function useConsultaCNJ(): UseConsultaCNJReturn {
  const [consultando, setConsultando] = useState(false)
  const [dados, setDados] = useState<ProcessoDataJud | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fonte, setFonte] = useState<'api' | 'cache' | null>(null)

  /**
   * Executa a consulta na API DataJud
   */
  const consultar = useCallback(async (numeroCNJ: string): Promise<ProcessoDataJud | null> => {
    // Limpar estado anterior
    setErro(null)
    setFonte(null)
    setConsultando(true)

    try {
      const response = await fetch('/api/datajud/consultar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numero_cnj: numeroCNJ })
      })

      const result = await response.json()

      if (!response.ok || !result.sucesso) {
        const mensagemErro = result.error || 'Erro ao consultar processo'
        setErro(mensagemErro)
        setDados(null)
        return null
      }

      setDados(result.dados)
      setFonte(result.fonte || 'api')
      return result.dados

    } catch (error) {
      console.error('[useConsultaCNJ] Erro:', error)
      const mensagemErro = error instanceof Error
        ? error.message
        : 'Erro de conexao ao consultar DataJud'
      setErro(mensagemErro)
      setDados(null)
      return null

    } finally {
      setConsultando(false)
    }
  }, [])

  /**
   * Limpa os dados e erros do estado
   */
  const limpar = useCallback(() => {
    setDados(null)
    setErro(null)
    setFonte(null)
  }, [])

  return {
    consultando,
    dados,
    erro,
    fonte,
    consultar,
    limpar
  }
}

export default useConsultaCNJ
