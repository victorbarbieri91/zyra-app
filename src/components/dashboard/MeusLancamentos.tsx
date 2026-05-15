'use client'

// Meus timesheets — agrupado por dia, com badges FATURADO/PENDENTE/RASCUNHO.
// Toggle Semana/Mês alterna a janela do hook (rolling 7d ou 30d).
// Container "warm" — não usar <Card> shadcn dentro.

import { useMemo, useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import {
  useTimesheetRecentes,
  type TimesheetEntryRecente,
  type TimesheetPeriodo,
} from '@/hooks/useTimesheetRecentes'
import EmptyState from '@/components/dashboard/EmptyState'

interface MeusLancamentosProps {
  className?: string
  onEditEntry: (entry: TimesheetEntryRecente) => void
}

// Indicador visual de COBRABILIDADE — mesma convenção do RankingEquipeCard:
// verde emerald = hora cobrável (faturavel=true); slate-blue = não-cobrável.
// O status FATURADO/PENDENTE/RASCUNHO continua tratado no módulo Financeiro.
function corBarraCobravel(entry: TimesheetEntryRecente): string {
  return entry.faturavel
    ? 'bg-emerald-500 dark:bg-emerald-400'
    : 'bg-[#34495e] dark:bg-[#8a97a8]'
}

function diasSemanaSigla(date: Date): string {
  const map = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
  return map[date.getDay()]
}

function formatarHoras(horas: number): string {
  return formatHoras(horas, 'curto')
}

export default function MeusLancamentos({ className, onEditEntry }: MeusLancamentosProps) {
  const [periodo, setPeriodo] = useState<TimesheetPeriodo>('semana')
  const { data: entries, loading } = useTimesheetRecentes(periodo)

  // Agrupamento por data_trabalho
  const grupos = useMemo(() => {
    const map = new Map<
      string,
      { date: Date; entries: TimesheetEntryRecente[]; total: number }
    >()
    for (const entry of entries) {
      const dataKey = entry.data_trabalho.slice(0, 10)
      if (!map.has(dataKey)) {
        map.set(dataKey, {
          date: parseDBDate(entry.data_trabalho),
          entries: [],
          total: 0,
        })
      }
      const grupo = map.get(dataKey)!
      grupo.entries.push(entry)
      grupo.total += Number(entry.horas)
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [entries])

  const totalRegistrado = entries.reduce((acc, e) => acc + Number(e.horas), 0)
  const labelPeriodo = periodo === 'semana' ? 'Esta semana' : 'Este mês'

  return (
    <div
      className={cn(
        'bg-card-warm border border-warm rounded-[14px]',
        'px-[22px] pt-[18px] pb-4 flex flex-col min-h-0',
        // Altura máxima alinhada ao card de Ranking ao lado.
        // No mobile, o card fica natural; no desktop, scrolla internamente.
        'xl:max-h-[440px] overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3.5">
        <div>
          <h3
            className="text-warm-primary m-0 font-semibold"
            style={{ fontSize: 14, letterSpacing: '-0.01em' }}
          >
            Meus timesheets
          </h3>
          <div className="text-[11px] text-warm-secondary mt-0.5">
            {labelPeriodo} ·{' '}
            <span className="text-warm-primary font-semibold">
              {formatarHoras(totalRegistrado)}
            </span>{' '}
            registradas
          </div>
        </div>
        <div className="flex gap-0.5 bg-rail p-0.5 rounded-md">
          {(['semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={cn(
                'px-2.5 py-1 rounded text-[10.5px] font-semibold transition-colors',
                periodo === p
                  ? 'bg-card-warm text-warm-primary shadow-sm'
                  : 'text-warm-muted hover:text-warm-secondary',
              )}
            >
              {p === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nenhum lançamento no período"
          description="Registre suas horas de trabalho"
          actionLabel="Lançar horas"
          actionHref="/dashboard/financeiro/timesheet"
          variant="compact"
        />
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col no-scrollbar">
          {grupos.map((grupo, gi) => {
            const dataStr =
              grupo.date.getDate().toString().padStart(2, '0') +
              '/' +
              (grupo.date.getMonth() + 1).toString().padStart(2, '0')
            return (
              <div key={dataStr} className={gi < grupos.length - 1 ? 'mb-2' : ''}>
                <div className="flex items-baseline gap-2 py-1.5 px-0">
                  <span
                    className="text-warm-primary font-mono font-bold"
                    style={{ fontSize: 11 }}
                  >
                    {dataStr}
                  </span>
                  <span className="text-[9.5px] font-bold text-warm-muted tracking-[0.1em] uppercase">
                    {diasSemanaSigla(grupo.date)}
                  </span>
                  <span className="flex-1 h-px bg-warm-subtle" />
                  <span className="text-[10.5px] text-warm-secondary font-mono w-14 text-right">
                    {formatarHoras(grupo.total)}
                  </span>
                </div>
                {grupo.entries.map((entry) => {
                  const casoTitulo = entry.processo_titulo || entry.consulta_titulo || ''
                  const cobravel = entry.faturavel
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onEditEntry(entry)}
                      className="w-full flex gap-2.5 items-start py-2 hover:bg-rail/40 transition-colors text-left rounded-md"
                    >
                      <div
                        className={cn(
                          'w-[3px] h-7 rounded-sm flex-shrink-0 mt-0.5',
                          corBarraCobravel(entry),
                        )}
                        title={cobravel ? 'Hora cobrável' : 'Hora não cobrável'}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-warm-primary truncate"
                          style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}
                          title={entry.atividade}
                        >
                          {entry.atividade}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {casoTitulo && (
                            <span
                              className="text-warm-muted truncate min-w-0"
                              style={{ fontSize: 10.5 }}
                              title={casoTitulo}
                            >
                              {casoTitulo}
                            </span>
                          )}
                          <span
                            className={cn(
                              'text-[8.5px] font-bold px-1.5 py-0.5 rounded tracking-[0.05em] flex-shrink-0 uppercase',
                              cobravel
                                ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
                                : 'bg-[#34495e]/10 text-[#46627f] dark:bg-[#8a97a8]/15 dark:text-[#cbd5e1]',
                            )}
                          >
                            {cobravel ? 'Cobrável' : 'Não cobrável'}
                          </span>
                        </div>
                      </div>
                      <div className="text-warm-primary font-semibold font-mono flex-shrink-0 w-14 text-right text-[13px] pt-0.5">
                        {formatarHoras(Number(entry.horas))}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
