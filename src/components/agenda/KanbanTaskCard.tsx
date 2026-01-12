'use client'

import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ListTodo,
  AlertCircle,
  FileText,
  User,
  Calendar,
  ClipboardList,
  Check,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'
import { formatBrazilDate } from '@/lib/timezone'

interface KanbanTaskCardProps {
  tarefa: Tarefa
  onClick: () => void
  onComplete?: () => void
}

const tipoTarefaLabels: Record<string, string> = {
  prazo_processual: 'Prazo Processual',
  acompanhamento: 'Acompanhamento',
  follow_up: 'Follow-up',
  administrativo: 'Administrativo',
  outro: 'Outro',
}

const prioridadeConfig = {
  alta: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Alta',
  },
  media: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Média',
  },
  baixa: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Baixa',
  },
}

const statusConfig = {
  concluida: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Concluída',
  },
  em_andamento: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Em andamento',
  },
  pendente: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: 'Pendente',
  },
  cancelada: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    label: 'Cancelada',
  },
}

export default function KanbanTaskCard({ tarefa, onClick, onComplete }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarefa.id,
    data: {
      tipo: 'tarefa',
      tarefa: tarefa,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const tipoLabel = tipoTarefaLabels[tarefa.tipo] || 'Tarefa'
  const prioridadeInfo = prioridadeConfig[tarefa.prioridade] || prioridadeConfig.media
  const statusInfo = statusConfig[tarefa.status] || statusConfig.pendente

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'border border-slate-200 hover:border-[#89bcbe] transition-all shadow-sm hover:shadow-md',
        'cursor-grab active:cursor-grabbing bg-white group',
        isDragging && 'opacity-50 border-dashed shadow-2xl',
        tarefa.status === 'concluida' && 'opacity-60'
      )}
    >
      <CardContent className="p-2.5">
        {/* Header com checkbox, ícone e título */}
        <div className="flex items-start gap-2 mb-2">
          {/* Checkbox de Concluir - ESQUERDA */}
          {onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onComplete()
              }}
              onPointerDown={(e) => e.stopPropagation()} // Evita drag
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                'transition-all duration-150 mt-0.5',
                'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50',
                'focus:outline-none focus:ring-1 focus:ring-emerald-500',
                tarefa.status === 'concluida' && 'bg-emerald-500 border-emerald-500'
              )}
              title={tarefa.status === 'concluida' ? 'Reabrir tarefa' : 'Marcar como concluída'}
            >
              {tarefa.status === 'concluida' && (
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              )}
            </button>
          )}

          {/* Ícone do Tipo */}
          <div className="rounded-md flex items-center justify-center flex-shrink-0 w-7 h-7 shadow-sm bg-gradient-to-br from-[#34495e] to-[#46627f]">
            <ListTodo className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Conteúdo Central */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  'text-xs font-bold text-[#34495e] leading-tight line-clamp-2',
                  tarefa.status === 'concluida' && 'line-through opacity-60'
                )}
                onClick={onClick}
              >
                {tarefa.titulo}
              </h4>
              {/* Botão Ver Detalhes - Sempre visível */}
              <button
                onClick={onClick}
                onPointerDown={(e) => e.stopPropagation()} // Evita drag
                className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
                  'bg-[#89bcbe]/80 hover:bg-[#89bcbe] text-white',
                  'transition-all duration-150',
                  'shadow-sm'
                )}
                title="Ver detalhes"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Descrição (se houver) */}
        {tarefa.descricao && (
          <p className={cn('text-[11px] text-slate-600 mb-2 line-clamp-2', onComplete ? 'pl-12' : 'pl-9')}>
            {tarefa.descricao}
          </p>
        )}

        {/* Info grid - com padding left para alinhar com ícone */}
        <div className={cn('space-y-1.5', onComplete ? 'pl-12' : 'pl-9')}>
          {/* Tipo de Tarefa */}
          <div className="flex items-center gap-1.5">
            <ClipboardList className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
            <span className="text-[11px] text-slate-600 font-medium">{tipoLabel}</span>
          </div>

          {/* Data */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
            <span className="text-[11px] text-slate-600">
              {formatBrazilDate(tarefa.data_inicio, 'dd/MM/yyyy')}
            </span>
          </div>

          {/* Prioridade */}
          <div className="flex items-center gap-1.5">
            <AlertCircle className={cn('w-3 h-3 flex-shrink-0', prioridadeInfo.color)} />
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 font-medium',
                prioridadeInfo.bg,
                prioridadeInfo.color,
                prioridadeInfo.border
              )}
            >
              Prioridade {prioridadeInfo.label}
            </Badge>
          </div>

          {/* Processo Vinculado */}
          {tarefa.processo_id && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-[#1E3A8A] font-medium truncate">
                Processo vinculado
              </span>
            </div>
          )}

          {/* Consultivo Vinculado */}
          {tarefa.consultivo_id && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-[#1E3A8A] font-medium truncate">
                Consultivo vinculado
              </span>
            </div>
          )}

          {/* Responsável */}
          {tarefa.responsavel_nome && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">{tarefa.responsavel_nome}</span>
            </div>
          )}
        </div>

        {/* Footer com status */}
        <div className={cn('mt-2.5 pt-2 border-t border-slate-100', onComplete ? 'pl-12' : 'pl-9')}>
          {/* Status Badge */}
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
