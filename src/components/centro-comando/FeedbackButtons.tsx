'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type TipoFeedback = 'positivo' | 'negativo' | 'correcao'

interface FeedbackButtonsProps {
  mensagemId?: string
  onFeedback: (tipo: TipoFeedback) => void
  onCorrecao: () => void
  disabled?: boolean
  feedbackEnviado?: TipoFeedback | null
}

export function FeedbackButtons({
  onFeedback,
  onCorrecao,
  disabled = false,
  feedbackEnviado = null,
}: FeedbackButtonsProps) {
  const [hovered, setHovered] = useState<TipoFeedback | null>(null)

  const handleFeedback = (tipo: TipoFeedback) => {
    if (disabled || feedbackEnviado) return

    if (tipo === 'correcao') {
      onCorrecao()
    } else {
      onFeedback(tipo)
    }
  }

  // Se feedback ja foi enviado, mostrar o que foi escolhido
  if (feedbackEnviado) {
    return (
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 mr-1">
          {feedbackEnviado === 'positivo' && 'Obrigado pelo feedback positivo!'}
          {feedbackEnviado === 'negativo' && 'Obrigado pelo feedback!'}
          {feedbackEnviado === 'correcao' && 'Correcao enviada!'}
        </span>
        {feedbackEnviado === 'positivo' && (
          <ThumbsUp className="w-3 h-3 text-emerald-500 fill-emerald-500" />
        )}
        {feedbackEnviado === 'negativo' && (
          <ThumbsDown className="w-3 h-3 text-red-400 fill-red-400" />
        )}
        {feedbackEnviado === 'correcao' && (
          <Pencil className="w-3 h-3 text-amber-500" />
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100"
        onMouseLeave={() => setHovered(null)}
      >
        <span className="text-[10px] text-slate-400 mr-1">Esta resposta foi util?</span>

        {/* Positivo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 rounded-full hover:bg-emerald-50',
                hovered === 'positivo' && 'bg-emerald-50'
              )}
              disabled={disabled}
              onClick={() => handleFeedback('positivo')}
              onMouseEnter={() => setHovered('positivo')}
            >
              <ThumbsUp
                className={cn(
                  'w-3 h-3 text-slate-400 transition-colors',
                  hovered === 'positivo' && 'text-emerald-500'
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Util
          </TooltipContent>
        </Tooltip>

        {/* Negativo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 rounded-full hover:bg-red-50',
                hovered === 'negativo' && 'bg-red-50'
              )}
              disabled={disabled}
              onClick={() => handleFeedback('negativo')}
              onMouseEnter={() => setHovered('negativo')}
            >
              <ThumbsDown
                className={cn(
                  'w-3 h-3 text-slate-400 transition-colors',
                  hovered === 'negativo' && 'text-red-400'
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Nao ajudou
          </TooltipContent>
        </Tooltip>

        {/* Correcao */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 rounded-full hover:bg-amber-50',
                hovered === 'correcao' && 'bg-amber-50'
              )}
              disabled={disabled}
              onClick={() => handleFeedback('correcao')}
              onMouseEnter={() => setHovered('correcao')}
            >
              <Pencil
                className={cn(
                  'w-3 h-3 text-slate-400 transition-colors',
                  hovered === 'correcao' && 'text-amber-500'
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Corrigir resposta
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
