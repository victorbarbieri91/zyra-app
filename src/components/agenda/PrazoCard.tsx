'use client'

import { AlertCircle, Calendar, Clock, FileText, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import { formatBrazilDate } from '@/lib/timezone'

export interface PrazoCardProps {
  id: string
  titulo: string
  tipo_prazo: string
  data_intimacao: Date
  data_limite: Date
  dias_uteis: boolean
  quantidade_dias: number
  cumprido?: boolean
  perdido?: boolean
  criticidade?: 'vencido' | 'hoje' | 'critico' | 'urgente' | 'atencao' | 'normal'
  processo_numero?: string
  cliente_nome?: string
  responsavel_nome?: string
  onMarcarCumprido?: () => void
  onClick?: () => void
}

const criticidadeConfig = {
  vencido: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-600 text-white',
    text: 'text-red-900',
    label: 'VENCIDO',
  },
  hoje: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    badge: 'bg-red-500 text-white',
    text: 'text-red-900',
    label: 'HOJE',
  },
  critico: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    badge: 'bg-orange-500 text-white',
    text: 'text-orange-900',
    label: 'CRÍTICO',
  },
  urgente: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-500 text-white',
    text: 'text-amber-900',
    label: 'URGENTE',
  },
  atencao: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-500 text-white',
    text: 'text-yellow-900',
    label: 'ATENÇÃO',
  },
  normal: {
    bg: 'bg-white',
    border: 'border-slate-200',
    badge: 'bg-slate-400 text-white',
    text: 'text-slate-900',
    label: 'NORMAL',
  },
}

export default function PrazoCard({
  id,
  titulo,
  tipo_prazo,
  data_intimacao,
  data_limite,
  dias_uteis,
  quantidade_dias,
  cumprido,
  perdido,
  criticidade = 'normal',
  processo_numero,
  cliente_nome,
  responsavel_nome,
  onMarcarCumprido,
  onClick,
}: PrazoCardProps) {
  const config = criticidadeConfig[criticidade]
  const diasRestantes = differenceInDays(data_limite, new Date())

  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-all cursor-pointer hover:shadow-lg',
        config.bg,
        config.border,
        'border-2'
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Ícone */}
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.badge)}>
              <AlertCircle className="w-4 h-4" />
            </div>

            {/* Título e Info */}
            <div className="flex-1 min-w-0">
              <h3 className={cn('font-semibold text-sm leading-tight mb-1', config.text)}>
                {titulo}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border font-bold', config.badge)}>
                  {config.label}
                </Badge>
                <span className="text-[10px] text-[#6c757d] font-medium">
                  {tipo_prazo.charAt(0).toUpperCase() + tipo_prazo.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Badge de dias restantes */}
          <div className={cn('px-2.5 py-1 rounded font-bold text-xs whitespace-nowrap', config.badge)}>
            {diasRestantes === 0 && 'HOJE'}
            {diasRestantes < 0 && `${Math.abs(diasRestantes)}d atraso`}
            {diasRestantes > 0 && `${diasRestantes}d`}
          </div>
        </div>

        {/* Informações do Prazo */}
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Data Intimação */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#6c757d] font-medium">
                <Calendar className="w-3 h-3" />
                Intimação
              </div>
              <div className="text-xs font-semibold text-[#34495e]">
                {formatBrazilDate(data_intimacao)}
              </div>
            </div>

            {/* Data Limite */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#6c757d] font-medium">
                <Clock className="w-3 h-3" />
                Vencimento
              </div>
              <div className={cn('text-xs font-bold', config.text)}>
                {formatBrazilDate(data_limite)}
              </div>
            </div>
          </div>

          {/* Quantidade de dias */}
          <div className="text-[11px] text-[#6c757d]">
            {quantidade_dias} {dias_uteis ? 'dias úteis' : 'dias corridos'}
          </div>
        </div>

        {/* Informações Adicionais */}
        {(processo_numero || cliente_nome) && (
          <div className="space-y-1.5 mb-3 pt-2 border-t border-slate-200">
            {processo_numero && (
              <div className="flex items-center gap-1.5 text-xs text-[#6c757d]">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="truncate font-medium">Processo {processo_numero}</span>
              </div>
            )}
            {cliente_nome && (
              <div className="flex items-center gap-1.5 text-xs text-[#6c757d]">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{cliente_nome}</span>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2">
          {!cumprido && !perdido && onMarcarCumprido && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMarcarCumprido()
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              Marcar como Cumprido
            </Button>
          )}

          {cumprido && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
              ✓ Cumprido
            </Badge>
          )}

          {perdido && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
              Prazo Perdido
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
