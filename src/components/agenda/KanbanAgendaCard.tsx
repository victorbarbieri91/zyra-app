'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  MapPin,
  User,
  Video,
  Gavel,
  Eye,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBrazilDate, formatBrazilTime } from '@/lib/timezone'

export interface AgendaCardItem {
  id: string
  tipo: 'evento' | 'audiencia'
  titulo: string
  descricao?: string | null
  data_inicio: string
  data_fim?: string | null
  dia_inteiro?: boolean
  local?: string | null
  status: string
  responsavel_nome?: string | null
  processo_id?: string | null
  consultivo_id?: string | null
  subtipo?: string // tipo de audiência ou tipo de evento
}

interface KanbanAgendaCardProps {
  item: AgendaCardItem
  onClick: () => void
}

const tipoAudienciaLabels: Record<string, string> = {
  inicial: 'Audiência Inicial',
  instrucao: 'Instrução',
  conciliacao: 'Conciliação',
  julgamento: 'Julgamento',
  una: 'Audiência Una',
  outra: 'Outra Audiência',
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  agendado: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Agendado' },
  agendada: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Agendada' },
  realizado: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Realizado' },
  realizada: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Realizada' },
  cancelado: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Cancelado' },
  cancelada: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Cancelada' },
}

export default function KanbanAgendaCard({ item, onClick }: KanbanAgendaCardProps) {
  const isAudiencia = item.tipo === 'audiencia'
  const statusInfo = statusConfig[item.status] || statusConfig.agendado
  const tipoLabel = isAudiencia
    ? (tipoAudienciaLabels[item.subtipo || ''] || 'Audiência')
    : 'Compromisso'

  return (
    <Card
      className={cn(
        'border transition-all shadow-sm hover:shadow-md cursor-pointer',
        isAudiencia
          ? 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/30'
          : 'border-[#89bcbe]/40 hover:border-[#89bcbe] bg-[#f0f9f9]/30'
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
            isAudiencia ? 'bg-emerald-100' : 'bg-[#aacfd0]/30'
          )}>
            {isAudiencia
              ? <Gavel className="w-3 h-3 text-emerald-600" />
              : <Video className="w-3 h-3 text-[#46627f]" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-bold text-[#34495e] leading-tight line-clamp-2">
                {item.titulo}
              </h4>
              <button
                onClick={(e) => { e.stopPropagation(); onClick() }}
                className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
                  isAudiencia
                    ? 'bg-emerald-500/80 hover:bg-emerald-500'
                    : 'bg-[#89bcbe]/80 hover:bg-[#89bcbe]',
                  'text-white transition-all duration-150 shadow-sm'
                )}
                title="Ver detalhes"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5 pl-7">
          {/* Tipo */}
          <div className="flex items-center gap-1.5">
            {isAudiencia
              ? <Gavel className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              : <Calendar className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
            }
            <span className="text-[11px] text-slate-600 font-medium">{tipoLabel}</span>
          </div>

          {/* Horário */}
          {!item.dia_inteiro && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                {formatBrazilTime(item.data_inicio)}
              </span>
            </div>
          )}

          {/* Local */}
          {item.local && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">{item.local}</span>
            </div>
          )}

          {/* Processo/Consultivo vinculado */}
          {(item.processo_id || item.consultivo_id) && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-[#1E3A8A] font-medium truncate">
                {item.processo_id ? 'Processo vinculado' : 'Consultivo vinculado'}
              </span>
            </div>
          )}

          {/* Responsável */}
          {item.responsavel_nome && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">{item.responsavel_nome}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 pl-7">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4 font-medium',
              statusInfo.bg,
              statusInfo.text,
              statusInfo.border
            )}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
