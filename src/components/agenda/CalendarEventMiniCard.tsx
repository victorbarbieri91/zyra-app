'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Flag } from 'lucide-react'

interface CalendarEventMiniCardProps {
  id: string
  titulo: string
  tipo: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  prioridade?: string
  data_inicio: Date
  dia_inteiro?: boolean
  status?: string
  recorrencia_id?: string | null
  prazo_data_limite?: Date | string
  onClick?: () => void
}

// Eventos têm cor por tipo (audiência / compromisso). Tarefas têm cor por prioridade.
const EVENTO_COR: Record<string, string> = {
  audiencia: '#a85a3e',
  compromisso: '#3f7376',
}
export const PRIORIDADE_COR: Record<string, string> = {
  alta: '#8f3a4d', // bordô / vinho escuro (sério, vivo)
  media: '#34557f', // azul-marinho (sério, vivo)
  baixa: '#3c7a50', // verde-esmeralda escuro (sério, vivo)
}

export default function CalendarEventMiniCard({
  titulo,
  tipo,
  prioridade,
  data_inicio,
  dia_inteiro,
  status,
  prazo_data_limite,
  onClick,
}: CalendarEventMiniCardProps) {
  const cor = EVENTO_COR[tipo] || PRIORIDADE_COR[prioridade || 'media'] || PRIORIDADE_COR.media
  const isConcluido = ['concluida', 'concluido', 'realizada', 'realizado'].includes(status || '')
  const temFatal = (tipo === 'tarefa' || tipo === 'prazo') && !!prazo_data_limite
  const hora = !dia_inteiro && tipo !== 'tarefa' ? format(data_inicio, 'HH:mm') : null

  return (
    <div
      onClick={onClick}
      title={titulo}
      className="group flex items-center gap-1.5 min-w-0 rounded-[3px] px-[9px] py-1 cursor-pointer select-none transition-[filter,opacity] hover:brightness-[1.08]"
      style={{ background: cor, opacity: isConcluido ? 0.5 : 1 }}
    >
      {hora && (
        <span className="font-mono text-[10.5px] font-bold flex-shrink-0 text-white/90 tracking-[-0.02em]">
          {hora}
        </span>
      )}
      <span
        className={cn(
          'flex-1 min-w-0 truncate text-[12px] font-semibold text-white leading-tight tracking-[-0.005em]',
          isConcluido && 'line-through',
        )}
      >
        {titulo}
      </span>
      {temFatal && <Flag className="w-[11px] h-[11px] text-white flex-shrink-0" />}
    </div>
  )
}
