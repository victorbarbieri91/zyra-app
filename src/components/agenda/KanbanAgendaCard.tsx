'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight, Gavel, Video, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBrazilTime } from '@/lib/timezone'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  subtipo?: string
}

interface KanbanAgendaCardProps {
  item: AgendaCardItem
  onClick: () => void
}

const tipoAudienciaShortLabels: Record<string, string> = {
  inicial: 'Inicial',
  instrucao: 'Instrução',
  conciliacao: 'Conciliação',
  julgamento: 'Julgamento',
  una: 'Una',
  outra: 'Outra',
}

export default function KanbanAgendaCard({ item, onClick }: KanbanAgendaCardProps) {
  const isAudiencia = item.tipo === 'audiencia'
  const tipoLabel = isAudiencia
    ? (tipoAudienciaShortLabels[item.subtipo || ''] || 'Audiência')
    : 'Compromisso'

  return (
    <Card
      className={cn(
        'border transition-all shadow-sm hover:shadow-md cursor-pointer group',
        isAudiencia
          ? 'border-emerald-200/60 hover:border-emerald-400 bg-emerald-50/20'
          : 'border-[#89bcbe]/30 hover:border-[#89bcbe] bg-[#f0f9f9]/20'
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5">
        {/* Linha 1: Ícone tipo + Título + Botão detalhes */}
        <div className="flex items-start gap-2">
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
            isAudiencia ? 'bg-emerald-100' : 'bg-[#aacfd0]/20'
          )}>
            {isAudiencia
              ? <Gavel className="w-2.5 h-2.5 text-emerald-600" />
              : <Video className="w-2.5 h-2.5 text-[#46627f]" />
            }
          </div>
          <h4 className="flex-1 text-xs font-semibold text-[#34495e] leading-snug line-clamp-2">
            {item.titulo}
          </h4>
          <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
              isAudiencia
                ? 'bg-emerald-100 hover:bg-emerald-500 text-emerald-400 hover:text-white'
                : 'bg-slate-100 hover:bg-[#89bcbe] text-slate-400 hover:text-white',
              'transition-all duration-150'
            )}
            title="Ver detalhes"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Linha 2: Chip tipo + Horário + Local icon */}
        <div className="flex items-center gap-1.5 mt-2 ml-[26px]">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium leading-none',
            isAudiencia ? 'bg-emerald-50 text-emerald-600' : 'bg-[#f0f9f9] text-[#46627f]'
          )}>
            {tipoLabel}
          </span>

          {!item.dia_inteiro && (
            <span className="text-[10px] text-slate-400 font-medium">
              {formatBrazilTime(item.data_inicio)}
            </span>
          )}

          {item.local && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                  {item.local}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
