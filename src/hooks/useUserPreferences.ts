'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserPreferences {
  sidebar_aberta: boolean
  agenda_view_padrao: 'month' | 'week' | 'day' | 'list'
}

const defaultPreferences: UserPreferences = {
  sidebar_aberta: false,
  agenda_view_padrao: 'month'
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('preferencias')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erro ao carregar preferências:', error)
        setLoading(false)
        return
      }

      if (data?.preferencias) {
        setPreferences({
          ...defaultPreferences,
          ...data.preferencias
        })
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const updatedPreferences = {
        ...preferences,
        ...newPreferences
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          preferencias: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Erro ao atualizar preferências:', error)
        return false
      }

      setPreferences(updatedPreferences)
      return true
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error)
      return false
    }
  }, [supabase, preferences])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    preferences,
    loading,
    updatePreferences,
    reloadPreferences: loadPreferences
  }
}
