'use client'

import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, AlertCircle, Check, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'
import { formatTimeDisplay, calcularHorarioFim } from '@/lib/timezone'

interface ScheduledTaskCardProps {
  tarefa: Tarefa
  onClick: () => void
  onComplete?: () => void
  onResize?: (tarefaId: string, novaDuracaoMinutos: number) => void
  isResizable?: boolean
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


export default function ScheduledTaskCard({
  tarefa,
  onClick,
  onComplete,
  onResize,
  isResizable = true,
}: ScheduledTaskCardProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [localDuracao, setLocalDuracao] = useState(tarefa.duracao_planejada_minutos || 60)
  const cardRef = useRef<HTMLDivElement>(null)
  const resizeStartY = useRef<number>(0)
  const resizeStartDuracao = useRef<number>(0)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarefa.id,
    data: {
      tipo: 'tarefa_agendada',
      tarefa: tarefa,
    },
    disabled: isResizing, // Desabilita drag quando está resizing
  })

  const style = transform && !isResizing
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const prioridadeInfo = prioridadeConfig[tarefa.prioridade] || prioridadeConfig.media

  // Handlers de Resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStartY.current = e.clientY
    resizeStartDuracao.current = localDuracao

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY.current

      // Escala da grade: 1.5px por minuto (90px por hora)
      // Converter deltaY de pixels para minutos
      const ESCALA_GRADE = 1.5
      const deltaMinutos = deltaY / ESCALA_GRADE

      // Calcular nova duração total
      let novaDuracao = resizeStartDuracao.current + deltaMinutos

      // Snap para 15 minutos
      novaDuracao = Math.round(novaDuracao / 15) * 15

      // Duração mínima: 15 minutos
      // Duração máxima: 960 minutos (16 horas)
      novaDuracao = Math.max(15, Math.min(960, novaDuracao))

      setLocalDuracao(novaDuracao)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      // Se mudou a duração, notificar
      if (localDuracao !== (tarefa.duracao_planejada_minutos || 60)) {
        onResize?.(tarefa.id, localDuracao)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, localDuracao, tarefa.id, tarefa.duracao_planejada_minutos, onResize])

  const duracaoEmHoras = localDuracao / 60

  // Escala da grade: 1.5px por minuto (90px por hora)
  const ESCALA_GRADE = 1.5
  const alturaCard = Math.round(localDuracao * ESCALA_GRADE)

  // Layout responsivo baseado na ALTURA VISUAL do card (não duração)
  const isUltraCompact = alturaCard < 35 // 15min (22.5px) e pequenos ajustes
  const isCompact = alturaCard >= 35 && alturaCard < 50 // 30min (45px)
  const isMedium = alturaCard >= 50 && alturaCard < 120 // 33-80min → 50-120px
  // Normal: alturaCard >= 120 (> 80min → > 120px)

  return (
    <Card
      ref={(node) => {
        setNodeRef(node)
        cardRef.current = node
      }}
      style={{
        ...style,
        // Altura baseada na escala da grade (1.5px por minuto)
        height: `${alturaCard}px`,
      }}
      className={cn(
        'group border border-slate-200 hover:border-[#89bcbe] transition-all shadow-sm hover:shadow-md',
        'bg-white absolute left-1 right-1 overflow-hidden',
        isDragging && 'opacity-50 border-dashed shadow-2xl z-50',
        isResizing && 'ring-2 ring-[#89bcbe]'
      )}
    >
      {/* Área arrastável - apenas o corpo do card */}
      <div
        {...attributes}
        {...(isResizing ? {} : listeners)}
        onClick={onClick}
        className={cn(
          'cursor-grab active:cursor-grabbing',
          isResizing && 'pointer-events-none' // Desabilita drag durante resize
        )}
      >
        <CardContent className={cn('p-2', (isCompact || isUltraCompact) && 'p-1')}>
          {/* Layout Ultra Compacto: 15min - Minimalista */}
          {isUltraCompact && (
            <div className="flex items-center gap-0.5 pl-4 pr-4">
              <h4
                className={cn(
                  'text-[8px] font-semibold text-[#34495e] leading-none truncate flex-1 min-w-0',
                  tarefa.status === 'concluida' && 'line-through opacity-60'
                )}
              >
                {tarefa.titulo}
              </h4>
              {tarefa.horario_planejado_dia && (
                <span className="text-[7px] text-slate-600 whitespace-nowrap font-medium">
                  {formatTimeDisplay(tarefa.horario_planejado_dia)}
                  <span className="text-slate-400">-</span>
                  {calcularHorarioFim(tarefa.horario_planejado_dia, localDuracao)}
                  <span className="text-slate-400">•</span>
                  {localDuracao >= 60 ? `${(localDuracao / 60).toFixed(localDuracao % 60 === 0 ? 0 : 1)}h` : `${localDuracao}m`}
                </span>
              )}
              <div
                className={cn(
                  'w-1 h-1 rounded-full flex-shrink-0',
                  prioridadeInfo.color.replace('text-', 'bg-')
                )}
              />
            </div>
          )}

          {/* Layout Compacto: 30min - Sem ícone */}
          {isCompact && (
            <div className="flex items-center gap-0.5 pl-5 pr-5">
              <h4
                className={cn(
                  'text-[8px] font-semibold text-[#34495e] leading-none truncate flex-1 min-w-0',
                  tarefa.status === 'concluida' && 'line-through opacity-60'
                )}
              >
                {tarefa.titulo}
              </h4>
              {tarefa.horario_planejado_dia && (
                <span className="text-[7px] text-slate-600 whitespace-nowrap font-medium">
                  {formatTimeDisplay(tarefa.horario_planejado_dia)}
                  <span className="text-slate-400">-</span>
                  {calcularHorarioFim(tarefa.horario_planejado_dia, localDuracao)}
                  <span className="text-slate-400">•</span>
                  {localDuracao >= 60 ? `${(localDuracao / 60).toFixed(localDuracao % 60 === 0 ? 0 : 1)}h` : `${localDuracao}m`}
                </span>
              )}
              <div
                className={cn(
                  'w-1 h-1 rounded-full flex-shrink-0',
                  prioridadeInfo.color.replace('text-', 'bg-')
                )}
              />
            </div>
          )}

          {/* Layout Médio: 45-90 min - Duas linhas */}
          {isMedium && (
            <>
              <div className="flex items-center gap-1.5 mb-1 pl-5 pr-5">
                <h4
                  className={cn(
                    'text-[10px] font-bold text-[#34495e] leading-tight line-clamp-1 flex-1 min-w-0',
                    tarefa.status === 'concluida' && 'line-through opacity-60'
                  )}
                >
                  {tarefa.titulo}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 pl-5 pr-5">
                {tarefa.horario_planejado_dia && (
                  <div className="flex items-center gap-0.5 text-[9px] text-slate-600 font-medium">
                    <Clock className="w-2 h-2 text-[#89bcbe] flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {formatTimeDisplay(tarefa.horario_planejado_dia)}
                      <span className="text-slate-400 mx-0.5">-</span>
                      {calcularHorarioFim(tarefa.horario_planejado_dia, localDuracao)}
                    </span>
                    <span className="text-slate-400 mx-0.5">•</span>
                    <span className="text-[#34495e] font-semibold">
                      {duracaoEmHoras >= 1
                        ? `${duracaoEmHoras.toFixed(duracaoEmHoras % 1 === 0 ? 0 : 1)}h`
                        : `${localDuracao}m`}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto',
                    prioridadeInfo.color.replace('text-', 'bg-')
                  )}
                />
              </div>
            </>
          )}

          {/* Layout Normal: > 90 min - Layout completo */}
          {!isUltraCompact && !isCompact && !isMedium && (
            <>
              {/* Header com título */}
              <div className="flex items-start gap-1.5 mb-1 pl-5 pr-5">
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      'text-[11px] font-bold text-[#34495e] leading-tight line-clamp-2',
                      tarefa.status === 'concluida' && 'line-through opacity-60'
                    )}
                  >
                    {tarefa.titulo}
                  </h4>
                </div>
              </div>

              {/* Horário e Duração */}
              <div className="flex items-center gap-1.5 mb-1.5 pl-5 pr-5">
                <Clock className="w-2.5 h-2.5 text-[#89bcbe] flex-shrink-0" />
                {tarefa.horario_planejado_dia && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                    <span>{formatTimeDisplay(tarefa.horario_planejado_dia)}</span>
                    <span className="text-slate-400">-</span>
                    <span>{calcularHorarioFim(tarefa.horario_planejado_dia, localDuracao)}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-[#34495e]">
                      {duracaoEmHoras >= 1
                        ? `${duracaoEmHoras.toFixed(duracaoEmHoras % 1 === 0 ? 0 : 1)}h`
                        : `${localDuracao}m`}
                    </span>
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div className="flex items-center gap-1 pl-5 pr-5">
                <AlertCircle className={cn('w-2.5 h-2.5 flex-shrink-0', prioridadeInfo.color)} />
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] px-1 py-0 h-3.5 font-medium',
                    prioridadeInfo.bg,
                    prioridadeInfo.color,
                    prioridadeInfo.border
                  )}
                >
                  {prioridadeInfo.label}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </div>

      {/* Botões de Ação - Sempre visíveis em TODOS os layouts */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Checkbox de Concluir - Canto Superior Esquerdo */}
        {onComplete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onComplete()
            }}
            onPointerDown={(e) => e.stopPropagation()} // Evita drag
            className={cn(
              'absolute pointer-events-auto rounded-full border-2 flex items-center justify-center',
              'transition-all duration-150',
              'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 bg-white',
              'focus:outline-none focus:ring-1 focus:ring-emerald-500',
              'shadow-sm',
              tarefa.status === 'concluida' && 'bg-emerald-500 border-emerald-500',
              // Tamanhos responsivos
              isUltraCompact && 'top-0.5 left-0.5 w-2.5 h-2.5 border',
              isCompact && 'top-0.5 left-0.5 w-3 h-3 border',
              (isMedium || (!isUltraCompact && !isCompact && !isMedium)) && 'top-1 left-1 w-3.5 h-3.5'
            )}
            title={tarefa.status === 'concluida' ? 'Reabrir tarefa' : 'Marcar como concluída'}
          >
            {tarefa.status === 'concluida' && (
              <Check
                className={cn(
                  'text-white',
                  isUltraCompact && 'w-1.5 h-1.5',
                  isCompact && 'w-1.5 h-1.5',
                  (isMedium || (!isUltraCompact && !isCompact && !isMedium)) && 'w-2 h-2'
                )}
                strokeWidth={3}
              />
            )}
          </button>
        )}

        {/* Botão Ver Detalhes - Canto Superior Direito */}
        <button
          onClick={onClick}
          onPointerDown={(e) => e.stopPropagation()} // Evita drag
          className={cn(
            'absolute pointer-events-auto rounded-md flex items-center justify-center',
            'transition-all duration-150',
            'shadow-sm',
            // Tamanhos e cores responsivos
            isUltraCompact && 'top-0.5 right-0.5 w-2.5 h-2.5 bg-[#89bcbe]/80 hover:bg-[#89bcbe] text-white',
            isCompact && 'top-0.5 right-0.5 w-3 h-3 bg-[#89bcbe]/80 hover:bg-[#89bcbe] text-white',
            isMedium && 'top-1 right-1 w-4 h-4 bg-[#89bcbe]/80 hover:bg-[#89bcbe] text-white',
            (!isUltraCompact && !isCompact && !isMedium) && 'top-1 right-1 w-5 h-5 bg-[#89bcbe]/80 hover:bg-[#89bcbe] text-white'
          )}
          title="Ver detalhes"
        >
          <Eye
            className={cn(
              isUltraCompact && 'w-1.5 h-1.5',
              isCompact && 'w-2 h-2',
              isMedium && 'w-2.5 h-2.5',
              (!isUltraCompact && !isCompact && !isMedium) && 'w-3 h-3'
            )}
          />
        </button>
      </div>

      {/* Resize Handle - Borda inferior inteira */}
      {isResizable && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute bottom-0 left-0 right-0 cursor-ns-resize',
            'flex items-center justify-center',
            'bg-gradient-to-t from-slate-200/50 to-transparent',
            'hover:from-[#89bcbe]/30 hover:to-transparent',
            'transition-all',
            isResizing && 'from-[#89bcbe]/50 to-transparent ring-2 ring-[#89bcbe]',
            isUltraCompact ? 'h-1.5' : isCompact ? 'h-2' : 'h-3' // Handle progressivo
          )}
        >
          {/* Linha indicadora sempre visível */}
          <div className={cn(
            'rounded-full bg-slate-400',
            'group-hover:bg-[#89bcbe] transition-colors',
            isResizing && 'bg-[#89bcbe] scale-110',
            isUltraCompact ? 'w-6 h-0.5' : isCompact ? 'w-8 h-0.5' : 'w-12 h-1' // Linha progressiva
          )} />

          {/* Badge de duração durante resize */}
          {isResizing && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-[#34495e] text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
              {duracaoEmHoras >= 1
                ? `${duracaoEmHoras.toFixed(duracaoEmHoras % 1 === 0 ? 0 : 1)}h`
                : `${localDuracao}min`}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
