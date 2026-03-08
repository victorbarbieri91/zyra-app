'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  size?: 'default' | 'sm'
}

export function ThemeToggle({ className, size = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
          'rounded-lg',
          className
        )}
        aria-label="Alternar tema"
        disabled
      >
        <Sun className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        'rounded-lg relative',
        className
      )}
      aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      <Sun className={cn(
        size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
        'rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0'
      )} />
      <Moon className={cn(
        size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
        'absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100'
      )} />
    </Button>
  )
}
