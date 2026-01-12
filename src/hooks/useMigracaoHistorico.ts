// ============================================
// HOOK PARA HISTÓRICO DE MIGRAÇÕES
// ============================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MigracaoHistorico, ModuloMigracao } from '@/types/migracao'

interface UseMigracaoHistoricoResult {
  historico: MigracaoHistorico[]
  isLoading: boolean
  error: string | null
  modulosMigrados: ModuloMigracao[]
  getContagemModulo: (modulo: ModuloMigracao) => number
  refetch: () => Promise<void>
}

export function useMigracaoHistorico(): UseMigracaoHistoricoResult {
  const [historico, setHistorico] = useState<MigracaoHistorico[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistorico = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('migracao_historico')
        .select('*')
        .order('executado_em', { ascending: false })

      if (fetchError) throw fetchError

      setHistorico((data as MigracaoHistorico[]) || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar histórico')
      setHistorico([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistorico()
  }, [fetchHistorico])

  // Lista de módulos que já foram migrados com sucesso
  const modulosMigrados = historico
    .filter(h => h.total_importados > 0)
    .map(h => h.modulo)
    .filter((modulo, index, self) => self.indexOf(modulo) === index) as ModuloMigracao[]

  // Obter contagem de registros importados de um módulo
  const getContagemModulo = useCallback((modulo: ModuloMigracao): number => {
    const registros = historico.filter(h => h.modulo === modulo)
    return registros.reduce((total, h) => total + h.total_importados, 0)
  }, [historico])

  return {
    historico,
    isLoading,
    error,
    modulosMigrados,
    getContagemModulo,
    refetch: fetchHistorico
  }
}
