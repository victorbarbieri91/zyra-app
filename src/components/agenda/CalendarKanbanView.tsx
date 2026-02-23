'use client'

import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight, ListTodo, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { format, addDays, subDays, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tarefa, useTarefas } from '@/hooks/useTarefas'
import { useEventos, Evento } from '@/hooks/useEventos'
import { useAudiencias, Audiencia } from '@/hooks/useAudiencias'
import KanbanColumn from './KanbanColumn'
import KanbanTaskCard from './KanbanTaskCard'
import KanbanAgendaCard, { AgendaCardItem } from './KanbanAgendaCard'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import type { DateRange } from 'react-day-picker'
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

type KanbanFilter = 'todos' | 'tarefa' | 'audiencia' | 'evento'

interface CalendarKanbanViewProps {
  escritorioId?: string
  userId?: string
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onClickTarefa: (tarefa: Tarefa) => void
  onClickEvento?: (evento: Evento) => void
  onClickAudiencia?: (audiencia: Audiencia) => void
  onCreateTarefa: (status: 'pendente' | 'em_andamento' | 'em_pausa' | 'concluida') => void
  onTaskComplete?: (entityId: string, timerData?: {
    timerId: string
    defaultHoras?: number
    defaultMinutos?: number
    defaultAtividade: string
    entityType?: 'tarefa' | 'evento' | 'audiencia'
  }) => void
  className?: string
}

export default function CalendarKanbanView({
  escritorioId,
  userId,
  selectedDate,
  onDateSelect,
  onClickTarefa,
  onClickEvento,
  onClickAudiencia,
  onCreateTarefa,
  onTaskComplete,
  className,
}: CalendarKanbanViewProps) {
  const supabase = createClient()
  const { tarefas: todasTarefas, refreshTarefas: refetchTarefas } = useTarefas(escritorioId)
  const { eventos: todosEventos, refreshEventos } = useEventos(escritorioId)
  const { audiencias: todasAudiencias, refreshAudiencias } = useAudiencias(escritorioId)
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null)
  const [activeAgendaItem, setActiveAgendaItem] = useState<AgendaCardItem | null>(null)
  const [activeFilter, setActiveFilter] = useState<KanbanFilter>('todos')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Hook de timers para automação
  const {
    timersAtivos,
    iniciarTimer,
    pausarTimer,
    retomarTimer,
    finalizarTimer,
    descartarTimer,
  } = useTimer()

  // Estado para dialog de confirmação ao mover item com timer ativo
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    tarefa: Tarefa | null
    agendaItem: AgendaCardItem | null
    timerId: string | null
  }>({ open: false, tarefa: null, agendaItem: null, timerId: null })

  const previousDay = () => { setDateRange(undefined); onDateSelect(subDays(selectedDate, 1)) }
  const nextDay = () => { setDateRange(undefined); onDateSelect(addDays(selectedDate, 1)) }
  const goToToday = () => { setDateRange(undefined); onDateSelect(new Date()) }

  // Date range helpers
  const isRangeActive = !!(dateRange?.from && dateRange?.to && !isSameDay(dateRange.from, dateRange.to))

  const isDateInView = (date: Date) => {
    if (isRangeActive) {
      const day = startOfDay(date)
      return day >= startOfDay(dateRange!.from!) && day <= startOfDay(dateRange!.to!)
    }
    return isSameDay(date, selectedDate)
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    // Só aplicar quando 2 datas DIFERENTES forem selecionadas (período real)
    if (range?.from && range?.to && !isSameDay(range.from, range.to)) {
      onDateSelect(range.from)
      setCalendarOpen(false)
    }
  }

  // Funções auxiliares para automação de timer
  const getTimerParaTarefa = (tarefaId: string) => {
    return timersAtivos.find((t) => t.tarefa_id === tarefaId)
  }

  const getTimerParaAgendaItem = (item: AgendaCardItem) => {
    if (item.tipo === 'evento') {
      return timersAtivos.find((t) => t.evento_id === item.id)
    }
    if (item.tipo === 'audiencia') {
      return timersAtivos.find((t) => t.audiencia_id === item.id)
    }
    return undefined
  }

  const tarefaTemVinculo = (tarefa: Tarefa) => {
    return tarefa.processo_id || tarefa.consultivo_id
  }

  const agendaItemTemVinculo = (item: AgendaCardItem) => {
    return item.processo_id || item.consultivo_id
  }

  // Função para atualizar status da tarefa no banco
  const atualizarStatusTarefa = async (tarefaId: string, novoStatus: string) => {
    try {
      const tarefa = todasTarefas?.find(t => t.id === tarefaId)
      const updateData: Record<string, unknown> = { status: novoStatus }
      if (novoStatus === 'concluida') {
        updateData.data_conclusao = new Date().toISOString()
      } else {
        updateData.data_conclusao = null
      }
      // Fixa tasks: set fixa_status_data to today on every status change
      if (tarefa?.tipo === 'fixa') {
        updateData.fixa_status_data = new Date().toISOString().split('T')[0]
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
        em_pausa: 'Em Pausa',
        concluida: 'Concluída',
      }
      toast.success(`Tarefa movida para ${labels[novoStatus] || novoStatus}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status da tarefa')
    }
  }

  // Função para atualizar status de evento/audiência (só para concluir)
  const concluirAgendaItem = async (item: AgendaCardItem) => {
    try {
      if (item.tipo === 'evento') {
        const { error } = await supabase
          .from('agenda_eventos')
          .update({ status: 'realizado' })
          .eq('id', item.id)
        if (error) throw error
        await refreshEventos()
        toast.success('Compromisso marcado como realizado')
      } else if (item.tipo === 'audiencia') {
        const { error } = await supabase
          .from('agenda_audiencias')
          .update({ status: 'realizada' })
          .eq('id', item.id)
        if (error) throw error
        await refreshAudiencias()
        toast.success('Audiência marcada como realizada')
      }
    } catch (error) {
      console.error('Erro ao concluir item:', error)
      toast.error('Erro ao concluir item')
    }
  }

  // Handlers do dialog de confirmação
  const handlePausarEMover = async () => {
    if (!confirmDialog.timerId) return
    try {
      await pausarTimer(confirmDialog.timerId)
      toast.info('Timer pausado')
      if (confirmDialog.tarefa) {
        await atualizarStatusTarefa(confirmDialog.tarefa.id, 'pendente')
      }
      // Para agenda items, não precisa atualizar status no DB (virtual)
    } catch (error) {
      console.error('Erro ao pausar timer:', error)
      toast.error('Erro ao pausar timer')
    } finally {
      setConfirmDialog({ open: false, tarefa: null, agendaItem: null, timerId: null })
    }
  }

  const handleDescartarEMover = async () => {
    if (!confirmDialog.timerId) return
    try {
      await descartarTimer(confirmDialog.timerId)
      toast.info('Timer descartado')
      if (confirmDialog.tarefa) {
        await atualizarStatusTarefa(confirmDialog.tarefa.id, 'pendente')
      }
      // Para agenda items, não precisa atualizar status no DB (virtual)
    } catch (error) {
      console.error('Erro ao descartar timer:', error)
      toast.error('Erro ao descartar timer')
    } finally {
      setConfirmDialog({ open: false, tarefa: null, agendaItem: null, timerId: null })
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
  const { pendente, em_andamento, em_pausa, concluida } = useMemo(() => {
    if (!todasTarefas) {
      return {
        pendente: [],
        em_andamento: [],
        em_pausa: [],
        concluida: [],
      }
    }

    // Filtrar tarefas do dia e do usuário logado
    const hoje = startOfDay(new Date())
    const tarefasDoDia = todasTarefas.filter((tarefa) => {
      // Fixa tasks always appear when viewing today (their DB data_inicio is the original creation date)
      if (tarefa.tipo === 'fixa') {
        if (userId && !tarefa.responsaveis_ids?.includes(userId)) return false
        return isDateInView(hoje)
      }
      const tarefaDate = parseDBDate(tarefa.data_inicio)
      // Filtro 1: dia selecionado ou range
      if (!isDateInView(tarefaDate)) return false
      // Filtro 2: apenas tarefas do usuário logado
      if (userId && !tarefa.responsaveis_ids?.includes(userId)) return false
      return true
    })

    // Apply client-side daily reset for fixa tasks (useTarefas reads raw table, not view)
    const todayStr = hoje.toISOString().split('T')[0]
    const tarefasComReset = tarefasDoDia.map((tarefa) => {
      if (tarefa.tipo === 'fixa' && tarefa.fixa_status_data !== todayStr) {
        return { ...tarefa, status: 'pendente' as const, data_conclusao: undefined }
      }
      return tarefa
    })

    // Separar por status
    const pendentes = ordenarPorPrioridade(
      tarefasComReset.filter((t) => t.status === 'pendente')
    )
    const emAndamento = ordenarPorPrioridade(
      tarefasComReset.filter((t) => t.status === 'em_andamento')
    )
    const emPausa = ordenarPorPrioridade(
      tarefasComReset.filter((t) => t.status === 'em_pausa')
    )
    const concluidas = ordenarPorPrioridade(
      tarefasComReset.filter((t) => t.status === 'concluida')
    )

    return {
      pendente: pendentes,
      em_andamento: emAndamento,
      em_pausa: emPausa,
      concluida: concluidas,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasTarefas, selectedDate, userId, dateRange])

  // Filtrar eventos e audiências do dia e mapear para colunas
  const { eventosPendentes, eventosRealizados, audienciasPendentes, audienciasRealizadas } = useMemo(() => {
    // Eventos do dia (filtrar por responsáveis se userId disponível)
    const eventosDoDia = (todosEventos || []).filter((evento) => {
      const eventoDate = parseDBDate(evento.data_inicio)
      if (!isDateInView(eventoDate)) return false
      if (userId && !evento.responsaveis_ids?.includes(userId)) return false
      if (evento.status === 'cancelado') return false
      return true
    })

    // Audiências do dia (filtrar por responsáveis se userId disponível)
    const audienciasDoDia = (todasAudiencias || []).filter((audiencia) => {
      const audienciaDate = parseDBDate(audiencia.data_hora)
      if (!isDateInView(audienciaDate)) return false
      if (userId && !audiencia.responsaveis_ids?.includes(userId)) return false
      if (audiencia.status === 'cancelada') return false
      return true
    })

    return {
      eventosPendentes: eventosDoDia.filter(e => e.status !== 'realizado'),
      eventosRealizados: eventosDoDia.filter(e => e.status === 'realizado'),
      audienciasPendentes: audienciasDoDia.filter(a => a.status !== 'realizada'),
      audienciasRealizadas: audienciasDoDia.filter(a => a.status === 'realizada'),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosEventos, todasAudiencias, selectedDate, userId, dateRange])

  // Converter eventos para AgendaCardItem
  const mapEventoToCard = (evento: Evento): AgendaCardItem => ({
    id: evento.id,
    tipo: 'evento',
    titulo: evento.titulo,
    descricao: evento.descricao,
    data_inicio: evento.data_inicio,
    data_fim: evento.data_fim,
    dia_inteiro: evento.dia_inteiro,
    local: evento.local,
    status: evento.status || 'agendado',
    responsavel_nome: (evento as any).responsavel_nome,
    processo_id: evento.processo_id,
    consultivo_id: evento.consultivo_id,
  })

  const mapAudienciaToCard = (audiencia: Audiencia): AgendaCardItem => ({
    id: audiencia.id,
    tipo: 'audiencia',
    titulo: audiencia.titulo,
    descricao: audiencia.observacoes,
    data_inicio: audiencia.data_hora,
    local: audiencia.forum || audiencia.tribunal || audiencia.link_virtual || undefined,
    status: audiencia.status,
    responsavel_nome: audiencia.responsavel_nome,
    processo_id: audiencia.processo_id,
    consultivo_id: audiencia.consultivo_id,
    subtipo: audiencia.tipo_audiencia,
  })

  // Items de agenda base (todos os pendentes e concluídos)
  const allAgendaPendente: AgendaCardItem[] = [
    ...eventosPendentes.map(mapEventoToCard),
    ...audienciasPendentes.map(mapAudienciaToCard),
  ]

  const agendaConcluida: AgendaCardItem[] = [
    ...eventosRealizados.map(mapEventoToCard),
    ...audienciasRealizadas.map(mapAudienciaToCard),
  ]

  // Computar agenda items por coluna baseado no estado do timer
  const { agendaPendente, agendaEmAndamento, agendaEmPausa } = useMemo(() => {
    const emAndamento: AgendaCardItem[] = []
    const emPausa: AgendaCardItem[] = []
    const pendentes: AgendaCardItem[] = []

    for (const item of allAgendaPendente) {
      const timer = timersAtivos.find(t =>
        (item.tipo === 'evento' && t.evento_id === item.id) ||
        (item.tipo === 'audiencia' && t.audiencia_id === item.id)
      )
      if (timer?.status === 'rodando') {
        emAndamento.push(item)
      } else if (timer?.status === 'pausado') {
        emPausa.push(item)
      } else {
        pendentes.push(item)
      }
    }

    return {
      agendaPendente: pendentes,
      agendaEmAndamento: emAndamento,
      agendaEmPausa: emPausa,
    }
  }, [allAgendaPendente, timersAtivos])

  // Filtrar items por tipo selecionado
  const filterTarefas = (tarefas: Tarefa[]) => {
    if (activeFilter === 'todos' || activeFilter === 'tarefa') return tarefas
    return []
  }

  const filterAgendaItems = (items: AgendaCardItem[]) => {
    if (activeFilter === 'todos') return items
    if (activeFilter === 'tarefa') return []
    return items.filter(item => {
      if (activeFilter === 'audiencia') return item.tipo === 'audiencia'
      if (activeFilter === 'evento') return item.tipo === 'evento'
      return false
    })
  }

  // Handler para click em agenda item
  const handleClickAgendaItem = (item: AgendaCardItem) => {
    if (item.tipo === 'evento') {
      const evento = todosEventos?.find(e => e.id === item.id)
      if (evento && onClickEvento) onClickEvento(evento)
    } else if (item.tipo === 'audiencia') {
      const audiencia = todasAudiencias?.find(a => a.id === item.id)
      if (audiencia && onClickAudiencia) onClickAudiencia(audiencia)
    }
  }

  // Handlers de Drag-and-Drop
  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current

    if (dragData?.tipo === 'tarefa') {
      const tarefa = todasTarefas?.find((t) => t.id === event.active.id)
      setActiveTarefa(tarefa || null)
      setActiveAgendaItem(null)
    } else if (dragData?.tipo === 'evento' || dragData?.tipo === 'audiencia') {
      setActiveAgendaItem(dragData.item as AgendaCardItem)
      setActiveTarefa(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTarefa(null)
    setActiveAgendaItem(null)

    if (!over || active.id === over.id) return

    const dragData = active.data.current
    const novoStatus = over.id as string

    if (!['pendente', 'em_andamento', 'em_pausa', 'concluida'].includes(novoStatus)) return

    // ========================================
    // LÓGICA PARA TAREFAS (existente)
    // ========================================
    if (dragData?.tipo === 'tarefa') {
      const tarefaId = active.id as string
      const tarefa = todasTarefas?.find((t) => t.id === tarefaId)

      if (!tarefa) return
      if (tarefa.status === novoStatus) return

      const timerExistente = getTimerParaTarefa(tarefa.id)

      // CASO: Movendo para EM_PAUSA
      if (novoStatus === 'em_pausa') {
        if (timerExistente && timerExistente.status === 'rodando') {
          try {
            await pausarTimer(timerExistente.id)
            toast.info('Timer pausado automaticamente')
          } catch (error) {
            console.error('Erro ao pausar timer:', error)
            toast.error('Erro ao pausar timer')
          }
        }
        await atualizarStatusTarefa(tarefaId, 'em_pausa')
        return
      }

      // CASO 1: Movendo para EM_ANDAMENTO
      if (novoStatus === 'em_andamento') {
        if (!timerExistente) {
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
            toast.info('Tarefa movida (sem timer — vincule a um processo/consulta para habilitar)')
          }
        } else if (timerExistente.status === 'pausado') {
          try {
            await retomarTimer(timerExistente.id)
            toast.success('Timer retomado automaticamente')
          } catch (error) {
            console.error('Erro ao retomar timer:', error)
            toast.error('Erro ao retomar timer')
          }
        }
      }

      // CASO 2: Movendo para CONCLUÍDA
      if (novoStatus === 'concluida') {
        if (tarefaTemVinculo(tarefa) && onTaskComplete) {
          if (timerExistente) {
            const segundos = timerExistente.tempo_atual
            const horas = Math.floor(segundos / 3600)
            const minutos = Math.floor((segundos % 3600) / 60)
            onTaskComplete(tarefa.id, {
              timerId: timerExistente.id,
              defaultHoras: horas,
              defaultMinutos: minutos,
              defaultAtividade: tarefa.titulo,
              entityType: 'tarefa',
            })
          } else {
            onTaskComplete(tarefa.id, {
              timerId: '',
              defaultAtividade: tarefa.titulo,
              entityType: 'tarefa',
            })
          }
          return
        } else if (timerExistente) {
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
        setConfirmDialog({
          open: true,
          tarefa,
          agendaItem: null,
          timerId: timerExistente.id,
        })
        return
      }

      await atualizarStatusTarefa(tarefaId, novoStatus)
      return
    }

    // ========================================
    // LÓGICA PARA EVENTOS/AUDIÊNCIAS
    // ========================================
    if (dragData?.tipo === 'evento' || dragData?.tipo === 'audiencia') {
      const item = dragData.item as AgendaCardItem
      const timerExistente = getTimerParaAgendaItem(item)
      const temVinculo = agendaItemTemVinculo(item)
      const tipoLabel = item.tipo === 'audiencia' ? 'Audiência' : 'Compromisso'

      // CASO: Movendo para EM_ANDAMENTO — Iniciar/retomar timer
      if (novoStatus === 'em_andamento') {
        if (!timerExistente) {
          if (temVinculo) {
            try {
              await iniciarTimer({
                titulo: item.titulo,
                descricao: `Trabalho: ${item.titulo}`,
                processo_id: item.processo_id || undefined,
                consulta_id: item.consultivo_id || undefined,
                evento_id: item.tipo === 'evento' ? item.id : undefined,
                audiencia_id: item.tipo === 'audiencia' ? item.id : undefined,
                faturavel: true,
              })
              toast.success('Timer iniciado automaticamente')
            } catch (error) {
              console.error('Erro ao iniciar timer:', error)
              toast.error('Erro ao iniciar timer')
            }
          } else {
            toast.info(`${tipoLabel} sem vínculo — vincule a um processo/consulta para habilitar timer`)
          }
        } else if (timerExistente.status === 'pausado') {
          try {
            await retomarTimer(timerExistente.id)
            toast.success('Timer retomado automaticamente')
          } catch (error) {
            console.error('Erro ao retomar timer:', error)
            toast.error('Erro ao retomar timer')
          }
        }
        // Sem mudança de status no DB — a coluna é derivada do timer
        return
      }

      // CASO: Movendo para EM_PAUSA — Pausar timer
      if (novoStatus === 'em_pausa') {
        if (timerExistente && timerExistente.status === 'rodando') {
          try {
            await pausarTimer(timerExistente.id)
            toast.info('Timer pausado automaticamente')
          } catch (error) {
            console.error('Erro ao pausar timer:', error)
            toast.error('Erro ao pausar timer')
          }
        }
        return
      }

      // CASO: Movendo para PENDENTE — Pausar/descartar timer
      if (novoStatus === 'pendente') {
        if (timerExistente) {
          setConfirmDialog({
            open: true,
            tarefa: null,
            agendaItem: item,
            timerId: timerExistente.id,
          })
          return
        }
        // Sem timer = não faz nada (já está em pendente no DB)
        return
      }

      // CASO: Movendo para CONCLUÍDA — Finalizar timer + atualizar status
      if (novoStatus === 'concluida') {
        if (temVinculo && onTaskComplete) {
          if (timerExistente) {
            const segundos = timerExistente.tempo_atual
            const horas = Math.floor(segundos / 3600)
            const minutos = Math.floor((segundos % 3600) / 60)
            onTaskComplete(item.id, {
              timerId: timerExistente.id,
              defaultHoras: horas,
              defaultMinutos: minutos,
              defaultAtividade: item.titulo,
              entityType: item.tipo,
            })
          } else {
            onTaskComplete(item.id, {
              timerId: '',
              defaultAtividade: item.titulo,
              entityType: item.tipo,
            })
          }
          return // Parent vai atualizar status após o modal
        } else if (timerExistente) {
          try {
            await finalizarTimer(timerExistente.id, {
              descricao: `${tipoLabel} concluído: ${item.titulo}`,
            })
            toast.success('Timer finalizado e horas registradas')
          } catch (error) {
            console.error('Erro ao finalizar timer:', error)
            toast.error('Erro ao finalizar timer')
          }
        }

        await concluirAgendaItem(item)
        return
      }
    }
  }

  const totalTarefas = pendente.length + em_andamento.length + em_pausa.length + concluida.length
  const totalAgenda = allAgendaPendente.length + agendaConcluida.length
  const totalItems = totalTarefas + totalAgenda

  const filterOptions: { key: KanbanFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'tarefa', label: 'Tarefas' },
    { key: 'audiencia', label: 'Audiências' },
    { key: 'evento', label: 'Compromissos' },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header de Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#34495e]">
            {isRangeActive
              ? `${format(dateRange!.from!, "d MMM", { locale: ptBR }).replace('.', '')} — ${format(dateRange!.to!, "d MMM", { locale: ptBR }).replace('.', '')}`
              : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={previousDay}
              className="h-7 w-7 p-0 border-slate-200"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextDay}
              className="h-7 w-7 p-0 border-slate-200"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-7 w-7 p-0 border-slate-200',
                  isRangeActive && 'border-[#89bcbe] bg-[#f0f9f9] text-[#89bcbe]'
                )}
                title="Selecionar período"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={1}
                defaultMonth={selectedDate}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-7 text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] px-2.5"
          >
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtros por tipo */}
          <div className="flex items-center gap-1">
            {filterOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                  activeFilter === key
                    ? 'bg-[#34495e] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {totalItems > 0 && (
            <span className="text-xs text-slate-400">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-3 h-[calc(100vh-300px)] min-h-[500px]">
          <KanbanColumn
            titulo="Pendente"
            icone={<ListTodo className="w-3.5 h-3.5 text-[#46627f]" />}
            status="pendente"
            tarefas={filterTarefas(pendente)}
            agendaItems={filterAgendaItems(agendaPendente)}
            corBarra="bg-[#34495e]"
            corIconeBg="bg-slate-100"
            onClickTarefa={onClickTarefa}
            onClickAgendaItem={handleClickAgendaItem}
            onCreateTarefa={() => onCreateTarefa('pendente')}
          />

          <KanbanColumn
            titulo="Em Andamento"
            icone={<PlayCircle className="w-3.5 h-3.5 text-[#89bcbe]" />}
            status="em_andamento"
            tarefas={filterTarefas(em_andamento)}
            agendaItems={filterAgendaItems(agendaEmAndamento)}
            corBarra="bg-[#89bcbe]"
            corIconeBg="bg-[#f0f9f9]"
            onClickTarefa={onClickTarefa}
            onClickAgendaItem={handleClickAgendaItem}
          />

          <KanbanColumn
            titulo="Em Pausa"
            icone={<PauseCircle className="w-3.5 h-3.5 text-amber-500" />}
            status="em_pausa"
            tarefas={filterTarefas(em_pausa)}
            agendaItems={filterAgendaItems(agendaEmPausa)}
            corBarra="bg-amber-400"
            corIconeBg="bg-amber-50"
            onClickTarefa={onClickTarefa}
            onClickAgendaItem={handleClickAgendaItem}
          />

          <KanbanColumn
            titulo="Concluída"
            icone={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            status="concluida"
            tarefas={filterTarefas(concluida)}
            agendaItems={filterAgendaItems(agendaConcluida)}
            corBarra="bg-emerald-500"
            corIconeBg="bg-emerald-50"
            onClickTarefa={onClickTarefa}
            onClickAgendaItem={handleClickAgendaItem}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTarefa && (
            <div className="rotate-3">
              <KanbanTaskCard tarefa={activeTarefa} onClick={() => {}} />
            </div>
          )}
          {activeAgendaItem && (
            <div className="rotate-3">
              <KanbanAgendaCard item={activeAgendaItem} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialog de confirmação ao mover item com timer ativo */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, tarefa: null, agendaItem: null, timerId: null })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Timer Ativo Detectado</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.tarefa
                ? 'Esta tarefa tem um timer em execução. O que deseja fazer com o tempo registrado?'
                : 'Este item tem um timer em execução. O que deseja fazer com o tempo registrado?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setConfirmDialog({ open: false, tarefa: null, agendaItem: null, timerId: null })}
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
