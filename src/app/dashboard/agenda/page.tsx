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
import CalendarGrid from '@/components/agenda/CalendarGrid'
import CalendarWeekView from '@/components/agenda/CalendarWeekView'
import CalendarDayView from '@/components/agenda/CalendarDayView'
import ListView from '@/components/agenda/ListView'
import SidebarDinamica from '@/components/agenda/SidebarDinamica'
import ResumoIA from '@/components/agenda/ResumoIA'
import AgendaFiltersCompact from '@/components/agenda/AgendaFiltersCompact'
import TarefaModal from '@/components/agenda/TarefaModal'
import TarefaViewModal from '@/components/agenda/TarefaViewModal'
import AudienciaModal from '@/components/agenda/AudienciaModal'
import EventoModal from '@/components/agenda/EventoModal'
import { EventCardProps } from '@/components/agenda/EventCard'

// Hooks
import { useAgendaConsolidada } from '@/hooks/useAgendaConsolidada'
import { useTarefas, Tarefa } from '@/hooks/useTarefas'
import { useAudiencias, Audiencia } from '@/hooks/useAudiencias'
import { useEventos, Evento } from '@/hooks/useEventos'

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)

  // Modais separados
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [tarefaViewModalOpen, setTarefaViewModalOpen] = useState(false)
  const [audienciaModalOpen, setAudienciaModalOpen] = useState(false)
  const [eventoModalOpen, setEventoModalOpen] = useState(false)

  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null)
  const [audienciaSelecionada, setAudienciaSelecionada] = useState<Audiencia | null>(null)
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null)

  const [filters, setFilters] = useState({
    tipos: {
      evento: true,
      audiencia: true,
      tarefa: true,
    },
    status: {
      agendado: true,
      realizado: false,
      cancelado: false,
    },
    responsaveis: [] as string[],
  })

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

  // Hooks - usar agenda consolidada e hooks específicos
  const { items: agendaItems, loading, refreshItems } = useAgendaConsolidada()
  const { tarefas } = useTarefas(escritorioId || undefined)
  const { audiencias } = useAudiencias(escritorioId || undefined)
  const { eventos } = useEventos(escritorioId || undefined)

  // Converter items consolidados para formato do EventCard
  const eventosFormatados = useMemo((): EventCardProps[] => {
    return agendaItems
      .filter(item => {
        // Aplicar filtros de tipo
        if (!filters.tipos[item.tipo_entidade]) return false
        // Aplicar filtros de status (se aplicável)
        // TODO: ajustar quando status estiver disponível
        return true
      })
      .map(item => ({
        id: item.id,
        titulo: item.titulo,
        tipo: item.tipo_entidade === 'tarefa' ? 'tarefa' : item.tipo_entidade === 'audiencia' ? 'audiencia' : 'compromisso',
        data_inicio: new Date(item.data_inicio),
        data_fim: item.data_fim ? new Date(item.data_fim) : undefined,
        dia_inteiro: item.dia_inteiro || false,
        local: item.local,
        responsavel_nome: item.responsavel_nome,
        status: item.status || 'agendado',
        prazo_criticidade: item.prioridade === 'alta' ? 'critico' : item.prioridade === 'media' ? 'normal' : 'baixa',
      }))
  }, [agendaItems, filters])

  // Eventos do dia selecionado (para sidebar)
  const eventosDoDia = useMemo(() => {
    return eventosFormatados.filter(e =>
      isSameDay(e.data_inicio, selectedDate)
    )
  }, [eventosFormatados, selectedDate])

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
    // Buscar dados completos do item para visualização
    if (evento.tipo === 'tarefa') {
      const tarefaCompleta = tarefas.find(t => t.id === evento.id)
      if (tarefaCompleta) {
        setTarefaSelecionada(tarefaCompleta)
      }
      setTarefaViewModalOpen(true) // Abrir modal de visualização
    } else if (evento.tipo === 'audiencia') {
      const audienciaCompleta = audiencias.find(a => a.id === evento.id)
      if (audienciaCompleta) {
        setAudienciaSelecionada(audienciaCompleta)
      }
      setAudienciaModalOpen(true)
    } else {
      const eventoCompleto = eventos.find(e => e.id === evento.id)
      if (eventoCompleto) {
        setEventoSelecionado(eventoCompleto)
      }
      setEventoModalOpen(true)
    }
  }

  const handleEditTarefa = () => {
    // Fechar modal de visualização e abrir modal de edição
    setTarefaViewModalOpen(false)
    setTarefaModalOpen(true)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Abrir sidebar apenas na view de mês
    if (viewMode === 'month') {
      setSidebarOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
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
                  Semana
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
              <CalendarGrid
                eventos={eventosFormatados}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                feriados={[]}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {viewMode === 'week' && (
              <CalendarWeekView
                eventos={eventosFormatados}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onEventClick={handleEventClick}
                onCreateEvent={handleCreateEvent}
              />
            )}

            {viewMode === 'day' && (
              <CalendarDayView
                eventos={eventosFormatados}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onEventClick={handleEventClick}
                onCreateEvent={handleCreateEvent}
              />
            )}

            {viewMode === 'list' && (
              <ListView
                eventos={eventosFormatados}
                onEventClick={handleEventClick}
                onCreateEvent={() => handleCreateEvent()}
              />
            )}
          </>
        )}
      </div>

      {/* Sidebar Dinâmica (apenas para view de mês) */}
      <SidebarDinamica
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedDate={selectedDate}
        eventos={eventosDoDia}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
      />

      {/* Modais Separados */}
      <TarefaViewModal
        open={tarefaViewModalOpen}
        onOpenChange={(open) => {
          setTarefaViewModalOpen(open)
          if (!open) {
            setTarefaSelecionada(null)
          }
        }}
        tarefa={tarefaSelecionada}
        onEdit={handleEditTarefa}
      />

      <TarefaModal
        open={tarefaModalOpen}
        onOpenChange={(open) => {
          setTarefaModalOpen(open)
          if (!open) {
            setTarefaSelecionada(null)
            refreshItems()
          }
        }}
        tarefa={tarefaSelecionada}
        escritorioId={escritorioId}
      />

      <AudienciaModal
        open={audienciaModalOpen}
        onOpenChange={(open) => {
          setAudienciaModalOpen(open)
          if (!open) {
            setAudienciaSelecionada(null)
            refreshItems()
          }
        }}
        audiencia={audienciaSelecionada}
        escritorioId={escritorioId}
      />

      <EventoModal
        open={eventoModalOpen}
        onOpenChange={(open) => {
          setEventoModalOpen(open)
          if (!open) {
            setEventoSelecionado(null)
            refreshItems()
          }
        }}
        evento={eventoSelecionado}
        escritorioId={escritorioId}
      />
    </div>
  )
}
