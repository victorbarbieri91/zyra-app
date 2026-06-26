'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Clock,
  Loader2,
  Search,
  FileText,
  Briefcase,
  X,
  Check,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Calendar,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useAtosHora, AtoHoraConfig, HorasAcumuladasInfo } from '@/hooks/useAtosHora'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { useTimesheetEntry } from '@/hooks/useTimesheetEntry'
import { useQueryClient } from '@tanstack/react-query'
import { AtoHoraProgress } from './AtoHoraProgress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  type FormaCobranca,
  parseFormasPagamento,
  contratoCobraHoras,
  formaPrincipal,
  FORMA_COBRANCA_LABELS,
} from '@/lib/contratos/formas'

interface TimesheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Pré-seleção opcional
  processoId?: string | null
  consultaId?: string | null
  tarefaId?: string | null
  audienciaId?: string | null
  eventoId?: string | null
  // Defaults para integração com timer
  defaultModoRegistro?: 'horario' | 'duracao'
  defaultDuracaoHoras?: number
  defaultDuracaoMinutos?: number
  defaultAtividade?: string
  // Modo edição: pré-preenche com dados de lançamento existente
  editTimesheetId?: string | null
  defaultDataTrabalho?: string | null
  defaultHoraInicio?: string | null
  defaultHoraFim?: string | null
  defaultFaturavel?: boolean | null
  // Callbacks
  onSuccess?: () => void
  // Callback para "Salvar e Concluir" - salva horas E marca entidade como concluída
  onSaveAndComplete?: () => void
}

interface ProcessoOption {
  id: string
  numero_cnj: string
  numero_pasta?: string
  cliente_nome?: string
  contrato_id?: string
  forma_cobranca?: string
}

interface ConsultaOption {
  id: string
  numero?: string
  titulo: string
  cliente_nome?: string
  contrato_id?: string
  forma_cobranca?: string
}

interface ContratoInfo {
  id: string
  /** Array canônico de formas configuradas no contrato */
  formas_cobranca: FormaCobranca[]
  /** Primeira forma do array — atalho para badges resumidas */
  forma_cobranca: FormaCobranca
  horas_faturaveis: boolean
  titulo?: string
}

// Item da lista de vínculos (busca e recentes) — formato unificado
interface VinculoItem {
  id: string
  chip: string
  titulo: string
  sub?: string
}

// Formata data para input HTML type="date" (YYYY-MM-DD)
const formatDateForInput = (date: Date = new Date()): string => {
  return formatBrazilDate(date, 'yyyy-MM-dd')
}

// YYYY-MM-DD → Date local (sem deslocamento de timezone)
const parseInputDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y || 2000, (m || 1) - 1, d || 1)
}

// ── tokens de superfície (paleta quente V4, consistente com o resto da Agenda) ──
const SURFACE = 'bg-white dark:bg-[#151e2b]'
const FIELD = 'bg-white dark:bg-[#10161f] border border-[#e6e3da] dark:border-[#37455f]'
const LABEL = 'text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-[#808fa1]'

// número grande editável (mono) com setas evidentes
function TimeStepper({
  value, max, label, step = 1, onChange, onStep,
}: { value: number; max: number; label: string; step?: number; onChange: (n: number) => void; onStep: (d: number) => void }) {
  const [v, setV] = useState(String(value).padStart(2, '0'))
  const [foc, setFoc] = useState(false)
  useEffect(() => { if (!foc) setV(String(value).padStart(2, '0')) }, [value, foc])
  const stepCls = 'w-[84px] h-8 rounded-[9px] flex items-center justify-center transition-colors border border-[#e6e3da] dark:border-[#37455f] bg-white dark:bg-[#10161f] text-[#5a6775] dark:text-[#9fadbf] hover:border-[#89bcbe] hover:text-[#3f7376] dark:hover:text-[#9fc7c9]'
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => onStep(step)} className={stepCls}><ChevronUp className="w-[18px] h-[18px]" /></button>
      <input
        value={v}
        inputMode="numeric"
        onFocus={(e) => { setFoc(true); e.target.select() }}
        onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(-2))}
        onBlur={() => { let n = parseInt(v || '0', 10); if (isNaN(n)) n = 0; n = Math.max(0, Math.min(max, n)); onChange(n); setV(String(n).padStart(2, '0')); setFoc(false) }}
        className={cn(
          'w-[84px] h-14 text-center text-[40px] font-semibold font-mono tracking-[-0.01em] rounded-[10px] outline-none tabular-nums text-[#1a2330] dark:text-[#e8ecf2] border-[1.5px]',
          foc ? 'border-[#89bcbe] bg-white dark:bg-[#10161f]' : 'border-transparent bg-transparent',
        )}
      />
      <button type="button" onClick={() => onStep(-step)} className={stepCls}><ChevronDown className="w-[18px] h-[18px]" /></button>
      <span className={cn(LABEL, 'tracking-[0.1em] text-[10px]')}>{label}</span>
    </div>
  )
}

// linha de vínculo (busca / recentes)
function VinculoRow({ chip, titulo, sub, selected, onClick }: VinculoItem & { selected?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors group',
        selected ? 'bg-[#eef7f7] dark:bg-[#89bcbe]/[0.12]' : 'hover:bg-[#f7f6f2] dark:hover:bg-[#1c2433]',
      )}
    >
      <span className={cn(
        'flex-shrink-0 h-[22px] px-2 rounded-md inline-flex items-center text-[11px] font-bold font-mono whitespace-nowrap max-w-[120px] truncate',
        selected ? 'bg-[#dcefef] text-[#3f7376] dark:bg-[#89bcbe]/[0.2] dark:text-[#9fc7c9]' : 'bg-[#eef1f0] text-[#5a6775] dark:bg-[#232f42] dark:text-[#9fadbf]',
      )}>{chip}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-semibold text-[#1a2330] dark:text-[#e8ecf2] truncate">{titulo}</span>
        {sub && <span className="block text-[10.5px] text-[#9aa1a8] dark:text-[#808fa1] truncate">{sub}</span>}
      </span>
      <ChevronRight className={cn('w-[15px] h-[15px] flex-shrink-0 transition-colors', selected ? 'text-[#89bcbe]' : 'text-transparent group-hover:text-[#89bcbe]')} />
    </button>
  )
}

export default function TimesheetModal({
  open,
  onOpenChange,
  processoId,
  consultaId,
  tarefaId,
  audienciaId,
  eventoId,
  defaultModoRegistro,
  defaultDuracaoHoras,
  defaultDuracaoMinutos,
  defaultAtividade,
  editTimesheetId,
  defaultDataTrabalho,
  defaultHoraInicio,
  defaultHoraFim,
  defaultFaturavel,
  onSuccess,
  onSaveAndComplete,
}: TimesheetModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const { editarTimesheet } = useTimesheetEntry(escritorioAtivo)
  const queryClient = useQueryClient()
  const isEditMode = !!editTimesheetId

  // Form state
  const [dataTrabalho, setDataTrabalho] = useState(formatDateForInput())
  const [dateOpen, setDateOpen] = useState(false)
  const [atividade, setAtividade] = useState('')
  const [faturavel, setFaturavel] = useState<boolean | null>(null) // null = usar padrão do contrato
  const [faturavelManual, setFaturavelManual] = useState(false) // Indica se usuário sobrescreveu

  // Tempo registrado — só duração (horas:min)
  const [duracaoHoras, setDuracaoHoras] = useState(1)
  const [duracaoMinutos, setDuracaoMinutos] = useState(0)

  // Vínculo state
  const [vinculoTipo, setVinculoTipo] = useState<'processo' | 'consulta'>('processo')
  const [searchTerm, setSearchTerm] = useState('')

  // Selected state
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoOption | null>(null)
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaOption | null>(null)
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null)

  // Search results
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [consultas, setConsultas] = useState<ConsultaOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Recentes (vínculos + atividades recentes do usuário, derivados do timesheet)
  const [recentes, setRecentes] = useState<{ processo: VinculoItem[]; consulta: VinculoItem[] }>({ processo: [], consulta: [] })
  const [atividadesRecentes, setAtividadesRecentes] = useState<string[]>([])

  // Submit state
  const [loading, setLoading] = useState(false)

  // Loading state para vínculo pré-carregado (evita flash da UI de busca)
  const [loadingVinculo, setLoadingVinculo] = useState(false)

  // Ato Hora state (para contratos por_ato com modo hora)
  const [atosHora, setAtosHora] = useState<AtoHoraConfig[]>([])
  const [atoSelecionado, setAtoSelecionado] = useState<string | null>(null)
  const [horasAcumuladasAto, setHorasAcumuladasAto] = useState<HorasAcumuladasInfo | null>(null)
  const [atosLoading, setAtosLoading] = useState(false)

  // Hook para atos hora
  const { getAtosConfiguradosHora, getHorasAcumuladas } = useAtosHora()

  // Total em minutos / decimal (só duração)
  const totalMin = duracaoHoras * 60 + duracaoMinutos
  const calcularHorasDecimalUnificado = useCallback(
    () => Math.max(0, duracaoHoras + duracaoMinutos / 60),
    [duracaoHoras, duracaoMinutos],
  )
  const horasDisplay = `${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}`

  // Steppers
  const incH = (d: number) => setDuracaoHoras((x) => Math.max(0, Math.min(23, x + d)))
  const incM = (d: number) => {
    let nm = duracaoMinutos + d
    let nh = duracaoHoras
    if (nm > 59) { nm -= 60; nh += 1 }
    if (nm < 0) { nm += 60; nh -= 1 }
    if (nh < 0) { nh = 0; nm = 0 }
    setDuracaoHoras(Math.min(23, nh))
    setDuracaoMinutos(nm)
  }

  // Calcular faturável padrão baseado no array canônico de formas do contrato.
  // Espelha a lógica de calcular_faturavel_timesheet no banco — usa o helper
  // contratoCobraHoras para reconhecer contratos híbridos (ex: por_pasta + por_cargo).
  const faturavelPadrao = useCallback((): boolean => {
    if (!contratoInfo) return true
    return contratoCobraHoras(contratoInfo.formas_cobranca, contratoInfo.horas_faturaveis)
  }, [contratoInfo])

  // Valor efetivo de faturável (manual ou padrão)
  const faturavelEfetivo = faturavel !== null ? faturavel : faturavelPadrao()

  // Reset form quando abrir — só duração
  useEffect(() => {
    if (open) {
      // Data de trabalho: usar default se disponível (modo edição), senão hoje
      setDataTrabalho(defaultDataTrabalho || formatDateForInput())

      // Sempre duração: pré-preenche a partir dos defaults (call sites de edição
      // já mandam defaultDuracaoHoras/Minutos calculados a partir de `horas`).
      setDuracaoHoras(defaultDuracaoHoras ?? 1)
      setDuracaoMinutos(defaultDuracaoMinutos ?? 0)

      setAtividade(defaultAtividade || '')

      // Faturável: pré-preencher se disponível (modo edição)
      if (defaultFaturavel !== undefined && defaultFaturavel !== null) {
        setFaturavel(defaultFaturavel)
        setFaturavelManual(true)
      } else {
        setFaturavel(null)
        setFaturavelManual(false)
      }

      setSearchTerm('')
      setProcessoSelecionado(null)
      setConsultaSelecionada(null)
      setContratoInfo(null)
      setAtosHora([])
      setAtoSelecionado(null)
      setHorasAcumuladasAto(null)

      // Se tem processoId ou consultaId, carregar com loading state
      if (processoId) {
        setVinculoTipo('processo')
        setLoadingVinculo(true)
        loadProcessoById(processoId).finally(() => setLoadingVinculo(false))
      } else if (consultaId) {
        setVinculoTipo('consulta')
        setLoadingVinculo(true)
        loadConsultaById(consultaId).finally(() => setLoadingVinculo(false))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processoId, consultaId, defaultModoRegistro, defaultDuracaoHoras, defaultDuracaoMinutos, defaultAtividade, defaultDataTrabalho, defaultHoraInicio, defaultHoraFim, defaultFaturavel])

  // Carregar "Recentes" (vínculos + atividades recentes do usuário)
  useEffect(() => {
    if (!open || !escritorioAtivo) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('v_timesheet_aprovacao')
        .select('processo_id, numero_processo, processo_pasta, processo_titulo, consulta_id, consulta_titulo, cliente_nome, atividade, created_at')
        .eq('escritorio_id', escritorioAtivo)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60)
      if (cancelled || !data) return
      const procMap = new Map<string, VinculoItem>()
      const consMap = new Map<string, VinculoItem>()
      const ativs: string[] = []
      for (const r of data as any[]) {
        if (r.processo_id && !procMap.has(r.processo_id)) {
          procMap.set(r.processo_id, {
            id: r.processo_id,
            chip: r.processo_pasta || r.numero_processo || 'Processo',
            titulo: r.processo_titulo || r.cliente_nome || r.numero_processo || '—',
            sub: r.cliente_nome || undefined,
          })
        }
        if (r.consulta_id && !consMap.has(r.consulta_id)) {
          consMap.set(r.consulta_id, {
            id: r.consulta_id,
            chip: 'Consulta',
            titulo: r.consulta_titulo || r.cliente_nome || '—',
            sub: r.cliente_nome || undefined,
          })
        }
        const a = (r.atividade || '').trim()
        if (a && !ativs.includes(a)) ativs.push(a)
      }
      setRecentes({
        processo: Array.from(procMap.values()).slice(0, 5),
        consulta: Array.from(consMap.values()).slice(0, 5),
      })
      setAtividadesRecentes(ativs.slice(0, 5))
    })()
    return () => { cancelled = true }
  }, [open, escritorioAtivo, supabase])

  // Carregar atos hora quando contrato é por_ato
  useEffect(() => {
    const carregarAtosHora = async () => {
      if (!contratoInfo || contratoInfo.forma_cobranca !== 'por_ato') {
        setAtosHora([])
        setAtoSelecionado(null)
        setHorasAcumuladasAto(null)
        return
      }

      setAtosLoading(true)
      try {
        const atos = await getAtosConfiguradosHora(contratoInfo.id)
        setAtosHora(atos)

        // Se só tem um ato, selecionar automaticamente
        if (atos.length === 1) {
          setAtoSelecionado(atos[0].ato_tipo_id)
        }
      } catch (err) {
        console.error('Erro ao carregar atos hora:', err)
        setAtosHora([])
      } finally {
        setAtosLoading(false)
      }
    }

    carregarAtosHora()
  }, [contratoInfo, getAtosConfiguradosHora])

  // Carregar horas acumuladas quando ato é selecionado
  useEffect(() => {
    const carregarHorasAcumuladas = async () => {
      if (!atoSelecionado || !processoSelecionado?.id) {
        setHorasAcumuladasAto(null)
        return
      }

      try {
        const horasInfo = await getHorasAcumuladas(processoSelecionado.id, atoSelecionado)
        setHorasAcumuladasAto(horasInfo)
      } catch (err) {
        console.error('Erro ao carregar horas acumuladas:', err)
        setHorasAcumuladasAto(null)
      }
    }

    carregarHorasAcumuladas()
  }, [atoSelecionado, processoSelecionado?.id, getHorasAcumuladas])

  // Função auxiliar para carregar contrato por ID
  const loadContratoById = async (contratoId: string): Promise<ContratoInfo | null> => {
    const { data, error } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('id, forma_cobranca, formas_pagamento, horas_faturaveis, titulo')
      .eq('id', contratoId)
      .single()

    if (error || !data) {
      console.error('Erro ao carregar contrato:', error)
      return null
    }

    // Canônico: array de formas parseado do jsonb formas_pagamento.
    // Fallback para forma_cobranca legada se o array vier vazio.
    const formas = parseFormasPagamento(data.formas_pagamento)
    const formasEfetivas: FormaCobranca[] =
      formas.length > 0
        ? formas
        : data.forma_cobranca
          ? [data.forma_cobranca as FormaCobranca]
          : []

    return {
      id: data.id,
      formas_cobranca: formasEfetivas,
      forma_cobranca: (formaPrincipal(formasEfetivas) ?? data.forma_cobranca) as FormaCobranca,
      horas_faturaveis: data.horas_faturaveis ?? true,
      titulo: data.titulo,
    }
  }

  // Carregar processo por ID
  const loadProcessoById = async (id: string) => {
    // Buscar processo com cliente
    const { data: processoData, error: processoError } = await supabase
      .from('processos_processos')
      .select(`
        id,
        numero_cnj,
        numero_pasta,
        contrato_id,
        cliente_id
      `)
      .eq('id', id)
      .single()

    if (processoError || !processoData) {
      console.error('Erro ao carregar processo:', processoError)
      return
    }

    // Buscar nome do cliente separadamente
    let clienteNome: string | undefined
    if (processoData.cliente_id) {
      const { data: clienteData } = await supabase
        .from('crm_pessoas')
        .select('nome_completo')
        .eq('id', processoData.cliente_id)
        .single()
      clienteNome = clienteData?.nome_completo
    }

    // Buscar contrato separadamente (mais confiável que join)
    let contrato: ContratoInfo | null = null
    if (processoData.contrato_id) {
      contrato = await loadContratoById(processoData.contrato_id)
    }

    // Definir processo selecionado
    setProcessoSelecionado({
      id: processoData.id,
      numero_cnj: processoData.numero_cnj,
      numero_pasta: processoData.numero_pasta,
      cliente_nome: clienteNome,
      contrato_id: processoData.contrato_id,
      forma_cobranca: contrato?.forma_cobranca,
    })
    setConsultaSelecionada(null)

    // Definir info do contrato
    setContratoInfo(contrato)
  }

  // Carregar consulta por ID
  const loadConsultaById = async (id: string) => {
    // Buscar consulta com cliente
    const { data: consultaData, error: consultaError } = await supabase
      .from('consultivo_consultas')
      .select(`
        id,
        numero,
        titulo,
        contrato_id,
        cliente_id
      `)
      .eq('id', id)
      .single()

    if (consultaError || !consultaData) {
      console.error('Erro ao carregar consulta:', consultaError)
      return
    }

    // Buscar nome do cliente separadamente
    let clienteNome: string | undefined
    if (consultaData.cliente_id) {
      const { data: clienteData } = await supabase
        .from('crm_pessoas')
        .select('nome_completo')
        .eq('id', consultaData.cliente_id)
        .single()
      clienteNome = clienteData?.nome_completo
    }

    // Buscar contrato separadamente (mais confiável que join)
    let contrato: ContratoInfo | null = null
    if (consultaData.contrato_id) {
      contrato = await loadContratoById(consultaData.contrato_id)
    }

    // Definir consulta selecionada
    setConsultaSelecionada({
      id: consultaData.id,
      numero: consultaData.numero,
      titulo: consultaData.titulo,
      cliente_nome: clienteNome,
      contrato_id: consultaData.contrato_id,
      forma_cobranca: contrato?.forma_cobranca,
    })
    setProcessoSelecionado(null)

    // Definir info do contrato
    setContratoInfo(contrato)
  }

  // Buscar processos/consultas
  useEffect(() => {
    const buscar = async () => {
      if (!escritorioAtivo || searchTerm.length < 2) {
        setProcessos([])
        setConsultas([])
        return
      }

      setSearchLoading(true)
      try {
        if (vinculoTipo === 'processo') {
          // Busca por numero_cnj, numero_pasta OU parte_contraria
          const { data: processosData } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, parte_contraria, contrato_id, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`numero_cnj.ilike.%${searchTerm}%,numero_pasta.ilike.%${searchTerm}%,parte_contraria.ilike.%${searchTerm}%`)
            .limit(15)

          // Também buscar por nome do cliente no CRM
          const { data: clientesData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMap = new Map((clientesData || []).map((c: any) => [c.id, c.nome_completo]))

          // Buscar processos desses clientes
          let processosCliente: any[] = []
          if (clienteMap.size > 0) {
            const { data: pcData } = await supabase
              .from('processos_processos')
              .select('id, numero_cnj, numero_pasta, parte_contraria, contrato_id, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMap.keys()))
              .limit(10)
            processosCliente = pcData || []
          }

          // Combinar e remover duplicados
          const todosProcessos = [...(processosData || []), ...processosCliente]
          const processosUnicos = Array.from(
            new Map(todosProcessos.map((p: any) => [p.id, p])).values()
          ).slice(0, 10)

          // Buscar nomes dos clientes para os processos que não vieram da busca por cliente
          const clienteIdsParaBuscar = processosUnicos
            .filter((p: any) => p.cliente_id && !clienteMap.has(p.cliente_id))
            .map((p: any) => p.cliente_id)

          if (clienteIdsParaBuscar.length > 0) {
            const { data: clientesAdicionais } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsParaBuscar)

            ;(clientesAdicionais || []).forEach((c: any) => clienteMap.set(c.id, c.nome_completo))
          }

          // Buscar forma_cobranca dos contratos
          const contratoIds = processosUnicos
            .filter((p: any) => p.contrato_id)
            .map((p: any) => p.contrato_id)

          const contratoMap = new Map<string, string>()
          if (contratoIds.length > 0) {
            const { data: contratos } = await supabase
              .from('financeiro_contratos_honorarios')
              .select('id, forma_cobranca')
              .in('id', contratoIds)

            ;(contratos || []).forEach((c: any) => contratoMap.set(c.id, c.forma_cobranca))
          }

          setProcessos(
            processosUnicos.map((p: any) => ({
              id: p.id,
              numero_cnj: p.numero_cnj,
              numero_pasta: p.numero_pasta,
              cliente_nome: clienteMap.get(p.cliente_id) || p.parte_contraria,
              contrato_id: p.contrato_id,
              forma_cobranca: p.contrato_id ? contratoMap.get(p.contrato_id) : undefined,
            }))
          )
        } else {
          // Busca por numero ou titulo
          const { data: consultasResultado } = await supabase
            .from('consultivo_consultas')
            .select('id, numero, titulo, contrato_id, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`titulo.ilike.%${searchTerm}%,numero.ilike.%${searchTerm}%`)
            .limit(15)

          // Também buscar por nome do cliente
          const { data: clientesConsultas } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMapConsultas = new Map((clientesConsultas || []).map((c: any) => [c.id, c.nome_completo]))

          // Buscar consultas desses clientes
          let consultasDoCliente: any[] = []
          if (clienteMapConsultas.size > 0) {
            const { data: ccData } = await supabase
              .from('consultivo_consultas')
              .select('id, numero, titulo, contrato_id, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMapConsultas.keys()))
              .limit(10)
            consultasDoCliente = ccData || []
          }

          // Combinar e remover duplicados
          const todasConsultas = [...(consultasResultado || []), ...consultasDoCliente]
          const consultasUnicas = Array.from(
            new Map(todasConsultas.map((c: any) => [c.id, c])).values()
          ).slice(0, 10)

          // Buscar nomes dos clientes para as consultas que não vieram da busca por cliente
          const clienteIdsBuscarConsultas = consultasUnicas
            .filter((c: any) => c.cliente_id && !clienteMapConsultas.has(c.cliente_id))
            .map((c: any) => c.cliente_id)

          if (clienteIdsBuscarConsultas.length > 0) {
            const { data: clientesExtra } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsBuscarConsultas)

            ;(clientesExtra || []).forEach((c: any) => clienteMapConsultas.set(c.id, c.nome_completo))
          }

          // Buscar forma_cobranca dos contratos
          const contratoIdsConsultas = consultasUnicas
            .filter((c: any) => c.contrato_id)
            .map((c: any) => c.contrato_id)

          const contratoMapConsultas = new Map<string, string>()
          if (contratoIdsConsultas.length > 0) {
            const { data: contratosConsultas } = await supabase
              .from('financeiro_contratos_honorarios')
              .select('id, forma_cobranca')
              .in('id', contratoIdsConsultas)

            ;(contratosConsultas || []).forEach((c: any) => contratoMapConsultas.set(c.id, c.forma_cobranca))
          }

          setConsultas(
            consultasUnicas.map((c: any) => ({
              id: c.id,
              numero: c.numero,
              titulo: c.titulo,
              cliente_nome: clienteMapConsultas.get(c.cliente_id) as string | undefined,
              contrato_id: c.contrato_id,
              forma_cobranca: c.contrato_id ? contratoMapConsultas.get(c.contrato_id) : undefined,
            }))
          )
        }
      } catch (err) {
        console.error('Erro ao buscar:', err)
      } finally {
        setSearchLoading(false)
      }
    }

    const debounce = setTimeout(buscar, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, vinculoTipo, escritorioAtivo, supabase])

  // Selecionar processo (resultado de busca — já traz contrato_id)
  const handleSelectProcesso = async (processo: ProcessoOption) => {
    setProcessoSelecionado(processo)
    setConsultaSelecionada(null)
    setSearchTerm('')
    setFaturavel(null)
    setFaturavelManual(false)
    setAtoSelecionado(null)
    setHorasAcumuladasAto(null)

    // Carregar contrato se existir
    if (processo.contrato_id) {
      const contrato = await loadContratoById(processo.contrato_id)
      setContratoInfo(contrato)
    } else {
      setContratoInfo(null)
    }
  }

  // Selecionar consulta (resultado de busca — já traz contrato_id)
  const handleSelectConsulta = async (consulta: ConsultaOption) => {
    setConsultaSelecionada(consulta)
    setProcessoSelecionado(null)
    setSearchTerm('')
    setFaturavel(null)
    setFaturavelManual(false)
    setAtoSelecionado(null)
    setHorasAcumuladasAto(null)

    // Carregar contrato se existir
    if (consulta.contrato_id) {
      const contrato = await loadContratoById(consulta.contrato_id)
      setContratoInfo(contrato)
    } else {
      setContratoInfo(null)
    }
  }

  // Selecionar item de "Recentes" (não traz contrato_id — carrega tudo por ID)
  const handleSelectRecente = async (id: string) => {
    setSearchTerm('')
    setFaturavel(null)
    setFaturavelManual(false)
    setAtoSelecionado(null)
    setHorasAcumuladasAto(null)
    setLoadingVinculo(true)
    try {
      if (vinculoTipo === 'processo') await loadProcessoById(id)
      else await loadConsultaById(id)
    } finally {
      setLoadingVinculo(false)
    }
  }

  // Limpar seleção
  const handleClearSelection = () => {
    setProcessoSelecionado(null)
    setConsultaSelecionada(null)
    setContratoInfo(null)
    setFaturavel(null)
    setFaturavelManual(false)
    setAtosHora([])
    setAtoSelecionado(null)
    setHorasAcumuladasAto(null)
  }

  // Override de faturável (checkbox no card de contrato). Marcado = inverte o
  // padrão do contrato neste lançamento; desmarcado = volta ao padrão.
  const padraoCobravel = faturavelPadrao()
  const overrideMarcado = faturavelManual && faturavel !== null && faturavel !== padraoCobravel
  const toggleOverride = () => {
    if (overrideMarcado) {
      setFaturavel(null)
      setFaturavelManual(false)
    } else {
      setFaturavel(!padraoCobravel)
      setFaturavelManual(true)
    }
  }

  // Submit - andComplete=true salva horas E marca entidade como concluída
  const handleSubmit = async (andComplete: boolean = false) => {
    const vinculoId = processoSelecionado?.id || consultaSelecionada?.id

    if (!vinculoId) {
      toast.error('Selecione um processo ou consulta')
      return
    }

    if (!processoSelecionado?.contrato_id && !consultaSelecionada?.contrato_id) {
      toast.error('Este caso não tem contrato de honorários vinculado. Vincule um contrato antes de lançar horas.')
      return
    }

    // Validação de duração
    if (totalMin <= 0) {
      toast.error('Informe a duração do trabalho')
      return
    }

    if (!atividade.trim()) {
      toast.error('Informe a atividade realizada')
      return
    }

    // Validar seleção de ato para contratos por_ato com atos modo hora
    if (atosHora.length > 0 && !atoSelecionado) {
      toast.error('Selecione o ato processual para este lançamento')
      return
    }

    setLoading(true)
    try {
      // Modo edição: atualizar registro existente
      if (isEditMode && editTimesheetId) {
        await editarTimesheet(editTimesheetId, {
          horas: calcularHorasDecimalUnificado(),
          atividade: atividade.trim(),
          faturavel: faturavelEfetivo,
          faturavel_manual: faturavelManual,
          data_trabalho: dataTrabalho,
          hora_inicio: null,
          hora_fim: null,
          processo_id: processoSelecionado?.id || null,
          consulta_id: consultaSelecionada?.id || null,
          ato_tipo_id: atoSelecionado || null,
        })

        // Invalidar queries para atualizar listas
        queryClient.invalidateQueries({ queryKey: ['timesheet-recentes'] })
        queryClient.invalidateQueries({ queryKey: ['timesheet-tarefa'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })

        toast.success('Lançamento atualizado com sucesso!')
        onSuccess?.()
        onOpenChange(false)
        return
      }

      // Modo criação: registrar novo
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase.rpc('registrar_tempo_retroativo', {
        p_escritorio_id: escritorioAtivo,
        p_user_id: user.id,
        p_data_trabalho: dataTrabalho,
        p_hora_inicio: null,
        p_hora_fim: null,
        p_horas: calcularHorasDecimalUnificado(),
        p_atividade: atividade.trim(),
        p_processo_id: processoSelecionado?.id || null,
        p_consulta_id: consultaSelecionada?.id || null,
        p_tarefa_id: tarefaId || null,
        p_faturavel: faturavelEfetivo,
        p_faturavel_manual: faturavelManual,
        p_ato_tipo_id: atoSelecionado || null,
        p_audiencia_id: audienciaId || null,
        p_evento_id: eventoId || null,
      })

      if (error) throw error

      // Mostrar mensagem específica se houver horas excedentes
      if (horasAcumuladasAto?.atingiu_maximo) {
        toast.success('Horas registradas! Atenção: parte das horas ficará como não cobrável (máximo atingido).')
      } else {
        toast.success('Horas registradas com sucesso!')
      }

      // IMPORTANTE: Chamar callback ANTES de fechar o modal
      // para que o handler possa atualizar o ref de sucesso
      // antes do onOpenChange disparar a verificação
      if (andComplete) {
        onSaveAndComplete?.()
      } else {
        onSuccess?.()
      }
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao registrar horas:', err)
      toast.error(err?.message || 'Erro ao registrar horas')
    } finally {
      setLoading(false)
    }
  }

  const hasSelection = !!(processoSelecionado || consultaSelecionada)
  const vinculoFixo = !!(processoId || consultaId)
  const submitDisabled = loading || !hasSelection || !atividade.trim() || totalMin <= 0

  // Lista da coluna de vínculo: busca (≥2 chars) ou recentes
  const buscando = searchTerm.length >= 2
  const itensBusca: VinculoItem[] = vinculoTipo === 'processo'
    ? processos.map((p) => ({ id: p.id, chip: p.numero_pasta || 'Proc.', titulo: p.cliente_nome || p.numero_cnj, sub: p.numero_cnj }))
    : consultas.map((c) => ({ id: c.id, chip: c.numero || 'Cons.', titulo: c.titulo, sub: c.cliente_nome }))
  const itensRecentes = vinculoTipo === 'processo' ? recentes.processo : recentes.consulta
  const baseList = buscando ? itensBusca : itensRecentes

  const dataObj = parseInputDate(dataTrabalho)
  const hojeObj = parseInputDate(formatDateForInput())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[980px] p-0 gap-0 overflow-hidden border border-[#e6e3da] dark:border-[#2e3a52] rounded-[22px] dark:dark-dialog-glow [&>button]:hidden flex flex-col max-h-[90vh]',
          SURFACE,
        )}
      >
        {/* HEADER */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#f0ede3] dark:border-[#253345] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <DialogTitle asChild>
              <h2 className="text-[18px] font-semibold text-[#1a2330] dark:text-[#e8ecf2] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-fraunces)' }}>
                {isEditMode ? 'Editar lançamento' : 'Registrar horas'}
              </h2>
            </DialogTitle>
            <div className="text-[12px] text-[#5a6775] dark:text-[#9fadbf] mt-0.5 capitalize">
              {format(dataObj, "EEE',' d 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 text-[#9aa1a8] dark:text-[#808fa1] hover:bg-[#ece9e2] dark:hover:bg-[#313f57] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY — 2 colunas (horizontal) */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">

          {/* COLUNA ESQUERDA — escolher o vínculo */}
          <div className="md:w-[340px] flex-shrink-0 flex flex-col md:min-h-0 gap-3 p-4 border-b md:border-b-0 md:border-r border-[#f0ede3] dark:border-[#253345] bg-[#fbfaf7] dark:bg-[#10161f]">
            {loadingVinculo ? (
              <div className={cn('rounded-[12px] px-4 py-3 flex items-center gap-3', FIELD)}>
                <Loader2 className="w-4 h-4 animate-spin text-[#89bcbe]" />
                <span className="text-xs text-[#5a6775] dark:text-[#9fadbf]">Carregando vínculo…</span>
              </div>
            ) : hasSelection ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={LABEL}>Vinculado a</span>
                  {!vinculoFixo && (
                    <button type="button" onClick={handleClearSelection} className="text-[11px] font-medium text-[#9aa1a8] hover:text-[#5a6775] dark:hover:text-[#9fadbf] transition-colors">Trocar</button>
                  )}
                </div>
                <div className="rounded-[13px] border border-[#dcebeb] dark:border-[#33455f] bg-white dark:bg-[#141b27] overflow-hidden flex-shrink-0">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center bg-[#e8f5f5] dark:bg-[#89bcbe]/[0.16] text-[#3f7376] dark:text-[#9fc7c9]">
                      {processoSelecionado ? <FileText className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {processoSelecionado ? (
                        <>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {processoSelecionado.numero_pasta && (
                              <span className="text-[13px] font-semibold text-[#1a2330] dark:text-[#e8ecf2]">{processoSelecionado.numero_pasta}</span>
                            )}
                            <span className="text-[11.5px] font-mono text-[#5a6775] dark:text-[#9fadbf]">{processoSelecionado.numero_cnj}</span>
                          </div>
                          {processoSelecionado.cliente_nome && (
                            <div className="text-[11.5px] text-[#5a6775] dark:text-[#808fa1] truncate mt-0.5">{processoSelecionado.cliente_nome}</div>
                          )}
                        </>
                      ) : consultaSelecionada && (
                        <>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {consultaSelecionada.numero && (
                              <span className="text-[13px] font-semibold text-[#1a2330] dark:text-[#e8ecf2]">{consultaSelecionada.numero}</span>
                            )}
                            <span className="text-[12px] text-[#2c3e50] dark:text-[#d8e2ef] truncate">{consultaSelecionada.titulo}</span>
                          </div>
                          {consultaSelecionada.cliente_nome && (
                            <div className="text-[11.5px] text-[#5a6775] dark:text-[#808fa1] truncate mt-0.5">{consultaSelecionada.cliente_nome}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {!contratoInfo && (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-[#f8f0e6] dark:bg-[#8a6438]/[0.16] border-t border-[#ecdcc4] dark:border-[#8a6438]/[0.3]">
                      <Info className="w-3 h-3 text-[#8a6438] dark:text-[#d6a87a] flex-shrink-0" />
                      <span className="text-[10.5px] text-[#8a6438] dark:text-[#d6a87a]">Sem contrato — não é possível lançar horas</span>
                    </div>
                  )}
                </div>

                {/* Últimas atividades — até 5, caixa com altura limitada */}
                {atividadesRecentes.length > 0 && (
                  <div className="mt-1 min-w-0">
                    <span className={cn(LABEL, 'mb-2 block')}>Últimas atividades</span>
                    <div className="rounded-[13px] border border-[#f0ede3] dark:border-[#2c3a52] bg-white dark:bg-[#0c1119] overflow-hidden max-h-[228px] overflow-y-auto">
                      {atividadesRecentes.map((a, i) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAtividade(a.slice(0, 280))}
                          className={cn(
                            'w-full text-left px-3 py-2.5 text-[12.5px] leading-snug transition-colors',
                            i > 0 && 'border-t border-[#f0ede3] dark:border-[#2c3a52]',
                            atividade === a
                              ? 'bg-[#eef7f7] dark:bg-[#89bcbe]/[0.12] text-[#3f7376] dark:text-[#9fc7c9] font-medium'
                              : 'text-[#5a6775] dark:text-[#9fadbf] hover:bg-[#f7f6f2] dark:hover:bg-[#1c2433]',
                          )}
                        >
                          <span className="line-clamp-2">{a}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={LABEL}>Vincular a</span>
                  <div className="inline-flex gap-0.5 p-[3px] rounded-[10px] bg-[#f1ede2] dark:bg-[#141b27] border border-[#f0ede3] dark:border-[#2c3a52]">
                    {([['processo', 'Processo'], ['consulta', 'Consultivo']] as const).map(([v, l]) => {
                      const on = vinculoTipo === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVinculoTipo(v)}
                          className={cn(
                            'h-7 px-3 rounded-[7px] text-[12px] font-semibold transition-colors',
                            on ? 'bg-white dark:bg-[#2a3850] text-[#34495e] dark:text-[#e8eef6] shadow-sm' : 'text-[#5a6775] dark:text-[#9fadbf]',
                          )}
                        >{l}</button>
                      )
                    })}
                  </div>
                </div>

                <div className={cn('flex items-center gap-2.5 h-11 px-3.5 rounded-[12px] flex-shrink-0', FIELD)}>
                  <Search className="w-4 h-4 text-[#9aa1a8] dark:text-[#808fa1] flex-shrink-0" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={vinculoTipo === 'processo' ? 'Buscar por CNJ, pasta ou cliente…' : 'Buscar por número, título ou cliente…'}
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#2c3e50] dark:text-[#e8ecf2] placeholder:text-[#aab0b8] dark:placeholder:text-[#5a6675]"
                  />
                  {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-[#9aa1a8]" />}
                </div>

                {/* lista (recentes até 5, ou resultados) — caixa com altura limitada */}
                <div className="flex flex-col rounded-[13px] border border-[#f0ede3] dark:border-[#2c3a52] bg-white dark:bg-[#0c1119] overflow-hidden">
                  <div className={cn(LABEL, 'px-3 pt-2.5 pb-1')}>{buscando ? 'Resultados' : 'Recentes'}</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {searchLoading && buscando ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-[#9aa1a8]" /></div>
                    ) : baseList.length > 0 ? (
                      baseList.map((it, i) => (
                        <div key={it.id}>
                          {i > 0 && <div className="h-px bg-[#f0ede3] dark:bg-[#2c3a52] mx-3" />}
                          <VinculoRow
                            {...it}
                            onClick={() => {
                              if (buscando) {
                                if (vinculoTipo === 'processo') {
                                  const p = processos.find((x) => x.id === it.id)
                                  if (p) handleSelectProcesso(p)
                                } else {
                                  const c = consultas.find((x) => x.id === it.id)
                                  if (c) handleSelectConsulta(c)
                                }
                              } else {
                                handleSelectRecente(it.id)
                              }
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-5 text-[12px] text-[#9aa1a8] dark:text-[#808fa1]">
                        {buscando ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum lançamento recente'}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* COLUNA DIREITA — preencher o lançamento */}
          <div className="flex-1 min-w-0 md:min-h-0 md:overflow-y-auto p-5 flex flex-col gap-4">
            {/* TEMPO + DATA + CONTRATO */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
              <div className="flex-shrink-0">
                <div className={cn(LABEL, 'mb-2')}>Tempo registrado</div>
                <div className={cn('relative rounded-[16px] overflow-hidden px-4 py-4', FIELD)}>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(120% 140% at 100% 100%, rgba(137,188,190,0.18), transparent 55%)' }}
                  />
                  <div className="relative flex items-center justify-center gap-4">
                    <TimeStepper value={duracaoHoras} max={23} label="Horas" onChange={setDuracaoHoras} onStep={incH} />
                    <span className="font-mono text-[30px] font-bold text-[#9aa1a8] dark:text-[#808fa1] mb-[18px] leading-none">:</span>
                    <TimeStepper value={duracaoMinutos} max={59} label="Min" step={5} onChange={setDuracaoMinutos} onStep={incM} />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div>
                  <div className={cn(LABEL, 'mb-2')}>Data</div>
                  {/* Calendário próprio do sistema (V4), mesmo do "reagendar" da Agenda.
                      Mantém o visual do campo (ícone + data + dia) e abre o seletor temático. */}
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn('w-full flex items-center gap-2.5 h-11 px-3.5 rounded-[12px] transition-colors hover:border-[#89bcbe] dark:hover:border-[#89bcbe]', FIELD)}
                      >
                        <Calendar className="w-4 h-4 text-[#9aa1a8] dark:text-[#808fa1] flex-shrink-0" />
                        <span className="text-[13.5px] font-semibold font-mono text-[#1a2330] dark:text-[#e8ecf2]">{format(dataObj, 'dd/MM/yyyy')}</span>
                        <span className="text-[12.5px] text-[#9aa1a8] dark:text-[#808fa1] ml-auto capitalize">{format(dataObj, 'EEEE', { locale: ptBR })}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[200]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataObj}
                        defaultMonth={dataObj}
                        onSelect={(d) => { if (d) { setDataTrabalho(format(d, 'yyyy-MM-dd')); setDateOpen(false) } }}
                        disabled={(date) => date > hojeObj}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* CONTRATO VINCULADO */}
                {contratoInfo && (
                  <div>
                    <div className={cn(LABEL, 'mb-2')}>Contrato vinculado</div>
                    <div className="rounded-[13px] border border-[#dcebeb] dark:border-[#33455f] bg-white dark:bg-[#141b27] overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center bg-[#e8f5f5] dark:bg-[#89bcbe]/[0.16] text-[#3f7376] dark:text-[#9fc7c9]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-[#1a2330] dark:text-[#e8ecf2] truncate">{contratoInfo.titulo || 'Contrato de honorários'}</div>
                          <div className="text-[11px] text-[#9aa1a8] dark:text-[#808fa1] truncate mt-0.5">
                            {contratoInfo.formas_cobranca.map((f) => FORMA_COBRANCA_LABELS[f]).join(' · ')}
                          </div>
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1 h-5 px-2.5 rounded-full text-[10px] font-bold flex-shrink-0',
                          faturavelEfetivo ? 'bg-[#e0f2f2] text-[#2f6063] dark:bg-[#3f7376]/[0.22] dark:text-[#8fd0d2]' : 'bg-[#f3ece0] text-[#8a6438] dark:bg-[#8a6438]/[0.2] dark:text-[#d6a87a]',
                        )}>
                          {faturavelEfetivo && <Check className="w-[11px] h-[11px]" />}
                          {faturavelEfetivo ? 'Cobrável' : 'Não cobrável'}
                        </span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2.5 mt-2.5 cursor-pointer select-none" onClick={toggleOverride}>
                      <span className={cn(
                        'w-[18px] h-[18px] rounded-[5px] flex-shrink-0 flex items-center justify-center transition-all border-[1.5px]',
                        overrideMarcado ? 'bg-[#89bcbe] border-[#89bcbe] dark:bg-[#7fb8ba] dark:border-[#7fb8ba]' : 'border-[#e6e3da] dark:border-[#37455f]',
                      )}>
                        {overrideMarcado && <Check className="w-3 h-3 text-white dark:text-[#0b1016]" strokeWidth={3} />}
                      </span>
                      <span className="text-[12.5px] text-[#5a6775] dark:text-[#9fadbf]">
                        {padraoCobravel ? (
                          <>Marcar como <strong className="text-[#2c3e50] dark:text-[#e8ecf2] font-semibold">não cobrável</strong> só neste lançamento</>
                        ) : (
                          <>Marcar como <strong className="text-[#2c3e50] dark:text-[#e8ecf2] font-semibold">cobrável</strong> só neste lançamento</>
                        )}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* ATO (contratos por_ato com modo hora) */}
            {hasSelection && atosHora.length > 0 && (
              <div>
                <div className={cn(LABEL, 'mb-2')}>Qual ato você está trabalhando? *</div>
                <Select value={atoSelecionado || ''} onValueChange={(value) => setAtoSelecionado(value)} disabled={atosLoading}>
                  <SelectTrigger className="h-10 rounded-[12px]">
                    <SelectValue placeholder={atosLoading ? 'Carregando…' : 'Selecione o ato…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {atosHora.map((ato) => (
                      <SelectItem key={ato.ato_tipo_id} value={ato.ato_tipo_id}>
                        <div className="flex items-center gap-2">
                          <span>{ato.ato_nome}</span>
                          <span className="text-[10px] text-slate-400">(R${ato.valor_hora?.toFixed(2)}/h)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {atoSelecionado && horasAcumuladasAto && (
                  <div className="mt-2">
                    <AtoHoraProgress
                      horasUsadas={horasAcumuladasAto.horas_totais}
                      horasMinimas={atosHora.find((a) => a.ato_tipo_id === atoSelecionado)?.horas_minimas}
                      horasMaximas={atosHora.find((a) => a.ato_tipo_id === atoSelecionado)?.horas_maximas}
                      valorHora={atosHora.find((a) => a.ato_tipo_id === atoSelecionado)?.valor_hora}
                      horasNovas={calcularHorasDecimalUnificado()}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ATIVIDADE */}
            <div>
              <div className="flex items-center justify-between mb-2 min-h-[20px]">
                <span className={LABEL}>Atividade realizada <span className="text-[#c2785a]">*</span></span>
                <span className={cn('text-[11px] font-mono', atividade.length >= 280 ? 'text-[#c2785a]' : 'text-[#9aa1a8] dark:text-[#808fa1]')}>{atividade.length}/280</span>
              </div>
              <Textarea
                value={atividade}
                onChange={(e) => setAtividade(e.target.value.slice(0, 280))}
                rows={4}
                className={cn('text-[13px] leading-relaxed resize-none rounded-[12px]', FIELD)}
                placeholder="Descreva o que foi feito — ex: revisão da minuta, leitura de parecer, reunião com cliente…"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#f0ede3] dark:border-[#253345] bg-[#faf9f5] dark:bg-white/[0.018] flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="h-10 rounded-[11px]">
            Cancelar
          </Button>

          {!isEditMode && onSaveAndComplete && (tarefaId || audienciaId || eventoId) ? (
            <>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitDisabled}
                variant="outline"
                className="h-10 rounded-[11px] border-[#34495e] text-[#34495e] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-2"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={submitDisabled}
                className="h-10 rounded-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Salvar e concluir
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitDisabled}
              className="h-10 rounded-[11px] bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando…</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />{isEditMode ? 'Salvar alterações' : `Registrar ${horasDisplay}`}</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
