'use client'

import { Clock, DollarSign, FileText } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
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
    if (isHonorario) {
      return lancamento.valor || 0
    }
    if (isTimesheet) {
      const valorHora = 400 // TODO: buscar do contrato
      return (lancamento.horas || 0) * valorHora
    }
    return 0
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-slate-50',
        selected ? 'border-[#1E3A8A] bg-blue-50' : 'border-slate-200'
      )}
      onClick={() => onToggle(lancamento.lancamento_id)}
    >
      {/* Checkbox */}
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(lancamento.lancamento_id)}
        className="mt-0.5"
      />

      {/* Ícone */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isHonorario ? 'bg-[#aacfd0]/30' : 'bg-[#89bcbe]/20'
        )}
      >
        {isHonorario ? (
          <DollarSign className="h-4 w-4 text-[#34495e]" />
        ) : (
          <Clock className="h-4 w-4 text-[#34495e]" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-[#34495e] line-clamp-2">
              {lancamento.descricao}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-600">{lancamento.categoria}</span>
              {(lancamento.processo_id || lancamento.consulta_id) && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">
                    {lancamento.processo_id ? 'Processo' : 'Consulta'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {isTimesheet && (
              <p className="text-xs font-semibold text-slate-700">
                {lancamento.horas?.toFixed(1)}h
              </p>
            )}
            <p className="text-sm font-bold text-emerald-600">
              {formatCurrency(getValorCalculado())}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
