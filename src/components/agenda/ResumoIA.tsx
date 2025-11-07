'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, TrendingUp, AlertTriangle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResumoIAProps {
  viewMode: 'month' | 'week' | 'day' | 'list'
  totalEventos: number
  eventosCriticos: number
  proximoEvento?: {
    titulo: string
    horario: string
  }
  className?: string
}

export default function ResumoIA({
  viewMode,
  totalEventos,
  eventosCriticos,
  proximoEvento,
  className,
}: ResumoIAProps) {
  const getTitulo = () => {
    switch (viewMode) {
      case 'day':
        return 'Resumo do Dia'
      case 'week':
        return 'Resumo da Semana'
      case 'month':
        return 'Resumo do Mês'
      case 'list':
        return 'Visão Geral'
      default:
        return 'Resumo'
    }
  }

  const getMensagem = () => {
    if (totalEventos === 0) {
      return 'Nenhum evento agendado para este período.'
    }

    if (eventosCriticos > 0) {
      return `Você tem ${totalEventos} evento${totalEventos === 1 ? '' : 's'}, incluindo ${eventosCriticos} com prazos críticos que requerem atenção imediata.`
    }

    return `Você tem ${totalEventos} evento${totalEventos === 1 ? '' : 's'} agendado${totalEventos === 1 ? '' : 's'}. ${proximoEvento ? `Próximo: ${proximoEvento.titulo} às ${proximoEvento.horario}.` : ''}`
  }

  return (
    <Card className={cn('border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30', className)}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <CardTitle className="text-sm font-medium text-[#34495e]">
            {getTitulo()}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <p className="text-xs text-[#6c757d] leading-relaxed mb-3">
          {getMensagem()}
        </p>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 bg-blue-50/50 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-blue-600 mb-1" />
            <span className="text-xs font-semibold text-blue-900">{totalEventos}</span>
            <span className="text-[10px] text-blue-700">Eventos</span>
          </div>

          {eventosCriticos > 0 && (
            <div className="flex flex-col items-center p-2 bg-red-50/50 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 mb-1" />
              <span className="text-xs font-semibold text-red-900">{eventosCriticos}</span>
              <span className="text-[10px] text-red-700">Críticos</span>
            </div>
          )}

          {!eventosCriticos && totalEventos > 0 && (
            <div className="flex flex-col items-center p-2 bg-emerald-50/50 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 mb-1" />
              <span className="text-xs font-semibold text-emerald-900">OK</span>
              <span className="text-[10px] text-emerald-700">Status</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
