'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'
import { parseDBDate } from '@/lib/timezone'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface KanbanTaskCardProps {
  tarefa: Tarefa
  onClick: () => void
  onComplete?: () => void
}

const tipoChipConfig: Record<string, { label: string; bg: string; text: string }> = {
  prazo_processual: { label: 'Prazo', bg: 'bg-red-50', text: 'text-red-600' },
  acompanhamento: { label: 'Acomp.', bg: 'bg-blue-50', text: 'text-blue-600' },
  follow_up: { label: 'Follow-up', bg: 'bg-purple-50', text: 'text-purple-600' },
  administrativo: { label: 'Admin', bg: 'bg-slate-100', text: 'text-slate-600' },
  fixa: { label: 'Fixa', bg: 'bg-teal-50', text: 'text-teal-600' },
  outro: { label: 'Outro', bg: 'bg-slate-100', text: 'text-slate-500' },
}

export const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  concluida: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Concluída' },
  em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Em andamento' },
  em_pausa: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Em Pausa' },
  pendente: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Pendente' },
  cancelada: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Cancelada' },
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

  const tipoInfo = tipoChipConfig[tarefa.tipo] || tipoChipConfig.outro
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
        'border border-slate-200 hover:border-[#89bcbe]/60 transition-all shadow-sm hover:shadow-md',
        'cursor-grab active:cursor-grabbing bg-white group',
        isDragging && 'opacity-50 border-dashed shadow-2xl',
        tarefa.status === 'concluida' && 'opacity-50'
      )}
    >
      <CardContent className="p-2.5">
        {/* Linha 1: Título + Botão detalhes */}
        <div className="flex items-start gap-2">
          <h4
            className={cn(
              'flex-1 text-xs font-semibold text-[#34495e] leading-snug line-clamp-2 cursor-pointer',
              tarefa.status === 'concluida' && 'line-through opacity-60'
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
              'bg-slate-100 hover:bg-[#89bcbe] text-slate-400 hover:text-white',
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
          <span className="text-[10px] text-slate-400 font-medium">
            {dataFormatada}
          </span>
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
