'use client'

/**
 * Componente que renderiza o número CNJ como link clicável para o tribunal.
 *
 * Integra:
 * - `useCnjLink` para resolver a URL correta (parser + cache + DataJud background)
 * - Tooltip explicando o destino
 * - `onClick` que abre nova aba e, para tipo 'landing', copia o CNJ no clipboard + toast
 * - Fallback silencioso: se nenhum link pode ser resolvido, renderiza só o texto
 */

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCnjLink } from '@/hooks/useCnjLink'
import type { SistemaTribunal } from '@/lib/tribunais'

interface CnjLinkProps {
  /** CNJ do processo (com ou sem máscara) */
  numeroCnj: string | null | undefined
  /** ID do processo (para cache) */
  processoId: string | null | undefined
  /** ID do escritório ativo (para multitenancy) */
  escritorioId: string | null | undefined
  /** Sistema em cache já carregado do banco (opcional) */
  sistemaCache?: SistemaTribunal | null
  /** Link manual cadastrado no banco (override total) */
  linkManual?: string | null
  /** Classe extra para o container */
  className?: string
}

const SISTEMA_LABEL: Record<SistemaTribunal, string> = {
  saj: 'e-SAJ',
  pje: 'PJe',
  eproc: 'eproc',
  projudi: 'Projudi',
  proprio: 'consulta pública',
  outro: 'consulta pública',
}

export function CnjLink({
  numeroCnj,
  processoId,
  escritorioId,
  sistemaCache,
  linkManual,
  className,
}: CnjLinkProps) {
  const [copiedInline, setCopiedInline] = useState(false)

  const { link } = useCnjLink({
    numeroCnj,
    processoId,
    escritorioId,
    sistemaCache,
    linkManual,
  })

  // Sem CNJ → não renderiza nada
  if (!numeroCnj) {
    return null
  }

  // Helper para copiar o CNJ isoladamente (botão de copiar dedicado)
  const handleCopyCnj = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(numeroCnj)
      setCopiedInline(true)
      setTimeout(() => setCopiedInline(false), 2000)
      toast.success('CNJ copiado')
    } catch {
      toast.error('Erro ao copiar CNJ')
    }
  }

  // Sem link resolvido → renderiza texto simples + botão de copiar
  if (!link) {
    return (
      <div className={cn('flex items-center gap-2 min-w-0', className)}>
        <span className="text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {numeroCnj}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyCnj}
          className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-surface-2 flex-shrink-0"
          title="Copiar CNJ"
        >
          {copiedInline ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
        </Button>
      </div>
    )
  }

  // onClick do link principal: abre nova aba e (se landing) copia o CNJ
  const handleLinkClick = async (e: React.MouseEvent) => {
    if (link.tipo === 'landing') {
      try {
        await navigator.clipboard.writeText(numeroCnj)
        toast.success(
          `CNJ copiado — cole na ${SISTEMA_LABEL[link.sistema]} do ${link.tribunalSigla}`,
          { duration: 4500 }
        )
      } catch {
        // Se falhar o clipboard, pelo menos abre a landing
        console.warn('[CnjLink] clipboard.writeText falhou')
      }
    }
    // Deixa o comportamento padrão do <a target="_blank"> abrir a nova aba
    void e
  }

  const tooltipText =
    link.tipo === 'direct'
      ? `Abrir processo no ${link.tribunalNome} (${SISTEMA_LABEL[link.sistema]})`
      : `Abrir consulta pública do ${link.tribunalNome} (${SISTEMA_LABEL[link.sistema]}) — CNJ será copiado`

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="text-sm font-mono text-[#34495e] dark:text-slate-300 hover:text-[#89bcbe] hover:underline whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {numeroCnj}
              <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopyCnj}
        className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-surface-2 flex-shrink-0"
        title="Copiar CNJ"
      >
        {copiedInline ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-400" />
        )}
      </Button>
    </div>
  )
}
