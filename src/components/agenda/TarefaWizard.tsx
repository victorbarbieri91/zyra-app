'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  Calendar, CalendarClock, Search, X, Check, Loader2, Mail, Upload, CheckCircle2,
  Lock, Plus, Repeat, Link as LinkIcon, CalendarDays, ChevronsRight, Zap, TrendingUp, ArrowDown,
  Scale, MessageSquare, FileText, type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DateInput } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import type { Vinculacao } from '@/components/agenda/VinculacaoSelector'
import { type RecorrenciaData } from '@/components/agenda/RecorrenciaConfig'
import { useVinculacaoSearch, type ResultadoBusca } from '@/hooks/useVinculacaoSearch'
import type { Tarefa, TarefaFormData } from '@/hooks/useTarefas'
import { format } from 'date-fns'
import { useRecorrencias } from '@/hooks/useRecorrencias'
import { useTarefas } from '@/hooks/useTarefas'
import { useAgendaResponsaveis } from '@/hooks/useAgendaResponsaveis'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  CONTENCIOSO_TIPOS,
  CONSULTIVO_TIPOS,
  type TipoTarefaContencioso,
  type TipoTarefaConsultivo,
  type CategoriaTarefa,
} from '@/lib/constants/tarefa-tipos'

interface TarefaWizardProps {
  escritorioId: string
  onClose: () => void
  onSubmit?: (data: TarefaFormData) => Promise<void> // Callback opcional após criação
  onCreated?: (tarefa?: Tarefa) => void | Promise<void> // Callback após tarefa criada (recebe a tarefa quando criada via createTarefa)
  initialData?: Partial<TarefaFormData>
}

type TipoTarefa = TipoTarefaContencioso | TipoTarefaConsultivo
type Prioridade = 'alta' | 'media' | 'baixa'

// ───────────────────────── helpers de UI (V4) ─────────────────────────
const lbl = 'text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa1a8] dark:text-slate-500'

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span className={lbl}>{title}</span>
        {hint}
      </div>
      {children}
    </div>
  )
}

interface SegOption<T extends string> {
  v: T
  l: string
  Icon?: LucideIcon
  activeBg?: string
  activeText?: string
}
function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T
  onChange: (v: T) => void
  options: SegOption<T>[]
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 p-[3px] rounded-[9px] bg-[#ece9e2] dark:bg-[#10151d]', className)}>
      {options.map((o) => {
        const on = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              'flex-1 h-[30px] rounded-[7px] inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-all',
              on
                ? cn('shadow-sm', o.activeBg || 'bg-white dark:bg-[#46627f]', o.activeText || 'text-[#34495e] dark:text-white')
                : 'text-[#7c8693] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200',
            )}
          >
            {o.Icon && <o.Icon className="w-3.5 h-3.5" />}
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

// avatar com iniciais
const AVATAR_CORES = ['#34495e', '#46627f', '#3f7376', '#6b9e84', '#8a6438', '#a85a3e', '#415a7e']
function avatarCor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_CORES[h % AVATAR_CORES.length]
}
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
function Avatar({ nome, size = 26 }: { nome: string; size?: number }) {
  return (
    <span
      className="rounded-full text-white font-bold inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: avatarCor(nome) }}
    >
      {iniciais(nome)}
    </span>
  )
}

const PRIOR_OPTS: SegOption<Prioridade>[] = [
  { v: 'alta', l: 'Alta', Icon: Zap, activeBg: 'bg-[#f9ebe6] dark:bg-[#a85a3e]/25', activeText: 'text-[#a85a3e] dark:text-[#e0a085]' },
  { v: 'media', l: 'Média', Icon: TrendingUp, activeBg: 'bg-[#f7f0e7] dark:bg-[#8a6438]/25', activeText: 'text-[#8a6438] dark:text-[#d4a574]' },
  { v: 'baixa', l: 'Baixa', Icon: ArrowDown, activeBg: 'bg-[#e8f5f5] dark:bg-[#3f7376]/25', activeText: 'text-[#3f7376] dark:text-[#7fb8ba]' },
]

// Paleta quente V4 dos cartões de tipo (igual ao design). Classes estáticas p/ o Tailwind gerar.
const TIPO_CORES: Record<string, { cardSel: string; chipBg: string; icon: string }> = {
  // Contencioso
  prazo_processual: { cardSel: 'bg-[#f9ebe6] text-[#a85a3e] border-[#a85a3e]/50 dark:bg-[#a85a3e]/20 dark:text-[#e0a085] dark:border-[#a85a3e]/50', chipBg: 'bg-[#f9ebe6] dark:bg-[#a85a3e]/15', icon: 'text-[#a85a3e] dark:text-[#e0a085]' },
  acompanhamento: { cardSel: 'bg-[#e8f5f5] text-[#3f7376] border-[#3f7376]/50 dark:bg-[#3f7376]/20 dark:text-[#7fb8ba] dark:border-[#3f7376]/50', chipBg: 'bg-[#e8f5f5] dark:bg-[#3f7376]/15', icon: 'text-[#3f7376] dark:text-[#7fb8ba]' },
  follow_up: { cardSel: 'bg-[#f7f0e7] text-[#8a6438] border-[#8a6438]/50 dark:bg-[#8a6438]/20 dark:text-[#d4a574] dark:border-[#8a6438]/50', chipBg: 'bg-[#f7f0e7] dark:bg-[#8a6438]/15', icon: 'text-[#8a6438] dark:text-[#d4a574]' },
  administrativo: { cardSel: 'bg-[#edf1f7] text-[#415a7e] border-[#415a7e]/50 dark:bg-[#415a7e]/20 dark:text-[#9bb3d4] dark:border-[#415a7e]/50', chipBg: 'bg-[#edf1f7] dark:bg-[#415a7e]/15', icon: 'text-[#415a7e] dark:text-[#9bb3d4]' },
  outro: { cardSel: 'bg-[#f1ede2] text-[#5a6775] border-[#5a6775]/50 dark:bg-[#5a6775]/20 dark:text-[#9aa7b8] dark:border-[#5a6775]/50', chipBg: 'bg-[#f1ede2] dark:bg-[#5a6775]/15', icon: 'text-[#5a6775] dark:text-[#9aa7b8]' },
  // Consultivo (paleta quente equivalente)
  cons_parecer: { cardSel: 'bg-[#f7f0e7] text-[#8a6438] border-[#8a6438]/50 dark:bg-[#8a6438]/20 dark:text-[#d4a574] dark:border-[#8a6438]/50', chipBg: 'bg-[#f7f0e7] dark:bg-[#8a6438]/15', icon: 'text-[#8a6438] dark:text-[#d4a574]' },
  cons_contrato: { cardSel: 'bg-[#edf1f7] text-[#415a7e] border-[#415a7e]/50 dark:bg-[#415a7e]/20 dark:text-[#9bb3d4] dark:border-[#415a7e]/50', chipBg: 'bg-[#edf1f7] dark:bg-[#415a7e]/15', icon: 'text-[#415a7e] dark:text-[#9bb3d4]' },
  cons_pesquisa: { cardSel: 'bg-[#e8f5f5] text-[#3f7376] border-[#3f7376]/50 dark:bg-[#3f7376]/20 dark:text-[#7fb8ba] dark:border-[#3f7376]/50', chipBg: 'bg-[#e8f5f5] dark:bg-[#3f7376]/15', icon: 'text-[#3f7376] dark:text-[#7fb8ba]' },
  cons_providencia: { cardSel: 'bg-[#ebf3ee] text-[#6b9e84] border-[#6b9e84]/50 dark:bg-[#6b9e84]/20 dark:text-[#9ecbb0] dark:border-[#6b9e84]/50', chipBg: 'bg-[#ebf3ee] dark:bg-[#6b9e84]/15', icon: 'text-[#6b9e84] dark:text-[#9ecbb0]' },
  cons_outro: { cardSel: 'bg-[#f1ede2] text-[#5a6775] border-[#5a6775]/50 dark:bg-[#5a6775]/20 dark:text-[#9aa7b8] dark:border-[#5a6775]/50', chipBg: 'bg-[#f1ede2] dark:bg-[#5a6775]/15', icon: 'text-[#5a6775] dark:text-[#9aa7b8]' },
}

export default function TarefaWizard({ escritorioId, onClose, onSubmit, onCreated, initialData }: TarefaWizardProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toggle Contencioso/Consultivo
  const [modoTipo, setModoTipo] = useState<CategoriaTarefa>(() => {
    if (initialData?.consultivo_id) return 'consultivo'
    return 'contencioso'
  })

  // Email drag-and-drop
  const [emailProcessing, setEmailProcessing] = useState(false)
  const [emailFileName, setEmailFileName] = useState<string | null>(null)
  const [emailProcessed, setEmailProcessed] = useState(false)

  // Carregar membros do escritório (responsáveis + exibição na revisão/série)
  const { membros } = useEscritorioMembros(escritorioId)

  // Hook para criar tarefas diretamente
  const { createTarefa } = useTarefas(escritorioId)

  // Hook para carregar responsáveis existentes (apenas para edição)
  const { getResponsaveis } = useAgendaResponsaveis()

  // Form State — se editando tarefa fixa, exibir como 'administrativo' (tipo original perdido)
  const [tipo, setTipo] = useState<TipoTarefa>(() => {
    if (initialData?.tipo === 'fixa') return 'administrativo'
    const t = initialData?.tipo as TipoTarefa | undefined
    if (t && (t in CONTENCIOSO_TIPOS || t in CONSULTIVO_TIPOS)) return t
    // Default conforme modo
    if (initialData?.consultivo_id) return 'cons_parecer'
    return 'outro'
  })
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descricao, setDescricao] = useState(initialData?.descricao || '')
  const [isPessoal, setIsPessoal] = useState<boolean>(initialData?.pessoal === true)

  // Helper para extrair parte da data (yyyy-MM-dd) de ISO datetime
  const extractDatePart = (dateStr?: string | null) => {
    if (!dateStr) return ''
    return dateStr.split('T')[0]
  }

  const [dataExecucao, setDataExecucao] = useState(extractDatePart(initialData?.data_inicio))
  const [prazoFatal, setPrazoFatal] = useState(
    extractDatePart(initialData?.prazo_data_limite) || extractDatePart(initialData?.data_fim)
  )
  const [prioridade, setPrioridade] = useState<Prioridade>(initialData?.prioridade || 'media')
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(
    initialData?.responsavel_id ? [initialData.responsavel_id] : (user?.id ? [user.id] : [])
  )

  const [processoId, setProcessoId] = useState<string | null>(initialData?.processo_id || null)
  const [consultivoId, setConsultivoId] = useState<string | null>(initialData?.consultivo_id || null)

  const [cor, setCor] = useState(initialData?.cor || '#3B82F6')

  // Estado de recorrência — se editando tarefa fixa, inicializar com isFixa: true
  const [recorrencia, setRecorrencia] = useState<RecorrenciaData | null>(() => {
    if (initialData?.tipo === 'fixa') {
      return {
        ativa: false,
        isFixa: true,
        frequencia: 'diaria',
        intervalo: 1,
        dataInicio: new Date().toISOString().split('T')[0],
        terminoTipo: 'permanente',
        horaPadrao: '09:00',
      }
    }
    return null
  })

  // Hook de recorrências
  const { createRecorrencia, getRecorrencia, atualizarSerie } = useRecorrencias(escritorioId)

  // Estado de edição em série: quando edita uma instância materializada de recorrência,
  // o usuário escolhe se a alteração se aplica apenas a essa ocorrência ou a toda a série.
  const [regraRecorrencia, setRegraRecorrencia] = useState<
    { id: string; data_inicio: string; data_fim: string | null; max_ocorrencias: number | null } | null
  >(null)
  const [escopoEdicao, setEscopoEdicao] = useState<'instancia' | 'em-diante' | 'serie'>('instancia')

  // Estado unificado de vinculação
  const [vinculacao, setVinculacao] = useState<Vinculacao | null>(() => {
    if (initialData?.processo_id) {
      return { modulo: 'processo', modulo_registro_id: initialData.processo_id }
    }
    if (initialData?.consultivo_id) {
      return { modulo: 'consultivo', modulo_registro_id: initialData.consultivo_id }
    }
    return null
  })

  // Busca de vínculo (mesma lógica do VinculacaoSelector, via hook compartilhado)
  const vsearch = useVinculacaoSearch()

  // Buscar metadados do processo/consultivo quando vem do initialData
  useEffect(() => {
    const loadMetadados = async () => {
      const supabase = createClient()

      if (initialData?.processo_id && (!vinculacao?.metadados || Object.keys(vinculacao.metadados).length === 0)) {
        const { data: processo } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            parte_contraria,
            crm_pessoas!processos_processos_cliente_id_fkey(nome_completo, nome_fantasia)
          `)
          .eq('id', initialData.processo_id)
          .single()

        if (processo) {
          const clienteNome = (processo as any).crm_pessoas?.nome_completo || (processo as any).crm_pessoas?.nome_fantasia
          const parteContraria = processo.parte_contraria

          let partes = ''
          if (clienteNome && parteContraria) {
            partes = `${clienteNome} × ${parteContraria}`
          } else if (clienteNome) {
            partes = clienteNome
          } else if (parteContraria) {
            partes = parteContraria
          }

          setVinculacao({
            modulo: 'processo',
            modulo_registro_id: processo.id,
            metadados: {
              numero_pasta: processo.numero_pasta,
              numero_cnj: processo.numero_cnj,
              partes: partes || undefined,
            },
          })
        }
      }

      if (initialData?.consultivo_id && (!vinculacao?.metadados || Object.keys(vinculacao.metadados).length === 0)) {
        const { data: consultivo } = await supabase
          .from('consultivo_consultas')
          .select(`
            id,
            numero,
            titulo,
            crm_pessoas!consultivo_consultas_cliente_id_fkey(nome_completo, nome_fantasia)
          `)
          .eq('id', initialData.consultivo_id)
          .single()

        if (consultivo) {
          const clienteNome = (consultivo as any).crm_pessoas?.nome_completo || (consultivo as any).crm_pessoas?.nome_fantasia

          setVinculacao({
            modulo: 'consultivo',
            modulo_registro_id: consultivo.id,
            metadados: {
              numero_pasta: consultivo.numero,
              titulo: consultivo.titulo,
              partes: clienteNome || undefined,
            },
          })
        }
      }
    }

    loadMetadados()
  }, [initialData?.processo_id, initialData?.consultivo_id])

  // Sincronizar vinculacao com processoId/consultivoId + auto-switch modo
  useEffect(() => {
    if (vinculacao) {
      if (vinculacao.modulo === 'processo') {
        setProcessoId(vinculacao.modulo_registro_id)
        setConsultivoId(null)
        if (modoTipo === 'consultivo') {
          setModoTipo('contencioso')
          setTipo('outro')
        }
      } else if (vinculacao.modulo === 'consultivo') {
        setConsultivoId(vinculacao.modulo_registro_id)
        setProcessoId(null)
        if (modoTipo === 'contencioso') {
          setModoTipo('consultivo')
          setTipo('cons_parecer')
        }
      }
    } else {
      setProcessoId(null)
      setConsultivoId(null)
    }
  }, [vinculacao])

  // Drag-and-drop de e-mail (.msg do Outlook)
  const onDropEmail = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setEmailFileName(file.name)
    setEmailProcessing(true)
    setEmailProcessed(false)

    try {
      const arrayBuffer = await file.arrayBuffer()

      let emailSubject = ''
      let emailBody = ''

      try {
        const MsgReader = (await import('@kenjiuno/msgreader')).default
        const msgReader = new MsgReader(arrayBuffer)
        const msgData = msgReader.getFileData()

        emailSubject = msgData.subject || ''
        emailBody = msgData.body || ''
      } catch {
        const decoder = new TextDecoder('utf-8')
        const rawText = decoder.decode(arrayBuffer)
        const subjectMatch = rawText.match(/(?:Subject|Assunto):\s*(.+)/i)
        emailSubject = subjectMatch?.[1]?.trim() || ''
        emailBody = rawText
      }

      const emailText = emailSubject
        ? `Assunto: ${emailSubject}\n\n${emailBody}`
        : emailBody

      if (!emailText.trim()) {
        throw new Error('Não foi possível extrair texto do e-mail')
      }

      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('processar-email-tarefa', {
        body: { email_text: emailText, modo: modoTipo },
      })

      if (error) throw error
      if (!data?.sucesso) throw new Error(data?.erro || 'Erro ao processar e-mail')

      const resultado = data.resultado

      setTitulo(emailSubject || resultado.titulo || '')

      const resumoIA = resultado.descricao || ''
      const conteudoLimpo = resultado.conteudo_ultimo_email || ''
      const partes = [resumoIA, conteudoLimpo].filter(Boolean)
      const descricaoFinal = partes.length > 1
        ? `${resumoIA}\n\n--- E-mail original ---\n${conteudoLimpo}`
        : partes[0] || emailBody.slice(0, 500)
      setDescricao(descricaoFinal)
      if (resultado.tipo_sugerido) {
        const tipoSugerido = resultado.tipo_sugerido as TipoTarefa
        if (modoTipo === 'contencioso' && tipoSugerido in CONTENCIOSO_TIPOS) {
          setTipo(tipoSugerido)
        } else if (modoTipo === 'consultivo' && tipoSugerido in CONSULTIVO_TIPOS) {
          setTipo(tipoSugerido)
        }
      }
      if (resultado.prioridade_sugerida) {
        const prio = resultado.prioridade_sugerida as Prioridade
        if (['alta', 'media', 'baixa'].includes(prio)) setPrioridade(prio)
      }

      setEmailProcessed(true)
      toast.success('E-mail processado! Campos preenchidos automaticamente.')

      setTimeout(() => {
        setEmailProcessed(false)
        setEmailFileName(null)
      }, 3000)
    } catch (err: any) {
      console.error('Erro ao processar e-mail:', err)
      toast.error(err?.message || 'Erro ao processar e-mail')
      setEmailFileName(null)
    } finally {
      setEmailProcessing(false)
    }
  }, [modoTipo])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropEmail,
    accept: {
      'application/vnd.ms-outlook': ['.msg'],
      'message/rfc822': ['.eml'],
    },
    maxFiles: 1,
    noClick: false,
    noKeyboard: true,
  })

  // Carregar responsáveis existentes quando estamos editando (initialData tem id)
  useEffect(() => {
    const loadResponsaveis = async () => {
      if (initialData?.id) {
        const responsaveis = await getResponsaveis('tarefa', initialData.id)
        if (responsaveis.length > 0) {
          setResponsaveisIds(responsaveis.map(r => r.user_id))
        }
      }
    }
    loadResponsaveis()
  }, [initialData?.id])

  // Carregar regra de recorrência quando editando uma instância recorrente.
  const regraLoadedRef = useRef<string | null>(null)
  useEffect(() => {
    const recorrenciaId = (initialData as any)?.recorrencia_id as string | undefined
    if (!initialData?.id || !recorrenciaId) {
      setRegraRecorrencia(null)
      regraLoadedRef.current = null
      return
    }

    if (regraLoadedRef.current === recorrenciaId) return
    regraLoadedRef.current = recorrenciaId

    ;(async () => {
      const regra = await getRecorrencia(recorrenciaId)
      if (!regra) return

      setRegraRecorrencia({
        id: regra.id,
        data_inicio: regra.data_inicio,
        data_fim: regra.data_fim,
        max_ocorrencias: regra.max_ocorrencias,
      })

      setRecorrencia({
        ativa: true,
        isFixa: false,
        frequencia: regra.regra_frequencia,
        intervalo: regra.regra_intervalo || 1,
        diasSemana: regra.regra_dias_semana ?? undefined,
        diaMes: regra.regra_dia_mes ?? undefined,
        mes: regra.regra_mes ?? undefined,
        horaPadrao: (regra.regra_hora || '09:00').substring(0, 5),
        dataInicio: regra.data_inicio,
        terminoTipo: regra.data_fim
          ? 'data'
          : regra.max_ocorrencias
            ? 'ocorrencias'
            : 'permanente',
        dataFim: regra.data_fim ?? undefined,
        numeroOcorrencias: regra.max_ocorrencias ?? undefined,
        apenasUteis: regra.regra_apenas_uteis ?? false,
      })
    })()
  }, [initialData?.id, (initialData as any)?.recorrencia_id, getRecorrencia])

  const isFixa = recorrencia?.isFixa === true
  const recorrenteAtiva = recorrencia?.ativa === true
  const isEditing = !!initialData?.id

  // ───────────────────────── submit (lógica preservada) ─────────────────────────
  const handleComplete = async (closeAfter = true): Promise<boolean> => {
    if (responsaveisIds.length === 0) {
      toast.error('Selecione pelo menos um responsável')
      return false
    }
    setIsSubmitting(true)
    try {
      const formatDateToISO = (dateStr: string) => {
        if (!dateStr) return undefined
        return `${dateStr}T12:00:00`
      }

      const dataInicioFinal = isFixa
        ? format(new Date(), 'yyyy-MM-dd')
        : dataExecucao

      const formData: TarefaFormData = {
        escritorio_id: escritorioId,
        tipo: isFixa ? 'fixa' : tipo,
        pessoal: isPessoal,
        titulo,
        descricao: descricao || undefined,
        data_inicio: formatDateToISO(dataInicioFinal),
        data_fim: (isFixa || !prazoFatal) ? undefined : formatDateToISO(prazoFatal),
        prioridade,
        responsaveis_ids: responsaveisIds,
        responsavel_id: responsaveisIds.length > 0 ? responsaveisIds[0] : undefined,
        cor,
        processo_id: processoId,
        consultivo_id: consultivoId,
        prazo_data_limite: (!isFixa && tipo === 'prazo_processual' && prazoFatal) ? prazoFatal : undefined,
      }

      const editing = initialData?.id

      if (editing && regraRecorrencia) {
        if ((escopoEdicao === 'serie' || escopoEdicao === 'em-diante') && recorrencia) {
          const dataCorte = escopoEdicao === 'em-diante'
            ? (initialData?.data_inicio ?? '').split('T')[0] || null
            : null
          const templateComDisplay = {
            ...formData,
            _display: {
              responsavel_nome: membros.find(m => m.user_id === responsaveisIds[0])?.nome,
              caso_titulo: vinculacao?.metadados?.partes,
              processo_numero: vinculacao?.metadados?.numero_cnj,
              consultivo_titulo: vinculacao?.metadados?.titulo,
            },
          }
          await atualizarSerie(regraRecorrencia.id, {
            dataCorte,
            templateDados: templateComDisplay,
            templateNome: titulo,
            templateDescricao: descricao || undefined,
            regraFrequencia: recorrencia.frequencia,
            regraIntervalo: recorrencia.intervalo,
            regraDiasSemana: recorrencia.diasSemana,
            regraDiaMes: recorrencia.diaMes,
            regraMes: recorrencia.mes,
            regraHora: recorrencia.horaPadrao,
            dataFim: recorrencia.dataFim ?? null,
            dataFimExplicito: true,
          })
          toast.success(escopoEdicao === 'em-diante' ? 'Aplicado desta em diante' : 'Série atualizada')
        } else if (onSubmit) {
          await onSubmit(formData)
          toast.success('Tarefa atualizada')
        }
        if (onCreated) {
          await onCreated()
        }
      } else if (recorrencia && recorrencia.ativa && !editing) {
        const templateComDisplay = {
          ...formData,
          _display: {
            responsavel_nome: membros.find(m => m.user_id === responsaveisIds[0])?.nome,
            caso_titulo: vinculacao?.metadados?.partes,
            processo_numero: vinculacao?.metadados?.numero_cnj,
            consultivo_titulo: vinculacao?.metadados?.titulo,
          }
        }

        await createRecorrencia({
          nome: titulo,
          descricao: descricao || undefined,
          tipo: 'tarefa',
          templateDados: templateComDisplay,
          frequencia: recorrencia.frequencia,
          intervalo: recorrencia.intervalo,
          diasSemana: recorrencia.diasSemana,
          diaMes: recorrencia.diaMes,
          mes: recorrencia.mes,
          horaPadrao: recorrencia.horaPadrao,
          dataInicio: recorrencia.dataInicio,
          terminoTipo: recorrencia.terminoTipo,
          dataFim: recorrencia.dataFim,
          numeroOcorrencias: recorrencia.numeroOcorrencias,
          apenasUteis: recorrencia.apenasUteis,
        })
        toast.success('Tarefa recorrente criada com sucesso!')
      } else if (editing) {
        if (onSubmit) {
          await onSubmit(formData)
        }
        if (onCreated) {
          await onCreated()
        }
      } else {
        const tarefaCriada = await createTarefa(formData)
        toast.success(isFixa ? 'Tarefa fixa criada com sucesso!' : 'Tarefa criada com sucesso!')
        if (onCreated) {
          await onCreated(tarefaCriada)
        }
      }

      if (closeAfter) onClose()
      return true
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error)
      toast.error(error?.message || 'Erro ao criar tarefa. Verifique os dados e tente novamente.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  // ───────────────────────── validação + atalho ─────────────────────────
  const tituloOk = titulo.trim().length >= 3
  // Para recorrente, a data vem do "Início" da recorrência (no rail); para fixa não há data.
  const dataOk = (isFixa || recorrenteAtiva) ? true : dataExecucao !== ''
  const podeSalvar = tituloOk && responsaveisIds.length > 0 && dataOk

  const submitRef = useRef<() => void>(() => {})
  submitRef.current = () => {
    if (podeSalvar && !isSubmitting) handleComplete()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        submitRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // "Salvar e criar outra" — mantém vínculo/natureza/responsáveis, limpa o que é por-tarefa
  const handleCriarOutra = async () => {
    const ok = await handleComplete(false)
    if (!ok) return
    setTitulo('')
    setDescricao('')
    setPrazoFatal('')
    setRecorrencia(null)
    setEmailFileName(null)
    setEmailProcessed(false)
  }

  // ───────────────────────── handlers de natureza/tipo ─────────────────────────
  const handleNatureza = (novo: CategoriaTarefa) => {
    setModoTipo(novo)
    if (novo === 'consultivo' && tipo in CONTENCIOSO_TIPOS) setTipo('cons_parecer')
    if (novo === 'contencioso' && tipo in CONSULTIVO_TIPOS) setTipo('outro')
  }

  const handlePickVinculo = (r: ResultadoBusca) => {
    setVinculacao({
      modulo: r.modulo,
      modulo_registro_id: r.id,
      metadados: {
        numero_pasta: r.numero_pasta,
        numero_cnj: r.numero_cnj,
        titulo: r.titulo,
        partes: r.partes,
        tipo: r.tipo,
      },
    })
    vsearch.limpar()
  }

  const tiposAtuais = modoTipo === 'contencioso' ? CONTENCIOSO_TIPOS : CONSULTIVO_TIPOS

  // Toggle de escopo de edição (header, quando editando recorrente)
  const escopoToggle = isEditing && regraRecorrencia ? (
    <div className="inline-flex items-center bg-slate-100 dark:bg-[#151e2b] rounded-md overflow-hidden">
      {([
        { v: 'instancia', l: 'Apenas esta', Icon: CalendarDays },
        { v: 'em-diante', l: 'Desta em diante', Icon: ChevronsRight },
        { v: 'serie', l: 'Toda a série', Icon: Repeat },
      ] as const).map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => setEscopoEdicao(o.v)}
          className={cn(
            'inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium transition-colors',
            escopoEdicao === o.v
              ? 'bg-[#34495e] text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
          )}
        >
          <o.Icon className="w-3 h-3" />
          {o.l}
        </button>
      ))}
    </div>
  ) : null

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="p-0 gap-0 flex flex-col max-h-[90vh] overflow-hidden w-[min(1060px,calc(100vw-2rem))] sm:max-w-[1060px] top-[5vh] translate-y-0 dark:bg-[#141922] dark:border-[#253345]">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-3.5 border-b border-[#f0ede3] dark:border-[#253345] flex-row items-center justify-between gap-3 space-y-0 pr-12">
          <DialogTitle className="text-[18px] font-semibold text-[#2c3e50] dark:text-slate-200" style={{ fontFamily: 'var(--font-fraunces)', letterSpacing: '-0.02em' }}>
            {isEditing ? 'Editar tarefa' : 'Nova tarefa'}
          </DialogTitle>
          <DialogDescription className="sr-only">{isEditing ? 'Editar tarefa' : 'Nova tarefa'}</DialogDescription>
          {escopoToggle}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_322px]">
            {/* ── Coluna principal ── */}
            <div className="px-6 py-5 space-y-5">
              {/* Natureza + Pessoal */}
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-[320px]">
                  <Segmented
                    value={modoTipo}
                    onChange={handleNatureza}
                    options={[
                      { v: 'contencioso', l: 'Contencioso', Icon: Scale },
                      { v: 'consultivo', l: 'Consultivo', Icon: MessageSquare },
                    ]}
                  />
                </div>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setIsPessoal(!isPessoal)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-colors',
                    isPessoal
                      ? 'bg-[#edf1f7] text-[#415a7e] border-[#415a7e]/30 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
                      : 'bg-white dark:bg-[#151e2b] text-[#7c8693] dark:text-slate-400 border-[#e6e3da] dark:border-[#253345] hover:border-[#89bcbe]',
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Pessoal
                </button>
              </div>

              {/* Tipo de tarefa */}
              <Section title="Tipo de tarefa">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.entries(tiposAtuais).map(([key, config]) => {
                    const Icon = config.icon
                    const selected = tipo === key
                    const cores = TIPO_CORES[key] || TIPO_CORES.outro
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipo(key as TipoTarefa)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-[11px] border text-center transition-all',
                          selected
                            ? cn('shadow-sm', cores.cardSel)
                            : 'border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] text-[#34495e] dark:text-slate-300 hover:border-[#89bcbe]',
                        )}
                      >
                        <span className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center',
                          selected ? 'bg-white dark:bg-white/10' : cores.chipBg,
                        )}>
                          <Icon className={cn('w-[17px] h-[17px]', cores.icon)} />
                        </span>
                        <span className="text-[11px] font-semibold leading-tight">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </Section>

              {/* Importar de e-mail */}
              <Section title="Importar de e-mail" hint={<span className="text-[10.5px] text-[#9aa1a8]">Opcional</span>}>
                <div
                  {...getRootProps()}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-dashed cursor-pointer transition-all',
                    isDragActive
                      ? 'border-[#89bcbe] bg-[#f0f9f9] dark:bg-teal-500/5 dark:border-teal-500/40'
                      : 'border-[#d5cfc3] dark:border-[#253345] bg-[#faf8f2] dark:bg-[#0f141c] hover:border-[#89bcbe]',
                    emailProcessing && 'pointer-events-none opacity-70',
                  )}
                >
                  <input {...getInputProps()} />
                  <span className="w-7 h-7 rounded-lg bg-white dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] flex items-center justify-center flex-shrink-0">
                    {emailProcessing
                      ? <Loader2 className="w-3.5 h-3.5 text-[#89bcbe] animate-spin" />
                      : emailProcessed
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        : <Mail className="w-3.5 h-3.5 text-[#3f7376]" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    {emailProcessing ? (
                      <span className="block text-[12px] font-semibold text-[#34495e] dark:text-slate-200 truncate">Processando {emailFileName}…</span>
                    ) : emailProcessed ? (
                      <span className="block text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">E-mail processado</span>
                    ) : (
                      <>
                        <span className="block text-[12px] font-semibold text-[#34495e] dark:text-slate-200 leading-tight">
                          {isDragActive ? 'Solte o e-mail aqui' : 'Arraste um e-mail do Outlook'}
                        </span>
                        <span className="block text-[10.5px] text-[#9aa1a8] dark:text-slate-500 leading-tight">ou clique para selecionar — preenche título e descrição</span>
                      </>
                    )}
                  </div>
                  {!emailProcessing && !emailProcessed && <Upload className="w-3.5 h-3.5 text-[#9aa1a8] flex-shrink-0" />}
                </div>
              </Section>

              {/* Identificação */}
              <Section title="Identificação">
                <div className="space-y-1.5">
                  <span className="text-[11.5px] font-semibold text-[#34495e] dark:text-slate-300">
                    Título <span className="text-[#a85a3e]">*</span>
                  </span>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Apresentar contestação"
                    className="h-[42px] text-[14.5px] dark:bg-[#151e2b]"
                  />
                </div>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição (opcional) — pauta, observações, contexto…"
                  className="mt-3 text-sm min-h-[80px] resize-y dark:bg-[#151e2b]"
                />
              </Section>

              {/* Quando — só para tarefa única (fixa não tem data; recorrente usa o "Início" da recorrência) */}
              {!isFixa && !recorrenteAtiva && (
                <Section title="Quando">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#34495e] dark:text-slate-300 mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#89bcbe]" />
                        Data de execução <span className="text-[#a85a3e]">*</span>
                      </label>
                      <DateInput value={dataExecucao} onChange={setDataExecucao} className="dark:bg-[#151e2b]" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#34495e] dark:text-slate-300 mb-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-[#34495e] dark:text-slate-400" />
                        Prazo fatal
                        <span className="text-[10.5px] text-[#9aa1a8] font-normal">Opcional</span>
                      </label>
                      <DateInput value={prazoFatal} onChange={setPrazoFatal} className="dark:bg-[#151e2b]" />
                    </div>
                  </div>
                </Section>
              )}

              {/* Prioridade */}
              <div className="space-y-2.5">
                <span className={lbl}>Prioridade</span>
                <Segmented value={prioridade} onChange={setPrioridade} options={PRIOR_OPTS} />
              </div>
            </div>

            {/* ── Rail direito ── */}
            <div className="px-6 py-5 space-y-5 border-t lg:border-t-0 lg:border-l border-[#e6e3da] dark:border-[#253345] bg-[#faf8f2] dark:bg-[#0f141c]">
              {/* Responsáveis */}
              <Section title="Responsáveis">
                <ResponsaveisBlock
                  membros={membros}
                  selectedIds={responsaveisIds}
                  currentUserId={user?.id}
                  onChange={setResponsaveisIds}
                />
              </Section>

              {/* Vínculo */}
              <Section title="Vínculo">
                <VinculoBlock
                  vinculacao={vinculacao}
                  vsearch={vsearch}
                  onPick={handlePickVinculo}
                  onClear={() => setVinculacao(null)}
                />
              </Section>

              {/* Recorrência */}
              <Section title="Recorrência">
                <RecorrenciaRail value={recorrencia} onChange={setRecorrencia} />
              </Section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0ede3] dark:border-[#253345] bg-slate-50/60 dark:bg-[#0f141c]/60 flex items-center justify-between gap-2.5">
          <div>
            {!isEditing && (
              <button
                type="button"
                onClick={handleCriarOutra}
                disabled={!podeSalvar || isSubmitting}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#46627f] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Repeat className="w-3.5 h-3.5" />
                Salvar e criar outra
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button
              onClick={() => handleComplete()}
              disabled={!podeSalvar || isSubmitting}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
              {isEditing ? 'Salvar' : 'Criar tarefa'}
              <span className="ml-2 text-[10px] font-mono bg-white/18 px-1.5 py-0.5 rounded">⌘↵</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═════════════════════════ Bloco: Responsáveis ═════════════════════════
function ResponsaveisBlock({ membros, selectedIds, currentUserId, onChange }: {
  membros: { user_id: string; nome: string }[]
  selectedIds: string[]
  currentUserId?: string
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const selecionados = selectedIds.map((id) => ({
    id,
    nome: membros.find((m) => m.user_id === id)?.nome || 'Usuário',
  }))
  const disponiveis = membros.filter((m) => !selectedIds.includes(m.user_id))

  return (
    <div className="space-y-1.5">
      {selecionados.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[9px] border border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b]">
          <Avatar nome={p.nome} size={26} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[#34495e] dark:text-slate-200 truncate">{p.nome}</div>
            <div className="text-[10px] text-[#9aa1a8] dark:text-slate-500">
              {p.id === currentUserId ? 'Você' : 'Colaborador'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(selectedIds.filter((x) => x !== p.id))}
            className="text-[#9aa1a8] hover:text-red-500 transition-colors flex-shrink-0"
            title="Remover responsável"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disponiveis.length === 0}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-[9px] border border-dashed border-[#d5cfc3] dark:border-[#253345] text-[11.5px] font-semibold text-[#5a6775] dark:text-slate-400 hover:border-[#89bcbe] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3 h-3" />
            Adicionar responsável
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[260px] p-1 max-h-64 overflow-y-auto">
          {disponiveis.length === 0 ? (
            <div className="text-center py-3 text-[11px] text-slate-400">Nenhum membro disponível</div>
          ) : (
            disponiveis.map((m) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => { onChange([...selectedIds, m.user_id]); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-surface-2 text-left transition-colors"
              >
                <Avatar nome={m.nome} size={24} />
                <span className="text-[12.5px] text-[#34495e] dark:text-slate-200 truncate">{m.nome}</span>
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ═════════════════════════ Bloco: Vínculo ═════════════════════════
function VinculoBlock({ vinculacao, vsearch, onPick, onClear }: {
  vinculacao: Vinculacao | null
  vsearch: ReturnType<typeof useVinculacaoSearch>
  onPick: (r: ResultadoBusca) => void
  onClear: () => void
}) {
  const { buscaTexto, setBuscaTexto, resultados, resultadosProcessos, resultadosConsultivos, loading, mostrarResultados, setMostrarResultados } = vsearch

  if (vinculacao) {
    const m = vinculacao.metadados
    return (
      <div className="relative bg-white dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] rounded-[10px] p-3 pr-8">
        {m?.partes && <div className="text-[12.5px] font-semibold text-[#34495e] dark:text-slate-200 leading-snug">{m.partes}</div>}
        {m?.titulo && !m?.partes && <div className="text-[12.5px] font-semibold text-[#34495e] dark:text-slate-200 leading-snug line-clamp-2">{m.titulo}</div>}
        <div className="text-[11px] text-[#9aa1a8] dark:text-slate-500 mt-1 space-y-0.5">
          <div className={cn(!m?.partes && !m?.titulo && 'text-[12.5px] font-semibold text-[#34495e] dark:text-slate-200')}>
            Pasta {m?.numero_pasta || 'S/N'}
          </div>
          {m?.numero_cnj && <div className="font-mono text-[10px]">CNJ: {m.numero_cnj}</div>}
          {m?.titulo && m?.partes && <div className="line-clamp-1">{m.titulo}</div>}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2.5 right-2.5 text-[#9aa1a8] hover:text-red-500 transition-colors"
          title="Remover vínculo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <Popover open={mostrarResultados} onOpenChange={(o) => { if (!o) setMostrarResultados(false) }}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa1a8]" />
          <Input
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            onFocus={() => { if (buscaTexto.length >= 2 && resultados.length > 0) setMostrarResultados(true) }}
            placeholder="Buscar processo ou cliente…"
            className="pl-10 h-10 text-sm dark:bg-[#151e2b]"
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[440px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden"
      >
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-5 text-[12px] text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando…
            </div>
          ) : resultados.length > 0 ? (
            <div>
              {resultadosProcessos.length > 0 && (
                <>
                  <GrupoHead Icon={Scale} label="Processos" count={resultadosProcessos.length} cor="text-[#415a7e]" />
                  {resultadosProcessos.map((r) => <VinculoRow key={r.id} r={r} onPick={onPick} />)}
                </>
              )}
              {resultadosConsultivos.length > 0 && (
                <>
                  <GrupoHead Icon={FileText} label="Consultas" count={resultadosConsultivos.length} cor="text-[#3f7376]" />
                  {resultadosConsultivos.map((r) => <VinculoRow key={r.id} r={r} onPick={onPick} />)}
                </>
              )}
            </div>
          ) : (
            <div className="p-5 text-center text-[12px] text-slate-400">Nenhum resultado encontrado</div>
          )}
        </div>
      </PopoverContent>

      {!buscaTexto && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-[10px] border border-dashed border-[#e6e3da] dark:border-[#253345] text-[11.5px] text-[#9aa1a8] dark:text-slate-500">
          <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
          Nenhum vínculo — opcional
        </div>
      )}
    </Popover>
  )
}

function GrupoHead({ Icon, label, count, cor }: { Icon: LucideIcon; label: string; count: number; cor: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#faf8f2] dark:bg-[#0f141c]/60 border-y border-[#f0ede3] dark:border-[#253345]">
      <Icon className={cn('w-3.5 h-3.5', cor)} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a6775] dark:text-slate-300">{label}</span>
      <span className="ml-auto text-[10px] font-mono text-[#9aa1a8]">{count}</span>
    </div>
  )
}

function VinculoRow({ r, onPick }: { r: ResultadoBusca; onPick: (r: ResultadoBusca) => void }) {
  const isProc = r.modulo === 'processo'
  return (
    <button
      type="button"
      onClick={() => onPick(r)}
      className="w-full text-left px-3 py-2.5 hover:bg-[#89bcbe]/8 transition-colors border-b border-[#f0ede3] dark:border-[#253345] last:border-0"
    >
      <div className="text-[12.5px] font-semibold text-[#34495e] dark:text-slate-200 line-clamp-1">
        {isProc ? (r.partes || `Pasta ${r.numero_pasta}`) : (r.titulo || `Pasta ${r.numero_pasta}`)}
      </div>
      <div className="text-[11px] text-[#9aa1a8] dark:text-slate-500 mt-0.5 truncate">
        <span className={isProc ? '' : ''}>Pasta {r.numero_pasta}</span>
        {isProc && r.numero_cnj && <span className="font-mono"> · {r.numero_cnj}</span>}
        {!isProc && r.partes && <span> · {r.partes}</span>}
      </div>
    </button>
  )
}

// ═════════════════════════ Bloco: Recorrência (3 modos → RecorrenciaData) ═════════════════════════
type ModoRec = 'unica' | 'fixa' | 'recorrente'
const DIAS_SEM = [
  { l: 'D', v: 0 }, { l: 'S', v: 1 }, { l: 'T', v: 2 }, { l: 'Q', v: 3 }, { l: 'Q', v: 4 }, { l: 'S', v: 5 }, { l: 'S', v: 6 },
]

function RecorrenciaRail({ value, onChange }: { value: RecorrenciaData | null; onChange: (v: RecorrenciaData | null) => void }) {
  const modo: ModoRec = value?.isFixa ? 'fixa' : value?.ativa ? 'recorrente' : 'unica'

  const setModo = (novo: ModoRec) => {
    if (novo === 'unica') {
      onChange(null)
    } else if (novo === 'fixa') {
      onChange({
        ativa: false,
        isFixa: true,
        frequencia: 'diaria',
        intervalo: 1,
        dataInicio: new Date().toISOString().split('T')[0],
        terminoTipo: 'permanente',
        horaPadrao: '09:00',
      })
    } else {
      onChange({
        ativa: true,
        isFixa: false,
        frequencia: 'semanal',
        intervalo: 1,
        diasSemana: [1, 2, 3, 4, 5],
        dataInicio: new Date().toISOString().split('T')[0],
        terminoTipo: 'permanente',
        horaPadrao: '09:00',
      })
    }
  }

  const setField = (field: keyof RecorrenciaData, newValue: any) => {
    if (!value) return
    const updates: Partial<RecorrenciaData> = { [field]: newValue }

    if (field === 'frequencia') {
      const limites: Record<string, number> = { semanal: 3, mensal: 11 }
      const novoMax = limites[newValue as string] ?? 1
      if ((value.intervalo || 1) > novoMax) updates.intervalo = novoMax
      if (newValue === 'semanal') {
        updates.diaMes = undefined
        updates.mes = undefined
        if (!value.diasSemana || value.diasSemana.length === 0) updates.diasSemana = [1, 2, 3, 4, 5]
      } else if (newValue === 'mensal') {
        updates.diasSemana = undefined
        updates.mes = undefined
        if (!value.diaMes) updates.diaMes = 1
      }
    }
    onChange({ ...value, ...updates })
  }

  const toggleDia = (dia: number) => {
    if (!value) return
    const atuais = value.diasSemana || []
    const novos = atuais.includes(dia) ? atuais.filter((d) => d !== dia) : [...atuais, dia].sort()
    setField('diasSemana', novos)
  }

  const freqValue = value?.frequencia === 'mensal' ? 'mensal' : 'semanal'
  const maxIntervalo = freqValue === 'mensal' ? 11 : 3

  return (
    <div className="space-y-3">
      <Segmented<ModoRec>
        value={modo}
        onChange={setModo}
        options={[
          { v: 'unica', l: 'Única' },
          { v: 'fixa', l: 'Fixa' },
          { v: 'recorrente', l: 'Recorrente' },
        ]}
      />

      {modo === 'unica' && <p className="text-[11px] text-[#9aa1a8] dark:text-slate-500">Tarefa única, sem repetição.</p>}

      {modo === 'fixa' && (
        <p className="text-[11px] text-[#9aa1a8] dark:text-slate-500">Aparece todo dia automaticamente, sem acumular atrasos.</p>
      )}

      {modo === 'recorrente' && value && (
        <div className="border border-[#e6e3da] dark:border-[#253345] rounded-[11px] p-3.5 space-y-3 bg-white dark:bg-[#0f141c]">
          <Segmented
            value={freqValue}
            onChange={(v) => setField('frequencia', v)}
            options={[{ v: 'semanal', l: 'Semanal' }, { v: 'mensal', l: 'Mensal' }]}
          />

          {/* intervalo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-[#5a6775] dark:text-slate-400">A cada</span>
            <Input
              type="number"
              min={1}
              max={maxIntervalo}
              value={value.intervalo || 1}
              onChange={(e) => {
                const raw = parseInt(e.target.value) || 1
                setField('intervalo', Math.max(1, Math.min(raw, maxIntervalo)))
              }}
              className="w-14 h-8 text-center font-mono dark:bg-[#151e2b]"
            />
            <span className="text-[12px] text-[#5a6775] dark:text-slate-400">
              {freqValue === 'semanal' ? 'semana(s)' : 'mês(es)'}
              <span className="text-[#9aa1a8]"> (máx. {maxIntervalo})</span>
            </span>
          </div>

          {freqValue === 'semanal' ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#5a6775] dark:text-slate-400">Dias</span>
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEM.map((d, i) => {
                  const on = value.diasSemana?.includes(d.v)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(d.v)}
                      className={cn(
                        'h-8 rounded-md text-[11.5px] font-semibold border transition-all',
                        on
                          ? 'bg-[#89bcbe] border-[#89bcbe] text-white'
                          : 'bg-white dark:bg-[#151e2b] border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-slate-400 hover:border-[#89bcbe]',
                      )}
                    >
                      {d.l}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#5a6775] dark:text-slate-400">No dia</span>
              <Select value={(value.diaMes ?? 1).toString()} onValueChange={(v) => setField('diaMes', parseInt(v))}>
                <SelectTrigger className="w-[130px] h-8 dark:bg-[#151e2b]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                    <SelectItem key={dia} value={dia.toString()}>Dia {dia}</SelectItem>
                  ))}
                  <SelectItem value="99">Último dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t border-[#f0ede3] dark:border-[#253345]" />

          {/* início + término empilhados (largura total p/ a data não colidir com o ícone) */}
          <div className="space-y-2.5">
            <div>
              <span className="text-[11px] font-semibold text-[#5a6775] dark:text-slate-400 mb-1 block">Início</span>
              <DateInput value={value.dataInicio || ''} onChange={(d) => setField('dataInicio', d)} className="dark:bg-[#151e2b]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#5a6775] dark:text-slate-400 mb-1 block">Término</span>
              <Select value={value.terminoTipo || 'permanente'} onValueChange={(v) => setField('terminoTipo', v)}>
                <SelectTrigger className="h-9 dark:bg-[#151e2b]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanente">Nunca</SelectItem>
                  <SelectItem value="data">Em uma data</SelectItem>
                  <SelectItem value="ocorrencias">Após nº de ocorrências</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {value.terminoTipo === 'data' && (
              <DateInput value={value.dataFim || ''} onChange={(d) => setField('dataFim', d)} className="dark:bg-[#151e2b]" />
            )}
            {value.terminoTipo === 'ocorrencias' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={value.numeroOcorrencias || 10}
                  onChange={(e) => setField('numeroOcorrencias', parseInt(e.target.value) || 10)}
                  className="w-20 h-8 font-mono dark:bg-[#151e2b]"
                />
                <span className="text-[12px] text-[#5a6775] dark:text-slate-400">vezes</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
