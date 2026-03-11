'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  id?: string
}

/**
 * Input monetário com máscara BRL (centavos-first).
 * Usuário digita apenas números. Ex: digitar "46246" exibe "462,46".
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, disabled, placeholder = 'R$ 0,00', id }, ref) => {
    const formatValue = (cents: number): string => {
      if (cents === 0) return ''
      const reais = cents / 100
      return reais.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }

    const [displayValue, setDisplayValue] = React.useState(() => formatValue(Math.round(value * 100)))

    // Sync display when external value changes
    React.useEffect(() => {
      const cents = Math.round(value * 100)
      setDisplayValue(formatValue(cents))
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '')
      if (raw === '') {
        setDisplayValue('')
        onChange(0)
        return
      }

      const cents = parseInt(raw, 10)
      if (isNaN(cents)) return

      setDisplayValue(formatValue(cents))
      onChange(cents / 100)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy replacement
      setTimeout(() => e.target.select(), 0)
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          R$
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-right',
            className
          )}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
