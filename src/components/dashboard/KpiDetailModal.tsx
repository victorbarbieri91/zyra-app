'use client'

import React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Briefcase, Users, FileText, Activity, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatHoras } from '@/lib/utils'
import { useKpiDetails, type KpiType } from '@/hooks/useKpiDetails'
import { type DashboardMetrics } from '@/hooks/useDashboardMetrics'
import ProcessosDetail from './kpi-details/ProcessosDetail'
import ClientesDetail from './kpi-details/ClientesDetail'
import ConsultivosDetail from './kpi-details/ConsultivosDetail'
import HorasDetail from './kpi-details/HorasDetail'
import Link from 'next/link'

interface KpiDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kpiType: KpiType | null
  metrics: DashboardMetrics | null
}

const KPI_CONFIG: Record<KpiType, {
  label: string
  icon: typeof Briefcase
  gradient: string
  href: string
  hrefLabel: string
  getValue: (m: DashboardMetrics) => string | number
  getTrend: (m: DashboardMetrics) => number
  trendLabel: string
  trendSuffix?: string
}> = {
  processos: {
    label: 'Processos Ativos',
    icon: Briefcase,
    gradient: 'from-[#34495e] to-[#4a6fa5]',
    href: '/dashboard/processos',
    hrefLabel: 'Ver todos os processos',
    getValue: (m) => m.processos_ativos,
    getTrend: (m) => m.processos_trend_qtd,
    trendLabel: 'este mês',
  },
  clientes: {
    label: 'Clientes Ativos',
    icon: Users,
    gradient: 'from-[#46627f] to-[#5a8f9e]',
    href: '/dashboard/crm',
    hrefLabel: 'Ver todos os clientes',
    getValue: (m) => m.clientes_ativos,
    getTrend: (m) => m.clientes_trend_qtd,
    trendLabel: 'este mês',
  },
  consultivo: {
    label: 'Casos Consultivos',
    icon: FileText,
    gradient: 'from-[#5a8f9e] to-[#89bcbe]',
    href: '/dashboard/consultivo',
    hrefLabel: 'Ver todos os casos',
    getValue: (m) => m.consultas_abertas,
    getTrend: (m) => m.consultas_trend_qtd,
    trendLabel: 'este mês',
  },
  horas: {
    label: 'Horas Cobráveis',
    icon: Activity,
    gradient: 'from-[#89bcbe] to-[#6ba9ab]',
    href: '/dashboard/financeiro/timesheet',
    hrefLabel: 'Ver timesheet',
    getValue: (m) => formatHoras(m.horas_cobraveis, 'curto'),
    getTrend: (m) => m.horas_cobraveis_trend_percent,
    trendLabel: 'vs mês',
    trendSuffix: '%',
  },
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export default function KpiDetailModal({ open, onOpenChange, kpiType, metrics }: KpiDetailModalProps) {
  const details = useKpiDetails(open ? kpiType : null)

  if (!kpiType) return null

  const config = KPI_CONFIG[kpiType]
  const Icon = config.icon
  const hoje = new Date()
  const mesNome = MESES[hoje.getMonth()]
  const ano = hoje.getFullYear()
  const value = metrics ? config.getValue(metrics) : 0
  const trend = metrics ? config.getTrend(metrics) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 border-0 overflow-hidden gap-0">
        <VisuallyHidden>
          <DialogTitle>{config.label} - Detalhamento</DialogTitle>
        </VisuallyHidden>

        {/* ── Header Gradiente ── */}
        <div className={cn('bg-gradient-to-br p-5 pb-4', config.gradient)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{config.label}</h2>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Detalhamento · {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} {ano}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-3 mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
            {trend !== 0 && (
              <div className="flex items-center gap-1 mb-1">
                {trend > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-300" />
                )}
                <span className={cn(
                  'text-sm font-semibold',
                  trend > 0 ? 'text-emerald-300' : 'text-red-300'
                )}>
                  {trend > 0 ? '+' : ''}{Math.round(trend * 10) / 10}{config.trendSuffix || ''}
                </span>
                <span className="text-xs text-white/50 ml-0.5">{config.trendLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-h-[60vh] overflow-y-auto">
          {kpiType === 'processos' && (
            <ProcessosDetail
              data={details.processos.data || null}
              loading={details.processos.isLoading}
            />
          )}
          {kpiType === 'clientes' && (
            <ClientesDetail
              data={details.clientes.data || null}
              loading={details.clientes.isLoading}
            />
          )}
          {kpiType === 'consultivo' && (
            <ConsultivosDetail
              data={details.consultivos.data || null}
              loading={details.consultivos.isLoading}
            />
          )}
          {kpiType === 'horas' && (
            <HorasDetail
              data={details.horas.data || null}
              loading={details.horas.isLoading}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-0/50">
          <Link
            href={config.href}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#46627f] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 transition-colors"
          >
            {config.hrefLabel}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
