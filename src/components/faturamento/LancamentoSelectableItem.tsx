'use client'

import Link from 'next/link'
import { ExternalLink, FolderOpen, CalendarDays, User } from 'lucide-react'
import { cn, formatHoras, formatDescricaoFatura } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import type { LancamentoProntoFaturar } from '@/hooks/useFaturamento'

interface LancamentoSelectableItemProps {
  lancamento: LancamentoProntoFaturar
  selected: boolean
  onToggle: (id: string) => void
}

export function LancamentoSelectableItem({
  lancamento,
  selected,
  onToggle,
}: LancamentoSelectableItemProps) {
  const isTimesheet = lancamento.tipo_lancamento === 'timesheet'

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        selected ? 'bg-[#1E3A8A]/5 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-[hsl(var(--surface-3))]'
      )}
      onClick={() => onToggle(lancamento.lancamento_id)}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(lancamento.lancamento_id)}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-slate-300 dark:border-slate-600 text-[#1E3A8A] focus:ring-[#1E3A8A] h-4 w-4 mt-0.5 shrink-0"
      />

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
          {formatDescricaoFatura(lancamento.descricao)}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{lancamento.categoria}</p>

        {/* Caso vinculado (Processo ou Consultivo) */}
        {(lancamento.processo_id || lancamento.consulta_id) && (
          <Link
            href={lancamento.processo_id
              ? `/dashboard/processos/${lancamento.processo_id}`
              : `/dashboard/consultivo/${lancamento.consulta_id}`
            }
            className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
          >
            <FolderOpen className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate max-w-[280px]">
              {lancamento.partes_resumo || lancamento.processo_pasta || 'Ver caso'}
            </span>
            <ExternalLink className="h-2 w-2 text-slate-400 shrink-0" />
          </Link>
        )}

        {/* Data e Profissional — apenas timesheet */}
        {isTimesheet && lancamento.data_trabalho && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5 shrink-0" />
              {formatBrazilDate(lancamento.data_trabalho)}
            </span>
            {lancamento.profissional_nome && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <User className="h-2.5 w-2.5 shrink-0" />
                {lancamento.profissional_nome}
                {lancamento.cargo_nome && (
                  <span className="text-slate-300 dark:text-slate-500">· {lancamento.cargo_nome}</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Valor + Horas (direita) */}
      <div className="text-right shrink-0 mt-0.5">
        {isTimesheet && lancamento.horas != null && (
          <p className="text-[11px] text-slate-400 tabular-nums">
            {formatHoras(lancamento.horas, 'curto')}
          </p>
        )}
        <p className="text-xs font-semibold text-emerald-600 tabular-nums">
          {formatCurrency(lancamento.valor || 0)}
        </p>
      </div>
    </div>
  )
}
