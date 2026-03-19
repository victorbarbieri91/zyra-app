'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'
import { parseDBDate } from '@/lib/timezone'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { getTipoChipStyle } from '@/lib/constants/tarefa-tipos'

interface KanbanTaskCardProps {
  tarefa: Tarefa
  onClick: () => void
  onComplete?: () => void
}

export const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  concluida: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200', label: 'Concluída' },
  em_andamento: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200', label: 'Em andamento' },
  em_pausa: { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200', label: 'Em Pausa' },
  pendente: { bg: 'bg-slate-100 dark:bg-surface-2', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', label: 'Pendente' },
  cancelada: { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200', label: 'Cancelada' },
}

export default function KanbanTaskCard({ tarefa, onClick }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarefa.id,
    data: {
      tipo: 'tarefa',
      tarefa: tarefa,
    },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const tipoInfo = getTipoChipStyle(tarefa.tipo)
  const dataFormatada = format(parseDBDate(tarefa.data_inicio), "d MMM", { locale: ptBR }).replace('.', '')
  // Link para o caso vinculado
  const casoHref = tarefa.processo_id
    ? `/dashboard/processos/${tarefa.processo_id}`
    : tarefa.consultivo_id
      ? `/dashboard/consultivo/${tarefa.consultivo_id}`
      : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'border border-slate-200 dark:border-slate-700 hover:border-[#89bcbe]/60 transition-all shadow-sm hover:shadow-md',
        'cursor-grab active:cursor-grabbing bg-white dark:bg-surface-1 group',
        isDragging && 'opacity-50 border-dashed shadow-2xl',
        ['concluida', 'concluido', 'realizada', 'realizado'].includes(tarefa.status) && 'opacity-50'
      )}
    >
      <CardContent className="p-2.5">
        {/* Linha 1: Título + Botão detalhes */}
        <div className="flex items-start gap-2">
          <h4
            className={cn(
              'flex-1 text-xs font-semibold text-[#34495e] dark:text-slate-200 leading-snug line-clamp-2 cursor-pointer',
              ['concluida', 'concluido', 'realizada', 'realizado'].includes(tarefa.status) && 'line-through opacity-60'
            )}
            onClick={onClick}
          >
            {tarefa.titulo}
          </h4>
          <button
            onClick={onClick}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
              'bg-slate-100 dark:bg-surface-2 hover:bg-[#89bcbe] text-slate-400 dark:text-slate-500 hover:text-white',
              'transition-all duration-150'
            )}
            title="Ver detalhes"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Linha 2: Chip tipo + Data */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium leading-none', tipoInfo.bg, tipoInfo.text)}>
            {tipoInfo.label}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {dataFormatada}
          </span>
          {tarefa.recorrencia_id && (
            <span title="Tarefa recorrente"><Repeat className="w-3 h-3 text-[#89bcbe]" /></span>
          )}
        </div>

        {/* Linha 3: Título do caso vinculado (linkável) */}
        {tarefa.caso_titulo && casoHref && (
          <div className="mt-1.5">
            <Link
              href={casoHref}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[10px] text-[#1E3A8A]/70 hover:text-[#1E3A8A] font-medium truncate block hover:underline leading-snug"
              title={tarefa.caso_titulo}
            >
              {tarefa.caso_titulo}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
