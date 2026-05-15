'use client'

// KPI strip horizontal — 4 colunas dentro de um único card.
// Substitui os 4 cards gradient anteriores.
// Cada coluna é clicável e abre o KpiDetailModal.

import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import type { KpiType } from '@/hooks/useKpiDetails'
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics'

interface KpiStripProps {
  className?: string
  metrics: DashboardMetrics | null
  onKpiClick: (kpi: KpiType) => void
}

interface KpiItem {
  type: KpiType
  label: string
  value: string | number
  trend: number | null
  trendLabel: string
  trendSuffix?: string
}

export default function KpiStrip({ className, metrics, onKpiClick }: KpiStripProps) {
  const itens: KpiItem[] = [
    {
      type: 'processos',
      label: 'Processos ativos',
      value: metrics?.processos_ativos ?? 0,
      trend: metrics?.processos_trend_qtd ?? 0,
      trendLabel: 'este mês',
    },
    {
      type: 'clientes',
      label: 'Clientes ativos',
      value: metrics?.clientes_ativos ?? 0,
      trend: metrics?.clientes_trend_qtd ?? 0,
      trendLabel: 'este mês',
    },
    {
      type: 'consultivo',
      label: 'Casos consultivos',
      value: metrics?.consultas_abertas ?? 0,
      trend: metrics?.consultas_trend_qtd ?? 0,
      trendLabel: 'este mês',
    },
    {
      type: 'horas',
      label: 'Horas cobráveis',
      value: formatHoras(metrics?.horas_cobraveis ?? 0, 'curto'),
      trend: metrics?.horas_cobraveis_trend_percent ?? 0,
      trendLabel: 'vs mês',
      trendSuffix: '%',
    },
  ]

  return (
    <div
      className={cn(
        'bg-card-warm border border-warm rounded-[14px] p-1',
        'grid grid-cols-4',
        className,
      )}
    >
      {itens.map((kpi, idx) => {
        const trendUp = (kpi.trend ?? 0) > 0
        const showTrend = (kpi.trend ?? 0) !== 0

        return (
          <button
            key={kpi.type}
            type="button"
            onClick={() => onKpiClick(kpi.type)}
            className={cn(
              'text-left px-4 py-3 hover:bg-rail/50 transition-colors rounded-[10px]',
              idx < itens.length - 1 && 'border-r border-warm-subtle',
            )}
          >
            <div
              className="text-[10px] font-semibold text-warm-muted tracking-[0.08em] uppercase mb-1.5"
            >
              {kpi.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-semibold text-warm-primary leading-none tabular-nums"
                style={{ fontSize: 22, letterSpacing: '-0.025em' }}
              >
                {kpi.value}
              </span>
              {showTrend && (
                <span
                  className={cn(
                    'text-[10px] font-semibold inline-flex items-center',
                    trendUp ? 'text-state-success-fg' : 'text-state-danger-fg',
                  )}
                >
                  {trendUp ? (
                    <ArrowUp className="w-2.5 h-2.5" />
                  ) : (
                    <ArrowDown className="w-2.5 h-2.5" />
                  )}
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-warm-secondary mt-1">
              {showTrend ? (
                <>
                  {trendUp ? '+' : ''}
                  {kpi.trend}
                  {kpi.trendSuffix ?? ''} {kpi.trendLabel}
                </>
              ) : (
                kpi.trendLabel
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
