'use client'

// Coluna lateral "Hoje" do novo dashboard.
// IMPORTANTE: este é um container "warm" — NÃO usar <Card> shadcn aqui dentro.
// A paleta warm coexiste com slate via tokens novos (bg-rail, border-warm, etc).

import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNowInBrazil } from '@/lib/timezone'
import { useDashboardAgenda, type AgendaItemDashboard } from '@/hooks/useDashboardAgenda'

interface PainelHojeProps {
  className?: string
  onItemClick?: (item: AgendaItemDashboard) => void
}

const DIAS_LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] // Domingo a sábado (getDay() = 0..6)
// Mapeia para a ordem S-T-Q-Q-S-S-D (segunda → domingo) usada no design.
const ORDEM_DESIGN = [1, 2, 3, 4, 5, 6, 0]

function corBarraPorTipo(tipo: AgendaItemDashboard['tipo']): string {
  switch (tipo) {
    case 'audiencia':
    case 'prazo':
      return 'bg-state-danger'
    case 'tarefa':
      return 'bg-teal-300'
    case 'evento':
    default:
      return 'bg-state-info'
  }
}

export default function PainelHoje({ className, onItemClick }: PainelHojeProps) {
  const now = getNowInBrazil()
  const diaHojeNum = now.getDay() // 0..6 (dom..sab)
  const diaMes = now.getDate()
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long' })
  const diaSemanaNome = now.toLocaleDateString('pt-BR', { weekday: 'long' })
  const ano = now.getFullYear()

  const { items: agendaItems, loading: loadingAgenda } = useDashboardAgenda()

  return (
    <aside
      className={cn(
        'w-[200px] flex-shrink-0 bg-rail border-r border-warm flex flex-col gap-[22px] overflow-y-auto',
        'px-[18px] py-[28px]',
        className,
      )}
    >
      {/* Data */}
      <div>
        <div className="text-[9.5px] font-bold text-warm-muted tracking-[0.18em] uppercase mb-1.5">
          Hoje
        </div>
        <div
          className="font-serif text-warm-primary leading-[0.88]"
          style={{ fontSize: 64, fontWeight: 500, letterSpacing: '-0.055em' }}
        >
          {diaMes}
        </div>
        <div
          className="font-serif text-warm-primary mt-1"
          style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}
        >
          {mesNome}
        </div>
        <div className="text-[11px] text-warm-secondary mt-0.5">
          {diaSemanaNome} · {ano}
        </div>
      </div>

      {/* Mini-progresso semanal — sem horas, só destacando o dia atual.
          Todas as barras com altura cheia; o dia atual usa o gradiente slate
          do sistema (cor de destaque) e os demais ficam em um cinza visível. */}
      <div>
        <div className="text-[9.5px] font-bold text-warm-muted tracking-[0.16em] uppercase mb-3">
          Esta semana
        </div>
        <div className="flex gap-1.5 items-end h-[48px]">
          {ORDEM_DESIGN.map((idxDia) => {
            const isHoje = idxDia === diaHojeNum
            return (
              <div key={idxDia} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-full flex-1 rounded-[3px] transition-colors',
                    isHoje
                      ? 'bg-gradient-to-b from-[#34495e] to-[#46627f] shadow-[0_2px_4px_-1px_rgba(52,73,94,0.25)]'
                      : 'bg-slate-300/70 dark:bg-slate-600/50',
                  )}
                />
                <div
                  className={cn(
                    'text-[9px] font-bold tracking-[0.08em]',
                    isHoje ? 'text-[#34495e] dark:text-[#89bcbe]' : 'text-warm-muted',
                  )}
                >
                  {DIAS_LETRAS[idxDia]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Agenda do dia */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-baseline mb-2.5">
          <div className="text-[9.5px] font-bold text-warm-muted tracking-[0.16em] uppercase">
            Agenda
          </div>
          <span className="text-[10px] font-bold text-teal-300">
            {loadingAgenda ? '…' : agendaItems.length}
          </span>
        </div>

        {loadingAgenda ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-warm-muted" />
          </div>
        ) : agendaItems.length === 0 ? (
          <p className="text-[11px] text-warm-secondary leading-snug">Dia livre.</p>
        ) : (
          <ul className="flex flex-col gap-0">
            {agendaItems.slice(0, 6).map((item, idx, arr) => {
              // Tarefas e prazos não têm horário no design — só audiência/evento.
              const mostraHorario =
                (item.tipo === 'audiencia' || item.tipo === 'evento') &&
                !!item.time &&
                item.time !== 'Dia todo'
              return (
                <li
                  key={`${item.id}-${idx}`}
                  className={cn(
                    'flex gap-[9px] py-2',
                    idx < arr.length - 1 && 'border-b border-rail-divider',
                  )}
                >
                  <div
                    className={cn(
                      'w-[3px] rounded-[2px] flex-shrink-0',
                      corBarraPorTipo(item.tipo),
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => onItemClick?.(item)}
                    className="flex-1 min-w-0 text-left group"
                  >
                    {mostraHorario && (
                      <div className="font-mono text-[11px] font-semibold text-warm-primary tracking-[0.02em]">
                        {item.time}
                      </div>
                    )}
                    <div
                      className={cn(
                        'text-[11.5px] text-warm-secondary leading-[1.3] truncate group-hover:text-warm-primary transition-colors',
                        mostraHorario && 'mt-0.5',
                      )}
                    >
                      {item.title}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Link
        href="/dashboard/agenda"
        className="h-8 rounded-lg bg-transparent border border-warm text-warm-primary text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-card-warm transition-colors"
      >
        Ver agenda completa
        <ChevronRight className="w-[11px] h-[11px]" />
      </Link>
    </aside>
  )
}
