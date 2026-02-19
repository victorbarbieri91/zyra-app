'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Button } from '@/components/ui/button'
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
import {
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  Clock,
  Plus,
} from 'lucide-react'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, isSameDay, isBefore, startOfDay, isToday, isAfter, differenceInDays, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { parseDBDate, formatDateTimeForDB } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import { getEscritorioAtivo } from '@/lib/supabase/escritorio-helpers'

// Components
import CalendarGridDnD from '@/components/agenda/CalendarGridDnD'
import CalendarKanbanView from '@/components/agenda/CalendarKanbanView'
import CalendarDayView from '@/components/agenda/CalendarDayView'
import CalendarListView from '@/components/agenda/CalendarListView'
import SidebarDinamica from '@/components/agenda/SidebarDinamica'
import ResumoIA from '@/components/agenda/ResumoIA'
import AgendaFiltersCompact from '@/components/agenda/AgendaFiltersCompact'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import RecorrenciaDeleteModal from '@/components/agenda/RecorrenciaDeleteModal'
import { EventCardProps } from '@/components/agenda/EventCard'

// Hooks
import { useAgendaConsolidada } from '@/hooks/useAgendaConsolidada'
import { useTarefas, Tarefa, TarefaFormData } from '@/hooks/useTarefas'
import { useAudiencias, Audiencia, AudienciaFormData } from '@/hooks/useAudiencias'
import { useEventos, Evento, EventoFormData } from '@/hooks/useEventos'
import { useRecorrencias } from '@/hooks/useRecorrencias'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useTimer } from '@/contexts/TimerContext'

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile()
  const filtroUrl = searchParams.get('filtro')
  const filtroInicial = (filtroUrl === 'vencidos' || filtroUrl === 'hoje') ? filtroUrl : null

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>(filtroInicial ? 'list' : 'month')

  // On mobile, force list/day views (month and kanban not available)
  useEffect(() => {
    if (isMobile && (viewMode === 'month' || viewMode === 'week')) {
      setViewMode('list')
    }
  }, [isMobile, viewMode])
  const [viewInitialized, setViewInitialized] = useState(!!filtroInicial)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [urlFiltroAtivo, setUrlFiltroAtivo] = useState<'vencidos' | 'hoje' | null>(filtroInicial)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Preferências do usuário
  const { preferences, loading: preferencesLoading } = useUserPreferences()

  // Modais de visualização (detail)
  const [tarefaDetailOpen, setTarefaDetailOpen] = useState(false)
  const [audienciaDetailOpen, setAudienciaDetailOpen] = useState(false)
  const [eventoDetailOpen, setEventoDetailOpen] = useState(false)

  // Modais de edição (wizards)
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [audienciaModalOpen, setAudienciaModalOpen] = useState(false)
  const [eventoModalOpen, setEventoModalOpen] = useState(false)

  // Modal de horas (timesheet) para conclusão de tarefa
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false)
  const [tarefaParaConcluir, setTarefaParaConcluir] = useState<Tarefa | null>(null)
  const [confirmConcluirSemHoras, setConfirmConcluirSemHoras] = useState(false)
  const [horasRegistradasComSucesso, setHorasRegistradasComSucesso] = useState(false)
  // Ref para leitura síncrona do sucesso (evita race condition com state)
  const horasRegistradasRef = useRef(false)
  // Flag para diferenciar: lançamento de horas avulso vs conclusão de tarefa
  const [modoLancamentoAvulso, setModoLancamentoAvulso] = useState(false)
  // Tipo da entidade do item sendo lançado (tarefa, audiencia, evento) - para não passar tarefa_id indevido
  const [tipoEntidadeLancamento, setTipoEntidadeLancamento] = useState<string | null>(null)
  // Dados do timer para pré-preencher o modal de horas ao concluir via Kanban
  const [timerDataParaConcluir, setTimerDataParaConcluir] = useState<{
    timerId: string
    defaultHoras?: number
    defaultMinutos?: number
    defaultAtividade: string
  } | null>(null)

  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null)
  const [audienciaSelecionada, setAudienciaSelecionada] = useState<Audiencia | null>(null)
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null)

  // Modal de exclusão de recorrência (apenas esta vs todas)
  const [recorrenciaDeleteOpen, setRecorrenciaDeleteOpen] = useState(false)
  const [recorrenciaDeleteTarget, setRecorrenciaDeleteTarget] = useState<{
    itemId: string
    titulo: string
    tipo: 'tarefa' | 'evento'
    recorrenciaId: string
    dataOcorrencia: string
  } | null>(null)

  // Modal de aviso quando reagendar ultrapassa prazo fatal (sidebar)
  const [rescheduleWarningOpen, setRescheduleWarningOpen] = useState(false)
  const [pendingReschedule, setPendingReschedule] = useState<{
    taskId: string
    newDate: Date
    prazoFatal: Date
    distanciaOriginal: number
  } | null>(null)
  // Seletor de novo prazo fatal (sidebar)
  const [novoPrazoFatalSidebar, setNovoPrazoFatalSidebar] = useState<Date | null>(null)
  const [prazoFatalCalendarOpenSidebar, setPrazoFatalCalendarOpenSidebar] = useState(false)

  const [filters, setFilters] = useState({
    tipos: {
      compromisso: !filtroInicial,
      audiencia: !filtroInicial,
      prazo: true,
      tarefa: !filtroInicial ? true : true,
    },
    status: {
      agendado: true,
      realizado: false,
      cancelado: false,
    },
    responsaveis: [] as string[],
  })

  // Aplicar preferência de view do usuário
  useEffect(() => {
    if (!preferencesLoading && !viewInitialized) {
      setViewMode(preferences.agenda_view_padrao)
      setViewInitialized(true)
    }
  }, [preferencesLoading, preferences.agenda_view_padrao, viewInitialized])

  // Buscar escritório ativo ao carregar
  useEffect(() => {
    async function loadEscritorio() {
      const escritorio = await getEscritorioAtivo()
      if (escritorio) {
        setEscritorioId(escritorio.id)
      } else {
        console.warn('Nenhum escritório ativo encontrado')
      }
    }
    loadEscritorio()
  }, [])

  // Buscar usuário logado
  useEffect(() => {
    async function loadUser() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    loadUser()
  }, [])

  // Filtros para agenda consolidada - sempre filtra por responsável (usuário logado)
  const agendaFilters = useMemo(() => {
    if (userId) {
      return { responsavel_id: userId }
    }
    return undefined
  }, [userId])

  // Timer context - para descartar timer ao concluir tarefa via Kanban
  const { descartarTimer } = useTimer()

  // Hooks - usar agenda consolidada e hooks específicos
  const { items: agendaItems, loading, refreshItems } = useAgendaConsolidada(escritorioId || undefined, agendaFilters)
  const { tarefas, createTarefa, updateTarefa, concluirTarefa, reabrirTarefa, refreshTarefas } = useTarefas(escritorioId || undefined)
  const { audiencias, createAudiencia, updateAudiencia } = useAudiencias(escritorioId || undefined)
  const { eventos, createEvento, updateEvento } = useEventos(escritorioId || undefined)
  const { materializarInstancia, excluirOcorrencia, deactivateRecorrencia } = useRecorrencias(escritorioId || undefined)

  /**
   * Se o item é virtual (recorrência expandida), materializa no banco e retorna o ID real.
   * Caso contrário, retorna o ID original inalterado.
   */
  const materializarSeVirtual = useCallback(async (itemId: string): Promise<string> => {
    if (!itemId.startsWith('virtual_')) return itemId

    // Extrair recorrencia_id e data do ID virtual: "virtual_{recId}_{YYYY-MM-DD}"
    const parts = itemId.split('_')
    // parts = ['virtual', recorrencia_id, 'YYYY-MM-DD']
    const recorrenciaId = parts[1]
    const dataOcorrencia = parts[2]

    if (!recorrenciaId || !dataOcorrencia) {
      throw new Error('ID virtual inválido: ' + itemId)
    }

    const { id: realId } = await materializarInstancia(recorrenciaId, dataOcorrencia)

    // Refresh both data sources to show the materialized instance
    await Promise.all([refreshItems(), refreshTarefas()])

    return realId
  }, [materializarInstancia, refreshItems, refreshTarefas])

  // Converter items consolidados para formato do EventCard
  const eventosFormatados = useMemo((): EventCardProps[] => {
    const hoje = startOfDay(new Date())

    return agendaItems
      .filter(item => {
        // Mapear tipo_entidade para os filtros
        if (item.tipo_entidade === 'tarefa' && !filters.tipos.tarefa) return false
        if (item.tipo_entidade === 'audiencia' && !filters.tipos.audiencia) return false
        if (item.tipo_entidade === 'evento') {
          const isPrazo = item.subtipo === 'prazo_processual'
          if (isPrazo && !filters.tipos.prazo) return false
          if (!isPrazo && !filters.tipos.compromisso) return false
        }

        // Filtro de URL: prazos vencidos ou prazos de hoje
        if (urlFiltroAtivo) {
          const prazoLimite = item.prazo_data_limite ? parseDBDate(item.prazo_data_limite) : null
          const dataInicio = parseDBDate(item.data_inicio)

          if (urlFiltroAtivo === 'vencidos') {
            // Mostrar apenas itens com prazo vencido (antes de hoje) e não concluídos
            if (prazoLimite) {
              return isBefore(startOfDay(prazoLimite), hoje) && item.status !== 'concluida'
            }
            return isBefore(startOfDay(dataInicio), hoje) && item.status !== 'concluida' && item.status !== 'realizado'
          }
          if (urlFiltroAtivo === 'hoje') {
            // Mostrar apenas itens com prazo para hoje e não concluídos
            if (prazoLimite) {
              return isSameDay(prazoLimite, hoje) && item.status !== 'concluida'
            }
            return isSameDay(dataInicio, hoje) && item.status !== 'concluida' && item.status !== 'realizado'
          }
        }

        return true
      })
      .map(item => ({
        id: item.id,
        titulo: item.titulo,
        tipo: item.tipo_entidade === 'tarefa' ? 'tarefa' : item.tipo_entidade === 'audiencia' ? 'audiencia' : item.subtipo === 'prazo_processual' ? 'prazo' : 'compromisso',
        data_inicio: parseDBDate(item.data_inicio),
        data_fim: item.data_fim ? parseDBDate(item.data_fim) : undefined,
        dia_inteiro: item.dia_inteiro || false,
        local: item.local,
        responsavel_nome: item.responsavel_nome,
        processo_numero: item.processo_numero,
        status: (item.status || 'agendado') as EventCardProps['status'],
        prazo_criticidade: item.prioridade === 'alta' ? 'critico' : item.prioridade === 'media' ? 'atencao' : 'normal',
        prazo_data_limite: item.prazo_data_limite ? parseDBDate(item.prazo_data_limite) : undefined,
        prioridade: item.prioridade,
        subtipo: item.subtipo,
        recorrencia_id: item.recorrencia_id,
      }))
  }, [agendaItems, filters, urlFiltroAtivo])

  // Prioridade de exibição por tipo
  const tipoPrioridade: Record<string, number> = {
    audiencia: 0,
    prazo: 1,
    tarefa: 2,
    compromisso: 3,
  }

  // Helper para verificar urgência do prazo fatal
  // Apenas tarefas e prazos têm prazo_data_limite (audiências e compromissos não)
  const getUrgenciaPrazoFatal = (item: typeof agendaItems[0]): number => {
    // Só considerar prazo fatal para tarefas e prazos
    if (item.tipo_entidade !== 'tarefa' && item.subtipo !== 'prazo_processual') return 99
    if (!item.prazo_data_limite) return 99

    const prazoDate = parseDBDate(item.prazo_data_limite)
    const hoje = startOfDay(new Date())

    if (isBefore(prazoDate, hoje)) return 0 // Vencido - máxima prioridade
    if (isToday(prazoDate)) return 1 // Hoje - alta prioridade
    return 99 // Futuro - prioridade normal
  }

  // Eventos do dia selecionado (para sidebar) - com ordenação por urgência
  const eventosDoDia = useMemo(() => {
    return agendaItems
      .filter(item => isSameDay(parseDBDate(item.data_inicio), selectedDate))
      .sort((a, b) => {
        // Primeiro: ordenar por urgência do prazo fatal (vencido/hoje primeiro)
        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        // Segundo: ordenar por tipo (audiência primeiro)
        const tipoDisplayA = a.tipo_entidade === 'tarefa' ? 'tarefa' : a.tipo_entidade === 'audiencia' ? 'audiencia' : a.subtipo === 'prazo_processual' ? 'prazo' : 'compromisso'
        const tipoDisplayB = b.tipo_entidade === 'tarefa' ? 'tarefa' : b.tipo_entidade === 'audiencia' ? 'audiencia' : b.subtipo === 'prazo_processual' ? 'prazo' : 'compromisso'
        const prioridadeA = tipoPrioridade[tipoDisplayA] ?? 99
        const prioridadeB = tipoPrioridade[tipoDisplayB] ?? 99
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB

        // Terceiro: ordenar por horário
        const dataA = parseDBDate(a.data_inicio)
        const dataB = parseDBDate(b.data_inicio)
        return dataA.getTime() - dataB.getTime()
      })
  }, [agendaItems, selectedDate])

  // Estatísticas para ResumoIA
  const eventosCriticos = useMemo(() => {
    return eventosFormatados.filter(e =>
      e.tipo === 'prazo' && (e.prazo_criticidade === 'critico' || e.prazo_criticidade === 'urgente')
    ).length
  }, [eventosFormatados])

  const proximoEvento = useMemo(() => {
    const hoje = new Date()
    const proximosEventos = eventosFormatados
      .filter(e => e.data_inicio >= hoje)
      .sort((a, b) => a.data_inicio.getTime() - b.data_inicio.getTime())

    if (proximosEventos.length === 0) return undefined

    return {
      titulo: proximosEventos[0].titulo,
      horario: format(proximosEventos[0].data_inicio, 'HH:mm')
    }
  }, [eventosFormatados])

  const handleCreateEvent = (date?: Date, tipo?: 'compromisso' | 'audiencia' | 'tarefa') => {
    const dataInicio = date || selectedDate

    if (tipo === 'tarefa') {
      setTarefaSelecionada(null)
      setTarefaModalOpen(true)
    } else if (tipo === 'audiencia') {
      setAudienciaSelecionada(null)
      setAudienciaModalOpen(true)
    } else {
      setEventoSelecionado(null)
      setEventoModalOpen(true)
    }
  }

  const handleEventClick = (evento: EventCardProps) => {
    console.log('🔵 handleEventClick chamado', evento.tipo, evento.titulo)
    // Buscar dados completos do item na agenda consolidada (tem mais informações e é mais atualizado)
    const itemCompleto = agendaItems.find(item => item.id === evento.id)

    if (evento.tipo === 'tarefa') {
      // Primeiro tenta no array de tarefas carregado
      let tarefaCompleta = tarefas.find(t => t.id === evento.id)

      // Se não encontrar, usar dados da agenda consolidada como fallback
      if (!tarefaCompleta && itemCompleto) {
        console.log('🔵 Tarefa não encontrada no hook, usando dados da view consolidada')
        const item = itemCompleto as any
        tarefaCompleta = {
          id: item.id,
          escritorio_id: item.escritorio_id,
          titulo: item.titulo,
          descricao: item.descricao,
          tipo: item.subtipo || 'outro',
          prioridade: item.prioridade || 'media',
          status: item.status || 'pendente',
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          responsavel_id: item.responsavel_id,
          responsavel_nome: item.responsavel_nome,
          responsaveis_ids: item.responsaveis_ids || [],
          processo_id: item.processo_id,
          consultivo_id: item.consultivo_id,
          prazo_data_limite: item.prazo_data_limite,
          cor: item.cor,
          recorrencia_id: item.recorrencia_id,
          is_virtual: item.is_virtual,
          created_at: item.created_at,
          updated_at: item.updated_at,
        } as Tarefa
      } else if (tarefaCompleta && itemCompleto) {
        // Se encontrou em ambos, usar agendaItems para campos de data (é mais atualizado após refreshItems)
        const item = itemCompleto as any
        tarefaCompleta = {
          ...tarefaCompleta,
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          prazo_data_limite: item.prazo_data_limite,
          status: item.status || tarefaCompleta.status,
        }
        console.log('🔵 Mesclando dados da tarefa com dados atualizados da view consolidada')
      }

      if (tarefaCompleta) {
        setTarefaSelecionada(tarefaCompleta)
        setTarefaDetailOpen(true)
        console.log('🔵 Abrindo TarefaDetailModal com processo_id:', tarefaCompleta.processo_id)
      } else {
        console.warn('🔴 Tarefa não encontrada:', evento.id)
      }
    } else if (evento.tipo === 'audiencia') {
      let audienciaCompleta = audiencias.find(a => a.id === evento.id)

      // Fallback para dados da view consolidada
      if (!audienciaCompleta && itemCompleto) {
        console.log('🔵 Audiência não encontrada no hook, usando dados da view consolidada')
        const item = itemCompleto as any
        audienciaCompleta = {
          id: item.id,
          escritorio_id: item.escritorio_id,
          processo_id: item.processo_id,
          titulo: item.titulo,
          data_hora: item.data_inicio,
          tipo_audiencia: item.subtipo || 'outra',
          status: item.status || 'agendado',
          responsavel_id: item.responsavel_id,
          responsavel_nome: item.responsavel_nome,
          responsaveis_ids: item.responsaveis_ids || [],
          duracao_minutos: 60,
          modalidade: 'presencial',
          local: item.local,
          observacoes: item.descricao,
          created_at: item.created_at,
          updated_at: item.updated_at,
        } as unknown as Audiencia
      }

      if (audienciaCompleta) {
        setAudienciaSelecionada(audienciaCompleta)
        setAudienciaDetailOpen(true)
      } else {
        console.warn('🔴 Audiência não encontrada:', evento.id)
      }
    } else {
      // Para eventos/prazos, montar objeto compatível com EventoDetailModal
      let eventoCompleto = eventos.find(e => e.id === evento.id)

      if (!eventoCompleto && itemCompleto) {
        console.log('🔵 Evento não encontrado no hook, usando dados da view consolidada')
        const item = itemCompleto as any
        eventoCompleto = {
          id: item.id,
          escritorio_id: item.escritorio_id,
          titulo: item.titulo,
          descricao: item.descricao,
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          dia_inteiro: item.dia_inteiro,
          local: item.local,
          status: item.status || 'agendado',
          responsavel_id: item.responsavel_id,
          responsavel_nome: item.responsavel_nome,
          responsaveis_ids: item.responsaveis_ids || [],
          processo_id: item.processo_id,
          consultivo_id: item.consultivo_id,
          recorrencia_id: item.recorrencia_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        } as Evento
      }

      if (eventoCompleto && itemCompleto) {
        // Combinar dados do evento e da agenda consolidada
        const item = itemCompleto as any
        setEventoSelecionado({
          ...eventoCompleto,
          subtipo: item.subtipo,
          status: item.status,
          processo_numero: item.processo_numero,
          consultivo_titulo: item.consultivo_titulo,
          cliente_nome: item.cliente_nome,
          responsavel_nome: item.responsavel_nome,
          prazo_data_limite: item.prazo_data_limite,
        } as any)
        setEventoDetailOpen(true)
      } else {
        console.warn('🔴 Evento não encontrado:', evento.id)
      }
    }
  }

  // Handler para lançar horas manualmente (sem concluir)
  const handleLancarHoras = async (taskId: string) => {
    // Materializar se virtual antes de lançar horas
    const effectiveId = await materializarSeVirtual(taskId)

    // Buscar a tarefa
    let tarefa = tarefas.find(t => t.id === effectiveId)
    let tipoEntidade: string = 'tarefa'

    // Se não encontrou no hook, buscar na agenda consolidada
    if (!tarefa) {
      const itemCompleto = agendaItems.find(item => item.id === effectiveId || item.id === taskId)
      if (itemCompleto) {
        tipoEntidade = itemCompleto.tipo_entidade
        tarefa = {
          id: effectiveId,
          escritorio_id: itemCompleto.escritorio_id,
          titulo: itemCompleto.titulo,
          descricao: itemCompleto.descricao,
          tipo: itemCompleto.subtipo || 'outro',
          prioridade: itemCompleto.prioridade || 'media',
          status: itemCompleto.status || 'pendente',
          data_inicio: itemCompleto.data_inicio,
          data_fim: itemCompleto.data_fim,
          responsavel_id: itemCompleto.responsavel_id,
          responsavel_nome: itemCompleto.responsavel_nome,
          responsaveis_ids: (itemCompleto as any).responsaveis_ids || [],
          processo_id: itemCompleto.processo_id,
          consultivo_id: itemCompleto.consultivo_id,
          created_at: itemCompleto.created_at,
          updated_at: itemCompleto.updated_at,
        } as Tarefa
      }
    }

    if (!tarefa) {
      toast.error('Compromisso não encontrado')
      return
    }

    // Verificar se tem processo ou consulta vinculada
    if (!tarefa.processo_id && !tarefa.consultivo_id) {
      toast.error('Este compromisso não tem processo ou consulta vinculada. Vincule primeiro para lançar horas.')
      return
    }

    // Abrir modal de horas em modo avulso (sem concluir depois)
    setModoLancamentoAvulso(true)
    setTarefaParaConcluir(tarefa)
    setTipoEntidadeLancamento(tipoEntidade)
    setHorasRegistradasComSucesso(false)
    horasRegistradasRef.current = false
    setTimesheetModalOpen(true)
  }

  // Handler para conclusão rápida de tarefa (toggle)
  // timerData é passado pelo Kanban quando há timer ativo, para pré-preencher o modal
  const handleCompleteTask = async (
    taskId: string,
    timerData?: { timerId: string; defaultHoras?: number; defaultMinutos?: number; defaultAtividade: string }
  ) => {
    try {
      // Materializar se for instância virtual de recorrência
      const realId = await materializarSeVirtual(taskId)
      // Se foi materializado, usar o ID real daqui em diante
      const effectiveId = realId

      // Encontrar a tarefa para verificar o status atual
      let tarefa = tarefas.find(t => t.id === effectiveId)

      // Se não encontrou no hook, buscar na agenda consolidada
      if (!tarefa) {
        const itemCompleto = agendaItems.find(item => item.id === effectiveId || item.id === taskId)
        if (itemCompleto) {
          tarefa = {
            id: effectiveId,
            escritorio_id: itemCompleto.escritorio_id,
            titulo: itemCompleto.titulo,
            descricao: itemCompleto.descricao,
            tipo: itemCompleto.subtipo || 'outro',
            prioridade: itemCompleto.prioridade || 'media',
            status: itemCompleto.status || 'pendente',
            data_inicio: itemCompleto.data_inicio,
            data_fim: itemCompleto.data_fim,
            responsavel_id: itemCompleto.responsavel_id,
            responsavel_nome: itemCompleto.responsavel_nome,
            responsaveis_ids: (itemCompleto as any).responsaveis_ids || [],
            processo_id: itemCompleto.processo_id,
            consultivo_id: itemCompleto.consultivo_id,
            created_at: itemCompleto.created_at,
            updated_at: itemCompleto.updated_at,
          } as Tarefa
        }
      }

      if (tarefa?.status === 'concluida') {
        // Se já está concluída, reabrir diretamente
        await reabrirTarefa(effectiveId)
        await refreshItems()
        toast.success('Tarefa reaberta com sucesso!')
      } else if (tarefa?.processo_id || tarefa?.consultivo_id) {
        // Se tem processo ou consultivo vinculado, abrir modal de horas ANTES de concluir
        setModoLancamentoAvulso(false) // Modo conclusão - vai concluir após registrar horas
        setTarefaParaConcluir({ ...tarefa, id: effectiveId } as Tarefa)
        setTipoEntidadeLancamento('tarefa') // Conclusão é sempre de tarefa
        setHorasRegistradasComSucesso(false)
        horasRegistradasRef.current = false
        // Armazenar dados do timer para pré-preencher o modal
        setTimerDataParaConcluir(timerData || { timerId: '', defaultAtividade: tarefa?.titulo || '' })
        setTimesheetModalOpen(true)
      } else {
        // Se não tem vínculo, concluir diretamente
        // Se veio do Kanban com timer, descartar timer sem criar entry
        if (timerData?.timerId) {
          try { await descartarTimer(timerData.timerId) } catch {}
        }
        await concluirTarefa(effectiveId)
        await refreshItems()
        toast.success('Tarefa concluída com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao alterar status da tarefa:', error)
      toast.error('Erro ao alterar status da tarefa')
    }
  }

  // Handler quando o modal de horas é fechado (com sucesso)
  const handleTimesheetSuccess = async () => {
    // Atualiza ref imediatamente (leitura síncrona) e state (para re-renders)
    horasRegistradasRef.current = true
    setHorasRegistradasComSucesso(true)

    if (modoLancamentoAvulso) {
      // Modo avulso: apenas registrar horas, não concluir
      // Reabrir o modal de detalhe da tarefa para continuar trabalhando
      if (tarefaParaConcluir) {
        // Garantir que tarefaSelecionada está setada antes de reabrir
        setTarefaSelecionada(tarefaParaConcluir as Tarefa)
        setTarefaDetailOpen(true)
      }
      setTarefaParaConcluir(null)
      setModoLancamentoAvulso(false)
    } else if (tarefaParaConcluir) {
      // Modo conclusão: registrar horas E concluir
      try {
        // Descartar timer sem criar entry (o modal já criou via registrar_tempo_retroativo)
        if (timerDataParaConcluir?.timerId) {
          await descartarTimer(timerDataParaConcluir.timerId)
        }
        await concluirTarefa(tarefaParaConcluir.id)
        await refreshItems()
        toast.success('Tarefa concluída!')
      } catch (error) {
        console.error('Erro ao concluir tarefa após timesheet:', error)
        toast.error('Horas registradas, mas erro ao concluir tarefa')
      }
      setTarefaParaConcluir(null)
      setTimerDataParaConcluir(null)
    }
    // Nota: O TimesheetModal fecha o modal via onOpenChange(false) após onSuccess
  }

  // Handler quando o modal de horas é fechado sem registrar
  const handleTimesheetClose = (open: boolean) => {
    if (!open) {
      if (modoLancamentoAvulso && !horasRegistradasRef.current) {
        // Modo avulso: usuário cancelou, reabrir modal de detalhe
        if (tarefaParaConcluir) {
          setTarefaSelecionada(tarefaParaConcluir as Tarefa)
          setTarefaDetailOpen(true)
        }
        setTarefaParaConcluir(null)
        setTimerDataParaConcluir(null)
        setModoLancamentoAvulso(false)
      } else if (modoLancamentoAvulso && horasRegistradasRef.current) {
        // Modo avulso com sucesso: handleTimesheetSuccess já reabriu o modal
        // Apenas limpar estado residual
        setTarefaParaConcluir(null)
        setTimerDataParaConcluir(null)
        setModoLancamentoAvulso(false)
      } else if (tarefaParaConcluir && !horasRegistradasRef.current) {
        // Modo conclusão: modal foi fechado sem registrar horas - perguntar se quer concluir mesmo assim
        // Usa ref para leitura síncrona (evita race condition com state)
        // NÃO limpar timerData ainda - o dialog "concluir sem horas?" precisa dele
        setConfirmConcluirSemHoras(true)
      } else {
        // Já registrou com sucesso, apenas limpar estado
        setTarefaParaConcluir(null)
        setTimerDataParaConcluir(null)
      }
    }
    setTimesheetModalOpen(open)
  }

  // Handler para concluir sem registrar horas
  const handleConcluirSemHoras = async () => {
    if (tarefaParaConcluir) {
      try {
        // Descartar timer sem criar entry no timesheet
        if (timerDataParaConcluir?.timerId) {
          await descartarTimer(timerDataParaConcluir.timerId)
        }
        await concluirTarefa(tarefaParaConcluir.id)
        await refreshItems()
        toast.success('Tarefa concluída!')
      } catch (error) {
        console.error('Erro ao concluir tarefa:', error)
        toast.error('Erro ao concluir tarefa')
      }
    }
    setTarefaParaConcluir(null)
    setTimerDataParaConcluir(null)
    setConfirmConcluirSemHoras(false)
  }

  // Handler para cancelar conclusão
  const handleCancelarConclusao = () => {
    // Não descartar timer - usuário cancelou, timer permanece ativo
    setTarefaParaConcluir(null)
    setTimerDataParaConcluir(null)
    setConfirmConcluirSemHoras(false)
  }

  // Handler para reabrir tarefa
  const handleReopenTask = async (taskId: string) => {
    try {
      const effectiveId = await materializarSeVirtual(taskId)
      await reabrirTarefa(effectiveId)
      await refreshItems()
      toast.success('Tarefa reaberta com sucesso!')
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error)
      toast.error('Erro ao reabrir tarefa')
    }
  }

  // Handler para reagendar tarefa (com verificação de prazo fatal)
  const handleRescheduleTask = async (taskId: string, newDate: Date) => {
    // Materializar se virtual antes de reagendar
    const effectiveId = await materializarSeVirtual(taskId)

    // Encontrar a tarefa para verificar prazo fatal
    // Nota: agendaItems usa tipo_entidade da view v_agenda_consolidada
    const tarefa = agendaItems.find(item => (item.id === effectiveId || item.id === taskId) && item.tipo_entidade === 'tarefa')

    // Tarefas fixas não podem ser reagendadas
    if (tarefa?.subtipo === 'fixa') {
      toast.info('Tarefas fixas não podem ser reagendadas')
      return
    }

    if (tarefa?.prazo_data_limite) {
      const prazoFatal = parseDBDate(tarefa.prazo_data_limite)
      const novaDataSemHora = startOfDay(newDate)
      const prazoFatalSemHora = startOfDay(prazoFatal)

      // Se nova data ultrapassa prazo fatal, mostrar aviso
      if (isAfter(novaDataSemHora, prazoFatalSemHora)) {
        const dataInicioAtual = parseDBDate(tarefa.data_inicio)
        const distancia = differenceInDays(prazoFatalSemHora, startOfDay(dataInicioAtual))
        setPendingReschedule({
          taskId: effectiveId,
          newDate,
          prazoFatal,
          distanciaOriginal: Math.max(distancia, 0)
        })
        // Inicializar sugestão de novo prazo fatal
        setNovoPrazoFatalSidebar(addDays(newDate, Math.max(distancia, 0)))
        setRescheduleWarningOpen(true)
        return
      }
    }

    // Se não tem prazo fatal ou não ultrapassa, reagendar normalmente
    await executeRescheduleTask(effectiveId, newDate)
  }

  // Executa o reagendamento de fato
  const executeRescheduleTask = async (taskId: string, newDate: Date, newPrazoFatal?: Date) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const updateData: Record<string, string> = {
        data_inicio: formatDateTimeForDB(newDate)
      }

      // Se também estamos atualizando o prazo fatal
      if (newPrazoFatal) {
        updateData.prazo_data_limite = formatDateTimeForDB(newPrazoFatal)
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error

      // Atualizar ambas as fontes de dados para manter consistência
      await Promise.all([refreshItems(), refreshTarefas()])
      toast.success(newPrazoFatal ? 'Tarefa e prazo fatal reagendados!' : 'Tarefa reagendada com sucesso!')
    } catch (error) {
      console.error('Erro ao reagendar tarefa:', error)
      toast.error('Erro ao reagendar tarefa')
    }
  }

  // Handler para navegar para processo
  const handleProcessoClick = (processoId: string) => {
    // Navegar para página do processo
    window.location.href = `/dashboard/processos/${processoId}`
  }

  // Handler para navegar para consultivo
  const handleConsultivoClick = (consultivoId: string) => {
    // Navegar para página do consultivo
    window.location.href = `/dashboard/consultivo/${consultivoId}`
  }

  // Handlers para editar (fechar detail, abrir wizard)
  const handleEditTarefa = () => {
    console.log('🟡 handleEditTarefa chamado - abrindo TarefaWizard')
    setTarefaDetailOpen(false)
    setTarefaModalOpen(true)
  }

  const handleEditAudiencia = () => {
    setAudienciaDetailOpen(false)
    setAudienciaModalOpen(true)
  }

  const handleEditEvento = () => {
    setEventoDetailOpen(false)
    setEventoModalOpen(true)
  }

  // Handlers para deletar
  const handleDeleteTarefa = async (tarefaId: string) => {
    // Instâncias virtuais → fechar detail modal e abrir modal de exclusão de recorrência
    if (tarefaId.startsWith('virtual_')) {
      const parts = tarefaId.split('_')
      const recId = parts[1]
      const dataOc = parts[2]
      const tarefa = tarefas.find(t => t.id === tarefaId)
      // Fechar modais e sidebar ANTES de abrir o de exclusão (evita conflito de z-index e focus trap)
      setTarefaDetailOpen(false)
      setEventoDetailOpen(false)
      setSidebarOpen(false)
      // Pequeno delay para garantir que os modais/sidebar fecharam
      setTimeout(() => {
        setRecorrenciaDeleteTarget({
          itemId: tarefaId,
          titulo: tarefa?.titulo || 'Tarefa recorrente',
          tipo: 'tarefa',
          recorrenciaId: recId,
          dataOcorrencia: dataOc,
        })
        setRecorrenciaDeleteOpen(true)
      }, 150)
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_tarefas')
        .delete()
        .eq('id', tarefaId)

      if (error) throw error

      setTarefaDetailOpen(false)
      setTarefaSelecionada(null)
      await refreshItems()
      toast.success('Tarefa excluída com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
      toast.error('Erro ao excluir tarefa')
    }
  }

  const handleCancelarAudiencia = async (audienciaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta audiência?')) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_audiencias')
        .update({ status: 'cancelada' })
        .eq('id', audienciaId)

      if (error) throw error

      setAudienciaDetailOpen(false)
      await refreshItems()
      toast.success('Audiência cancelada com sucesso!')
    } catch (error) {
      console.error('Erro ao cancelar audiência:', error)
      toast.error('Erro ao cancelar audiência')
    }
  }

  const handleRealizarAudiencia = async (audienciaId: string) => {
    if (!confirm('Deseja marcar esta audiência como realizada?')) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_audiencias')
        .update({ status: 'realizada' })
        .eq('id', audienciaId)

      if (error) throw error

      setAudienciaDetailOpen(false)
      setAudienciaSelecionada(null)
      await refreshItems()
      toast.success('Audiência marcada como realizada!')
    } catch (error) {
      console.error('Erro ao marcar audiência como realizada:', error)
      toast.error('Erro ao marcar audiência como realizada')
    }
  }

  const handleReabrirAudiencia = async (audienciaId: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_audiencias')
        .update({ status: 'agendada' })
        .eq('id', audienciaId)

      if (error) throw error

      setAudienciaDetailOpen(false)
      setAudienciaSelecionada(null)
      await refreshItems()
      toast.success('Audiência reaberta!')
    } catch (error) {
      console.error('Erro ao reabrir audiência:', error)
      toast.error('Erro ao reabrir audiência')
    }
  }

  const handleMarcarEventoCumprido = async (eventoId: string) => {
    if (!confirm('Deseja marcar este evento/prazo como cumprido?')) return

    try {
      const effectiveId = await materializarSeVirtual(eventoId)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_eventos')
        .update({ status: 'realizado' })
        .eq('id', effectiveId)

      if (error) throw error

      setEventoDetailOpen(false)
      setEventoSelecionado(null)
      await refreshItems()
      toast.success('Evento marcado como cumprido!')
    } catch (error) {
      console.error('Erro ao marcar evento como cumprido:', error)
      toast.error('Erro ao marcar evento como cumprido')
    }
  }

  const handleReabrirEvento = async (eventoId: string) => {
    try {
      const effectiveId = await materializarSeVirtual(eventoId)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_eventos')
        .update({ status: 'agendado' })
        .eq('id', effectiveId)

      if (error) throw error

      setEventoDetailOpen(false)
      setEventoSelecionado(null)
      await refreshItems()
      toast.success('Evento reaberto!')
    } catch (error) {
      console.error('Erro ao reabrir evento:', error)
      toast.error('Erro ao reabrir evento')
    }
  }

  const handleCancelarEvento = async (eventoId: string) => {
    // Instâncias virtuais → fechar modal de detalhe primeiro, depois abrir modal de exclusão
    if (eventoId.startsWith('virtual_')) {
      const parts = eventoId.split('_')
      const recId = parts[1]
      const dataOc = parts[2]
      const titulo = eventoSelecionado?.titulo || 'Evento recorrente'
      // Fechar modais e sidebar antes para evitar conflito de z-index e focus trap
      setTarefaDetailOpen(false)
      setEventoDetailOpen(false)
      setSidebarOpen(false)
      setTimeout(() => {
        setRecorrenciaDeleteTarget({
          itemId: eventoId,
          titulo,
          tipo: 'evento',
          recorrenciaId: recId,
          dataOcorrencia: dataOc,
        })
        setRecorrenciaDeleteOpen(true)
      }, 150)
      return
    }

    if (!confirm('Tem certeza que deseja cancelar este evento?')) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_eventos')
        .update({ status: 'cancelado' })
        .eq('id', eventoId)

      if (error) throw error

      setEventoDetailOpen(false)
      await refreshItems()
      toast.success('Evento cancelado com sucesso!')
    } catch (error) {
      console.error('Erro ao cancelar evento:', error)
      toast.error('Erro ao cancelar evento')
    }
  }

  // Handler para o modal de exclusão de recorrência
  const handleRecorrenciaDeleteEsta = async () => {
    if (!recorrenciaDeleteTarget) return
    try {
      await excluirOcorrencia(recorrenciaDeleteTarget.recorrenciaId, recorrenciaDeleteTarget.dataOcorrencia)
      setRecorrenciaDeleteOpen(false)
      setRecorrenciaDeleteTarget(null)
      setTarefaDetailOpen(false)
      setTarefaSelecionada(null)
      setEventoDetailOpen(false)
      setEventoSelecionado(null)
      await Promise.all([refreshItems(), refreshTarefas()])
      toast.success('Ocorrência removida')
    } catch (error) {
      console.error('Erro ao excluir ocorrência:', error)
      toast.error('Erro ao excluir ocorrência')
    }
  }

  const handleRecorrenciaDeleteTodas = async () => {
    if (!recorrenciaDeleteTarget) return
    try {
      await deactivateRecorrencia(recorrenciaDeleteTarget.recorrenciaId)
      setRecorrenciaDeleteOpen(false)
      setRecorrenciaDeleteTarget(null)
      setTarefaDetailOpen(false)
      setTarefaSelecionada(null)
      setEventoDetailOpen(false)
      setEventoSelecionado(null)
      await Promise.all([refreshItems(), refreshTarefas()])
      toast.success('Recorrência desativada — nenhuma nova ocorrência será exibida')
    } catch (error) {
      console.error('Erro ao desativar recorrência:', error)
      toast.error('Erro ao desativar recorrência')
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Abrir sidebar apenas na view de mês
    if (viewMode === 'month') {
      setSidebarOpen(true)
    }
  }

  const handleEventMove = async (eventId: string, newDate: Date) => {
    try {
      // Materializar se virtual antes de mover
      const effectiveId = await materializarSeVirtual(eventId)

      // Encontrar o evento nos dados consolidados
      const evento = agendaItems.find(item => item.id === effectiveId || item.id === eventId)
      if (!evento) {
        throw new Error('Evento não encontrado')
      }

      // Tarefas fixas não podem ser movidas
      if (evento.tipo_entidade === 'tarefa' && evento.subtipo === 'fixa') {
        toast.info('Tarefas fixas não podem ser reagendadas')
        return
      }

      // Pegar a data e hora original
      const originalDate = parseDBDate(evento.data_inicio)
      const originalEnd = evento.data_fim ? parseDBDate(evento.data_fim) : null

      // Criar nova data mantendo o horário original
      const newDateTime = new Date(newDate)
      newDateTime.setHours(originalDate.getHours())
      newDateTime.setMinutes(originalDate.getMinutes())
      newDateTime.setSeconds(originalDate.getSeconds())
      newDateTime.setMilliseconds(originalDate.getMilliseconds())

      // Se tem data fim, calcular a diferença e aplicar na nova data
      const newEndDateTime = originalEnd ? (() => {
        const timeDiff = originalEnd.getTime() - originalDate.getTime()
        return new Date(newDateTime.getTime() + timeDiff)
      })() : null

      // Atualizar no banco de dados baseado no tipo
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      let updateResult
      if (evento.tipo_entidade === 'tarefa') {
        updateResult = await supabase
          .from('agenda_tarefas')
          .update({
            data_inicio: newDateTime.toISOString(),
            data_fim: newEndDateTime?.toISOString() || null,
          })
          .eq('id', effectiveId)
      } else if (evento.tipo_entidade === 'audiencia') {
        updateResult = await supabase
          .from('agenda_audiencias')
          .update({
            data_hora: newDateTime.toISOString(),
          })
          .eq('id', effectiveId)
      } else if (evento.tipo_entidade === 'evento') {
        updateResult = await supabase
          .from('agenda_eventos')
          .update({
            data_inicio: newDateTime.toISOString(),
            data_fim: newEndDateTime?.toISOString() || null,
          })
          .eq('id', effectiveId)
      }

      if (updateResult?.error) {
        throw updateResult.error
      }

      // Pequeno delay para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 300))

      // Atualizar os dados localmente para feedback imediato
      await Promise.all([refreshItems(), refreshTarefas()])

    } catch (error) {
      console.error('Erro ao mover evento:', error)
      throw error
    }
  }

  // Handler para mover evento junto com prazo fatal (usado no drag and drop)
  const handleEventMoveWithPrazoFatal = async (eventId: string, newDate: Date, newPrazoFatal: Date) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('agenda_tarefas')
        .update({
          data_inicio: newDate.toISOString(),
          prazo_data_limite: newPrazoFatal.toISOString(),
        })
        .eq('id', eventId)

      if (error) throw error

      // Pequeno delay para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 300))

      // Atualizar os dados localmente para feedback imediato
      await Promise.all([refreshItems(), refreshTarefas()])

    } catch (error) {
      console.error('Erro ao mover tarefa com prazo fatal:', error)
      throw error
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          {/* Linha 1: Título */}
          <div className="mb-3 md:mb-4">
            <h1 className="text-xl md:text-2xl font-semibold text-[#34495e]">Agenda</h1>
            <p className="text-xs md:text-sm text-[#6c757d] mt-0.5 font-normal">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Linha 2: Botões de Ação e View Mode Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2 md:py-3">
            {/* Botões de Ação Rápida - scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Button
                size="sm"
                onClick={() => handleCreateEvent(undefined, 'compromisso')}
                className="h-8 min-w-[110px] md:w-[130px] text-xs bg-gradient-to-br from-[#aacfd0] to-[#89bcbe] hover:from-[#89bcbe] hover:to-[#6ba9ab] active:from-[#6ba9ab] text-[#34495e] border-0 shadow-sm whitespace-nowrap"
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                Compromisso
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreateEvent(undefined, 'audiencia')}
                className="h-8 min-w-[100px] md:w-[130px] text-xs bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-700 text-white border-0 shadow-sm whitespace-nowrap"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Audiência
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreateEvent(undefined, 'tarefa')}
                className="h-8 min-w-[100px] md:w-[130px] text-xs bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] active:from-[#2c3e50] text-white border-0 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nova Tarefa
              </Button>
            </div>

            {/* View Mode Selector - Mobile: only list/day. Desktop: all 4 */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
              <TabsList className="bg-white border border-slate-200 shadow-sm p-1">
                <TabsTrigger
                  value="month"
                  className="hidden md:flex text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Mês
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="hidden md:flex text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="day"
                  className="text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Clock className="w-4 h-4 mr-1 md:mr-2" />
                  Dia
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <List className="w-4 h-4 mr-1 md:mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Banner de filtro ativo da URL */}
        {urlFiltroAtivo && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-sm text-amber-800 font-medium">
                {urlFiltroAtivo === 'vencidos'
                  ? `Mostrando prazos vencidos (${eventosFormatados.length})`
                  : `Mostrando prazos de hoje (${eventosFormatados.length})`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrlFiltroAtivo(null)
                setFilters(prev => ({
                  ...prev,
                  tipos: {
                    compromisso: true,
                    audiencia: true,
                    prazo: true,
                    tarefa: true,
                  },
                }))
                router.replace('/dashboard/agenda')
              }}
              className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7"
            >
              Limpar filtro
            </Button>
          </div>
        )}

        {/* Layout Principal - Largura Completa */}
        {loading ? (
          <div className="border border-slate-200 rounded-lg p-8 text-center bg-white">
            <p className="text-sm text-[#6c757d]">Carregando eventos...</p>
          </div>
        ) : (
          <>
            {viewMode === 'month' && (
              <CalendarGridDnD
                eventos={eventosFormatados}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onEventMove={handleEventMove}
                onEventMoveWithPrazoFatal={handleEventMoveWithPrazoFatal}
                onEventClick={handleEventClick}
                feriados={[]}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {viewMode === 'week' && (
              <CalendarKanbanView
                escritorioId={escritorioId || undefined}
                userId={userId || undefined}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onClickTarefa={(tarefa) => {
                  setTarefaSelecionada(tarefa)
                  setTarefaDetailOpen(true)
                }}
                onClickEvento={(evento) => {
                  setEventoSelecionado(evento)
                  setEventoDetailOpen(true)
                }}
                onClickAudiencia={(audiencia) => {
                  setAudienciaSelecionada(audiencia)
                  setAudienciaDetailOpen(true)
                }}
                onCreateTarefa={(status) => {
                  setTarefaSelecionada(null)
                  setTarefaModalOpen(true)
                }}
                onTaskComplete={handleCompleteTask}
              />
            )}

            {viewMode === 'day' && (
              <CalendarDayView
                escritorioId={escritorioId || undefined}
                userId={userId || undefined}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onEventClick={(agendaItem) => {
                  // Identificar o tipo de item e abrir o modal correto
                  if (agendaItem.tipo_entidade === 'tarefa') {
                    // Buscar tarefa completa
                    const tarefa = tarefas.find(t => t.id === agendaItem.id)
                    if (tarefa) {
                      setTarefaSelecionada(tarefa)
                      setTarefaDetailOpen(true)
                    }
                  } else if (agendaItem.tipo_entidade === 'audiencia') {
                    // Buscar audiência completa
                    const audiencia = audiencias.find(a => a.id === agendaItem.id)
                    if (audiencia) {
                      setAudienciaSelecionada(audiencia)
                      setAudienciaDetailOpen(true)
                    }
                  } else if (agendaItem.tipo_entidade === 'evento') {
                    // Buscar evento completo
                    const evento = eventos.find(e => e.id === agendaItem.id)
                    if (evento) {
                      setEventoSelecionado(evento)
                      setEventoDetailOpen(true)
                    }
                  }
                }}
                onTaskClick={(tarefa) => {
                  setTarefaSelecionada(tarefa)
                  setTarefaDetailOpen(true)
                }}
                onTaskComplete={handleCompleteTask}
              />
            )}

            {viewMode === 'list' && (
              <CalendarListView
                escritorioId={escritorioId || undefined}
                userId={userId || undefined}
                onTarefaClick={(tarefa) => {
                  setTarefaSelecionada(tarefa)
                  setTarefaDetailOpen(true)
                }}
                onAudienciaClick={(audiencia) => {
                  setAudienciaSelecionada(audiencia)
                  setAudienciaDetailOpen(true)
                }}
                onEventoClick={(evento) => {
                  setEventoSelecionado(evento)
                  setEventoDetailOpen(true)
                }}
                onTaskComplete={handleCompleteTask}
                onAudienciaComplete={handleRealizarAudiencia}
                onEventoComplete={handleMarcarEventoCumprido}
              />
            )}
          </>
        )}

      {/* Sidebar Dinâmica (apenas para view de mês) */}
      <SidebarDinamica
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedDate={selectedDate}
        eventos={eventosDoDia}
        onEventClick={(agendaItem) => {
          // Converter AgendaItem para EventCardProps para manter compatibilidade
          const eventoProps: EventCardProps = {
            id: agendaItem.id,
            titulo: agendaItem.titulo,
            tipo: agendaItem.tipo_entidade === 'tarefa' ? 'tarefa' : agendaItem.tipo_entidade === 'audiencia' ? 'audiencia' : agendaItem.subtipo === 'prazo_processual' ? 'prazo' : 'compromisso',
            data_inicio: parseDBDate(agendaItem.data_inicio),
            data_fim: agendaItem.data_fim ? parseDBDate(agendaItem.data_fim) : undefined,
            dia_inteiro: agendaItem.dia_inteiro,
            local: agendaItem.local,
            responsavel_nome: agendaItem.responsavel_nome,
            status: agendaItem.status as EventCardProps['status'],
          }
          handleEventClick(eventoProps)
        }}
        onCompleteTask={handleCompleteTask}
        onReopenTask={handleReopenTask}
        onCompleteAudiencia={(id) => handleRealizarAudiencia(id)}
        onReopenAudiencia={(id) => handleReabrirAudiencia(id)}
        onCompleteEvento={(id) => handleMarcarEventoCumprido(id)}
        onReopenEvento={(id) => handleReabrirEvento(id)}
        onLancarHoras={handleLancarHoras}
        onRescheduleTask={handleRescheduleTask}
        onProcessoClick={handleProcessoClick}
        onConsultivoClick={handleConsultivoClick}
      />

      {/* Modais de Detalhes */}
      {tarefaSelecionada && (
        <TarefaDetailModal
          open={tarefaDetailOpen}
          onOpenChange={(open) => {
            setTarefaDetailOpen(open)
            // Só limpa a tarefa selecionada se o modal de edição NÃO estiver aberto
            // (evita limpar quando estamos transitando para edição)
            if (!open && !tarefaModalOpen) {
              setTarefaSelecionada(null)
            }
          }}
          tarefa={tarefaSelecionada}
          onEdit={handleEditTarefa}
          onDelete={() => handleDeleteTarefa(tarefaSelecionada.id)}
          onConcluir={() => handleCompleteTask(tarefaSelecionada.id)}
          onReabrir={() => handleReopenTask(tarefaSelecionada.id)}
          onLancarHoras={() => {
            setTarefaDetailOpen(false) // Fechar modal de detalhes
            handleLancarHoras(tarefaSelecionada.id)
          }}
          onProcessoClick={handleProcessoClick}
          onConsultivoClick={handleConsultivoClick}
          onUpdate={async () => {
            // Atualizar ambas as fontes de dados
            await Promise.all([refreshItems(), refreshTarefas()])

            // Buscar dados atualizados da tarefa diretamente do banco
            if (tarefaSelecionada) {
              const { createClient } = await import('@/lib/supabase/client')
              const supabase = createClient()
              const { data } = await supabase
                .from('agenda_tarefas')
                .select(`
                  *,
                  responsavel:profiles!responsavel_id(nome_completo)
                `)
                .eq('id', tarefaSelecionada.id)
                .single()

              if (data) {
                setTarefaSelecionada({
                  ...data,
                  responsavel_nome: data.responsavel?.nome_completo,
                } as Tarefa)
              }
            }
          }}
        />
      )}

      {audienciaSelecionada && (
        <AudienciaDetailModal
          open={audienciaDetailOpen}
          onOpenChange={(open) => {
            setAudienciaDetailOpen(open)
            if (!open) {
              setAudienciaSelecionada(null)
            }
          }}
          audiencia={{
            ...audienciaSelecionada,
            data_inicio: audienciaSelecionada.data_hora,
            tipo_audiencia: audienciaSelecionada.tipo_audiencia,
            status: audienciaSelecionada.status === 'adiada' ? 'remarcada' : audienciaSelecionada.status,
            juiz_nome: audienciaSelecionada.juiz,
            promotor_nome: audienciaSelecionada.promotor,
          } as any}
          onEdit={handleEditAudiencia}
          onCancelar={() => handleCancelarAudiencia(audienciaSelecionada.id)}
          onRealizar={() => handleRealizarAudiencia(audienciaSelecionada.id)}
          onReabrir={() => handleReabrirAudiencia(audienciaSelecionada.id)}
          onProcessoClick={handleProcessoClick}
        />
      )}

      {eventoSelecionado && (
        <EventoDetailModal
          open={eventoDetailOpen}
          onOpenChange={(open) => {
            setEventoDetailOpen(open)
            if (!open) {
              setEventoSelecionado(null)
            }
          }}
          evento={eventoSelecionado as any}
          onEdit={handleEditEvento}
          onCancelar={() => handleCancelarEvento(eventoSelecionado.id)}
          onMarcarCumprido={() => handleMarcarEventoCumprido(eventoSelecionado.id)}
          onReabrir={() => handleReabrirEvento(eventoSelecionado.id)}
          onProcessoClick={handleProcessoClick}
          onConsultivoClick={handleConsultivoClick}
        />
      )}

      {/* Wizards */}
      {tarefaModalOpen && escritorioId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setTarefaModalOpen(false)
            setTarefaSelecionada(null)
          }}
          onSubmit={tarefaSelecionada ? async (data: TarefaFormData) => {
            // Só usado para edição - atualiza a tarefa
            await updateTarefa(tarefaSelecionada.id, data)
            toast.success('Tarefa atualizada com sucesso!')
          } : undefined}
          onCreated={async () => {
            // Usado tanto na criação quanto na edição para atualizar a lista
            if (!tarefaSelecionada) {
              toast.success('Tarefa criada com sucesso!')
            }
            await refreshItems()
          }}
          initialData={tarefaSelecionada || undefined}
        />
      )}

      {audienciaModalOpen && escritorioId && (
        <AudienciaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setAudienciaModalOpen(false)
            setAudienciaSelecionada(null)
          }}
          onSubmit={async () => {
            // O wizard agora cria/atualiza a audiência diretamente usando useAudiencias
            // Este callback é apenas para refresh da lista
            await refreshItems()
          }}
          initialData={audienciaSelecionada || undefined}
        />
      )}

      {eventoModalOpen && escritorioId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => {
            setEventoModalOpen(false)
            setEventoSelecionado(null)
          }}
          onSubmit={async () => {
            // O wizard agora cria/atualiza o evento diretamente usando useEventos
            // Este callback é apenas para refresh da lista
            await refreshItems()
          }}
          initialData={eventoSelecionado || undefined}
        />
      )}

      {/* Modal de Lançamento de Horas */}
      <TimesheetModal
        open={timesheetModalOpen}
        onOpenChange={handleTimesheetClose}
        processoId={tarefaParaConcluir?.processo_id || undefined}
        consultaId={tarefaParaConcluir?.consultivo_id || undefined}
        tarefaId={tipoEntidadeLancamento === 'tarefa' ? tarefaParaConcluir?.id : undefined}
        audienciaId={tipoEntidadeLancamento === 'audiencia' ? tarefaParaConcluir?.id : undefined}
        eventoId={tipoEntidadeLancamento === 'evento' ? tarefaParaConcluir?.id : undefined}
        defaultModoRegistro="duracao"
        defaultDuracaoHoras={timerDataParaConcluir?.defaultHoras}
        defaultDuracaoMinutos={timerDataParaConcluir?.defaultMinutos}
        defaultAtividade={timerDataParaConcluir?.defaultAtividade}
        onSuccess={handleTimesheetSuccess}
      />

      {/* Dialog de Confirmação - Concluir sem Lançar Horas */}
      <AlertDialog open={confirmConcluirSemHoras} onOpenChange={setConfirmConcluirSemHoras}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir sem lançar horas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você fechou o modal sem registrar as horas trabalhadas.
              Deseja concluir a tarefa mesmo assim ou cancelar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelarConclusao}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConcluirSemHoras}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Concluir sem horas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Aviso - Reagendamento Ultrapassa Prazo Fatal (Sidebar) */}
      <AlertDialog open={rescheduleWarningOpen} onOpenChange={(open) => {
        setRescheduleWarningOpen(open)
        if (!open) {
          setPendingReschedule(null)
          setNovoPrazoFatalSidebar(null)
          setPrazoFatalCalendarOpenSidebar(false)
        }
      }}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden border-0 z-[100]">
          <div className="bg-white rounded-lg">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f9f9] flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-[#89bcbe]" />
                </div>
                <div>
                  <AlertDialogTitle className="text-base font-semibold text-[#34495e]">
                    Reagendar Prazo Fatal
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-[#46627f] mt-0.5">
                    A nova data de execução é posterior ao prazo fatal atual
                  </AlertDialogDescription>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Info das datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#f0f9f9] rounded-lg border border-[#89bcbe]/30">
                  <p className="text-[10px] text-[#46627f] mb-1">Nova Data Execução</p>
                  <p className="text-sm font-semibold text-[#34495e]">
                    {pendingReschedule?.newDate && format(pendingReschedule.newDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 mb-1">Prazo Fatal Atual</p>
                  <p className="text-sm font-semibold text-[#34495e]">
                    {pendingReschedule?.prazoFatal && format(pendingReschedule.prazoFatal, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Seletor de novo prazo fatal */}
              <div>
                <p className="text-xs text-[#46627f] mb-2">
                  Selecione o novo prazo fatal:
                </p>
                <Popover open={prazoFatalCalendarOpenSidebar} onOpenChange={setPrazoFatalCalendarOpenSidebar}>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                        "bg-[#e8f5f5] border-[#89bcbe]/40 hover:border-[#89bcbe]"
                      )}
                    >
                      <div className="text-left">
                        <p className="text-[10px] text-[#46627f] mb-0.5">Novo Prazo Fatal</p>
                        <p className="text-sm font-semibold text-[#34495e]">
                          {novoPrazoFatalSidebar ? format(novoPrazoFatalSidebar, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                        </p>
                      </div>
                      <CalendarIcon className="w-4 h-4 text-[#89bcbe]" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={novoPrazoFatalSidebar || undefined}
                      onSelect={(date) => {
                        if (date) {
                          setNovoPrazoFatalSidebar(date)
                          setPrazoFatalCalendarOpenSidebar(false)
                        }
                      }}
                      disabled={(date) => pendingReschedule?.newDate ? date < pendingReschedule.newDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRescheduleWarningOpen(false)
                    setPendingReschedule(null)
                    setNovoPrazoFatalSidebar(null)
                  }}
                  className="flex-1 h-9 text-xs font-medium border-slate-200 hover:bg-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (pendingReschedule && novoPrazoFatalSidebar) {
                      setRescheduleWarningOpen(false)
                      await executeRescheduleTask(pendingReschedule.taskId, pendingReschedule.newDate, novoPrazoFatalSidebar)
                      setPendingReschedule(null)
                      setNovoPrazoFatalSidebar(null)
                    }
                  }}
                  className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!novoPrazoFatalSidebar}
                >
                  Confirmar e Reagendar
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Exclusão de Recorrência */}
      <RecorrenciaDeleteModal
        open={recorrenciaDeleteOpen}
        onOpenChange={setRecorrenciaDeleteOpen}
        titulo={recorrenciaDeleteTarget?.titulo || ''}
        tipo={recorrenciaDeleteTarget?.tipo || 'tarefa'}
        onDeleteEsta={handleRecorrenciaDeleteEsta}
        onDeleteTodas={handleRecorrenciaDeleteTodas}
      />
    </div>
  )
}
