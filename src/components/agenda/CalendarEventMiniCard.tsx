'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Gavel, Calendar, AlertCircle } from 'lucide-react'

interface CalendarEventMiniCardProps {
  id: string
  titulo: string
  tipo: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  data_inicio: Date
  dia_inteiro?: boolean
  status?: string
  onClick?: () => void
}

const tipoStyles = {
  tarefa: {
    bg: 'bg-gradient-to-r from-[#34495e] to-[#46627f]',
    text: 'text-white',
    border: 'border-l-4 border-[#34495e]',
    icon: CheckCircle2,
    iconBg: 'bg-white/20',
  },
  audiencia: {
    bg: 'bg-gradient-to-r from-[#1E3A8A] to-blue-700',
    text: 'text-white',
    border: 'border-l-4 border-[#1E3A8A]',
    icon: Gavel,
    iconBg: 'bg-white/20',
  },
  prazo: {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    text: 'text-white',
    border: 'border-l-4 border-amber-600',
    icon: AlertCircle,
    iconBg: 'bg-white/20',
  },
  compromisso: {
    bg: 'bg-gradient-to-r from-[#89bcbe] to-[#aacfd0]',
    text: 'text-[#34495e]',
    border: 'border-l-4 border-[#89bcbe]',
    icon: Calendar,
    iconBg: 'bg-white/30',
  },
}

export default function CalendarEventMiniCard({
  id,
  titulo,
  tipo,
  data_inicio,
  dia_inteiro,
  status,
  onClick,
}: CalendarEventMiniCardProps) {
  const styles = tipoStyles[tipo]
  const Icon = styles.icon

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer mb-1.5 overflow-hidden',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {/* Ícone */}
        <div className={cn('rounded flex items-center justify-center flex-shrink-0 w-5 h-5', styles.iconBg)}>
          <Icon className="w-3 h-3 text-white" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Horário (apenas se não for dia inteiro e não for tarefa) */}
            {!dia_inteiro && tipo !== 'tarefa' && (
              <span className={cn('text-[10px] font-bold flex-shrink-0', styles.text)}>
                {format(data_inicio, 'HH:mm')}
              </span>
            )}

            {/* Título */}
            <span className={cn('text-[11px] font-semibold truncate leading-tight', styles.text)}>
              {titulo}
            </span>
          </div>
        </div>

        {/* Status indicator para tarefas concluídas */}
        {tipo === 'tarefa' && status === 'concluida' && (
          <div className="flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        )}
      </div>

      {/* Efeito hover */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
    </div>
  )
}
