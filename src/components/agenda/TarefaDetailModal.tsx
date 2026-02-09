'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Calendar,
  AlertCircle,
  Clock,
  CalendarDays,
  Timer,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBrazilDate, formatDateTimeForDB, parseDBDate } from '@/lib/timezone'
import { Tarefa } from '@/hooks/useTarefas'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAgendaResponsaveis, Responsavel } from '@/hooks/useAgendaResponsaveis'
import { addDays, nextMonday, differenceInDays, differenceInHours, startOfDay, isAfter } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'

interface TarefaDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tarefa: Tarefa
  onEdit?: () => void
  onDelete?: () => void
  onConcluir?: () => void
  onReabrir?: () => void
  onLancarHoras?: () => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
  onUpdate?: () => void | Promise<void>
}

interface ProcessoInfo {
  id: string
  numero_pasta?: string
  numero_cnj?: string
  cliente?: {
    nome_completo?: string
    nome_fantasia?: string
  }
  parte_contraria?: string
  valor_causa?: number
  status?: string
}

interface ConsultivoInfo {
  id: string
  titulo: string
  status?: string
}

interface RecorrenciaInfo {
  frequencia: string
  intervalo: number
  data_inicio: string
  data_fim?: string
}

export default function TarefaDetailModal({
  open,
  onOpenChange,
  tarefa,
  onEdit,
  onDelete,
  onConcluir,
  onReabrir,
  onLancarHoras,
  onProcessoClick,
  onConsultivoClick,
  onUpdate,
}: TarefaDetailModalProps) {
  const [processoInfo, setProcessoInfo] = useState<ProcessoInfo | null>(null)
  const [consultivoInfo, setConsultivoInfo] = useState<ConsultivoInfo | null>(null)
  const [recorrenciaInfo, setRecorrenciaInfo] = useState<RecorrenciaInfo | null>(null)
  const [loadingProcesso, setLoadingProcesso] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [dateDropdownOpen, setDateDropdownOpen] = useState<string | null>(null)
  const [calendarField, setCalendarField] = useState<'data_inicio' | 'prazo_data_limite' | null>(null)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [loadingResponsaveis, setLoadingResponsaveis] = useState(false)
  // Modal de confirmação para editar prazo fatal
  const [confirmPrazoFatalOpen, setConfirmPrazoFatalOpen] = useState(false)
  const [pendingPrazoFatalDate, setPendingPrazoFatalDate] = useState<Date | null>(null)
  // Modal de aviso quando ultrapassa prazo fatal
  const [prazoFatalWarningOpen, setPrazoFatalWarningOpen] = useState(false)
  const [pendingDataInicio, setPendingDataInicio] = useState<Date | null>(null)
  const [distanciaOriginalDias, setDistanciaOriginalDias] = useState<number>(0)
  // Seletor de novo prazo fatal
  const [novoPrazoFatalSelecionado, setNovoPrazoFatalSelecionado] = useState<Date | null>(null)
  const [prazoFatalCalendarOpen, setPrazoFatalCalendarOpen] = useState(false)

  const { getResponsaveis } = useAgendaResponsaveis()

  // Carregar informações adicionais
  useEffect(() => {
    if (!tarefa) return

    async function loadAdditionalInfo() {
      const supabase = createClient()

      // Carregar responsáveis (múltiplos)
      setLoadingResponsaveis(true)
      try {
        const responsaveisList = await getResponsaveis('tarefa', tarefa.id)
        setResponsaveis(responsaveisList)
      } catch (err) {
        console.error('[TarefaDetail] Erro ao carregar responsáveis:', err)
      } finally {
        setLoadingResponsaveis(false)
      }

      // Carregar processo
      if (tarefa.processo_id) {
        console.log('[TarefaDetail] Carregando processo ID:', tarefa.processo_id)
        setLoadingProcesso(true)

        const { data: processo, error } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            valor_causa,
            status,
            parte_contraria,
            crm_pessoas!cliente_id(nome_completo, nome_fantasia)
          `)
          .eq('id', tarefa.processo_id)
          .single()

        if (error) {
          console.error('[TarefaDetail] Erro ao carregar processo:', error)
          setLoadingProcesso(false)
          return
        }

        console.log('[TarefaDetail] Processo carregado:', processo)

        if (processo) {
          setProcessoInfo({
            id: processo.id,
            numero_pasta: processo.numero_pasta,
            numero_cnj: processo.numero_cnj,
            valor_causa: processo.valor_causa,
            status: processo.status,
            cliente: processo.crm_pessoas,
            parte_contraria: processo.parte_contraria
          } as ProcessoInfo)
        }
        setLoadingProcesso(false)
      } else {
        console.log('[TarefaDetail] Tarefa não tem processo_id')
      }

      // Carregar consultivo
      if (tarefa.consultivo_id) {
        const { data: consultivo } = await supabase
          .from('consultas')
          .select('id, titulo, status')
          .eq('id', tarefa.consultivo_id)
          .single()

        if (consultivo) setConsultivoInfo(consultivo)
      }

      // Carregar recorrência
      if (tarefa.recorrencia_id) {
        const { data: recorrencia } = await supabase
          .from('agenda_recorrencias')
          .select('frequencia, intervalo, data_inicio, data_fim')
          .eq('id', tarefa.recorrencia_id)
          .single()

        if (recorrencia) setRecorrenciaInfo(recorrencia)
      }
    }

    loadAdditionalInfo()
  }, [tarefa])

  // Determinar tipo
  const isPrazoProcessual = tarefa.tipo === 'prazo_processual'
  const isConcluido = tarefa.status === 'concluido'

  // Helper functions
  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      normal: 'Tarefa Normal',
      prazo_processual: 'Prazo Processual',
      recorrente: 'Tarefa Recorrente',
    }
    return labels[tipo] || tipo
  }

  const getPrioridadeLabel = (prioridade: string) => {
    const labels: Record<string, string> = {
      baixa: 'Baixa',
      normal: 'Normal',
      alta: 'Alta',
      urgente: 'Urgente',
    }
    return labels[prioridade] || prioridade
  }

  const getPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      baixa: 'text-slate-500',
      normal: 'text-blue-600',
      alta: 'text-amber-600',
      urgente: 'text-red-600',
    }
    return colors[prioridade] || 'text-slate-600'
  }

  const formatProcessoPartes = (processo: ProcessoInfo) => {
    const cliente = processo.cliente?.nome_completo || processo.cliente?.nome_fantasia
    if (!cliente) return null

    if (processo.parte_contraria) {
      return `${cliente} × ${processo.parte_contraria}`
    }
    return cliente
  }

  // Update date function
  const handleUpdateDate = async (field: 'data_inicio' | 'prazo_data_limite', newDate: Date, skipWarning = false) => {
    // Se estamos atualizando data_inicio e existe prazo_data_limite
    if (field === 'data_inicio' && tarefa.prazo_data_limite && !skipWarning) {
      const prazoFatal = parseDBDate(tarefa.prazo_data_limite)
      const dataInicioAtual = parseDBDate(tarefa.data_inicio)

      // Comparar apenas as datas (sem horário) para evitar problemas de timezone
      const novaDataSemHora = startOfDay(newDate)
      const prazoFatalSemHora = startOfDay(prazoFatal)

      // Se nova data ultrapassa o prazo fatal, mostrar aviso
      if (isAfter(novaDataSemHora, prazoFatalSemHora)) {
        const distancia = differenceInDays(startOfDay(prazoFatal), startOfDay(dataInicioAtual))
        setDistanciaOriginalDias(Math.max(distancia, 0))
        setPendingDataInicio(newDate)
        // Inicializar a sugestão de novo prazo fatal (mantendo a proporção)
        setNovoPrazoFatalSelecionado(addDays(newDate, Math.max(distancia, 0)))
        setPrazoFatalWarningOpen(true)
        setDateDropdownOpen(null)
        return
      }
    }

    // Se estamos atualizando prazo_data_limite, confirmar primeiro
    if (field === 'prazo_data_limite' && !skipWarning) {
      setPendingPrazoFatalDate(newDate)
      setConfirmPrazoFatalOpen(true)
      setDateDropdownOpen(null)
      return
    }

    await executeUpdateDate(field, newDate)
  }

  // Função que realmente executa a atualização
  const executeUpdateDate = async (field: 'data_inicio' | 'prazo_data_limite', newDate: Date) => {
    setUpdatingDate(true)

    try {
      const supabase = createClient()
      const updateData = {
        [field]: formatDateTimeForDB(newDate)
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
        .eq('id', tarefa.id)

      if (error) throw error

      toast.success(field === 'prazo_data_limite' ? 'Prazo fatal atualizado' : 'Data atualizada com sucesso')

      // Atualizar localmente
      tarefa[field] = updateData[field]

      // Atualizar a agenda
      if (onUpdate) {
        await onUpdate()
      }

      // Forçar re-render do modal
      onOpenChange(false)
      setTimeout(() => onOpenChange(true), 50)
    } catch (error) {
      console.error('Erro ao atualizar data:', error)
      toast.error('Erro ao atualizar data')
    } finally {
      setUpdatingDate(false)
      setDateDropdownOpen(null)
    }
  }

  // Atualizar data_inicio E prazo_data_limite juntos
  const handleUpdateBothDates = async (newDataInicio: Date, newPrazoFatal: Date) => {
    setUpdatingDate(true)

    try {
      const supabase = createClient()
      const updateData = {
        data_inicio: formatDateTimeForDB(newDataInicio),
        prazo_data_limite: formatDateTimeForDB(newPrazoFatal)
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
        .eq('id', tarefa.id)

      if (error) throw error

      toast.success('Data e prazo fatal atualizados')

      // Atualizar localmente
      tarefa.data_inicio = updateData.data_inicio
      tarefa.prazo_data_limite = updateData.prazo_data_limite

      // Atualizar a agenda
      if (onUpdate) {
        await onUpdate()
      }

      // Forçar re-render do modal
      onOpenChange(false)
      setTimeout(() => onOpenChange(true), 50)
    } catch (error) {
      console.error('Erro ao atualizar datas:', error)
      toast.error('Erro ao atualizar datas')
    } finally {
      setUpdatingDate(false)
      setPrazoFatalWarningOpen(false)
      setPendingDataInicio(null)
    }
  }

  // Calcular urgência
  const getUrgency = (date: string) => {
    const now = new Date()
    const targetDate = parseDBDate(date)
    return differenceInHours(targetDate, now)
  }

  // Handle custom date selection
  const handleCustomDateSelect = async (date: Date | undefined) => {
    if (!date || !calendarField) return
    await handleUpdateDate(calendarField, date)
    setCalendarField(null)
  }

  // Date reschedule component
  const DateReschedule = ({
    field,
    currentDate,
  }: {
    field: 'data_inicio' | 'prazo_data_limite'
    currentDate: string
  }) => {
    const handleQuickOption = async (option: 'today' | 'tomorrow' | 'nextMonday' | 'plus7') => {
      const today = new Date()
      let newDate: Date

      switch(option) {
        case 'today':
          newDate = today
          break
        case 'tomorrow':
          newDate = addDays(today, 1)
          break
        case 'nextMonday':
          newDate = nextMonday(today)
          break
        case 'plus7':
          newDate = addDays(today, 7)
          break
      }

      await handleUpdateDate(field, newDate)
    }

    const handleOpenCustomDate = () => {
      setDateDropdownOpen(null) // Fecha o dropdown primeiro
      setTimeout(() => {
        setCalendarField(field) // Abre o calendário após o dropdown fechar
      }, 100)
    }

    const hoursRemaining = getUrgency(currentDate)
    const isOverdue = hoursRemaining < 0
    const isUrgent = hoursRemaining >= 0 && hoursRemaining <= 48

    return (
      <DropdownMenu
        open={dateDropdownOpen === field}
        onOpenChange={(open) => setDateDropdownOpen(open ? field : null)}
      >
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1 text-xs transition-all h-5",
              "cursor-pointer rounded-sm px-1.5",
              "bg-slate-50 hover:bg-slate-100 border border-slate-200",
              isOverdue && "text-red-600 bg-red-50 border-red-200 hover:bg-red-100",
              isUrgent && !isOverdue && "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100",
              !isOverdue && !isUrgent && "text-slate-700 hover:text-slate-900"
            )}
            disabled={updatingDate}
          >
            <span className="font-medium">
              {formatBrazilDate(parseDBDate(currentDate))}
            </span>
            <Calendar className="w-3 h-3 ml-0.5 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <div className="px-2 py-1.5 text-[10px] font-medium text-slate-500">
            Reagendar para:
          </div>
          <DropdownMenuItem onClick={() => handleQuickOption('today')} className="text-xs">
            Hoje
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickOption('tomorrow')} className="text-xs">
            Amanhã
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickOption('nextMonday')} className="text-xs">
            Próxima segunda
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickOption('plus7')} className="text-xs">
            Daqui a 7 dias
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenCustomDate} className="text-xs">
            Data personalizada...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-0">
        <DialogTitle className="sr-only">Detalhes da Tarefa</DialogTitle>
        <div className="bg-white rounded-lg">

          {/* Header Minimalista */}
          <div className="p-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                {tarefa.titulo}
              </h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>{getTipoLabel(tarefa.tipo)}</span>
                <span className={cn("font-medium", getPrioridadeColor(tarefa.prioridade))}>
                  {getPrioridadeLabel(tarefa.prioridade)}
                </span>
              </div>
            </div>

            {/* Metadata sutil */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Criada {formatBrazilDate(tarefa.created_at)}</span>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="p-6 space-y-4">

            {/* DESCRIÇÃO */}
            <div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                Descrição
              </div>
              {tarefa.descricao ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {tarefa.descricao}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Sem descrição
                </p>
              )}
            </div>

            {/* PROCESSO VINCULADO */}
            {tarefa.processo_id && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Processo Vinculado
                </div>
                {processoInfo ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                    <button
                      onClick={() => onProcessoClick?.(processoInfo.id)}
                      className="flex-1 text-left hover:bg-slate-100 rounded transition-colors p-1 -m-1 group"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span>Pasta {processoInfo.numero_pasta || 'S/N'}</span>
                        {processoInfo.status && (
                          <span className="text-[10px] text-slate-500">• {processoInfo.status}</span>
                        )}
                        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      {processoInfo.numero_cnj && (
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {processoInfo.numero_cnj}
                        </div>
                      )}
                      {formatProcessoPartes(processoInfo) && (
                        <div className="text-[10px] text-slate-600 mt-1">
                          {formatProcessoPartes(processoInfo)}
                        </div>
                      )}
                    </button>
                    {processoInfo.numero_cnj && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(processoInfo.numero_cnj!)
                          toast.success('Número copiado!')
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-[#89bcbe] transition-colors flex-shrink-0"
                        title="Copiar número do processo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 rounded-md text-xs text-slate-400 italic">
                    {loadingProcesso ? 'Carregando...' : 'Erro ao carregar processo'}
                  </div>
                )}
              </div>
            )}

            {/* CONSULTIVO VINCULADO */}
            {consultivoInfo && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Consultivo Vinculado
                </div>
                <button
                  onClick={() => onConsultivoClick?.(consultivoInfo.id)}
                  className="w-full text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-700">
                        {consultivoInfo.titulo}
                      </div>
                      {consultivoInfo.status && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          Status: {consultivoInfo.status}
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            {/* INFORMAÇÕES ORGANIZADAS EM LAYOUT FLUIDO */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {/* Data de Execução */}
              <div className="min-w-[140px]">
                <div className="text-[10px] text-slate-500 mb-1 h-4">
                  <CalendarDays className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                  Data de Execução
                </div>
                <div className="h-5">
                  <DateReschedule
                    field="data_inicio"
                    currentDate={tarefa.data_inicio}
                  />
                </div>
              </div>

              {/* Prazo Fatal - Para todas as tarefas com prazo_data_limite */}
              {tarefa.prazo_data_limite && (
                <div className="min-w-[140px]">
                  <div className="text-[10px] text-red-600 font-medium mb-1 h-4">
                    <AlertCircle className="w-3 h-3 text-red-500 inline mr-1.5 align-text-bottom" />
                    Prazo Fatal
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      {(() => {
                        const diasEntreDatas = differenceInDays(
                          parseDBDate(tarefa.prazo_data_limite),
                          parseDBDate(tarefa.data_inicio)
                        )
                        return diasEntreDatas > 0 ? `(${diasEntreDatas}d)` : diasEntreDatas === 0 ? '(hoje)' : `(${Math.abs(diasEntreDatas)}d atrás)`
                      })()}
                    </span>
                  </div>
                  <div className="h-5">
                    <DateReschedule
                      field="prazo_data_limite"
                      currentDate={tarefa.prazo_data_limite}
                    />
                  </div>
                </div>
              )}

              {/* Responsáveis */}
              <div className="min-w-[120px]">
                <div className="text-[10px] text-slate-500 mb-1 h-4">
                  {responsaveis.length > 1 ? 'Responsáveis' : 'Responsável'}
                </div>
                <div className="min-h-[20px] leading-5">
                  {loadingResponsaveis ? (
                    <span className="text-xs text-slate-400 italic">Carregando...</span>
                  ) : responsaveis.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {responsaveis.map((resp, idx) => (
                        <span
                          key={resp.id}
                          className="text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded"
                        >
                          {resp.nome_completo}
                        </span>
                      ))}
                    </div>
                  ) : tarefa.responsavel_nome ? (
                    <span className="text-xs text-slate-700">
                      {tarefa.responsavel_nome}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Não atribuído
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="min-w-[100px]">
                <div className="text-[10px] text-slate-500 mb-1 h-4">
                  Status
                </div>
                <div className="h-5 flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    tarefa.status === 'concluido' ? "bg-emerald-500" :
                    tarefa.status === 'em_andamento' ? "bg-blue-500" :
                    tarefa.status === 'cancelado' ? "bg-slate-400" :
                    "bg-amber-500"
                  )} />
                  <span className="text-xs text-slate-700 capitalize">
                    {tarefa.status?.replace('_', ' ') || 'Pendente'}
                  </span>
                </div>
              </div>

              {/* Criado por */}
              {tarefa.criado_por_nome && (
                <div className="min-w-[120px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    Criado por
                  </div>
                  <div className="h-5 flex items-center">
                    <span className="text-xs text-slate-600">
                      {tarefa.criado_por_nome}
                    </span>
                  </div>
                </div>
              )}

              {/* Data de Conclusão */}
              {tarefa.data_conclusao && (
                <div className="min-w-[140px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    Concluído em
                  </div>
                  <div className="h-5 flex items-center">
                    <span className="text-xs text-emerald-600">
                      {formatBrazilDate(parseDBDate(tarefa.data_conclusao))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* RECORRÊNCIA */}
            {recorrenciaInfo && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Recorrência
                </div>
                <div className="text-xs text-slate-600">
                  {recorrenciaInfo.frequencia} - A cada {recorrenciaInfo.intervalo}{' '}
                  {recorrenciaInfo.intervalo === 1 ? 'vez' : 'vezes'}
                  {recorrenciaInfo.data_fim && (
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Até {formatBrazilDate(parseDBDate(recorrenciaInfo.data_fim))}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* OBSERVAÇÕES */}
            {tarefa.observacoes && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Observações
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {tarefa.observacoes}
                </p>
              </div>
            )}
          </div>

          {/* Footer com Ações */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isConcluido ? (
                  <Button
                    size="sm"
                    onClick={onConcluir}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Concluir
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReabrir}
                    className="h-8 text-xs border-slate-200"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reabrir
                  </Button>
                )}

                {/* Botão Lançar Horas - só aparece se tem processo ou consultivo vinculado */}
                {onLancarHoras && (tarefa.processo_id || tarefa.consultivo_id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onLancarHoras}
                    className="h-8 text-xs border-[#89bcbe] text-[#34495e] hover:bg-[#f0f9f9]"
                  >
                    <Timer className="w-3 h-3 mr-1" />
                    Lançar Horas
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-8 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Calendar Dialog separado para Data Personalizada */}
    <Dialog open={calendarField !== null} onOpenChange={(open) => !open && setCalendarField(null)}>
      <DialogContent className="max-w-fit p-4">
        <DialogTitle className="text-sm font-medium text-slate-700 mb-2">
          Selecione a nova data
        </DialogTitle>
        <CalendarComponent
          mode="single"
          selected={
            calendarField === 'data_inicio' && tarefa.data_inicio
              ? parseDBDate(tarefa.data_inicio)
              : calendarField === 'prazo_data_limite' && tarefa.prazo_data_limite
              ? parseDBDate(tarefa.prazo_data_limite)
              : undefined
          }
          onSelect={handleCustomDateSelect}
          disabled={updatingDate}
        />
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmação para Editar Prazo Fatal */}
    <Dialog open={confirmPrazoFatalOpen} onOpenChange={setConfirmPrazoFatalOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0">
        <DialogTitle className="sr-only">Confirmar Alteração do Prazo Fatal</DialogTitle>
        <div className="bg-white rounded-lg">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f0f9f9] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#89bcbe]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#34495e]">
                  Alterar Prazo Fatal?
                </h2>
                <p className="text-xs text-[#46627f] mt-0.5">
                  Confirme a alteração da data limite
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-[#46627f] mb-4">
              Você está prestes a alterar o <strong className="text-[#34495e]">prazo fatal</strong> desta tarefa para:
            </p>
            <div className="p-3 bg-[#f0f9f9] rounded-lg border border-[#89bcbe]/30 mb-4">
              <p className="text-sm font-semibold text-[#34495e]">
                {pendingPrazoFatalDate && formatBrazilDate(pendingPrazoFatalDate)}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              O prazo fatal representa a data limite absoluta para conclusão. Tem certeza?
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmPrazoFatalOpen(false)
                  setPendingPrazoFatalDate(null)
                }}
                className="flex-1 h-9 text-xs font-medium border-slate-200 hover:bg-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (pendingPrazoFatalDate) {
                    setConfirmPrazoFatalOpen(false)
                    await executeUpdateDate('prazo_data_limite', pendingPrazoFatalDate)
                    setPendingPrazoFatalDate(null)
                  }
                }}
                className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updatingDate}
              >
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Aviso - Reagendamento Ultrapassa Prazo Fatal */}
    <Dialog open={prazoFatalWarningOpen} onOpenChange={(open) => {
      setPrazoFatalWarningOpen(open)
      if (!open) {
        setPendingDataInicio(null)
        setNovoPrazoFatalSelecionado(null)
        setPrazoFatalCalendarOpen(false)
      }
    }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0">
        <DialogTitle className="sr-only">Reagendar Prazo Fatal</DialogTitle>
        <div className="bg-white rounded-lg">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f0f9f9] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#89bcbe]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#34495e]">
                  Reagendar Prazo Fatal
                </h2>
                <p className="text-xs text-[#46627f] mt-0.5">
                  A nova data de execução é posterior ao prazo fatal atual
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Info das datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#f0f9f9] rounded-lg border border-[#89bcbe]/30">
                <p className="text-[10px] text-[#46627f] mb-1">Nova Data Execução</p>
                <p className="text-sm font-semibold text-[#34495e]">
                  {pendingDataInicio && formatBrazilDate(pendingDataInicio)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] text-slate-500 mb-1">Prazo Fatal Atual</p>
                <p className="text-sm font-semibold text-[#34495e]">
                  {tarefa.prazo_data_limite && formatBrazilDate(parseDBDate(tarefa.prazo_data_limite))}
                </p>
              </div>
            </div>

            {/* Seletor de novo prazo fatal */}
            <div>
              <p className="text-xs text-[#46627f] mb-2">
                Selecione o novo prazo fatal:
              </p>
              <Popover open={prazoFatalCalendarOpen} onOpenChange={setPrazoFatalCalendarOpen}>
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
                        {novoPrazoFatalSelecionado ? formatBrazilDate(novoPrazoFatalSelecionado) : 'Selecionar data'}
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-[#89bcbe]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={novoPrazoFatalSelecionado || undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNovoPrazoFatalSelecionado(date)
                        setPrazoFatalCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => pendingDataInicio ? date < pendingDataInicio : false}
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
                  setPrazoFatalWarningOpen(false)
                  setPendingDataInicio(null)
                  setNovoPrazoFatalSelecionado(null)
                }}
                className="flex-1 h-9 text-xs font-medium border-slate-200 hover:bg-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (pendingDataInicio && novoPrazoFatalSelecionado) {
                    await handleUpdateBothDates(pendingDataInicio, novoPrazoFatalSelecionado)
                    setNovoPrazoFatalSelecionado(null)
                  }
                }}
                className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updatingDate || !novoPrazoFatalSelecionado}
              >
                Confirmar e Reagendar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
