'use client'

import { useState, useMemo, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  CalendarDays,
  List,
  Clock,
  Plus,
} from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
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
import { EventCardProps } from '@/components/agenda/EventCard'

// Hooks
import { useAgendaConsolidada } from '@/hooks/useAgendaConsolidada'
import { useTarefas, Tarefa, TarefaFormData } from '@/hooks/useTarefas'
import { useAudiencias, Audiencia, AudienciaFormData } from '@/hooks/useAudiencias'
import { useEventos, Evento, EventoFormData } from '@/hooks/useEventos'
import { useUserPreferences } from '@/hooks/useUserPreferences'

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month')
  const [viewInitialized, setViewInitialized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null)
  const [audienciaSelecionada, setAudienciaSelecionada] = useState<Audiencia | null>(null)
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null)

  const [filters, setFilters] = useState({
    tipos: {
      compromisso: true,
      audiencia: true,
      prazo: true,
      tarefa: true,
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

  // Hooks - usar agenda consolidada e hooks específicos
  const { items: agendaItems, loading, refreshItems } = useAgendaConsolidada(escritorioId || undefined)
  const { tarefas, createTarefa, updateTarefa, concluirTarefa, reabrirTarefa } = useTarefas(escritorioId || undefined)
  const { audiencias, createAudiencia, updateAudiencia } = useAudiencias(escritorioId || undefined)
  const { eventos, createEvento, updateEvento } = useEventos(escritorioId || undefined)

  // Converter items consolidados para formato do EventCard
  const eventosFormatados = useMemo((): EventCardProps[] => {
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
        return true
      })
      .map(item => ({
        id: item.id,
        titulo: item.titulo,
        tipo: item.tipo_entidade === 'tarefa' ? 'tarefa' : item.tipo_entidade === 'audiencia' ? 'audiencia' : item.subtipo === 'prazo_processual' ? 'prazo' : 'compromisso',
        data_inicio: new Date(item.data_inicio),
        data_fim: item.data_fim ? new Date(item.data_fim) : undefined,
        dia_inteiro: item.dia_inteiro || false,
        local: item.local,
        responsavel_nome: item.responsavel_nome,
        status: (item.status || 'agendado') as EventCardProps['status'],
        prazo_criticidade: item.prioridade === 'alta' ? 'critico' : item.prioridade === 'media' ? 'atencao' : 'normal',
        recorrencia_id: item.recorrencia_id,
      }))
  }, [agendaItems, filters])

  // Eventos do dia selecionado (para sidebar) - usar agendaItems diretamente
  const eventosDoDia = useMemo(() => {
    return agendaItems.filter(item =>
      isSameDay(new Date(item.data_inicio), selectedDate)
    )
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
    // Buscar dados completos do item na agenda consolidada (tem mais informações)
    const itemCompleto = agendaItems.find(item => item.id === evento.id)

    if (evento.tipo === 'tarefa') {
      const tarefaCompleta = tarefas.find(t => t.id === evento.id)
      if (tarefaCompleta) {
        setTarefaSelecionada(tarefaCompleta)
        console.log('🔵 Abrindo TarefaDetailModal')
      }
      setTarefaDetailOpen(true)
    } else if (evento.tipo === 'audiencia') {
      const audienciaCompleta = audiencias.find(a => a.id === evento.id)
      if (audienciaCompleta) {
        setAudienciaSelecionada(audienciaCompleta)
      }
      setAudienciaDetailOpen(true)
    } else {
      // Para eventos/prazos, montar objeto compatível com EventoDetailModal
      const eventoCompleto = eventos.find(e => e.id === evento.id)
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
      }
      setEventoDetailOpen(true)
    }
  }

  // Handler para conclusão rápida de tarefa (toggle)
  const handleCompleteTask = async (taskId: string) => {
    try {
      // Encontrar a tarefa para verificar o status atual
      const tarefa = tarefas.find(t => t.id === taskId)

      if (tarefa?.status === 'concluida') {
        // Se já está concluída, reabrir
        await reabrirTarefa(taskId)
        await refreshItems()
        toast.success('Tarefa reaberta com sucesso!')
      } else {
        // Se não está concluída, concluir
        await concluirTarefa(taskId)
        await refreshItems()
        toast.success('Tarefa concluída com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao alterar status da tarefa:', error)
      toast.error('Erro ao alterar status da tarefa')
    }
  }

  // Handler para reabrir tarefa
  const handleReopenTask = async (taskId: string) => {
    try {
      await reabrirTarefa(taskId)
      await refreshItems()
      toast.success('Tarefa reaberta com sucesso!')
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error)
      toast.error('Erro ao reabrir tarefa')
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

  const handleCancelarEvento = async (eventoId: string) => {
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Abrir sidebar apenas na view de mês
    if (viewMode === 'month') {
      setSidebarOpen(true)
    }
  }

  const handleEventMove = async (eventId: string, newDate: Date) => {
    try {
      // Encontrar o evento nos dados consolidados
      const evento = agendaItems.find(item => item.id === eventId)
      if (!evento) {
        throw new Error('Evento não encontrado')
      }

      // Pegar a data e hora original
      const originalDate = new Date(evento.data_inicio)
      const originalEnd = evento.data_fim ? new Date(evento.data_fim) : null

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
          .eq('id', eventId)
      } else if (evento.tipo_entidade === 'audiencia') {
        updateResult = await supabase
          .from('agenda_audiencias')
          .update({
            data_hora: newDateTime.toISOString(),
          })
          .eq('id', eventId)
      } else if (evento.tipo_entidade === 'evento') {
        updateResult = await supabase
          .from('agenda_eventos')
          .update({
            data_inicio: newDateTime.toISOString(),
            data_fim: newEndDateTime?.toISOString() || null,
          })
          .eq('id', eventId)
      }

      if (updateResult?.error) {
        throw updateResult.error
      }

      // Pequeno delay para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 300))

      // Atualizar os dados localmente para feedback imediato
      await refreshItems()

    } catch (error) {
      console.error('Erro ao mover evento:', error)
      throw error
    }
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          {/* Linha 1: Título */}
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-[#34495e]">Agenda</h1>
            <p className="text-sm text-[#6c757d] mt-0.5 font-normal">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Linha 2: Botões de Ação e View Mode Selector */}
          <div className="flex items-center justify-between py-3">
            {/* Botões de Ação Rápida */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleCreateEvent(undefined, 'compromisso')}
                className="h-8 w-[130px] text-xs bg-gradient-to-br from-[#aacfd0] to-[#89bcbe] hover:from-[#89bcbe] hover:to-[#6ba9ab] text-[#34495e] border-0 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Compromisso
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreateEvent(undefined, 'audiencia')}
                className="h-8 w-[130px] text-xs bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-sm"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Audiência
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreateEvent(undefined, 'tarefa')}
                className="h-8 w-[130px] text-xs bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white border-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nova Tarefa
              </Button>
            </div>

            {/* View Mode Selector - Destacado */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
              <TabsList className="bg-white border border-slate-200 shadow-sm p-1">
                <TabsTrigger
                  value="month"
                  className="text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Mês
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="day"
                  className="text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Dia
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#89bcbe] data-[state=active]:to-[#6ba9ab] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <List className="w-4 h-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

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
                onCreateTarefa={(status) => {
                  setTarefaSelecionada(null)
                  setTarefaModalOpen(true)
                }}
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
            data_inicio: new Date(agendaItem.data_inicio),
            data_fim: agendaItem.data_fim ? new Date(agendaItem.data_fim) : undefined,
            dia_inteiro: agendaItem.dia_inteiro,
            local: agendaItem.local,
            responsavel_nome: agendaItem.responsavel_nome,
            status: agendaItem.status as EventCardProps['status'],
          }
          handleEventClick(eventoProps)
        }}
        onCreateEvent={handleCreateEvent}
        onCompleteTask={handleCompleteTask}
        onReopenTask={handleReopenTask}
        onProcessoClick={handleProcessoClick}
        onConsultivoClick={handleConsultivoClick}
      />

      {/* Modais de Detalhes */}
      {tarefaSelecionada && (
        <TarefaDetailModal
          open={tarefaDetailOpen}
          onOpenChange={(open) => {
            setTarefaDetailOpen(open)
            if (!open) {
              setTarefaSelecionada(null)
            }
          }}
          tarefa={tarefaSelecionada}
          onEdit={handleEditTarefa}
          onDelete={() => handleDeleteTarefa(tarefaSelecionada.id)}
          onConcluir={() => handleCompleteTask(tarefaSelecionada.id)}
          onReabrir={() => handleReopenTask(tarefaSelecionada.id)}
          onProcessoClick={handleProcessoClick}
          onConsultivoClick={handleConsultivoClick}
          onUpdate={refreshItems}
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
          onSubmit={async (data: TarefaFormData) => {
            try {
              if (tarefaSelecionada) {
                await updateTarefa(tarefaSelecionada.id, data)
                toast.success('Tarefa atualizada com sucesso!')
              } else {
                await createTarefa(data)
                toast.success('Tarefa criada com sucesso!')
              }
              await refreshItems()
            } catch (error) {
              toast.error('Erro ao salvar tarefa')
              throw error
            }
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
          onSubmit={async (data: AudienciaFormData) => {
            try {
              if (audienciaSelecionada) {
                await updateAudiencia(audienciaSelecionada.id, data)
                toast.success('Audiência atualizada com sucesso!')
              } else {
                await createAudiencia(data)
                toast.success('Audiência criada com sucesso!')
              }
              await refreshItems()
            } catch (error) {
              toast.error('Erro ao salvar audiência')
              throw error
            }
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
          onSubmit={async (data: EventoFormData) => {
            try {
              if (eventoSelecionado) {
                await updateEvento(eventoSelecionado.id, data)
                toast.success('Compromisso atualizado com sucesso!')
              } else {
                await createEvento(data)
                toast.success('Compromisso criado com sucesso!')
              }
              await refreshItems()
            } catch (error) {
              toast.error('Erro ao salvar compromisso')
              throw error
            }
          }}
          initialData={eventoSelecionado || undefined}
        />
      )}
    </div>
  )
}
