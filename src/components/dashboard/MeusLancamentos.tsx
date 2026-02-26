'use client'

import Link from 'next/link'
import { Clock, Loader2 } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import { formatBrazilDate, parseDBDate } from '@/lib/timezone'
import { useTimesheetRecentes, type TimesheetEntryRecente } from '@/hooks/useTimesheetRecentes'
import EmptyState from '@/components/dashboard/EmptyState'
import { format } from 'date-fns'

interface MeusLancamentosProps {
  className?: string
  onEditEntry: (entry: TimesheetEntryRecente) => void
}

export default function MeusLancamentos({ className, onEditEntry }: MeusLancamentosProps) {
  const { data: entries, loading } = useTimesheetRecentes(5)

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(52,73,94,0.18)] hover:shadow-[0_10px_35px_-6px_rgba(52,73,94,0.25)] transition-all duration-300 p-5",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#34495e]">Meus Lançamentos</h2>
        <Link
          href="/dashboard/financeiro/timesheet"
          className="text-[10px] font-medium text-[#89bcbe] hover:text-[#6ba9ab] transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nenhum lançamento recente"
          description="Registre suas horas de trabalho"
          actionLabel="Lançar Horas"
          actionHref="/dashboard/financeiro/timesheet"
          variant="compact"
        />
      ) : (
        <div className="space-y-0.5">
          {entries.map((entry) => {
            const casoTitulo = entry.processo_titulo || entry.consulta_titulo || ''
            const dataFormatada = format(parseDBDate(entry.data_trabalho), 'dd/MM')

            return (
              <button
                key={entry.id}
                onClick={() => onEditEntry(entry)}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
              >
                {/* Data */}
                <span className="text-[10px] font-medium text-slate-400 w-10 flex-shrink-0 pt-0.5">
                  {dataFormatada}
                </span>

                {/* Atividade + caso */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate group-hover:text-[#34495e]">
                    {entry.atividade}
                  </p>
                  {casoTitulo && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {casoTitulo}
                    </p>
                  )}
                </div>

                {/* Horas */}
                <span className="text-xs font-semibold text-[#34495e] flex-shrink-0 pt-0.5">
                  {formatHoras(Number(entry.horas), 'curto')}
                </span>

                {/* Dot cobrável */}
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5",
                  entry.faturavel ? "bg-emerald-500" : "bg-slate-300"
                )} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
