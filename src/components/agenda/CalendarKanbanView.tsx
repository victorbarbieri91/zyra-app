'use client'

import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ListTodo, PlayCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tarefa, useTarefas } from '@/hooks/useTarefas'
import KanbanColumn from './KanbanColumn'
import KanbanTaskCard from './KanbanTaskCard'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useTimer } from '@/contexts/TimerContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CalendarKanbanViewProps {
  escritorioId?: string
  userId?: string
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onClickTarefa: (tarefa: Tarefa) => void
  onCreateTarefa: (status: 'pendente' | 'em_andamento' | 'concluida') => void
  onTaskComplete?: (tarefaId: string) => void // Callback externo para conclusão (abre modal de horas)
  className?: string
}

export default function CalendarKanbanView({
  escritorioId,
  userId,
  selectedDate,
  onDateSelect,
  onClickTarefa,
  onCreateTarefa,
  onTaskComplete,
  className,
}: CalendarKanbanViewProps) {
  const supabase = createClient()
  const { tarefas: todasTarefas, refreshTarefas: refetchTarefas } = useTarefas(escritorioId)
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null)

  // Hook de timers para automação
  const {
    timersAtivos,
    iniciarTimer,
    pausarTimer,
    retomarTimer,
    finalizarTimer,
    descartarTimer,
  } = useTimer()

  // Estado para dialog de confirmação ao mover tarefa com timer ativo
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    tarefa: Tarefa | null
    timerId: string | null
  }>({ open: false, tarefa: null, timerId: null })

  const previousDay = () => onDateSelect(subDays(selectedDate, 1))
  const nextDay = () => onDateSelect(addDays(selectedDate, 1))
  const goToToday = () => onDateSelect(new Date())

  // Funções auxiliares para automação de timer
  const getTimerParaTarefa = (tarefaId: string) => {
    return timersAtivos.find((t) => t.tarefa_id === tarefaId)
  }

  const tarefaTemVinculo = (tarefa: Tarefa) => {
    return tarefa.processo_id || tarefa.consultivo_id
  }

  // Função para atualizar status da tarefa no banco
  const atualizarStatusTarefa = async (tarefaId: string, novoStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: novoStatus }
      if (novoStatus === 'concluida') {
        updateData.data_conclusao = new Date().toISOString()
      } else {
        updateData.data_conclusao = null
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
        .eq('id', tarefaId)

      if (error) throw error
      await refetchTarefas()

      const labels: Record<string, string> = {
        pendente: 'Pendente',
        em_andamento: 'Em Andamento',
        concluida: 'Concluída',
      }
      toast.success(`Tarefa movida para ${labels[novoStatus]}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status da tarefa')
    }
  }

  // Handlers do dialog de confirmação
  const handlePausarEMover = async () => {
    if (!confirmDialog.tarefa || !confirmDialog.timerId) return
    try {
      await pausarTimer(confirmDialog.timerId)
      toast.info('Timer pausado')
      await atualizarStatusTarefa(confirmDialog.tarefa.id, 'pendente')
    } catch (error) {
      console.error('Erro ao pausar timer:', error)
      toast.error('Erro ao pausar timer')
    } finally {
      setConfirmDialog({ open: false, tarefa: null, timerId: null })
    }
  }

  const handleDescartarEMover = async () => {
    if (!confirmDialog.tarefa || !confirmDialog.timerId) return
    try {
      await descartarTimer(confirmDialog.timerId)
      toast.info('Timer descartado')
      await atualizarStatusTarefa(confirmDialog.tarefa.id, 'pendente')
    } catch (error) {
      console.error('Erro ao descartar timer:', error)
      toast.error('Erro ao descartar timer')
    } finally {
      setConfirmDialog({ open: false, tarefa: null, timerId: null })
    }
  }

  // Ordenar por prioridade
  const ordenarPorPrioridade = (tarefas: Tarefa[]) => {
    const ordem = { alta: 1, media: 2, baixa: 3 }
    return tarefas.sort((a, b) => {
      const prioA = ordem[a.prioridade] || 999
      const prioB = ordem[b.prioridade] || 999
      return prioA - prioB
    })
  }

  // Filtrar tarefas do dia selecionado e agrupar por status
  const { pendente, em_andamento, concluida } = useMemo(() => {
    if (!todasTarefas) {
      return {
        pendente: [],
        em_andamento: [],
        concluida: [],
      }
    }

    // Filtrar tarefas do dia e do usuário logado
    const tarefasDoDia = todasTarefas.filter((tarefa) => {
      const tarefaDate = parseDBDate(tarefa.data_inicio)
      // Filtro 1: dia selecionado
      if (!isSameDay(tarefaDate, selectedDate)) return false
      // Filtro 2: apenas tarefas do usuário logado
      if (userId && tarefa.responsavel_id !== userId) return false
      return true
    })

    // Separar por status
    const pendentes = ordenarPorPrioridade(
      tarefasDoDia.filter((t) => t.status === 'pendente')
    )
    const emAndamento = ordenarPorPrioridade(
      tarefasDoDia.filter((t) => t.status === 'em_andamento')
    )
    const concluidas = ordenarPorPrioridade(
      tarefasDoDia.filter((t) => t.status === 'concluida')
    )

    return {
      pendente: pendentes,
      em_andamento: emAndamento,
      concluida: concluidas,
    }
  }, [todasTarefas, selectedDate, userId])

  // Handlers de Drag-and-Drop
  const handleDragStart = (event: DragStartEvent) => {
    const tarefa = todasTarefas?.find((t) => t.id === event.active.id)
    setActiveTarefa(tarefa || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTarefa(null)

    if (!over || active.id === over.id) return

    const tarefaId = active.id as string
    const novoStatus = over.id as string
    const tarefa = todasTarefas?.find((t) => t.id === tarefaId)

    // Validações
    if (!tarefa || !['pendente', 'em_andamento', 'concluida'].includes(novoStatus)) {
      return
    }
    if (tarefa.status === novoStatus) return // Não mudou

    const timerExistente = getTimerParaTarefa(tarefa.id)

    // ========================================
    // LÓGICA DE TIMER BASEADA NA TRANSIÇÃO
    // ========================================

    // CASO 1: Movendo para EM_ANDAMENTO - Iniciar ou retomar timer automaticamente
    if (novoStatus === 'em_andamento') {
      if (!timerExistente) {
        // Não tem timer - criar novo se tiver vínculo
        if (tarefaTemVinculo(tarefa)) {
          try {
            await iniciarTimer({
              titulo: tarefa.titulo,
              descricao: `Trabalho na tarefa: ${tarefa.titulo}`,
              processo_id: tarefa.processo_id || undefined,
              consulta_id: tarefa.consultivo_id || undefined,
              tarefa_id: tarefa.id,
              faturavel: true,
            })
            toast.success('Timer iniciado automaticamente')
          } catch (error) {
            console.error('Erro ao iniciar timer:', error)
            toast.error('Erro ao iniciar timer')
          }
        } else {
          // Tarefa sem vínculo - mostrar aviso informativo
          toast.info('Tarefa movida (sem timer - vincule a um processo/consulta para habilitar)')
        }
      } else if (timerExistente.status === 'pausado') {
        // Timer existe mas está pausado - retomar automaticamente
        try {
          await retomarTimer(timerExistente.id)
          toast.success('Timer retomado automaticamente')
        } catch (error) {
          console.error('Erro ao retomar timer:', error)
          toast.error('Erro ao retomar timer')
        }
      }
      // Se timer existe e está rodando, não faz nada (já está ok)
    }

    // CASO 2: Movendo para CONCLUÍDA
    if (novoStatus === 'concluida') {
      // Se tem vínculo com processo/consultivo, sempre abrir modal para confirmar horas
      if (tarefaTemVinculo(tarefa) && onTaskComplete) {
        // Finalizar timer se existir (as horas serão mostradas no modal)
        if (timerExistente) {
          try {
            await finalizarTimer(timerExistente.id, {
              descricao: `Tarefa concluída: ${tarefa.titulo}`,
            })
            toast.success('Timer finalizado e horas registradas')
          } catch (error) {
            console.error('Erro ao finalizar timer:', error)
            toast.error('Erro ao finalizar timer')
          }
        }
        // Chamar callback externo para abrir modal de horas (permite ajustar/adicionar mais horas)
        onTaskComplete(tarefa.id)
        return // Não atualiza status aqui, o callback externo vai fazer isso
      } else if (timerExistente) {
        // Tarefa sem vínculo mas com timer (raro) - apenas finalizar
        try {
          await finalizarTimer(timerExistente.id, {
            descricao: `Tarefa concluída: ${tarefa.titulo}`,
          })
          toast.success('Timer finalizado e horas registradas')
        } catch (error) {
          console.error('Erro ao finalizar timer:', error)
          toast.error('Erro ao finalizar timer')
        }
      }
    }

    // CASO 3: Movendo de EM_ANDAMENTO para PENDENTE com timer ativo
    if (novoStatus === 'pendente' && tarefa.status === 'em_andamento' && timerExistente) {
      // Abrir dialog para decidir o que fazer com o timer
      setConfirmDialog({
        open: true,
        tarefa,
        timerId: timerExistente.id,
      })
      return // Aguardar decisão do usuário antes de mover
    }

    // ========================================
    // ATUALIZAR STATUS DA TAREFA
    // ========================================
    await atualizarStatusTarefa(tarefaId, novoStatus)
  }

  const totalTarefas = pendente.length + em_andamento.length + concluida.length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header de Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[#34495e]">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={previousDay}
              className="h-8 w-8 p-0 border-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextDay}
              className="h-8 w-8 p-0 border-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalTarefas > 0 && (
            <span className="text-sm text-slate-600">
              {totalTarefas} {totalTarefas === 1 ? 'tarefa' : 'tarefas'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          <KanbanColumn
            titulo="Pendente"
            icone={<ListTodo className="w-4 h-4" />}
            status="pendente"
            tarefas={pendente}
            corHeader="bg-gradient-to-r from-[#34495e] to-[#46627f]"
            onClickTarefa={onClickTarefa}
            onCreateTarefa={() => onCreateTarefa('pendente')}
          />

          <KanbanColumn
            titulo="Em Andamento"
            icone={<PlayCircle className="w-4 h-4" />}
            status="em_andamento"
            tarefas={em_andamento}
            corHeader="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0]"
            onClickTarefa={onClickTarefa}
          />

          <KanbanColumn
            titulo="Concluída"
            icone={<CheckCircle2 className="w-4 h-4" />}
            status="concluida"
            tarefas={concluida}
            corHeader="bg-gradient-to-r from-emerald-500 to-emerald-600"
            onClickTarefa={onClickTarefa}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTarefa && (
            <div className="rotate-3">
              <KanbanTaskCard tarefa={activeTarefa} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialog de confirmação ao mover tarefa com timer ativo */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, tarefa: null, timerId: null })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Timer Ativo Detectado</AlertDialogTitle>
            <AlertDialogDescription>
              Esta tarefa tem um timer em execução. O que deseja fazer com o tempo registrado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setConfirmDialog({ open: false, tarefa: null, timerId: null })}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePausarEMover}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Pausar Timer
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleDescartarEMover}
              className="bg-red-500 hover:bg-red-600"
            >
              Descartar Timer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
