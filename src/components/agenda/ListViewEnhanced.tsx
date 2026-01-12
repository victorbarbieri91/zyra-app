'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Calendar,
  CalendarDays,
  Clock,
  Filter,
  Search,
  ChevronRight,
  MapPin,
  User,
  AlertCircle,
  FileText,
  Scale,
  CheckCircle,
  XCircle,
  Timer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Grid,
  List as ListIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isWithinInterval,
  addDays,
  startOfDay,
  endOfDay,
  compareAsc,
  compareDesc,
  isSameDay,
  isPast,
  isFuture,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'

interface ListViewEnhancedProps {
  eventos: EventCardProps[]
  onEventClick: (evento: EventCardProps) => void
  onCreateEvent: () => void
  className?: string
}

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'audiencia':
      return <Scale className="w-3.5 h-3.5" />
    case 'tarefa':
      return <FileText className="w-3.5 h-3.5" />
    case 'prazo':
      return <AlertCircle className="w-3.5 h-3.5" />
    default:
      return <Calendar className="w-3.5 h-3.5" />
  }
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'realizado':
      return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
    case 'cancelado':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />
    case 'adiado':
      return <Timer className="w-3.5 h-3.5 text-amber-500" />
    default:
      return <Clock className="w-3.5 h-3.5 text-blue-500" />
  }
}

const getPrioridadeColor = (prioridade?: string) => {
  switch (prioridade) {
    case 'critico':
    case 'urgente':
      return 'bg-red-500'
    case 'alta':
      return 'bg-amber-500'
    case 'normal':
      return 'bg-blue-500'
    default:
      return 'bg-slate-400'
  }
}

// Enhanced Event Card Component
function EventListItem({
  evento,
  onClick,
  showDate = false,
  isCompact = false
}: {
  evento: EventCardProps
  onClick: () => void
  showDate?: boolean
  isCompact?: boolean
}) {
  const isPastEvent = isPast(evento.data_inicio)
  const isEventToday = isToday(evento.data_inicio)
  const isEventTomorrow = isTomorrow(evento.data_inicio)

  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-white rounded-lg border transition-all cursor-pointer",
        "hover:shadow-md hover:border-[#89bcbe]/50",
        isPastEvent && !isEventToday && "opacity-60",
        isCompact ? "p-3" : "p-4",
        "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Priority Indicator */}
        <div className={cn(
          "w-1 rounded-full self-stretch",
          getPrioridadeColor(evento.prazo_criticidade)
        )} />

        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          evento.tipo === 'audiencia' ? "bg-emerald-100 text-emerald-600" :
          evento.tipo === 'tarefa' ? "bg-purple-100 text-purple-600" :
          evento.tipo === 'prazo' ? "bg-red-100 text-red-600" :
          "bg-blue-100 text-blue-600"
        )}>
          {getTipoIcon(evento.tipo)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                "font-semibold text-[#34495e] group-hover:text-[#89bcbe] transition-colors",
                isCompact ? "text-sm" : "text-base"
              )}>
                {evento.titulo}
              </h4>

              {/* Date and Time */}
              <div className="flex items-center gap-3 mt-1">
                {showDate && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Calendar className="w-3 h-3" />
                    <span className="font-medium">
                      {isEventToday ? 'Hoje' :
                       isEventTomorrow ? 'Amanhã' :
                       format(evento.data_inicio, "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {!evento.dia_inteiro && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="w-3 h-3" />
                    <span>{format(evento.data_inicio, 'HH:mm')}</span>
                    {evento.data_fim && (
                      <span>- {format(evento.data_fim, 'HH:mm')}</span>
                    )}
                  </div>
                )}

                {evento.dia_inteiro && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Dia inteiro
                  </Badge>
                )}
              </div>

              {/* Additional Info */}
              {!isCompact && (
                <div className="flex items-center gap-3 mt-2">
                  {evento.local && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{evento.local}</span>
                    </div>
                  )}

                  {evento.responsavel_nome && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      <span>{evento.responsavel_nome}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status and Action */}
            <div className="flex items-center gap-2">
              {getStatusIcon(evento.status)}
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#89bcbe] transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListViewEnhanced({
  eventos,
  onEventClick,
  onCreateEvent,
  className,
}: ListViewEnhancedProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'timeline' | 'grouped' | 'compact'>('timeline')
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Filter and sort eventos
  const processedEventos = useMemo(() => {
    let filtered = [...eventos]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.responsavel_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.tipo === filterType)
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus)
    }

    // Period filter
    const now = new Date()
    switch (selectedPeriod) {
      case 'today':
        filtered = filtered.filter(e => isToday(e.data_inicio))
        break
      case 'week':
        filtered = filtered.filter(e =>
          isWithinInterval(e.data_inicio, {
            start: startOfWeek(now, { locale: ptBR }),
            end: endOfWeek(now, { locale: ptBR })
          })
        )
        break
      case 'month':
        filtered = filtered.filter(e =>
          isWithinInterval(e.data_inicio, {
            start: startOfMonth(now),
            end: endOfMonth(now)
          })
        )
        break
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = compareAsc(a.data_inicio, b.data_inicio)
          break
        case 'title':
          comparison = a.titulo.localeCompare(b.titulo)
          break
        case 'type':
          comparison = a.tipo.localeCompare(b.tipo)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [eventos, searchTerm, filterType, filterStatus, selectedPeriod, sortBy, sortOrder])

  // Group eventos for grouped view
  const groupedEventos = useMemo(() => {
    const groups = new Map<string, EventCardProps[]>()

    processedEventos.forEach(evento => {
      const date = evento.data_inicio
      let key: string

      if (isToday(date)) {
        key = 'Hoje'
      } else if (isTomorrow(date)) {
        key = 'Amanhã'
      } else if (isYesterday(date)) {
        key = 'Ontem'
      } else if (isPast(date)) {
        key = 'Passados'
      } else if (isWithinInterval(date, {
        start: addDays(new Date(), 2),
        end: addDays(new Date(), 7)
      })) {
        key = 'Próximos 7 dias'
      } else {
        key = 'Futuros'
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(evento)
    })

    // Order groups
    const orderedKeys = ['Hoje', 'Amanhã', 'Próximos 7 dias', 'Futuros', 'Ontem', 'Passados']
    return Array.from(groups.entries()).sort((a, b) =>
      orderedKeys.indexOf(a[0]) - orderedKeys.indexOf(b[0])
    )
  }, [processedEventos])

  // Stats
  const stats = useMemo(() => ({
    total: processedEventos.length,
    hoje: processedEventos.filter(e => isToday(e.data_inicio)).length,
    pendentes: processedEventos.filter(e => e.status === 'agendado' && isFuture(e.data_inicio)).length,
    realizados: processedEventos.filter(e => e.status === 'realizado').length,
  }), [processedEventos])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            {/* Title and Stats */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#34495e]">Eventos e Tarefas</h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-slate-600">
                    <span className="font-semibold text-[#89bcbe]">{stats.total}</span> total
                  </span>
                  <span className="text-xs text-slate-600">
                    <span className="font-semibold text-blue-600">{stats.hoje}</span> hoje
                  </span>
                  <span className="text-xs text-slate-600">
                    <span className="font-semibold text-amber-600">{stats.pendentes}</span> pendentes
                  </span>
                  <span className="text-xs text-slate-600">
                    <span className="font-semibold text-green-600">{stats.realizados}</span> realizados
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={onCreateEvent}
                className="bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Novo Evento
              </Button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm border-slate-200 focus:border-[#89bcbe]"
                />
              </div>

              {/* Period Filter */}
              <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
                <SelectTrigger className="w-[140px] h-9 text-sm border-slate-200">
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-9 text-sm border-slate-200">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="compromisso">Compromissos</SelectItem>
                  <SelectItem value="audiencia">Audiências</SelectItem>
                  <SelectItem value="tarefa">Tarefas</SelectItem>
                  <SelectItem value="prazo">Prazos</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex items-center gap-1">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[120px] h-9 text-sm border-slate-200">
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="title">Título</SelectItem>
                    <SelectItem value="type">Tipo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ?
                    <ArrowUp className="w-3.5 h-3.5" /> :
                    <ArrowDown className="w-3.5 h-3.5" />
                  }
                </Button>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 border rounded-lg p-1 border-slate-200">
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('timeline')}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('grouped')}
                >
                  <Grid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'compact' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('compact')}
                >
                  <FileText className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Events List */}
      {processedEventos.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-[#6c757d] mb-1">Nenhum evento encontrado</p>
              <p className="text-xs text-slate-400">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Comece criando seu primeiro evento'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="space-y-3">
              {processedEventos.map((evento) => (
                <EventListItem
                  key={evento.id}
                  evento={evento}
                  onClick={() => onEventClick(evento)}
                  showDate={true}
                />
              ))}
            </div>
          )}

          {/* Grouped View */}
          {viewMode === 'grouped' && (
            <div className="space-y-6">
              {groupedEventos.map(([groupName, groupEventos]) => (
                <Card key={groupName} className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <h3 className="text-sm font-semibold text-[#34495e] flex items-center gap-2">
                      {groupName === 'Hoje' && <div className="w-2 h-2 rounded-full bg-[#89bcbe]" />}
                      {groupName}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        ({groupEventos.length})
                      </span>
                    </h3>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {groupEventos.map((evento) => (
                      <EventListItem
                        key={evento.id}
                        evento={evento}
                        onClick={() => onEventClick(evento)}
                        showDate={false}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Compact View */}
          {viewMode === 'compact' && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 space-y-2">
                {processedEventos.map((evento) => (
                  <EventListItem
                    key={evento.id}
                    evento={evento}
                    onClick={() => onEventClick(evento)}
                    showDate={true}
                    isCompact={true}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}