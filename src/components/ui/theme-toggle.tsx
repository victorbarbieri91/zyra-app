'use client'

import { Moon, Sun, Clock, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  size?: 'default' | 'sm'
}

type ThemePreference = 'light' | 'dark' | 'auto'

const PREFERENCE_KEY = 'theme-preference'

// 'auto' resolve: claro entre 06h e 18h (horário local do navegador), escuro fora dessa janela.
function resolveAutoTheme(): 'light' | 'dark' {
  const hora = new Date().getHours()
  return hora >= 6 && hora < 18 ? 'light' : 'dark'
}

function loadPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(PREFERENCE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved
  return 'light'
}

export function ThemeToggle({ className, size = 'default' }: ThemeToggleProps) {
  const { setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [preference, setPreferenceState] = useState<ThemePreference>('light')

  // Aplica o tema conforme a preferência. Quando 'auto', calcula na hora.
  const applyPreference = useCallback(
    (pref: ThemePreference) => {
      if (pref === 'auto') {
        setTheme(resolveAutoTheme())
      } else {
        setTheme(pref)
      }
    },
    [setTheme],
  )

  useEffect(() => {
    setMounted(true)
    const initial = loadPreference()
    setPreferenceState(initial)
    applyPreference(initial)
  }, [applyPreference])

  // No modo automático, revalida o tema a cada minuto pra capturar a virada de 06h e 18h.
  useEffect(() => {
    if (!mounted || preference !== 'auto') return
    const id = window.setInterval(() => {
      setTheme(resolveAutoTheme())
    }, 60_000)
    return () => window.clearInterval(id)
  }, [mounted, preference, setTheme])

  const handleSelect = (pref: ThemePreference) => {
    setPreferenceState(pref)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREFERENCE_KEY, pref)
    }
    applyPreference(pref)
  }

  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const buttonClass = cn(
    size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
    'rounded-lg',
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
        <Sun className={iconClass} />
      </Button>
    )
  }

  const TriggerIcon = preference === 'auto' ? Clock : preference === 'dark' ? Moon : Sun
  const triggerLabel =
    preference === 'auto'
      ? 'Tema automático (claro de dia, escuro à noite)'
      : preference === 'dark'
        ? 'Modo escuro'
        : 'Modo claro'

  const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', Icon: Sun },
    { value: 'dark', label: 'Escuro', Icon: Moon },
    { value: 'auto', label: 'Automático', Icon: Clock },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={buttonClass}
          aria-label={triggerLabel}
        >
          <TriggerIcon className={iconClass} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {options.map(({ value, label, Icon }) => {
          const selected = preference === value
          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => handleSelect(value)}
              className={cn('justify-between', selected && 'bg-accent/50')}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              {selected && <Check className="h-3.5 w-3.5 text-[#46627f] dark:text-slate-300" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
