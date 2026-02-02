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

export interface EscritorioData {
  id?: string
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
  const [escritorioData, setEscritorioData] = useState<EscritorioData | null>(null)
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

      // Se tem escritório, buscar os dados dele
      if (profile.escritorio_id) {
        const { data: escritorio, error: escritorioError } = await supabase
          .from('escritorios')
          .select('id, nome, cnpj, telefone, email')
          .eq('id', profile.escritorio_id)
          .single()

        if (!escritorioError && escritorio) {
          setEscritorioData({
            id: escritorio.id,
            nome: escritorio.nome,
            cnpj: escritorio.cnpj || undefined,
            telefone: escritorio.telefone || undefined,
            email: escritorio.email || undefined,
          })
        }
      }

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

  // Criar ou atualizar escritório (Step 1)
  const createEscritorio = async (data: CreateEscritorioData): Promise<{ success: boolean; escritorio_id?: string; error?: string }> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Se já tem escritório, faz UPDATE
      if (progress?.escritorio_id) {
        const { error: updateError } = await supabase
          .from('escritorios')
          .update({
            nome: data.nome,
            cnpj: data.cnpj || null,
            telefone: data.telefone || null,
            email: data.email || null,
          })
          .eq('id', progress.escritorio_id)

        if (updateError) throw updateError

        // Atualizar etapa do onboarding
        await supabase
          .from('profiles')
          .update({ onboarding_etapa_atual: 'perfil' })
          .eq('id', user.id)

        await loadProgress()
        return { success: true, escritorio_id: progress.escritorio_id }
      }

      // Se não tem escritório, cria novo
      const { data: escritorio, error: insertError } = await supabase
        .from('escritorios')
        .insert({
          nome: data.nome,
          cnpj: data.cnpj || null,
          telefone: data.telefone || null,
          email: data.email || null,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Vincular usuário ao escritório e atualizar etapa
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          escritorio_id: escritorio.id,
          onboarding_etapa_atual: 'perfil',
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Recarregar progresso
      await loadProgress()
      return { success: true, escritorio_id: escritorio.id }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao criar/atualizar escritório:', err)
      return { success: false, error: err.message }
    }
  }

  // Completar perfil (Step 2)
  const completeProfile = async (data: UpdateProfileData): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          telefone: data.telefone || null,
          oab_numero: data.oab_numero || null,
          oab_uf: data.oab_uf || null,
          avatar_url: data.avatar_url || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await loadProgress()
      return { success: true }
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completo: true,
          primeiro_acesso: false,
          onboarding_etapa_atual: 'concluido',
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await loadProgress()
      return { success: true }
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
    escritorioData,
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
