'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Pencil, SendHorizontal } from 'lucide-react'
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
  onNegativoComRetry?: (correcao: string) => void
  disabled?: boolean
  feedbackEnviado?: TipoFeedback | null
  mostrarInlineCorrection?: boolean
  onToggleInlineCorrection?: () => void
}

export function FeedbackButtons({
  onFeedback,
  onCorrecao,
  onNegativoComRetry,
  disabled = false,
  feedbackEnviado = null,
  mostrarInlineCorrection = false,
  onToggleInlineCorrection,
}: FeedbackButtonsProps) {
  const [hovered, setHovered] = useState<TipoFeedback | null>(null)
  const [inlineText, setInlineText] = useState('')

  const handleFeedback = (tipo: TipoFeedback) => {
    if (disabled || feedbackEnviado) return

    if (tipo === 'correcao') {
      onCorrecao()
    } else if (tipo === 'negativo' && onToggleInlineCorrection) {
      // Toggle inline correction instead of immediate feedback
      onToggleInlineCorrection()
    } else {
      onFeedback(tipo)
    }
  }

  const handleInlineSubmit = () => {
    const text = inlineText.trim()
    if (!text) return

    if (onNegativoComRetry) {
      onNegativoComRetry(text)
    } else {
      // Fallback: just send negativo feedback
      onFeedback('negativo')
    }
    setInlineText('')
  }

  // Se feedback ja foi enviado, mostrar o que foi escolhido
  if (feedbackEnviado) {
    return (
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 mr-1">
          {feedbackEnviado === 'positivo' && 'Obrigado pelo feedback positivo!'}
          {feedbackEnviado === 'negativo' && 'Tentando novamente com sua correcao...'}
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
      <div onMouseLeave={() => setHovered(null)}>
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
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
                  hovered === 'negativo' && 'bg-red-50',
                  mostrarInlineCorrection && 'bg-red-50'
                )}
                disabled={disabled}
                onClick={() => handleFeedback('negativo')}
                onMouseEnter={() => setHovered('negativo')}
              >
                <ThumbsDown
                  className={cn(
                    'w-3 h-3 text-slate-400 transition-colors',
                    (hovered === 'negativo' || mostrarInlineCorrection) && 'text-red-400'
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

        {/* Inline correction input - appears when 👎 is clicked */}
        {mostrarInlineCorrection && (
          <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-200">
            <input
              type="text"
              placeholder="O que estava errado?"
              value={inlineText}
              onChange={(e) => setInlineText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleInlineSubmit()
                }
              }}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg
                         focus:outline-none focus:ring-1 focus:ring-[#89bcbe] focus:border-[#89bcbe]
                         placeholder:text-slate-400"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-[#89bcbe]/10 flex-shrink-0"
              onClick={handleInlineSubmit}
              disabled={!inlineText.trim()}
            >
              <SendHorizontal className={cn(
                'w-3.5 h-3.5 transition-colors',
                inlineText.trim() ? 'text-[#89bcbe]' : 'text-slate-300'
              )} />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
