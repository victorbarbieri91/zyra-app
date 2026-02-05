'use client'

import { cn } from '@/lib/utils'
import { format, isToday, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarEventMiniCardProps {
  id: string
  titulo: string
  tipo: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  data_inicio: Date
  dia_inteiro?: boolean
  status?: string
  recorrencia_id?: string | null
  prazo_data_limite?: Date | string  // Para indicar urgência quando prazo é hoje ou vencido
  onClick?: () => void
}

// Helper para converter prazo_data_limite para Date
function parsePrazoDate(prazo: Date | string | undefined): Date | null {
  if (!prazo) return null
  if (prazo instanceof Date) return prazo
  // Tratar string como data local para evitar problemas de timezone
  const [year, month, day] = prazo.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day)
}

const tipoStyles = {
  tarefa: {
    bg: 'bg-gradient-to-r from-[#34495e] to-[#46627f]',
    text: 'text-white',
    border: 'border-l-4 border-[#34495e]',
  },
  audiencia: {
    bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    text: 'text-white',
    border: 'border-l-4 border-emerald-500',
  },
  prazo: {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    text: 'text-white',
    border: 'border-l-4 border-amber-600',
  },
  compromisso: {
    bg: 'bg-gradient-to-r from-[#89bcbe] to-[#aacfd0]',
    text: 'text-[#34495e]',
    border: 'border-l-4 border-[#89bcbe]',
  },
  // PRAZO FATAL HOJE - laranja vibrante (qualquer tipo)
  prazoFatalHoje: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    border: 'border-l-4 border-amber-500',
  },
  // PRAZO FATAL VENCIDO - vermelho (qualquer tipo)
  prazoFatalVencido: {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    text: 'text-white',
    border: 'border-l-4 border-red-500',
  },
}

export default function CalendarEventMiniCard({
  id,
  titulo,
  tipo,
  data_inicio,
  dia_inteiro,
  status,
  recorrencia_id,
  prazo_data_limite,
  onClick,
}: CalendarEventMiniCardProps) {
  const temIndicadorEspecial = !!recorrencia_id

  // Verificar prazo fatal urgente (hoje) ou vencido - APENAS para tarefas e prazos
  // Audiências e compromissos NÃO têm prazo fatal
  const tiposComPrazoFatal = tipo === 'tarefa' || tipo === 'prazo'
  const prazoDate = parsePrazoDate(prazo_data_limite)
  const isPrazoFatalHoje = tiposComPrazoFatal && prazoDate && isToday(prazoDate)
  const isPrazoFatalVencido = tiposComPrazoFatal && prazoDate && isBefore(prazoDate, startOfDay(new Date()))
  const isConcluido = status === 'concluida' || status === 'concluido'

  // Determinar estilo baseado no tipo e urgência do prazo fatal
  let styles = tipoStyles[tipo]
  if (isPrazoFatalVencido && !isConcluido) {
    styles = tipoStyles.prazoFatalVencido
  } else if (isPrazoFatalHoje && !isConcluido) {
    styles = tipoStyles.prazoFatalHoje
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer mb-1.5 overflow-hidden',
        // Se tem indicador especial, usa background azul royal, senão usa o estilo padrão
        temIndicadorEspecial ? 'bg-[#1E3A8A]' : styles.bg,
        // Só aplica a borda se NÃO tiver indicador especial
        !temIndicadorEspecial && styles.border
      )}
    >

      <div className="flex items-center gap-1.5 px-2 py-1.5">
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
            <span className={cn(
              'text-[11px] font-semibold truncate leading-tight',
              styles.text,
              tipo === 'tarefa' && status === 'concluida' && 'line-through opacity-75'
            )}>
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
