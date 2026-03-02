'use client'

import Link from 'next/link'
import { Clock, DollarSign, ExternalLink, FolderOpen, CalendarDays, User } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
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
  const isHonorario = lancamento.tipo_lancamento === 'honorario'
  const isTimesheet = lancamento.tipo_lancamento === 'timesheet'

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getValorCalculado = () => {
    // A view já calcula o valor correto baseado no contrato
    return lancamento.valor || 0
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-md border transition-all cursor-pointer hover:bg-slate-50',
        selected ? 'border-[#1E3A8A] bg-blue-50' : 'border-slate-200'
      )}
      onClick={() => onToggle(lancamento.lancamento_id)}
    >
      {/* Checkbox — stopPropagation evita duplo-toggle com o onClick do pai */}
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(lancamento.lancamento_id)}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 h-3.5 w-3.5"
      />

      {/* Ícone */}
      <div
        className={cn(
          'w-6 h-6 rounded flex items-center justify-center shrink-0',
          isHonorario ? 'bg-[#aacfd0]/30' : 'bg-[#89bcbe]/20'
        )}
      >
        {isHonorario ? (
          <DollarSign className="h-3 w-3 text-[#34495e]" />
        ) : (
          <Clock className="h-3 w-3 text-[#34495e]" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex-1">
            <p className="text-xs font-medium text-[#34495e] line-clamp-2 leading-tight">
              {formatDescricaoFatura(lancamento.descricao)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-500">{lancamento.categoria}</span>
            </div>

            {/* Detalhes do Caso (Processo ou Consultivo) */}
            {(lancamento.processo_id || lancamento.consulta_id) && (
              <div className="mt-1">
                <Link
                  href={lancamento.processo_id
                    ? `/dashboard/processos/${lancamento.processo_id}`
                    : `/dashboard/consultivo/${lancamento.consulta_id}`
                  }
                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                >
                  <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">
                    {lancamento.partes_resumo || lancamento.processo_pasta || 'Ver caso'}
                  </span>
                  <ExternalLink className="h-2 w-2 text-slate-400 shrink-0" />
                </Link>
              </div>
            )}

            {/* Data e Profissional — apenas para timesheet */}
            {isTimesheet && lancamento.data_trabalho && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                  {formatBrazilDate(lancamento.data_trabalho)}
                </span>
                {lancamento.profissional_nome && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <User className="h-2.5 w-2.5 shrink-0" />
                    {lancamento.profissional_nome}
                    {lancamento.cargo_nome && (
                      <span className="text-slate-300 ml-0.5">· {lancamento.cargo_nome}</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            {isTimesheet && (
              <p className="text-[10px] font-medium text-slate-600">
                {formatHoras(lancamento.horas || 0, 'curto')}
              </p>
            )}
            <p className="text-xs font-semibold text-emerald-600">
              {formatCurrency(getValorCalculado())}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
