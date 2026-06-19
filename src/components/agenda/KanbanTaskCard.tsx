'use client'

import { useDraggable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tarefa } from '@/hooks/useTarefas'
import { parseDBDate } from '@/lib/timezone'
import KanbanCard from './KanbanCard'

interface KanbanTaskCardProps {
  tarefa: Tarefa
  onClick: () => void
  onComplete?: () => void
}

const DONE = ['concluida', 'concluido', 'realizada', 'realizado']

export default function KanbanTaskCard({ tarefa, onClick }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarefa.id,
    data: { tipo: 'tarefa', tarefa },
  })

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const ehProcesso = !!tarefa.processo_id
  const vinculoHref = ehProcesso
    ? `/dashboard/processos/${tarefa.processo_id}`
    : tarefa.consultivo_id
      ? `/dashboard/consultivo/${tarefa.consultivo_id}`
      : null

  return (
    <KanbanCard
      kind="tarefa"
      titulo={tarefa.titulo}
      done={DONE.includes(tarefa.status)}
      prioridade={tarefa.prioridade}
      prazoFatal={tarefa.prazo_data_limite}
      processo={ehProcesso ? tarefa.processo_numero : null}
      partes={ehProcesso ? tarefa.caso_titulo : null}
      pasta={!ehProcesso ? tarefa.caso_titulo : null}
      vinculoHref={vinculoHref}
      responsaveis={tarefa.responsavel_nome ? [tarefa.responsavel_nome] : []}
      dataLabel={format(parseDBDate(tarefa.data_inicio), 'd MMM', { locale: ptBR }).replace('.', '')}
      onOpen={onClick}
      dragRef={setNodeRef}
      dragStyle={dragStyle}
      dragHandle={{ ...attributes, ...listeners }}
      dragging={isDragging}
    />
  )
}
