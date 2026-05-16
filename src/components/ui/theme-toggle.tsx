'use client'

import { Moon, Sun, Clock } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  size?: 'default' | 'sm'
}

type ThemePreference = 'light' | 'dark' | 'auto'

const PREFERENCE_KEY = 'theme-preference'
const ORDER: ThemePreference[] = ['light', 'dark', 'auto']

// 'auto' resolve: claro entre 06h e 18h (horário local), escuro fora dessa janela.
function resolveAutoTheme(): 'light' | 'dark' {
  const hora = new Date().getHours()
  return hora >= 6 && hora < 18 ? 'light' : 'dark'
}

function loadLocalPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(PREFERENCE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved
  return 'light'
}

const LABEL_BY_PREF: Record<ThemePreference, string> = {
  light: 'Modo claro · clique para escuro',
  dark: 'Modo escuro · clique para automático',
  auto: 'Modo automático (claro de dia, escuro à noite) · clique para claro',
}

/**
 * Toggle de tema com 3 estados: Claro → Escuro → Automático → Claro.
 *
 * IMPORTANTE: `setTheme` do next-themes v0.4 NÃO é estável (sua referência
 * muda a cada troca de tema). Por isso usamos `useRef` pra acessar a versão
 * atual sem incluir nas deps de useEffect/useCallback. Se deixássemos como
 * dep, o efeito de hidratação re-rodaria a cada troca de tema, fazendo
 * fetch do DB com valor antigo e causando flashes.
 *
 * Persiste em `profiles.preferencias.tema` (per-usuário, cross-device) e
 * em `localStorage` (cache pra hidratação rápida e fallback offline).
 */
export function ThemeToggle({ className, size = 'default' }: ThemeToggleProps) {
  const { setTheme } = useTheme()
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme

  const [mounted, setMounted] = useState(false)
  const [preference, setPreferenceState] = useState<ThemePreference>('light')
  const supabaseRef = useRef(createClient())

  const applyPreference = useCallback((pref: ThemePreference) => {
    if (pref === 'auto') setThemeRef.current(resolveAutoTheme())
    else setThemeRef.current(pref)
  }, [])

  // Hidratação: roda UMA vez no mount. Aplica cache local imediato e depois
  // sincroniza com o canônico no banco se divergir.
  useEffect(() => {
    setMounted(true)
    const cached = loadLocalPreference()
    setPreferenceState(cached)
    applyPreference(cached)

    let cancelled = false
    ;(async () => {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await supabase
        .from('profiles')
        .select('preferencias')
        .eq('id', user.id)
        .single()

      const remoto = (data?.preferencias as { tema?: ThemePreference } | null)?.tema
      if (cancelled) return
      if ((remoto === 'light' || remoto === 'dark' || remoto === 'auto') && remoto !== cached) {
        setPreferenceState(remoto)
        applyPreference(remoto)
        window.localStorage.setItem(PREFERENCE_KEY, remoto)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // No modo automático, revalida a cada 1min pra capturar a virada de 06h/18h.
  useEffect(() => {
    if (!mounted || preference !== 'auto') return
    const id = window.setInterval(() => {
      setThemeRef.current(resolveAutoTheme())
    }, 60_000)
    return () => window.clearInterval(id)
  }, [mounted, preference])

  const handleClick = useCallback(async () => {
    const idx = ORDER.indexOf(preference)
    const next = ORDER[(idx + 1) % ORDER.length]

    setPreferenceState(next)
    applyPreference(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREFERENCE_KEY, next)
    }

    try {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferencias')
        .eq('id', user.id)
        .single()

      const novasPrefs = {
        ...(profile?.preferencias as Record<string, unknown> | null ?? {}),
        tema: next,
      }

      await supabase
        .from('profiles')
        .update({ preferencias: novasPrefs, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    } catch (err) {
      console.error('Erro ao salvar preferência de tema:', err)
    }
  }, [preference, applyPreference])

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const buttonClass = cn(
    size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
    'rounded-lg relative',
    className,
  )

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={buttonClass}
        aria-label="Alternar tema"
        disabled
      >
        <Sun className={iconSize} />
      </Button>
    )
  }

  // 3 ícones sobrepostos, sem CSS transition — snapam instantaneamente
  // (igual ao comportamento efetivo do padrão binário antigo, cujas
  // transições eram canceladas pelo `disableTransitionOnChange`).
  const baseIcon = cn(iconSize, 'absolute')

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={buttonClass}
      aria-label={LABEL_BY_PREF[preference]}
      title={LABEL_BY_PREF[preference]}
    >
      <Sun className={cn(baseIcon, preference === 'light' ? 'opacity-100' : 'opacity-0')} />
      <Moon className={cn(baseIcon, preference === 'dark' ? 'opacity-100' : 'opacity-0')} />
      <Clock className={cn(baseIcon, preference === 'auto' ? 'opacity-100' : 'opacity-0')} />
    </Button>
  )
}
