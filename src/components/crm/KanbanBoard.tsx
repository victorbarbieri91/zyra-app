'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, User, Calendar, DollarSign, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Oportunidade {
  id: string
  pessoa_id: string
  pessoa_nome: string
  titulo: string
  valor_estimado: number
  etapa_id: string
  area_juridica: string
  responsavel_nome: string
  tempo_na_etapa_dias: number
  ultima_interacao?: {
    data: string
    descricao: string
  }
  proxima_acao?: string
}

interface Etapa {
  id: string
  nome: string
  cor: string
}

interface KanbanBoardProps {
  etapas: Etapa[]
  oportunidades: Oportunidade[]
  onOportunidadeMove?: (oportunidadeId: string, novaEtapaId: string) => void
  onRegistrarInteracao?: (oportunidadeId: string, pessoaId: string, pessoaNome: string) => void
}

// Card individual do Kanban
function KanbanCard({
  oportunidade,
  onRegistrarInteracao
}: {
  oportunidade: Oportunidade
  onRegistrarInteracao?: (oportunidadeId: string, pessoaId: string, pessoaNome: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: oportunidade.id,
    data: {
      type: 'oportunidade',
      oportunidade,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Handle de arrastar */}
      <div className="flex items-start gap-2 mb-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">
            {oportunidade.titulo}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <User className="w-3 h-3" />
            <span className="truncate">{oportunidade.pessoa_nome}</span>
          </div>
        </div>
      </div>

      {/* Valor */}
      {oportunidade.valor_estimado && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#89bcbe] mb-0.5">Valor Estimado</div>
          <div className="text-sm font-semibold text-slate-900">
            {formatCurrency(oportunidade.valor_estimado)}
          </div>
        </div>
      )}

      {/* Última Interação */}
      {oportunidade.ultima_interacao && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#89bcbe] mb-0.5">Última Interação</div>
          <div className="text-xs text-slate-900 line-clamp-2">
            {oportunidade.ultima_interacao.descricao}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatDate(oportunidade.ultima_interacao.data)}
          </div>
        </div>
      )}

      {/* Próxima Ação */}
      {oportunidade.proxima_acao && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#89bcbe] mb-0.5">Próxima Ação</div>
          <div className="text-xs text-slate-900 line-clamp-2">{oportunidade.proxima_acao}</div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>{oportunidade.tempo_na_etapa_dias}d</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs bg-[#34495e] hover:bg-[#46627f] text-white"
          onClick={(e) => {
            e.stopPropagation()
            onRegistrarInteracao?.(
              oportunidade.id,
              oportunidade.pessoa_id,
              oportunidade.pessoa_nome
            )
          }}
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Interação
        </Button>
      </div>
    </div>
  )
}

// Coluna do Kanban
function KanbanColumn({
  etapa,
  oportunidades,
  children
}: {
  etapa: Etapa
  oportunidades: Oportunidade[]
  children?: React.ReactNode
}) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: etapa.id,
    data: {
      type: 'etapa',
      etapa,
    },
  })

  const valorTotal = oportunidades.reduce(
    (acc, opp) => acc + (opp.valor_estimado || 0),
    0
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header da Coluna */}
      <div
        className="rounded-lg p-3 mb-3"
        style={{ backgroundColor: etapa.cor }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">
            {etapa.nome}
          </h3>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
            <span className="text-xs font-semibold text-white">
              {oportunidades.length}
            </span>
          </div>
        </div>
        <div className="text-xs text-white/90 flex items-center gap-1 font-medium">
          <DollarSign className="w-3.5 h-3.5 text-white/80" />
          {formatCurrency(valorTotal)}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[400px] p-2 rounded-lg transition-colors",
          isOver && "bg-slate-100"
        )}
      >
        <div className="space-y-2">
          {children}
        </div>

        {oportunidades.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-400">Arraste cards aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({
  etapas,
  oportunidades,
  onOportunidadeMove,
  onRegistrarInteracao,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeOportunidade = oportunidades.find(o => o.id === active.id)
    if (!activeOportunidade) {
      setActiveId(null)
      return
    }

    // Determinar a nova etapa
    let novaEtapaId: string | null = null

    // Se soltou sobre uma etapa
    if (over.data.current?.type === 'etapa') {
      novaEtapaId = over.id as string
    }
    // Se soltou sobre outra oportunidade
    else if (over.data.current?.type === 'oportunidade') {
      const overOportunidade = oportunidades.find(o => o.id === over.id)
      if (overOportunidade) {
        novaEtapaId = overOportunidade.etapa_id
      }
    }

    // Executar o movimento se mudou de etapa
    if (novaEtapaId && novaEtapaId !== activeOportunidade.etapa_id) {
      onOportunidadeMove?.(activeOportunidade.id, novaEtapaId)
    }

    setActiveId(null)
  }

  const activeOportunidade = activeId
    ? oportunidades.find(o => o.id === activeId)
    : null

  // IDs únicos para cada contexto
  const allIds = [...etapas.map(e => e.id), ...oportunidades.map(o => o.id)]

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-4 gap-4">
          {etapas.map((etapa) => {
            const oportunidadesEtapa = oportunidades.filter(
              (opp) => opp.etapa_id === etapa.id
            )

            return (
              <KanbanColumn
                key={etapa.id}
                etapa={etapa}
                oportunidades={oportunidadesEtapa}
              >
                {oportunidadesEtapa.map((oportunidade) => (
                  <KanbanCard
                    key={oportunidade.id}
                    oportunidade={oportunidade}
                    onRegistrarInteracao={onRegistrarInteracao}
                  />
                ))}
              </KanbanColumn>
            )
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && activeOportunidade ? (
          <div className="bg-white rounded-lg border-2 border-[#34495e] p-3 shadow-lg rotate-3 w-64">
            <h3 className="text-sm font-semibold text-slate-900">
              {activeOportunidade.titulo}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {activeOportunidade.pessoa_nome}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}