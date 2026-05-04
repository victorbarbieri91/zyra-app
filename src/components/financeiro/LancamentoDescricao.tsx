'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Renderiza a descrição de um lançamento (despesa/receita) extraindo o sufixo
 * automático "(Parcela X/N)" ou "(Fixa <freq>)" e exibindo como BADGE colorido
 * antes do texto base — sempre visível, mesmo quando o texto principal é truncado.
 *
 * Inclui tooltip que aparece APENAS quando o texto é truncado (evita poluir a UI
 * quando a descrição cabe inteira na coluna).
 *
 * Não muda nada no banco — extração via regex no momento da renderização.
 */

interface LancamentoDescricaoProps {
  /** Descrição bruta do lançamento (vinda do banco, com sufixo automático se houver) */
  descricao: string
  /** Classe extra para a coluna inteira (controla largura/responsividade) */
  className?: string
}

const REGEX_PARCELA = /\s*\(Parcela\s+(\d+)\/(\d+)\)\s*$/i
const REGEX_FIXA = /\s*\(Fixa\s+(mensal|bimestral|trimestral|semestral|anual)\)\s*$/i

type Badge =
  | { tipo: 'parcela'; texto: string }
  | { tipo: 'fixa'; texto: string }

interface DescricaoComBadge {
  base: string
  badge: Badge | null
}

function extrairBadge(descricao: string): DescricaoComBadge {
  const matchParcela = descricao.match(REGEX_PARCELA)
  if (matchParcela) {
    return {
      base: descricao.replace(REGEX_PARCELA, '').trim(),
      badge: { tipo: 'parcela', texto: `Parcela ${matchParcela[1]}/${matchParcela[2]}` },
    }
  }
  const matchFixa = descricao.match(REGEX_FIXA)
  if (matchFixa) {
    const freq = matchFixa[1].toLowerCase()
    const freqLabel = freq.charAt(0).toUpperCase() + freq.slice(1)
    return {
      base: descricao.replace(REGEX_FIXA, '').trim(),
      badge: { tipo: 'fixa', texto: `Fixa ${freqLabel.toLowerCase()}` },
    }
  }
  return { base: descricao, badge: null }
}

export default function LancamentoDescricao({
  descricao,
  className,
}: LancamentoDescricaoProps) {
  const textoRef = useRef<HTMLSpanElement>(null)
  const [truncado, setTruncado] = useState(false)
  const { base, badge } = extrairBadge(descricao)

  // Detectar truncamento (e re-detectar em resize)
  useEffect(() => {
    const el = textoRef.current
    if (!el) return
    const verificar = () => setTruncado(el.scrollWidth > el.clientWidth)
    verificar()
    const observer = new ResizeObserver(verificar)
    observer.observe(el)
    return () => observer.disconnect()
  }, [base])

  const conteudo = (
    <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
      <span
        ref={textoRef}
        className="text-xs text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1"
      >
        {base}
      </span>
      {badge && (
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap flex-shrink-0',
            badge.tipo === 'parcela'
              ? 'bg-blue-50 dark:bg-blue-500/10 text-[#1E3A8A] dark:text-blue-300 border-blue-200 dark:border-blue-500/40'
              : 'bg-[#f0f9f9] dark:bg-teal-500/10 text-[#34495e] dark:text-teal-300 border-[#89bcbe]/40 dark:border-teal-500/30',
          )}
        >
          {badge.texto}
        </span>
      )}
    </div>
  )

  if (!truncado) {
    return conteudo
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{conteudo}</TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-md">
          {descricao}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
