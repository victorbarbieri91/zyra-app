// ============================================
// HOOK PRINCIPAL DE MIGRAÇÃO
// ============================================

'use client'

import { useState, useCallback } from 'react'
import { MigracaoState, ModuloMigracao, StepMigracao, MigracaoJob } from '@/types/migracao'

const initialState = (modulo: ModuloMigracao): MigracaoState => ({
  step: 'upload',
  modulo,
  arquivo: null,
  headers: [],
  amostra: [],
  totalLinhas: 0,
  mapeamento: {},
  confianca: {},
  jobId: null,
  job: null
})

export function useMigracao(modulo: ModuloMigracao) {
  const [state, setState] = useState<MigracaoState>(initialState(modulo))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Atualizar estado parcialmente
  const updateState = useCallback((updates: Partial<MigracaoState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Navegar para step
  const goToStep = useCallback((step: StepMigracao) => {
    updateState({ step })
  }, [updateState])

  // Reset estado
  const reset = useCallback(() => {
    setState(initialState(modulo))
    setError(null)
  }, [modulo])

  // Atualizar mapeamento de um campo
  const setMapeamentoCampo = useCallback((header: string, campo: string | null) => {
    setState(prev => ({
      ...prev,
      mapeamento: {
        ...prev.mapeamento,
        [header]: campo
      }
    }))
  }, [])

  // Atualizar job
  const setJob = useCallback((job: MigracaoJob) => {
    updateState({ job })
  }, [updateState])

  return {
    state,
    isLoading,
    error,
    setIsLoading,
    setError,
    updateState,
    goToStep,
    reset,
    setMapeamentoCampo,
    setJob
  }
}
