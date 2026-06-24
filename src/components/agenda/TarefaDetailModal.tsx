'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Edit2,
  Trash2,
  Ban,
  Check,
  RotateCcw,
  Calendar,
  Clock,
  CalendarDays,
  Timer,
  Copy,
  PlayCircle,
  PauseCircle,
  Lock,
  FileText,
  Scale,
  Users,
  Flag,
  Info,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import { formatBrazilDate, formatDateTimeForDB, parseDBDate, toBrazilTime } from '@/lib/timezone'
import { Tarefa } from '@/hooks/useTarefas'
import { useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAgendaResponsaveis, Responsavel } from '@/hooks/useAgendaResponsaveis'
import { addDays, nextMonday, differenceInDays, differenceInHours, startOfDay, isAfter, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import { useTimer } from '@/contexts/TimerContext'
import { useTimesheetPorTarefa, type TimesheetEntryRecente } from '@/hooks/useTimesheetRecentes'
import TimesheetListModal from '@/components/agenda/TimesheetListModal'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import { getTipoLabel as getTipoLabelFromConfig } from '@/lib/constants/tarefa-tipos'

// Extracted outside parent to prevent re-mount on every render (causes dropdown flicker)
function DateRescheduleButton({
  field,
  currentDate,
  dateDropdownOpen,
  setDateDropdownOpen,
  updatingDate,
  setCalendarField,
  handleUpdateDate,
  getUrgency,
}: {
  field: 'data_inicio' | 'prazo_data_limite'
  currentDate: string
  dateDropdownOpen: string | null
  setDateDropdownOpen: (v: string | null) => void
  updatingDate: boolean
  setCalendarField: (v: 'data_inicio' | 'prazo_data_limite' | null) => void
  handleUpdateDate: (field: 'data_inicio' | 'prazo_data_limite', date: Date) => Promise<void>
  getUrgency: (date: string) => number
}) {
  const hoje = new Date()
  const opcoes: { label: string; date: Date }[] = [
    { label: 'Hoje', date: hoje },
    { label: 'Amanhã', date: addDays(hoje, 1) },
    { label: 'Daqui a 2 dias', date: addDays(hoje, 2) },
    { label: 'Próxima segunda', date: nextMonday(hoje) },
    { label: 'Daqui a 7 dias', date: addDays(hoje, 7) },
  ]

  const handleOpenCustomDate = () => {
    setDateDropdownOpen(null)
    setTimeout(() => {
      setCalendarField(field)
    }, 100)
  }

  const hoursRemaining = getUrgency(currentDate)
  const isOverdue = hoursRemaining < 0
  const isUrgent = hoursRemaining >= 0 && hoursRemaining <= 72 // calmo: só acende em ≤3 dias

  return (
    <DropdownMenu
      open={dateDropdownOpen === field}
      onOpenChange={(open) => setDateDropdownOpen(open ? field : null)}
    >
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12.5px] transition-colors cursor-pointer border",
            isOverdue && "text-[#a8442c] dark:text-[#e0a085] bg-[#fbece5] dark:bg-[#a8442c]/[0.16] border-[#f0d4c8] dark:border-[#a8442c]/[0.3] hover:bg-[#f6dccf] dark:hover:bg-[#a8442c]/[0.24]",
            isUrgent && !isOverdue && "text-[#8a6438] dark:text-[#d6a87a] bg-[#f8f0e6] dark:bg-[#8a6438]/[0.16] border-[#ecdcc4] dark:border-[#8a6438]/[0.3] hover:bg-[#f0e4d2] dark:hover:bg-[#8a6438]/[0.24]",
            !isOverdue && !isUrgent && "text-[#2c3e50] dark:text-[#d8e2ef] bg-[#f7f5f0] dark:bg-[#1b2536] border-[#e6e3da] dark:border-[#253345] hover:bg-[#efece4] dark:hover:bg-[#222d3f]"
          )}
          disabled={updatingDate}
        >
          <span className="font-mono font-semibold">
            {formatBrazilDate(parseDBDate(currentDate))}
          </span>
          <Calendar className="w-3.5 h-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-56 p-1.5 rounded-xl border border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] shadow-[0_16px_38px_-16px_rgba(15,23,42,0.4)]"
      >
        <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#9aa1a8] dark:text-[#5a6675]">Reagendar para</div>
        {opcoes.map((o) => (
          <DropdownMenuItem
            key={o.label}
            onClick={() => handleUpdateDate(field, o.date)}
            className="rounded-lg px-2 py-1.5 cursor-pointer flex items-center justify-between gap-4 text-[12.5px] font-medium text-[#2c3e50] dark:text-[#d8e2ef] focus:bg-[#f4f1e8] dark:focus:bg-[#1d2a3c] focus:text-[#2c3e50] dark:focus:text-[#edf1f7]"
          >
            <span>{o.label}</span>
            <span className="text-[11px] font-mono text-[#9aa1a8] dark:text-[#5a6675] capitalize">{format(o.date, 'EEEEEE dd/MM', { locale: ptBR })}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-[#f0ede3] dark:bg-[#253345]" />
        <DropdownMenuItem
          onClick={handleOpenCustomDate}
          className="rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-2 text-[12.5px] font-medium text-[#3f7376] dark:text-[#9fc7c9] focus:bg-[#e8f5f5] dark:focus:bg-[#89bcbe]/[0.16]"
        >
          <CalendarDays className="w-3.5 h-3.5" />Escolher outra data…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ───────────────────────── átomos V4 ─────────────────────────
const AVATAR_CORES = ['#34495e', '#46627f', '#3f7376', '#6b9e84', '#8a6438', '#a85a3e', '#415a7e']
function avatarCor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_CORES[h % AVATAR_CORES.length]
}
function iniciaisNome(nome: string) {
  const p = nome.trim().split(/\s+/)
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

const PRIOR_PILL: Record<string, string> = {
  alta: 'text-[#a8442c] bg-[#fbece5] dark:text-[#e0a085] dark:bg-[#a8442c]/[0.2]',
  urgente: 'text-[#a8442c] bg-[#fbece5] dark:text-[#e0a085] dark:bg-[#a8442c]/[0.2]',
  media: 'text-[#8a6438] bg-[#f8f0e6] dark:text-[#d6a87a] dark:bg-[#8a6438]/[0.2]',
  normal: 'text-[#415a7e] bg-[#edf1f7] dark:text-[#9bb3d4] dark:bg-[#46627f]/[0.2]',
  baixa: 'text-[#3f7376] bg-[#e8f5f5] dark:text-[#7fb8ba] dark:bg-[#3f7376]/[0.2]',
}
const PRIOR_DOT: Record<string, string> = {
  alta: 'bg-[#a8442c] dark:bg-[#e0a085]', urgente: 'bg-[#a8442c] dark:bg-[#e0a085]',
  media: 'bg-[#8a6438] dark:bg-[#d6a87a]', normal: 'bg-[#415a7e] dark:bg-[#9bb3d4]',
  baixa: 'bg-[#3f7376] dark:bg-[#7fb8ba]',
}

function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'type' | 'default' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 h-[23px] px-2.5 rounded-md text-[11px] font-semibold whitespace-nowrap',
      tone === 'type'
        ? 'text-[#415a7e] bg-[#edf1f7] dark:text-[#9bb3d4] dark:bg-[#46627f]/[0.2]'
        : 'text-[#5a6775] bg-[#f3f1ea] dark:text-[#bcd2e6] dark:bg-[#232f42]',
    )}>{children}</span>
  )
}

function MetaCol({ Icon, label, children }: { Icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa1a8] dark:text-[#5a6675]">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className="min-h-[28px] flex items-center">{children}</div>
    </div>
  )
}

function SectionCard({ Icon, label, right, children }: { Icon: LucideIcon; label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="p-4 rounded-[16px] bg-[#fcfbf8] dark:bg-[#1b2536] border border-[#f0ede3] dark:border-[#253345]">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[#9aa1a8] dark:text-[#5a6675]">
          <Icon className="w-[13px] h-[13px]" />{label}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

type TileColor = 'success' | 'teal' | 'slate' | 'info' | 'warning' | 'danger'
const TILE_TINT: Record<TileColor, string> = {
  success: 'text-[#3f6a54] bg-[#eaf4ee] hover:bg-[#dcece2] dark:text-[#8db8a0] dark:bg-[#3f6a54]/[0.16] dark:hover:bg-[#3f6a54]/[0.26]',
  teal: 'text-[#3f7376] bg-[#e8f5f5] hover:bg-[#d7efef] dark:text-[#7fb8ba] dark:bg-[#3f7376]/[0.16] dark:hover:bg-[#3f7376]/[0.26]',
  slate: 'text-[#34495e] bg-[#eef1f6] hover:bg-[#e3e9f2] dark:text-[#9eb1cc] dark:bg-[#46627f]/[0.18] dark:hover:bg-[#46627f]/[0.28]',
  info: 'text-[#415a7e] bg-[#edf1f7] hover:bg-[#e1e9f3] dark:text-[#9bb3d4] dark:bg-[#46627f]/[0.18] dark:hover:bg-[#46627f]/[0.28]',
  warning: 'text-[#8a6438] bg-[#f8f0e6] hover:bg-[#f0e4d2] dark:text-[#d6a87a] dark:bg-[#8a6438]/[0.18] dark:hover:bg-[#8a6438]/[0.28]',
  danger: 'text-[#a8442c] bg-[#fbece5] hover:bg-[#f6dccf] dark:text-[#e0a085] dark:bg-[#a8442c]/[0.18] dark:hover:bg-[#a8442c]/[0.28]',
}
function ActTile({ Icon, label, color, filled, onClick }: {
  Icon: LucideIcon; label: string; color: TileColor; filled?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 min-w-[82px] h-16 rounded-[12px] flex flex-col items-center justify-center gap-1.5 transition-all',
        filled
          ? (color === 'success'
              ? 'bg-gradient-to-br from-[#3f6a54] to-[#4a7a61] text-white shadow-[0_4px_12px_-4px_rgba(63,106,84,0.4)] hover:brightness-[1.06]'
              : 'bg-gradient-to-br from-[#3f7376] to-[#4a8689] text-white shadow-[0_4px_12px_-4px_rgba(63,115,118,0.4)] hover:brightness-[1.06]')
          : TILE_TINT[color],
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span className="text-[11.5px] font-semibold">{label}</span>
    </button>
  )
}

interface TarefaDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tarefa: Tarefa
  onEdit?: () => void
  onDelete?: () => void
  onCancelar?: () => void
  onConcluir?: () => void
  onReabrir?: () => void
  onLancarHoras?: () => void
  onEditTimesheetEntry?: (entry: TimesheetEntryRecente) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
  onUpdate?: () => void | Promise<void>
  onClose?: () => void // Chamado quando o modal deve fechar por ação (reagendamento para outro dia, etc)
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
  regra_frequencia: string
  regra_intervalo: number
  data_inicio: string
  data_fim?: string
}

export default function TarefaDetailModal({
  open,
  onOpenChange,
  tarefa,
  onEdit,
  onDelete,
  onCancelar,
  onConcluir,
  onReabrir,
  onLancarHoras,
  onEditTimesheetEntry,
  onProcessoClick,
  onConsultivoClick,
  onUpdate,
  onClose,
}: TarefaDetailModalProps) {
  // Timer
  const { timersAtivos, iniciarTimer, pausarTimer, retomarTimer } = useTimer()
  const timerExistente = timersAtivos.find(t => t.tarefa_id === tarefa.id)

  // Horas lançadas vinculadas à tarefa
  const { data: timesheetEntries } = useTimesheetPorTarefa(open ? tarefa.id : null)
  const [timesheetListOpen, setTimesheetListOpen] = useState(false)
  const [editTimesheetEntry, setEditTimesheetEntry] = useState<TimesheetEntryRecente | null>(null)

  const handleTimerClick = async () => {
    try {
      if (timerExistente?.status === 'rodando') {
        await pausarTimer(timerExistente.id)
        toast.info('Timer pausado')
      } else if (timerExistente?.status === 'pausado') {
        await retomarTimer(timerExistente.id)
        toast.success('Timer retomado')
      } else {
        await iniciarTimer({
          titulo: tarefa.titulo,
          tarefa_id: tarefa.id,
          processo_id: tarefa.processo_id || undefined,
          consulta_id: tarefa.consultivo_id || undefined,
          faturavel: true,
        })
        toast.success('Timer iniciado')
      }
    } catch (error) {
      console.error('Erro ao controlar timer:', error)
      toast.error('Erro ao controlar timer')
    }
  }

  const [processoInfo, setProcessoInfo] = useState<ProcessoInfo | null>(null)
  const [consultivoInfo, setConsultivoInfo] = useState<ConsultivoInfo | null>(null)
  const [recorrenciaInfo, setRecorrenciaInfo] = useState<RecorrenciaInfo | null>(null)
  const [loadingProcesso, setLoadingProcesso] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [dateDropdownOpen, setDateDropdownOpen] = useState<string | null>(null)
  const [calendarField, setCalendarField] = useState<'data_inicio' | 'prazo_data_limite' | null>(null)
  // Local copies of dates so we can update display without closing/reopening the modal
  const [localDataInicio, setLocalDataInicio] = useState(tarefa.data_inicio)
  const [localPrazoDataLimite, setLocalPrazoDataLimite] = useState<string | null>(tarefa.prazo_data_limite ?? null)
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

  // Sync local date state when tarefa changes (e.g. when a different tarefa is opened)
  useEffect(() => {
    setLocalDataInicio(tarefa.data_inicio)
    setLocalPrazoDataLimite(tarefa.prazo_data_limite ?? null)
  }, [tarefa.id, tarefa.data_inicio, tarefa.prazo_data_limite])

  // Impedir que o Dialog principal feche quando um dialog secundário está aberto
  // Isso resolve o problema de stacking do Radix UI onde o Dialog principal
  // recebe onOpenChange(false) ao abrir um dialog filho
  const handleMainDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen && (prazoFatalWarningOpen || confirmPrazoFatalOpen || calendarField !== null)) {
      return // Não fechar enquanto dialogs secundários estiverem abertos
    }
    onOpenChange(newOpen)
  }

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

      // Carregar processo (maybeSingle para não falhar se foi deletado)
      if (tarefa.processo_id) {
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
          .maybeSingle()

        if (error) {
          console.error('[TarefaDetail] Erro ao carregar processo:', error?.message || JSON.stringify(error))
        } else if (processo) {
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
      }

      // Carregar consultivo (maybeSingle para não falhar se foi deletado)
      if (tarefa.consultivo_id) {
        const { data: consultivo } = await supabase
          .from('consultivo_consultas')
          .select('id, titulo, status')
          .eq('id', tarefa.consultivo_id)
          .maybeSingle()

        if (consultivo) setConsultivoInfo(consultivo)
      }

      // Carregar recorrência
      if (tarefa.recorrencia_id) {
        const { data: recorrencia } = await supabase
          .from('agenda_recorrencias')
          .select('regra_frequencia, regra_intervalo, data_inicio, data_fim')
          .eq('id', tarefa.recorrencia_id)
          .single()

        if (recorrencia) setRecorrenciaInfo(recorrencia)
      }
    }

    loadAdditionalInfo()
  }, [tarefa])

  // Estado otimista para feedback imediato ao concluir/reabrir
  const [statusOtimista, setStatusOtimista] = useState<'concluida' | 'pendente' | null>(null)

  // Reset estado otimista quando tarefa muda (ex: refetch do pai)
  useEffect(() => {
    setStatusOtimista(null)
  }, [tarefa.status])

  // Determinar tipo
  const isFixa = tarefa.tipo === 'fixa'
  const isConcluido = statusOtimista ? statusOtimista === 'concluida' : tarefa.status === 'concluida'

  // Helper functions
  const getLocalTipoLabel = (tipo: string) => {
    return getTipoLabelFromConfig(tipo)
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
    if (field === 'data_inicio' && localPrazoDataLimite && !skipWarning) {
      const prazoFatal = parseDBDate(localPrazoDataLimite)
      const dataInicioAtual = parseDBDate(localDataInicio)

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

      // Verificar se a tarefa saiu do dia atual (reagendamento para outro dia)
      if (field === 'data_inicio') {
        const newDateBrazil = toBrazilTime(updateData[field])
        const todayBrazil = toBrazilTime(new Date().toISOString())
        if (newDateBrazil.toDateString() !== todayBrazil.toDateString()) {
          // Tarefa reagendada para outro dia → fechar modal e atualizar agenda
          toast.success('Tarefa reagendada com sucesso')
          // Apenas onClose — ele já faz refreshAgenda() no dashboard,
          // e o Realtime subscription também dispara invalidação automática
          if (onClose) onClose()
          return
        }
      }

      toast.success(field === 'prazo_data_limite' ? 'Prazo fatal atualizado' : 'Data atualizada com sucesso')

      // Atualizar state local para refletir a nova data sem fechar o modal
      if (field === 'data_inicio') setLocalDataInicio(updateData[field])
      else setLocalPrazoDataLimite(updateData[field])

      // Atualizar a agenda
      if (onUpdate) {
        await onUpdate()
      }
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

      // Atualizar state local para refletir as novas datas sem fechar o modal
      setLocalDataInicio(updateData.data_inicio)
      setLocalPrazoDataLimite(updateData.prazo_data_limite)

      // Atualizar a agenda
      if (onUpdate) {
        await onUpdate()
      }
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

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainDialogOpenChange}>
      <DialogContent
        className="sm:max-w-[760px] p-0 gap-0 overflow-hidden border border-[#e6e3da] dark:border-[#2e3a52] rounded-[20px] bg-white dark:bg-[#151e2b] dark:dark-dialog-glow [&>button]:hidden"
        onPointerDownOutside={(e) => {
          // Prevenir fechamento quando dialogs secundários estão abertos
          if (prazoFatalWarningOpen || confirmPrazoFatalOpen || calendarField !== null) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          if (prazoFatalWarningOpen || confirmPrazoFatalOpen || calendarField !== null) {
            e.preventDefault()
          }
        }}
      >
        <DialogTitle className="sr-only">Detalhes da Tarefa</DialogTitle>
        <div className="flex flex-col max-h-[88vh]">

          {/* HEADER */}
          <div className="flex items-start gap-4 px-6 pt-6 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Chip tone="type"><FileText className="w-[11px] h-[11px]" />{getLocalTipoLabel(tarefa.tipo)}</Chip>
                {isFixa && <Chip>Aparece todo dia</Chip>}
                {tarefa.pessoal && <Chip><Lock className="w-[11px] h-[11px]" />Pessoal</Chip>}
                {tarefa.status === 'cancelada' && <Chip><Ban className="w-[11px] h-[11px]" />Cancelada</Chip>}
                <span className={cn('inline-flex items-center gap-1.5 h-[23px] px-2.5 rounded-full text-[11px] font-bold', PRIOR_PILL[tarefa.prioridade] || PRIOR_PILL.normal)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', PRIOR_DOT[tarefa.prioridade] || PRIOR_DOT.normal)} />
                  Prioridade {getPrioridadeLabel(tarefa.prioridade).toLowerCase()}
                </span>
              </div>
              <h2
                className={cn(
                  'text-[21px] font-semibold leading-[1.28] tracking-[-0.015em] text-[#1a2330] dark:text-[#e8ecf2] [text-wrap:pretty]',
                  isConcluido && 'line-through opacity-50',
                )}
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                {tarefa.titulo}
              </h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0 bg-[#f3f1ea] dark:bg-[#232f42] text-[#5a6775] dark:text-[#8a97a8] hover:bg-[#ece9e2] dark:hover:bg-[#313f57] transition-colors"
            >
              <X className="w-[15px] h-[15px]" />
            </button>
          </div>

          {/* CORPO EM SEÇÕES */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-4 flex flex-col gap-3">
            {/* Descrição */}
            <SectionCard Icon={FileText} label="Descrição">
              {tarefa.descricao ? (
                <div className="max-h-[150px] overflow-y-auto pr-1">
                  <p className="text-[13px] leading-[1.55] text-[#2c3e50] dark:text-[#d8e2ef] [text-wrap:pretty]">{tarefa.descricao}</p>
                </div>
              ) : (
                <p className="text-[13px] italic text-[#9aa1a8] dark:text-[#5a6675]">Sem descrição</p>
              )}
            </SectionCard>

            {/* Processo vinculado */}
            {tarefa.processo_id && (
              <SectionCard Icon={Scale} label="Processo vinculado">
                {processoInfo ? (
                  <div className="flex items-start gap-2">
                    <button onClick={() => onProcessoClick?.(processoInfo.id)} className="flex-1 min-w-0 text-left group">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#1a2330] dark:text-[#e8ecf2]">Pasta {processoInfo.numero_pasta || 'S/N'}</span>
                        {processoInfo.status && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#3f7376] dark:text-[#7fb8ba]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#89bcbe]" />{processoInfo.status}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#9aa1a8] group-hover:text-[#3f7376] ml-auto flex-shrink-0" />
                      </div>
                      {processoInfo.numero_cnj && (
                        <div className="text-[11.5px] font-mono text-[#5a6775] dark:text-[#8a97a8] mt-1">{processoInfo.numero_cnj}</div>
                      )}
                      {formatProcessoPartes(processoInfo) && (
                        <div className="text-[11.5px] text-[#5a6775] dark:text-[#8a97a8] mt-1">{formatProcessoPartes(processoInfo)}</div>
                      )}
                    </button>
                    {processoInfo.numero_cnj && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(processoInfo.numero_cnj!); toast.success('Número copiado!') }}
                        className="p-1.5 rounded-lg text-[#9aa1a8] dark:text-[#5a6675] hover:bg-[#efece4] dark:hover:bg-[#222d3f] hover:text-[#3f7376] transition-colors flex-shrink-0"
                        title="Copiar número do processo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-[12.5px] italic text-[#9aa1a8] dark:text-[#5a6675]">{loadingProcesso ? 'Carregando...' : 'Erro ao carregar processo'}</div>
                )}
              </SectionCard>
            )}

            {/* Consulta vinculada */}
            {consultivoInfo && (
              <SectionCard Icon={FileText} label="Consulta vinculada">
                <button onClick={() => onConsultivoClick?.(consultivoInfo.id)} className="w-full text-left group flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1a2330] dark:text-[#e8ecf2]">{consultivoInfo.titulo}</div>
                    {consultivoInfo.status && (
                      <div className="text-[11px] text-[#5a6775] dark:text-[#8a97a8] mt-0.5">Status: {consultivoInfo.status}</div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9aa1a8] group-hover:text-[#3f7376] flex-shrink-0" />
                </button>
              </SectionCard>
            )}

            {/* Responsáveis */}
            <SectionCard
              Icon={Users}
              label="Responsáveis"
              right={
                <span className="text-[11px] text-[#9aa1a8] dark:text-[#5a6675]">
                  {tarefa.criado_por_nome ? `criada por ${tarefa.criado_por_nome} · ` : 'criada '}{formatBrazilDate(tarefa.created_at)}
                </span>
              }
            >
              {loadingResponsaveis ? (
                <span className="text-[12.5px] italic text-[#9aa1a8] dark:text-[#5a6675]">Carregando...</span>
              ) : responsaveis.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {responsaveis.map((resp) => (
                    <span key={resp.id} className="inline-flex items-center gap-2 h-[30px] pl-1 pr-3 rounded-full bg-[#f7f5f0] dark:bg-white/[0.07]">
                      <span className="w-[23px] h-[23px] rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: avatarCor(resp.nome_completo) }}>
                        {iniciaisNome(resp.nome_completo)}
                      </span>
                      <span className="text-[12px] font-medium text-[#5a6775] dark:text-[#9fadbf]">{resp.nome_completo}</span>
                    </span>
                  ))}
                </div>
              ) : tarefa.responsavel_nome ? (
                <span className="text-[12.5px] text-[#2c3e50] dark:text-[#d8e2ef]">{tarefa.responsavel_nome}</span>
              ) : (
                <span className="text-[12.5px] italic text-[#9aa1a8] dark:text-[#5a6675]">Não atribuído</span>
              )}
            </SectionCard>

            {/* Linha de datas / status / horas (sem fundo, depois de responsáveis) */}
            <div className="flex items-center gap-x-5 gap-y-3 flex-wrap px-1 py-1">
              <MetaCol Icon={CalendarDays} label={isFixa ? 'Frequência' : 'Execução'}>
                {isFixa ? (
                  <span className="text-[12.5px] font-medium text-[#3f7376] dark:text-[#7fb8ba]">Todo dia (tarefa fixa)</span>
                ) : (
                  <DateRescheduleButton
                    field="data_inicio"
                    currentDate={localDataInicio}
                    dateDropdownOpen={dateDropdownOpen}
                    setDateDropdownOpen={setDateDropdownOpen}
                    updatingDate={updatingDate}
                    setCalendarField={setCalendarField}
                    handleUpdateDate={handleUpdateDate}
                    getUrgency={getUrgency}
                  />
                )}
              </MetaCol>

              {!isFixa && localPrazoDataLimite && (
                <>
                  <div className="w-px h-9 bg-[#f0ede3] dark:bg-[#253345]" />
                  <MetaCol Icon={Flag} label={(() => {
                    const dias = differenceInDays(parseDBDate(localPrazoDataLimite), parseDBDate(localDataInicio))
                    return `Prazo fatal ${dias > 0 ? `(${dias}d)` : dias === 0 ? '(hoje)' : `(${Math.abs(dias)}d atrás)`}`
                  })()}>
                    <DateRescheduleButton
                      field="prazo_data_limite"
                      currentDate={localPrazoDataLimite}
                      dateDropdownOpen={dateDropdownOpen}
                      setDateDropdownOpen={setDateDropdownOpen}
                      updatingDate={updatingDate}
                      setCalendarField={setCalendarField}
                      handleUpdateDate={handleUpdateDate}
                      getUrgency={getUrgency}
                    />
                  </MetaCol>
                </>
              )}

              <div className="w-px h-9 bg-[#f0ede3] dark:bg-[#253345]" />
              <MetaCol Icon={Info} label="Status">
                <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full text-[11.5px] font-semibold bg-[#f3f1ea] dark:bg-[#232f42] text-[#2c3e50] dark:text-[#d8e2ef] border border-[#e6e3da] dark:border-[#37455f]">
                  <span className={cn('w-[7px] h-[7px] rounded-full',
                    isConcluido ? 'bg-[#3f6a54]'
                    : tarefa.status === 'em_andamento' ? 'bg-[#46627f]'
                    : tarefa.status === 'em_pausa' ? 'bg-[#c2956b]'
                    : tarefa.status === 'cancelada' ? 'bg-[#9aa1a8]' : 'bg-[#c2956b]')} />
                  {isConcluido ? 'Concluída'
                    : tarefa.status === 'em_andamento' ? 'Em andamento'
                    : tarefa.status === 'em_pausa' ? 'Em pausa'
                    : tarefa.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                </span>
              </MetaCol>

              <div className="flex-1" />

              {timesheetEntries && timesheetEntries.length > 0 && (
                <button
                  onClick={() => setTimesheetListOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-[9px] text-[12px] font-medium text-[#5a6775] dark:text-[#8a97a8] hover:bg-[#f3f1ea] dark:hover:bg-[#1b2536] transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-[#3f7376] dark:text-[#7fb8ba]" />
                  Horas lançadas
                  <span className="font-mono font-semibold text-[#2c3e50] dark:text-[#edf1f7]">
                    {formatHoras(timesheetEntries.reduce((s, e) => s + (Number(e.horas) || 0), 0), 'curto')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9aa1a8] dark:text-[#5a6675]" />
                </button>
              )}
            </div>

            {/* Recorrência */}
            {recorrenciaInfo && (
              <SectionCard Icon={RotateCcw} label="Recorrência">
                <div className="text-[12.5px] text-[#2c3e50] dark:text-[#d8e2ef]">
                  {recorrenciaInfo.regra_frequencia} — A cada {recorrenciaInfo.regra_intervalo} {recorrenciaInfo.regra_intervalo === 1 ? 'vez' : 'vezes'}
                  {recorrenciaInfo.data_fim && (
                    <span className="block text-[11px] text-[#9aa1a8] dark:text-[#5a6675] mt-1">Até {formatBrazilDate(parseDBDate(recorrenciaInfo.data_fim))}</span>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Observações */}
            {tarefa.observacoes && (
              <SectionCard Icon={FileText} label="Observações">
                <p className="text-[13px] leading-[1.55] text-[#2c3e50] dark:text-[#d8e2ef]">{tarefa.observacoes}</p>
              </SectionCard>
            )}

            {/* Concluída em */}
            {tarefa.data_conclusao && (
              <div className="flex items-center gap-2 px-1 text-[11.5px] font-medium text-[#3f6a54] dark:text-[#8db8a0]">
                <Check className="w-3.5 h-3.5" />
                Concluída em {formatBrazilDate(parseDBDate(tarefa.data_conclusao))}
              </div>
            )}
          </div>

          {/* RODAPÉ — tiles de ação (todos visíveis, coloridos no DS) */}
          <div className="flex gap-2 px-6 py-3.5 border-t border-[#f0ede3] dark:border-[#253345] bg-[#faf9f5] dark:bg-white/[0.018] flex-wrap flex-shrink-0">
            {!isConcluido ? (
              <ActTile
                Icon={Check}
                label={isFixa ? 'Concluir hoje' : 'Concluir'}
                color="success"
                filled
                onClick={() => { setStatusOtimista('concluida'); onConcluir?.() }}
              />
            ) : (
              <ActTile
                Icon={RotateCcw}
                label="Reabrir"
                color="success"
                onClick={() => { setStatusOtimista('pendente'); onReabrir?.() }}
              />
            )}

            <ActTile
              Icon={timerExistente?.status === 'rodando' ? PauseCircle : PlayCircle}
              label={timerExistente?.status === 'rodando' ? 'Pausar' : timerExistente?.status === 'pausado' ? 'Retomar' : 'Timer'}
              color="teal"
              filled={timerExistente?.status === 'rodando'}
              onClick={handleTimerClick}
            />

            {onLancarHoras && (tarefa.processo_id || tarefa.consultivo_id) && (
              <ActTile Icon={Timer} label="Lançar" color="teal" onClick={onLancarHoras} />
            )}

            <ActTile Icon={Edit2} label="Editar" color="slate" onClick={onEdit} />

            {onCancelar && tarefa.status !== 'cancelada' && (
              <ActTile Icon={Ban} label="Cancelar" color="warning" onClick={onCancelar} />
            )}

            {onDelete && (
              <ActTile Icon={Trash2} label="Excluir" color="danger" onClick={onDelete} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Calendar Dialog separado para "Escolher outra data" (V4) */}
    <Dialog open={calendarField !== null} onOpenChange={(open) => !open && setCalendarField(null)}>
      <DialogContent className="max-w-fit p-4 rounded-[18px] border border-[#e6e3da] dark:border-[#2e3a52] bg-white dark:bg-[#151e2b] dark:dark-dialog-glow">
        <DialogTitle className="text-[14px] font-semibold text-[#1a2330] dark:text-[#e8ecf2] mb-2">
          Selecione a nova data
        </DialogTitle>
        <CalendarComponent
          mode="single"
          selected={
            calendarField === 'data_inicio' && localDataInicio
              ? parseDBDate(localDataInicio)
              : calendarField === 'prazo_data_limite' && localPrazoDataLimite
              ? parseDBDate(localPrazoDataLimite)
              : undefined
          }
          onSelect={handleCustomDateSelect}
          disabled={updatingDate}
        />
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmação para Editar Prazo Fatal - AlertDialog para stacking correto sobre o Dialog principal */}
    <AlertDialog open={confirmPrazoFatalOpen} onOpenChange={(open) => {
      setConfirmPrazoFatalOpen(open)
      if (!open) {
        setPendingPrazoFatalDate(null)
      }
    }}>
      <AlertDialogContent className="max-w-md p-0 overflow-hidden border-0 z-[100]">
        <AlertDialogTitle className="sr-only">Confirmar Alteração do Prazo Fatal</AlertDialogTitle>
        <AlertDialogDescription className="sr-only">Confirme a alteração da data limite do prazo fatal</AlertDialogDescription>
        <div className="bg-white dark:bg-surface-1 rounded-lg">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f0f9f9] dark:bg-teal-900/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#89bcbe]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#34495e] dark:text-slate-200">
                  Alterar Prazo Fatal?
                </h2>
                <p className="text-xs text-[#46627f] dark:text-slate-400 mt-0.5">
                  Confirme a alteração da data limite
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-[#46627f] dark:text-slate-400 mb-4">
              Você está prestes a alterar o <strong className="text-[#34495e] dark:text-slate-200">prazo fatal</strong> desta tarefa para:
            </p>
            <div className="p-3 bg-[#f0f9f9] dark:bg-teal-900/20 rounded-lg border border-[#89bcbe]/30 mb-4">
              <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                {pendingPrazoFatalDate && formatBrazilDate(pendingPrazoFatalDate)}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              O prazo fatal representa a data limite absoluta para conclusão. Tem certeza?
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-0/50">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmPrazoFatalOpen(false)
                  setPendingPrazoFatalDate(null)
                }}
                className="flex-1 h-9 text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-surface-2"
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
      </AlertDialogContent>
    </AlertDialog>

    {/* Modal de Aviso - Reagendamento Ultrapassa Prazo Fatal - AlertDialog para stacking correto */}
    <AlertDialog open={prazoFatalWarningOpen} onOpenChange={(open) => {
      setPrazoFatalWarningOpen(open)
      if (!open) {
        setPendingDataInicio(null)
        setNovoPrazoFatalSelecionado(null)
        setPrazoFatalCalendarOpen(false)
      }
    }}>
      <AlertDialogContent className="max-w-md p-0 overflow-hidden border-0 z-[100]">
        <AlertDialogTitle className="sr-only">Reagendar Prazo Fatal</AlertDialogTitle>
        <AlertDialogDescription className="sr-only">A nova data de execução é posterior ao prazo fatal atual</AlertDialogDescription>
        <div className="bg-white dark:bg-surface-1 rounded-lg">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f0f9f9] dark:bg-teal-900/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#89bcbe]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#34495e] dark:text-slate-200">
                  Reagendar Prazo Fatal
                </h2>
                <p className="text-xs text-[#46627f] dark:text-slate-400 mt-0.5">
                  A nova data de execução é posterior ao prazo fatal atual
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Info das datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#f0f9f9] dark:bg-teal-900/20 rounded-lg border border-[#89bcbe]/30">
                <p className="text-[10px] text-[#46627f] dark:text-slate-400 mb-1">Nova Data Execução</p>
                <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                  {pendingDataInicio && formatBrazilDate(pendingDataInicio)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-surface-0 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Prazo Fatal Atual</p>
                <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                  {localPrazoDataLimite && formatBrazilDate(parseDBDate(localPrazoDataLimite))}
                </p>
              </div>
            </div>

            {/* Seletor de novo prazo fatal */}
            <div>
              <p className="text-xs text-[#46627f] dark:text-slate-400 mb-2">
                Selecione o novo prazo fatal:
              </p>
              <Popover open={prazoFatalCalendarOpen} onOpenChange={setPrazoFatalCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                      "bg-[#e8f5f5] dark:bg-teal-900/20 border-[#89bcbe]/40 hover:border-[#89bcbe]"
                    )}
                  >
                    <div className="text-left">
                      <p className="text-[10px] text-[#46627f] dark:text-slate-400 mb-0.5">Novo Prazo Fatal</p>
                      <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                        {novoPrazoFatalSelecionado ? formatBrazilDate(novoPrazoFatalSelecionado) : 'Selecionar data'}
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-[#89bcbe]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="center">
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
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-0/50">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPrazoFatalWarningOpen(false)
                  setPendingDataInicio(null)
                  setNovoPrazoFatalSelecionado(null)
                }}
                className="flex-1 h-9 text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-surface-2"
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
      </AlertDialogContent>
    </AlertDialog>

    {/* Modal lista de horas vinculadas */}
    {timesheetEntries && timesheetEntries.length > 0 && (
      <TimesheetListModal
        open={timesheetListOpen}
        onOpenChange={setTimesheetListOpen}
        entries={timesheetEntries}
        tituloTarefa={tarefa.titulo}
        onEditEntry={(entry) => {
          setTimesheetListOpen(false)
          setEditTimesheetEntry(entry)
        }}
        onNewEntry={onLancarHoras ? () => { setTimesheetListOpen(false); onLancarHoras() } : undefined}
      />
    )}

    {/* Modal padrão de edição de horas */}
    {editTimesheetEntry && (
      <TimesheetModal
        open={!!editTimesheetEntry}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditTimesheetEntry(null)
        }}
        processoId={editTimesheetEntry.processo_id}
        consultaId={editTimesheetEntry.consulta_id}
        tarefaId={editTimesheetEntry.tarefa_id}
        editTimesheetId={editTimesheetEntry.id}
        defaultAtividade={editTimesheetEntry.atividade}
        defaultDataTrabalho={editTimesheetEntry.data_trabalho}
        defaultHoraInicio={editTimesheetEntry.hora_inicio}
        defaultHoraFim={editTimesheetEntry.hora_fim}
        defaultFaturavel={editTimesheetEntry.faturavel}
        defaultModoRegistro={editTimesheetEntry.hora_inicio ? 'horario' : 'duracao'}
        defaultDuracaoHoras={Math.floor(Number(editTimesheetEntry.horas) || 0)}
        defaultDuracaoMinutos={Math.round(((Number(editTimesheetEntry.horas) || 0) % 1) * 60)}
        onSuccess={() => {
          setEditTimesheetEntry(null)
        }}
      />
    )}
    </>
  )
}
