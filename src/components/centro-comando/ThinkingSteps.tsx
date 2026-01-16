'use client'

import { cn } from '@/lib/utils'
import { PassoThinking } from '@/types/centro-comando'

interface ThinkingStepsProps {
  passos: PassoThinking[]
  className?: string
}

export function ThinkingSteps({ passos, className }: ThinkingStepsProps) {
  if (passos.length === 0) return null

  // Pegar o último passo para mostrar
  const ultimoPasso = passos[passos.length - 1]

  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      {/* Dots animados */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] animate-pulse" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] animate-pulse [animation-delay:0.2s]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] animate-pulse [animation-delay:0.4s]" />
      </div>

      {/* Mensagem do último passo */}
      <span className="text-xs text-slate-500">
        {ultimoPasso?.message || 'Processando...'}
      </span>
    </div>
  )
}
