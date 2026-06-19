'use client'

import { useDraggable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBrazilTime, parseDBDate } from '@/lib/timezone'
import KanbanCard from './KanbanCard'

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
  draggable?: boolean
}

const DONE = ['realizado', 'realizada', 'concluida', 'concluido']

export default function KanbanAgendaCard({ item, onClick, draggable = false }: KanbanAgendaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { tipo: item.tipo, item },
    disabled: !draggable,
  })

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <KanbanCard
      kind={item.tipo === 'audiencia' ? 'audiencia' : 'compromisso'}
      titulo={item.titulo}
      done={DONE.includes(item.status)}
      hora={!item.dia_inteiro ? formatBrazilTime(item.data_inicio) : null}
      local={item.local}
      responsaveis={item.responsavel_nome ? [item.responsavel_nome] : []}
      dataLabel={format(parseDBDate(item.data_inicio), 'd MMM', { locale: ptBR }).replace('.', '')}
      onOpen={onClick}
      dragRef={draggable ? setNodeRef : undefined}
      dragStyle={dragStyle}
      dragHandle={draggable ? { ...attributes, ...listeners } : undefined}
      dragging={isDragging}
    />
  )
}
