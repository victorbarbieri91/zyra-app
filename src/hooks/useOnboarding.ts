'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type OnboardingStep = 'escritorio' | 'perfil' | 'concluido'

export interface OnboardingProgress {
  primeiro_acesso: boolean
  onboarding_completo: boolean
  onboarding_etapa_atual: OnboardingStep | null
  escritorio_id: string | null
  has_escritorio: boolean
}

export interface CreateEscritorioData {
  nome: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: {
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  }
}

export interface UpdateProfileData {
  telefone?: string
  oab_numero?: string
  oab_uf?: string
  avatar_url?: string
}

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Carregar progresso do onboarding
  const loadProgress = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Buscar dados do profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('primeiro_acesso, onboarding_completo, onboarding_etapa_atual, escritorio_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProgress({
        primeiro_acesso: profile.primeiro_acesso ?? true,
        onboarding_completo: profile.onboarding_completo ?? false,
        onboarding_etapa_atual: (profile.onboarding_etapa_atual as OnboardingStep) || 'escritorio',
        escritorio_id: profile.escritorio_id,
        has_escritorio: !!profile.escritorio_id,
      })
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar progresso do onboarding:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Criar escritório (Step 1)
  const createEscritorio = async (data: CreateEscritorioData): Promise<{ success: boolean; escritorio_id?: string; error?: string }> => {
    try {
      setError(null)

      const { data: result, error: rpcError } = await supabase.rpc('create_escritorio_onboarding', {
        p_nome: data.nome,
        p_cnpj: data.cnpj || null,
        p_telefone: data.telefone || null,
        p_email: data.email || null,
        p_endereco: data.endereco ? JSON.stringify(data.endereco) : null,
      })

      if (rpcError) throw rpcError

      if (result && result.success) {
        // Recarregar progresso
        await loadProgress()
        return { success: true, escritorio_id: result.escritorio_id }
      } else {
        throw new Error(result?.error || 'Erro ao criar escritório')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao criar escritório:', err)
      return { success: false, error: err.message }
    }
  }

  // Completar perfil (Step 2)
  const completeProfile = async (data: UpdateProfileData): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)

      const { data: result, error: rpcError } = await supabase.rpc('complete_profile_onboarding', {
        p_telefone: data.telefone || null,
        p_oab_numero: data.oab_numero || null,
        p_oab_uf: data.oab_uf || null,
        p_avatar_url: data.avatar_url || null,
      })

      if (rpcError) throw rpcError

      if (result && result.success) {
        await loadProgress()
        return { success: true }
      } else {
        throw new Error(result?.error || 'Erro ao atualizar perfil')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao completar perfil:', err)
      return { success: false, error: err.message }
    }
  }

  // Finalizar onboarding
  const finishOnboarding = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)

      const { data: result, error: rpcError } = await supabase.rpc('finish_onboarding')

      if (rpcError) throw rpcError

      if (result && result.success) {
        await loadProgress()
        return { success: true }
      } else {
        throw new Error(result?.error || 'Erro ao finalizar onboarding')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao finalizar onboarding:', err)
      return { success: false, error: err.message }
    }
  }

  // Pular etapa de perfil e finalizar
  const skipProfileAndFinish = async (): Promise<{ success: boolean; error?: string }> => {
    return finishOnboarding()
  }

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // Determinar step atual baseado no progresso
  const getCurrentStep = (): OnboardingStep => {
    if (!progress) return 'escritorio'
    if (progress.onboarding_completo) return 'concluido'
    if (!progress.has_escritorio) return 'escritorio'
    return 'perfil'
  }

  return {
    progress,
    loading,
    error,
    loadProgress,
    createEscritorio,
    completeProfile,
    finishOnboarding,
    skipProfileAndFinish,
    isComplete: progress?.onboarding_completo || false,
    currentStep: getCurrentStep(),
    hasEscritorio: progress?.has_escritorio || false,
  }
}
