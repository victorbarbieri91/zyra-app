'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useDashboardAlertas, AudienciaProxima } from '@/hooks/useDashboardAlertas'

interface AlertaItemProps {
  label: string
  value: number | string
  sublabel?: string
  color: 'red' | 'amber' | 'yellow' | 'emerald'
  href?: string
  onClick?: () => void
}

function AlertaItem({ label, value, sublabel, color, href, onClick }: AlertaItemProps) {
  const dotColors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-500',
    emerald: 'bg-emerald-500',
  }

  const valueColors = {
    red: 'text-red-600',
    amber: 'text-amber-600',
    yellow: 'text-yellow-600',
    emerald: 'text-emerald-600',
  }

  const isClickable = href || onClick

  const content = (
    <div className={`flex items-center gap-2 py-1.5 ${isClickable ? 'cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded' : ''}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[color]}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-slate-600">{label}</span>
        {sublabel && (
          <span className="text-[10px] text-slate-400 ml-1">({sublabel})</span>
        )}
      </div>
      <span className={`text-xs font-semibold ${valueColors[color]}`}>{value}</span>
    </div>
  )

  if (onClick) {
    return <button type="button" onClick={onClick} className="w-full text-left">{content}</button>
  }

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

interface AlertasCardProps {
  className?: string
  onAudienciasClick?: (audiencias: AudienciaProxima[]) => void
}

export default function AlertasCard({ className, onAudienciasClick }: AlertasCardProps) {
  const { alertas, loading, temAlertasCriticos, totalAlertas, isSocio } = useDashboardAlertas()

  return (
    <Card className={`border-slate-200 shadow-sm ${className || ''}`}>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-[#34495e]">
          <AlertTriangle className={`w-3.5 h-3.5 ${temAlertasCriticos ? 'text-red-500' : 'text-amber-500'}`} />
          Atenção Imediata
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1 pb-4 px-4">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
          </div>
        ) : (
          <>
            {/* Prazos Vencidos */}
            {alertas.prazosVencidos > 0 && (
              <AlertaItem
                label="Prazos vencidos"
                value={alertas.prazosVencidos}
                color="red"
                href="/dashboard/agenda?filtro=vencidos"
              />
            )}

            {/* Parcelas Vencidas (inadimplência) - apenas sócios */}
            {isSocio && alertas.parcelasVencidas > 0 && (
              <AlertaItem
                label="Parcelas vencidas"
                value={formatCurrency(alertas.valorParcelasVencidas)}
                color="red"
                href="/dashboard/financeiro/receitas-despesas?status=vencido"
              />
            )}

            {/* Prazos Hoje */}
            {alertas.prazosHoje > 0 && (
              <AlertaItem
                label="Prazos vencendo hoje"
                value={alertas.prazosHoje}
                color="amber"
                href="/dashboard/agenda?filtro=hoje"
              />
            )}

            {/* Audiências Próximas */}
            {alertas.audienciasProximas > 0 && (
              <AlertaItem
                label="Audiências em 7 dias"
                value={alertas.audienciasProximas}
                color="amber"
                onClick={onAudienciasClick
                  ? () => onAudienciasClick(alertas.audienciasProximasData)
                  : undefined}
                href={onAudienciasClick ? undefined : '/dashboard/agenda?tipo=audiencia'}
              />
            )}

            {/* Processos sem Contrato */}
            {alertas.processosSemContrato > 0 && (
              <AlertaItem
                label="Processos sem contrato"
                value={alertas.processosSemContrato}
                color="yellow"
                href="/dashboard/processos?view=sem_contrato"
              />
            )}

            {/* Horas p/ Faturar - apenas sócios, mostra só o valor */}
            {isSocio && alertas.valorHorasProntasFaturar > 0 && (
              <AlertaItem
                label="Horas p/ faturar"
                value={formatCurrency(alertas.valorHorasProntasFaturar)}
                color="emerald"
                href="/dashboard/financeiro/faturamento"
              />
            )}

            {/* Estado vazio */}
            {alertas.prazosVencidos === 0 &&
             alertas.prazosHoje === 0 &&
             alertas.processosSemContrato === 0 &&
             alertas.audienciasProximas === 0 &&
             (!isSocio || (alertas.parcelasVencidas === 0 && alertas.valorHorasProntasFaturar === 0)) && (
              <p className="text-[11px] text-slate-400 py-2">Nenhum alerta pendente ✓</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
