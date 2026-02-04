'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, DollarSign, FileCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatHoras } from '@/lib/utils'
import { useDashboardAlertas, DashboardAlertas } from '@/hooks/useDashboardAlertas'

interface AlertaItemProps {
  icon: React.ElementType
  label: string
  value: number | string
  sublabel?: string
  color: 'red' | 'amber' | 'yellow' | 'emerald'
  href?: string
}

function AlertaItem({ icon: Icon, label, value, sublabel, color, href }: AlertaItemProps) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  }

  const iconColorClasses = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    yellow: 'text-yellow-500',
    emerald: 'text-emerald-500',
  }

  const content = (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${colorClasses[color]} transition-all hover:opacity-80 ${href ? 'cursor-pointer' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${color === 'red' ? 'bg-red-100' : color === 'amber' ? 'bg-amber-100' : color === 'yellow' ? 'bg-yellow-100' : 'bg-emerald-100'}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColorClasses[color]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-slate-500 truncate">{sublabel}</p>
        )}
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${iconColorClasses[color]}`}>{value}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

interface AlertasCardProps {
  className?: string
}

export default function AlertasCard({ className }: AlertasCardProps) {
  const { alertas, loading, temAlertasCriticos, totalAlertas } = useDashboardAlertas()

  return (
    <Card className={`border-slate-200 shadow-sm ${className || ''}`}>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-[#34495e]">
            <AlertTriangle className={`w-4 h-4 ${temAlertasCriticos ? 'text-red-500' : 'text-amber-500'}`} />
            Atenção Imediata
            {totalAlertas > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${temAlertasCriticos ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {totalAlertas}
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-1 pb-5 px-5 space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
          </div>
        ) : (
          <>
            {/* Prazos Vencidos - Vermelho */}
            {alertas.prazosVencidos > 0 && (
              <AlertaItem
                icon={AlertTriangle}
                label="Prazos vencidos"
                value={alertas.prazosVencidos}
                color="red"
                href="/dashboard/agenda?filtro=vencidos"
              />
            )}

            {/* Prazos Hoje - Amber */}
            {alertas.prazosHoje > 0 && (
              <AlertaItem
                icon={Clock}
                label="Prazos vencendo HOJE"
                value={alertas.prazosHoje}
                color="amber"
                href="/dashboard/agenda?filtro=hoje"
              />
            )}

            {/* Atos Cobráveis - Yellow */}
            {alertas.atosCobraveisCount > 0 && (
              <AlertaItem
                icon={DollarSign}
                label="Atos cobráveis pendentes"
                value={alertas.atosCobraveisCount}
                sublabel={formatCurrency(alertas.atosCobraveisValor)}
                color="yellow"
                href="/dashboard/financeiro/cobrancas"
              />
            )}

            {/* Horas Pendentes Aprovação - Yellow */}
            {alertas.horasPendentesAprovacao > 0 && (
              <AlertaItem
                icon={FileCheck}
                label="Horas pendentes aprovação"
                value={formatHoras(alertas.horasPendentesAprovacao, 'curto')}
                color="yellow"
                href="/dashboard/financeiro/timesheet?status=pendente"
              />
            )}

            {/* Horas Prontas para Faturar - Emerald (oportunidade) */}
            {alertas.horasProntasFaturar > 0 && (
              <AlertaItem
                icon={DollarSign}
                label="Horas prontas para faturar"
                value={formatHoras(alertas.horasProntasFaturar, 'curto')}
                sublabel={formatCurrency(alertas.valorHorasProntasFaturar)}
                color="emerald"
                href="/dashboard/financeiro/faturamento"
              />
            )}

            {/* Estado vazio */}
            {alertas.prazosVencidos === 0 &&
             alertas.prazosHoje === 0 &&
             alertas.atosCobraveisCount === 0 &&
             alertas.horasPendentesAprovacao === 0 &&
             alertas.horasProntasFaturar === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500">Nenhum alerta pendente</p>
                <p className="text-[10px] text-slate-400 mt-1">Tudo em dia!</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
