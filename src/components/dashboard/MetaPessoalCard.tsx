'use client'

// Card de meta pessoal — círculo SVG de % atingido + valor + dias úteis restantes + CTAs.
// Tem toggle entre meta de horas e meta de honorários.
// Default = a meta com maior % atingido (mostra primeiro o sucesso).
// Container "warm" — NÃO usar <Card> shadcn dentro.

import { useMemo, useState } from 'react'
import { Plus, Clock, Info, DollarSign } from 'lucide-react'
import { cn, formatCurrency, formatHoras } from '@/lib/utils'
import { diasUteisRestantesNoMes } from '@/lib/timezone'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type MetaTipo = 'horas' | 'honorarios'

interface MetaPessoalCardProps {
  className?: string
  horasUsuario: number
  horasMeta: number
  honorariosAtuais: number
  receitaMeta: number
  percentualMeta: number // configuração de crescimento do escritório, para o tooltip
  onNovoProcesso?: () => void
  onRegistrarHoras?: () => void
}

function calcPct(atual: number, meta: number): number {
  return Math.min(100, Math.max(0, Math.round((atual / Math.max(1, meta)) * 100)))
}

export default function MetaPessoalCard({
  className,
  horasUsuario,
  horasMeta,
  honorariosAtuais,
  receitaMeta,
  percentualMeta,
  onNovoProcesso,
  onRegistrarHoras,
}: MetaPessoalCardProps) {
  const pctHoras = calcPct(horasUsuario, horasMeta)
  const pctHonorarios = calcPct(honorariosAtuais, receitaMeta)

  // Default fixo: horas (meta mais relevante para a rotina do advogado).
  const [metaAtiva, setMetaAtiva] = useState<MetaTipo>('horas')

  const view = useMemo(() => {
    if (metaAtiva === 'horas') {
      return {
        label: 'Sua meta de horas',
        valorFormatado: formatHoras(horasUsuario, 'curto'),
        metaFormatada: formatHoras(horasMeta, 'curto'),
        pct: pctHoras,
      }
    }
    return {
      label: 'Sua meta pessoal',
      valorFormatado: formatCurrency(honorariosAtuais),
      metaFormatada: formatCurrency(receitaMeta),
      pct: pctHonorarios,
    }
  }, [metaAtiva, horasUsuario, horasMeta, honorariosAtuais, receitaMeta, pctHoras, pctHonorarios])

  const ringCirc = 2 * Math.PI * 38
  const ringOffset = ringCirc * (1 - view.pct / 100)
  const diasUteis = diasUteisRestantesNoMes()

  return (
    <div
      className={cn(
        'bg-card-warm border border-warm rounded-[18px] px-[22px] py-5',
        'flex flex-col justify-between gap-3',
        className,
      )}
    >
      {/* Header com toggle alinhado à direita */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10.5px] font-semibold text-warm-muted tracking-[0.08em] uppercase flex items-center gap-1.5">
          {view.label}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Como a meta é calculada"
                  className="text-warm-muted hover:text-warm-secondary transition-colors"
                >
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                Sua meta do mês é o realizado do mês passado +{percentualMeta}%, com piso mínimo
                de 15h e R$ 10.000 (caso o cálculo dê menos, vale o piso). O percentual é
                configurável na gestão do escritório.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="inline-flex bg-rail rounded-md flex-shrink-0 border border-warm-subtle">
          <button
            type="button"
            onClick={() => setMetaAtiva('horas')}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors',
              metaAtiva === 'horas'
                ? 'bg-card-warm text-warm-primary shadow-sm'
                : 'text-warm-muted hover:text-warm-secondary',
            )}
            aria-pressed={metaAtiva === 'horas'}
          >
            <Clock className="w-2.5 h-2.5" />
            Horas
          </button>
          <button
            type="button"
            onClick={() => setMetaAtiva('honorarios')}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors',
              metaAtiva === 'honorarios'
                ? 'bg-card-warm text-warm-primary shadow-sm'
                : 'text-warm-muted hover:text-warm-secondary',
            )}
            aria-pressed={metaAtiva === 'honorarios'}
          >
            <DollarSign className="w-2.5 h-2.5" />
            Honorários
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="hsl(var(--border-warm))"
            strokeWidth="9"
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#meta-grad-v4)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 50 50)"
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          <defs>
            <linearGradient id="meta-grad-v4" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#34495e" />
              <stop offset="100%" stopColor="#89bcbe" />
            </linearGradient>
          </defs>
          <text
            x="50"
            y="49"
            textAnchor="middle"
            fontSize="20"
            fontWeight="600"
            fill="hsl(var(--text-warm-primary))"
            style={{ letterSpacing: '-0.03em' }}
          >
            {view.pct}%
          </text>
          <text
            x="50"
            y="63"
            textAnchor="middle"
            fontSize="8"
            fill="hsl(var(--text-warm-muted))"
            fontWeight="600"
            letterSpacing="0.1em"
          >
            DA META
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <div
            className="text-warm-primary font-semibold"
            style={{ fontSize: 18, letterSpacing: '-0.02em' }}
          >
            {view.valorFormatado}
          </div>
          <div className="text-[11.5px] text-warm-secondary mt-0.5">
            de {view.metaFormatada}
          </div>
          <div className="text-[10.5px] text-warm-secondary mt-2 flex items-center gap-1.5">
            <Clock className="w-2.5 h-2.5 text-teal-300" />
            {diasUteis} {diasUteis === 1 ? 'dia útil restante' : 'dias úteis restantes'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onNovoProcesso}
          className={cn(
            'flex-1 h-[34px] rounded-lg text-[11.5px] font-semibold text-white',
            'inline-flex items-center justify-center gap-1.5',
            'bg-gradient-to-r from-[#34495e] to-[#46627f]',
            'shadow-[0_6px_14px_-4px_rgba(52,73,94,0.35)]',
            'hover:from-[#2c3e50] hover:to-[#3d536b] transition-colors',
          )}
        >
          <Plus className="w-3 h-3" />
          Novo processo
        </button>
        <button
          type="button"
          onClick={onRegistrarHoras}
          className={cn(
            'flex-1 h-[34px] rounded-lg text-[11.5px] font-semibold text-warm-primary',
            'inline-flex items-center justify-center gap-1.5',
            'bg-transparent border border-warm hover:bg-rail transition-colors',
          )}
        >
          <Clock className="w-3 h-3" />
          Registrar horas
        </button>
      </div>
    </div>
  )
}
