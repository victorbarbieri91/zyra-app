'use client'

// Sino de notificações do header — popover compacto reusando useDashboardAlertas.
// NÃO renderiza o AlertasCard inteiro (esse continua vivo para outros usos).

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  AlertCircle,
  Clock,
  Gavel,
  FileWarning,
  CircleDollarSign,
  Loader2,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDashboardAlertas } from '@/hooks/useDashboardAlertas'

type Severidade = 'critico' | 'aviso' | 'informativo'

interface ItemAlerta {
  id: string
  icon: LucideIcon
  titulo: string
  descricao: string
  severidade: Severidade
  href: string
}

const severidadeStyle: Record<Severidade, { dot: string; iconBg: string; iconColor: string }> = {
  critico: {
    dot: 'bg-state-danger',
    iconBg: 'bg-state-danger-bg',
    iconColor: 'text-state-danger-fg',
  },
  aviso: {
    dot: 'bg-state-warning',
    iconBg: 'bg-state-warning-bg',
    iconColor: 'text-state-warning-fg',
  },
  informativo: {
    dot: 'bg-state-info',
    iconBg: 'bg-state-info-bg',
    iconColor: 'text-state-info-fg',
  },
}

const SEVERIDADE_LABEL: Record<Severidade, string> = {
  critico: 'Urgente',
  aviso: 'Atenção',
  informativo: 'Informativo',
}

export default function SinoAlertasPopover() {
  const [open, setOpen] = useState(false)
  const { alertas, loading, totalAlertas, isSocio } = useDashboardAlertas()

  const items: ItemAlerta[] = []

  if (alertas.prazosVencidos > 0) {
    items.push({
      id: 'prazos-vencidos',
      icon: AlertCircle,
      titulo: `${alertas.prazosVencidos} ${alertas.prazosVencidos === 1 ? 'prazo vencido' : 'prazos vencidos'}`,
      descricao: 'Tarefas com data limite no passado',
      severidade: 'critico',
      href: '/dashboard/agenda?filtro=vencidos',
    })
  }

  if (isSocio && alertas.parcelasVencidas > 0) {
    items.push({
      id: 'parcelas-vencidas',
      icon: CircleDollarSign,
      titulo: `${alertas.parcelasVencidas} ${alertas.parcelasVencidas === 1 ? 'parcela vencida' : 'parcelas vencidas'}`,
      descricao: formatCurrency(alertas.valorParcelasVencidas),
      severidade: 'critico',
      href: '/dashboard/financeiro/contas-receber?filtro=vencidas',
    })
  }

  if (alertas.prazosHoje > 0) {
    items.push({
      id: 'prazos-hoje',
      icon: Clock,
      titulo: `${alertas.prazosHoje} ${alertas.prazosHoje === 1 ? 'prazo hoje' : 'prazos hoje'}`,
      descricao: 'Tarefas que vencem hoje',
      severidade: 'aviso',
      href: '/dashboard/agenda',
    })
  }

  if (alertas.audienciasProximas > 0) {
    items.push({
      id: 'audiencias-proximas',
      icon: Gavel,
      titulo: `${alertas.audienciasProximas} ${alertas.audienciasProximas === 1 ? 'audiência próxima' : 'audiências próximas'}`,
      descricao: 'Nos próximos 7 dias',
      severidade: 'aviso',
      href: '/dashboard/agenda',
    })
  }

  if (alertas.processosSemContrato > 0) {
    items.push({
      id: 'processos-sem-contrato',
      icon: FileWarning,
      titulo: `${alertas.processosSemContrato} ${alertas.processosSemContrato === 1 ? 'processo sem contrato' : 'processos sem contrato'}`,
      descricao: 'Vincule contratos para faturar',
      severidade: 'informativo',
      href: '/dashboard/processos?filtro=sem-contrato',
    })
  }

  if (alertas.encerramentosPendentes > 0) {
    items.push({
      id: 'encerramentos-pendentes',
      icon: FileWarning,
      titulo: `${alertas.encerramentosPendentes} ${alertas.encerramentosPendentes === 1 ? 'processo aparenta encerrado' : 'processos aparentam encerrados'}`,
      descricao: 'Revise para confirmar o encerramento',
      severidade: 'informativo',
      href: '/dashboard/processos?filtro=aparentam-encerrados',
    })
  }

  if (isSocio && alertas.valorHorasProntasFaturar > 0) {
    items.push({
      id: 'horas-faturar',
      icon: CircleDollarSign,
      titulo: 'Horas prontas para faturar',
      descricao: formatCurrency(alertas.valorHorasProntasFaturar),
      severidade: 'informativo',
      href: '/dashboard/financeiro/timesheet?filtro=faturavel',
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notificações"
          className="relative w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#34495e] dark:hover:text-slate-200 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {totalAlertas > 0 && (
            <span
              className={cn(
                'absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full',
                'inline-flex items-center justify-center text-[9px] font-bold leading-[16px]',
                alertas.prazosVencidos > 0 || alertas.parcelasVencidas > 0
                  ? 'bg-state-danger text-white'
                  : 'bg-state-warning text-white',
              )}
            >
              {totalAlertas > 99 ? '99+' : totalAlertas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 bg-card-warm border-warm"
      >
        <div className="px-4 pt-3.5 pb-2 border-b border-warm-subtle flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-warm-primary">Notificações</p>
            <p className="text-[11px] text-warm-secondary mt-0.5">
              {totalAlertas === 0
                ? 'Tudo em dia'
                : `${totalAlertas} ${totalAlertas === 1 ? 'item' : 'itens'} pra revisar`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-warm-muted" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-state-success-bg flex items-center justify-center">
              <Bell className="w-4 h-4 text-state-success-fg" />
            </div>
            <p className="text-sm font-medium text-warm-primary">Sem alertas</p>
            <p className="text-[11px] text-warm-secondary mt-0.5">
              Você não tem nada urgente no momento.
            </p>
          </div>
        ) : (
          <ul className="max-h-[440px] overflow-y-auto py-1">
            {items.map((item) => {
              const style = severidadeStyle[item.severidade]
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-rail/60 transition-colors group"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        style.iconBg,
                      )}
                    >
                      <Icon className={cn('w-4 h-4', style.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-warm-primary truncate">
                          {item.titulo}
                        </p>
                        <span
                          className={cn(
                            'text-[8.5px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded',
                            item.severidade === 'critico' && 'bg-state-danger-bg text-state-danger-fg',
                            item.severidade === 'aviso' && 'bg-state-warning-bg text-state-warning-fg',
                            item.severidade === 'informativo' && 'bg-state-info-bg text-state-info-fg',
                          )}
                        >
                          {SEVERIDADE_LABEL[item.severidade]}
                        </span>
                      </div>
                      <p className="text-[11px] text-warm-secondary truncate mt-0.5">
                        {item.descricao}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-warm-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
