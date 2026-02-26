'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Clock, ChevronRight } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TimesheetEntryRecente } from '@/hooks/useTimesheetRecentes'

interface TimesheetListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: TimesheetEntryRecente[]
  onEditEntry: (entry: TimesheetEntryRecente) => void
}

export default function TimesheetListModal({
  open,
  onOpenChange,
  entries,
  onEditEntry,
}: TimesheetListModalProps) {
  const totalHoras = entries.reduce((sum, e) => sum + (Number(e.horas) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-[#34495e]">
            <Clock className="w-4 h-4 text-[#89bcbe]" />
            Horas Lançadas
          </DialogTitle>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-400">
              {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
            </span>
            <span className="text-xs font-semibold text-[#34495e]">
              Total: {formatHoras(totalHoras, 'curto')}
            </span>
          </div>
        </div>

        {/* Lista */}
        <div className="px-4 py-3 max-h-[360px] overflow-y-auto">
          <div className="space-y-1.5">
            {entries.map((entry) => {
              const dataDate = parseDBDate(entry.data_trabalho)
              const dataFormatted = format(dataDate, "dd 'de' MMM", { locale: ptBR })

              return (
                <button
                  key={entry.id}
                  onClick={() => onEditEntry(entry)}
                  className="w-full rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all text-left group px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Data */}
                    <div className="flex-shrink-0 w-[72px]">
                      <span className="text-[11px] font-medium text-slate-500">
                        {dataFormatted}
                      </span>
                    </div>

                    {/* Atividade */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 truncate group-hover:text-[#34495e]">
                        {entry.atividade || 'Sem descrição'}
                      </p>
                    </div>

                    {/* Horas + Dot */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-[#34495e]">
                        {formatHoras(Number(entry.horas), 'curto')}
                      </span>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        entry.faturavel ? "bg-emerald-500" : "bg-slate-300"
                      )} />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer legenda */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-400">Cobrável</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-[10px] text-slate-400">Não cobrável</span>
            </div>
            <span className="text-[10px] text-slate-400 ml-auto">Clique para editar</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
