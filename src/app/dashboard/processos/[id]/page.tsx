'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Edit,
  Copy,
  Check,
  Archive,
  RotateCcw,
  Info,
  GitBranch,
  History,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBrazilDate } from '@/lib/timezone'
import { formatCurrency } from '@/lib/utils'
import {
  PROCESSO_STATUS_ENCERRADO,
  PROCESSO_STATUS_LABELS,
  PROCESSO_RESULTADO_LABELS,
} from '@/lib/constants/processo-enums'

// Componentes do processo
import ProcessoResumo from '@/components/processos/ProcessoResumo'
import ProcessoPartes from '@/components/processos/ProcessoPartes'
import ProcessoHistorico from '@/components/processos/ProcessoHistorico'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import EncerrarProcessoModal from '@/components/processos/EncerrarProcessoModal'
import ProcessoRelacionados from '@/components/processos/ProcessoRelacionados'
import { type ProcessoPrincipalData } from '@/components/processos/ProcessoDerivadoWizard'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  tipo: string
  area: string
  fase: string
  instancia: string
  rito?: string
  tribunal: string
  link_tribunal?: string
  sistema_tribunal?: import('@/lib/tribunais').SistemaTribunal | null
  comarca?: string
  vara?: string
  data_distribuicao: string
  cliente_id: string
  cliente_nome: string
  polo_cliente: string
  parte_contraria?: string
  responsavel_id: string
  responsavel_nome: string
  colaboradores_ids: string[]
  colaboradores_nomes: string[]
  status: string
  valor_causa?: number
  valor_atualizado?: number
  data_ultima_atualizacao_monetaria?: string
  indice_correcao?: string
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
  objeto_acao?: string
  observacoes?: string
  tags: string[]
  data_transito_julgado?: string
  data_arquivamento?: string
  data_encerramento?: string
  resultado?: string
  resumo_encerramento?: string
  encerrado_por?: string
  encerrado_por_nome?: string
  encerrado_em?: string
  contrato_id?: string | null
  created_at: string
  updated_at: string
}

// Dados brutos do processo para edição (sem formatação)
interface ProcessoRaw {
  id: string
  numero_cnj: string
  outros_numeros?: { tipo: string; numero: string }[]
  tipo: string
  area: string
  fase: string
  instancia: string
  rito?: string
  valor_causa?: number
  indice_correcao?: string
  data_distribuicao: string
  objeto_acao?: string
  cliente_id: string
  polo_cliente: string
  parte_contraria?: string
  contrato_id?: string
  modalidade_cobranca?: string
  tribunal: string
  comarca?: string
  vara?: string
  responsavel_id: string
  colaboradores_ids?: string[]
  tags?: string[]
  status: string
  provisao_perda?: string
  observacoes?: string
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
  processo_principal_id?: string
  tipo_derivado?: 'recurso' | 'incidente'
}

export default function ProcessoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const [processo, setProcesso] = useState<Processo | null>(null)
  const [processoRaw, setProcessoRaw] = useState<ProcessoRaw | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistorico, setShowHistorico] = useState(false)
  const [copiedCNJ, setCopiedCNJ] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEncerrarModal, setShowEncerrarModal] = useState(false)
  const [reabrindo, setReabrindo] = useState(false)
  const supabase = createClient()


  // Relacionamentos (recursos e incidentes)
  const [processoDerived, setProcessoDerived] = useState<{
    tipo: 'recurso' | 'incidente'
    principal_id: string
    principal_cnj: string
  } | null>(null)

  useEffect(() => {
    if (params.id) {
      loadProcesso(params.id as string)
    }
  }, [params.id])

  const loadProcesso = async (id: string) => {
    try {
      setLoading(true)

      // Buscar processo do Supabase
      const { data, error } = await supabase
        .from('processos_processos')
        .select(`
          *,
          cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo),
          responsavel:profiles!processos_processos_responsavel_id_fkey(nome_completo),
          encerrador:profiles!processos_processos_encerrado_por_fkey(nome_completo)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erro ao carregar processo:', error)
        setLoading(false)
        return
      }

      if (!data) {
        setLoading(false)
        return
      }

      // Hidratar nomes dos colaboradores (mantendo a ordem dos IDs)
      let colaboradoresNomes: string[] = []
      if (data.colaboradores_ids?.length) {
        const { data: colabs } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', data.colaboradores_ids)
        const colabsList = (colabs ?? []) as { id: string; nome_completo: string }[]
        colaboradoresNomes = (data.colaboradores_ids as string[])
          .map((cid) => colabsList.find((c) => c.id === cid)?.nome_completo)
          .filter((n): n is string => !!n)
      }

      // Transformar dados do banco para o formato da interface
      const processoFormatado: Processo = {
        id: data.id,
        numero_pasta: data.numero_pasta,
        numero_cnj: data.numero_cnj,
        tipo: data.tipo,
        area: formatArea(data.area),
        fase: formatFase(data.fase),
        instancia: formatInstancia(data.instancia),
        rito: data.rito || undefined,
        tribunal: data.tribunal,
        link_tribunal: data.link_tribunal || undefined,
        sistema_tribunal: data.sistema_tribunal || null,
        comarca: data.comarca || undefined,
        vara: data.vara || undefined,
        data_distribuicao: data.data_distribuicao,
        cliente_id: data.cliente_id,
        cliente_nome: data.cliente?.nome_completo || 'N/A',
        polo_cliente: data.polo_cliente,
        parte_contraria: data.parte_contraria || undefined,
        responsavel_id: data.responsavel_id,
        responsavel_nome: data.responsavel?.nome_completo || 'N/A',
        colaboradores_ids: data.colaboradores_ids || [],
        colaboradores_nomes: colaboradoresNomes,
        status: data.status,
        valor_causa: data.valor_causa || undefined,
        valor_atualizado: data.valor_atualizado || undefined,
        data_ultima_atualizacao_monetaria: data.data_ultima_atualizacao_monetaria || undefined,
        indice_correcao: data.indice_correcao || undefined,
        valor_acordo: data.valor_acordo || undefined,
        valor_condenacao: data.valor_condenacao || undefined,
        provisao_sugerida: data.provisao_sugerida || undefined,
        objeto_acao: data.objeto_acao || undefined,
        observacoes: data.observacoes || undefined,
        tags: data.tags || [],
        data_transito_julgado: data.data_transito_julgado || undefined,
        data_arquivamento: data.data_arquivamento || undefined,
        data_encerramento: data.data_encerramento || undefined,
        resultado: data.resultado || undefined,
        resumo_encerramento: data.resumo_encerramento || undefined,
        encerrado_por: data.encerrado_por || undefined,
        encerrado_por_nome: data.encerrador?.nome_completo || undefined,
        encerrado_em: data.encerrado_em || undefined,
        contrato_id: data.contrato_id || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      setProcesso(processoFormatado)

      // Registrar acesso do usuário (alimenta "Acessados recentemente"). Silencioso.
      void (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || !data.escritorio_id) return
          await supabase.from('processos_acessos').upsert(
            {
              user_id: user.id,
              processo_id: data.id,
              escritorio_id: data.escritorio_id,
              acessado_em: new Date().toISOString(),
            },
            { onConflict: 'user_id,processo_id' }
          )
        } catch {
          /* não-crítico */
        }
      })()

      // Guardar dados brutos para edição
      setProcessoRaw({
        id: data.id,
        numero_cnj: data.numero_cnj,
        outros_numeros: data.outros_numeros || [],
        tipo: data.tipo,
        area: data.area,
        fase: data.fase,
        instancia: data.instancia,
        rito: data.rito || undefined,
        valor_causa: data.valor_causa || undefined,
        indice_correcao: data.indice_correcao || undefined,
        data_distribuicao: data.data_distribuicao,
        objeto_acao: data.objeto_acao || undefined,
        cliente_id: data.cliente_id,
        polo_cliente: data.polo_cliente,
        parte_contraria: data.parte_contraria || undefined,
        contrato_id: data.contrato_id || undefined,
        modalidade_cobranca: data.modalidade_cobranca || undefined,
        tribunal: data.tribunal,
        comarca: data.comarca || undefined,
        vara: data.vara || undefined,
        responsavel_id: data.responsavel_id,
        colaboradores_ids: data.colaboradores_ids || [],
        tags: data.tags || [],
        status: data.status,
        provisao_perda: data.provisao_perda || undefined,
        observacoes: data.observacoes || undefined,
        valor_acordo: data.valor_acordo || undefined,
        valor_condenacao: data.valor_condenacao || undefined,
        provisao_sugerida: data.provisao_sugerida || undefined,
      })


      // Verificar se este processo é derivado de outro (recurso/incidente)
      if (data.processo_principal_id) {
        const { data: principal } = await supabase
          .from('processos_processos')
          .select('numero_cnj, numero_pasta')
          .eq('id', data.processo_principal_id)
          .single()
        setProcessoDerived({
          tipo: data.tipo_derivado as 'recurso' | 'incidente',
          principal_id: data.processo_principal_id,
          principal_cnj: principal?.numero_cnj ?? principal?.numero_pasta ?? '',
        })
      } else {
        setProcessoDerived(null)
      }

      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar processo:', error)
      setLoading(false)
    }
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível',
      'trabalhista': 'Trabalhista',
      'tributaria': 'Tributária',
      'familia': 'Família',
      'criminal': 'Criminal',
      'previdenciaria': 'Previdenciária',
      'consumidor': 'Consumidor',
      'empresarial': 'Empresarial',
      'ambiental': 'Ambiental',
      'outra': 'Outra'
    }
    return map[area] || area
  }

  const formatFase = (fase: string) => {
    const map: Record<string, string> = {
      'conhecimento': 'Conhecimento',
      'recurso': 'Recurso',
      'execucao': 'Execução',
      'cumprimento_sentenca': 'Cumprimento de Sentença'
    }
    return map[fase] || fase
  }

  const formatInstancia = (instancia: string) => {
    const map: Record<string, string> = {
      '1a': '1ª',
      '2a': '2ª',
      '3a': '3ª',
      'stj': 'STJ',
      'stf': 'STF',
      'tst': 'TST',
      'administrativa': 'Administrativa'
    }
    return map[instancia] || instancia
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-700',
      suspenso: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-700',
      arquivado: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-surface-2 dark:text-slate-300 dark:border-slate-700',
      baixado: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-700',
      transito_julgado: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-700',
      acordo: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-700'
    }
    return styles[status as keyof typeof styles] || styles.ativo
  }

  // Estilo do badge de status sobre o hero escuro (V4)
  const getHeroStatus = (status: string) => {
    const map: Record<string, { dot: string; bg: string; fg: string }> = {
      ativo: { dot: '#9fdfbd', bg: 'rgba(107,158,132,0.35)', fg: '#9fdfbd' },
      suspenso: { dot: '#e6c79a', bg: 'rgba(194,149,107,0.30)', fg: '#e6c79a' },
      acordo: { dot: '#9fdfbd', bg: 'rgba(107,158,132,0.30)', fg: '#bfe6cf' },
      arquivado: { dot: '#c2cad3', bg: 'rgba(148,163,184,0.25)', fg: '#cbd5e1' },
      baixado: { dot: '#c2cad3', bg: 'rgba(148,163,184,0.25)', fg: '#cbd5e1' },
      transito_julgado: { dot: '#b9a9d6', bg: 'rgba(124,103,168,0.30)', fg: '#cfc0e6' },
      extinto: { dot: '#c2cad3', bg: 'rgba(148,163,184,0.25)', fg: '#cbd5e1' },
    }
    const style = map[status] || map.ativo
    return { ...style, label: PROCESSO_STATUS_LABELS[status] || status }
  }

  // Iniciais para avatar (1ª letra do 1º e do último nome)
  const getIniciais = (nome: string) => {
    const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '—'
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const copyCNJ = () => {
    if (processo?.numero_cnj) {
      navigator.clipboard.writeText(processo.numero_cnj)
      setCopiedCNJ(true)
      setTimeout(() => setCopiedCNJ(false), 2000)
    }
  }

  const isEncerrado = processo
    ? (PROCESSO_STATUS_ENCERRADO as readonly string[]).includes(processo.status)
    : false

  const handleReabrir = async () => {
    if (!processo) return
    setReabrindo(true)
    try {
      const { error } = await supabase
        .from('processos_processos')
        .update({
          status: 'ativo',
          data_encerramento: null,
          resultado: null,
          resumo_encerramento: null,
          encerrado_por: null,
          encerrado_em: null,
        })
        .eq('id', processo.id)

      if (!error) {
        loadProcesso(processo.id)
      }
    } finally {
      setReabrindo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-teal-200 dark:border-teal-700 border-t-teal-500 dark:border-t-teal-400 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!processo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#34495e] dark:text-slate-200 mb-2">Processo não encontrado</h2>
          <Button onClick={() => router.push('/dashboard/processos')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  const heroStatus = getHeroStatus(processo.status)

  return (
    <div className="min-h-screen bg-[#fafaf7] dark:bg-[#0c1017] p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">

        {/* HERO — card flutuante (V4) */}
        <div
          className="relative overflow-hidden rounded-[18px] px-6 pt-[18px] pb-5 shadow-[0_14px_36px_rgba(44,62,80,0.20)]"
          style={{ background: 'linear-gradient(155deg,#2c3e50 0%,#34495e 45%,#46627f 100%)' }}
        >
          {/* glows decorativos */}
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(137,188,190,0.20),transparent 70%)' }} />
          <div className="pointer-events-none absolute -top-10 left-[140px] w-[200px] h-[200px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.04),transparent 70%)' }} />

          {/* breadcrumb + ações */}
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-[11.5px] text-white/50">
              <button onClick={() => router.push('/dashboard/processos')} className="flex items-center gap-1.5 hover:text-white/90 transition-colors">
                <ChevronLeft className="w-3 h-3" />
                Processos
              </button>
              <ChevronRight className="w-2.5 h-2.5" />
              <span className="text-white/70">{processo.area}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowHistorico(true)}
                className="h-7 px-2.5 rounded-md bg-white/10 border border-white/15 text-white/85 text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors"
              >
                <History className="w-3 h-3" />
                Histórico
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="h-7 px-2.5 rounded-md bg-white/10 border border-white/15 text-white/85 text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors"
              >
                <Edit className="w-3 h-3" />
                Editar
              </button>
              {!isEncerrado ? (
                <button
                  onClick={() => setShowEncerrarModal(true)}
                  className="h-7 px-2.5 rounded-md bg-white/10 border border-white/15 text-white/85 text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors"
                >
                  <Archive className="w-3 h-3" />
                  Encerrar
                </button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={reabrindo}
                      className="h-7 px-2.5 rounded-md bg-white/10 border border-white/15 text-white/85 text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reabrir
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reabrir processo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O processo voltará ao status &quot;Ativo&quot; e as informações de encerramento serão removidas. Esta ação será registrada no histórico.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReabrir}>
                        Reabrir Processo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* kicker: área · status · tags */}
          <div className="relative flex items-center gap-2.5 mb-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{processo.area}</span>
            <span className="w-px h-3 bg-white/20" />
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-[3px] rounded"
              style={{ background: heroStatus.bg, color: heroStatus.fg }}
            >
              <span className="w-[5px] h-[5px] rounded-full" style={{ background: heroStatus.dot }} />
              {heroStatus.label}
            </span>
            {processo.tags.map((tag, i) => (
              <span key={i} className="text-[10.5px] font-medium px-2 py-[3px] rounded bg-white/10 text-white/75">
                {tag}
              </span>
            ))}
          </div>

          {/* título */}
          <h1 className="relative m-0 font-serif text-[34px] font-medium tracking-[-0.03em] text-white leading-[1.1]">
            {processo.cliente_nome} <span className="italic opacity-50 font-normal">v.</span> {processo.parte_contraria || '—'}
          </h1>

          {/* meta strip */}
          <div className="relative mt-[18px] pt-3.5 border-t border-white/10 flex gap-6 flex-wrap items-end">
            {/* Pasta */}
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#89bcbe] mb-1.5">Pasta</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[21px] font-bold text-white tracking-[0.03em] leading-none whitespace-nowrap border-b-2 border-[#89bcbe] pb-[3px]">
                  {processo.numero_pasta}
                </span>
                <button
                  onClick={copyCNJ}
                  title="Copiar número da pasta"
                  className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white/55 hover:text-white transition-colors flex-shrink-0"
                >
                  {copiedCNJ ? <Check className="w-2.5 h-2.5 text-[#9fdfbd]" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>

            <span className="w-px h-[38px] bg-white/[0.12] self-center" />

            {/* CNJ */}
            {processo.numero_cnj && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40 mb-1">Número CNJ</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[12.5px] text-white/90">{processo.numero_cnj}</span>
                  <button
                    onClick={copyCNJ}
                    title="Copiar"
                    className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white/55 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copiedCNJ ? <Check className="w-2.5 h-2.5 text-[#9fdfbd]" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                  {processo.link_tribunal && (
                    <button
                      onClick={() => window.open(processo.link_tribunal, '_blank')}
                      title="Abrir no tribunal"
                      className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[#89bcbe] hover:text-white transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1" />

            {/* Valor da causa + Responsável */}
            <div className="flex items-end gap-7">
              <div className="text-right">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/45 mb-1">Valor da causa</div>
                <div className="font-serif text-[22px] font-medium text-white tracking-[-0.025em] leading-none">
                  {processo.valor_causa ? formatCurrency(processo.valor_causa) : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] ring-1 ring-white/20 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white">
                  {getIniciais(processo.responsavel_nome)}
                </span>
                <div>
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/45 mb-0.5">Responsável</div>
                  <div className="text-[12.5px] font-semibold text-white">{processo.responsavel_nome}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner de encerramento */}
        {isEncerrado && processo.data_encerramento && (
          <div className="bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                  Processo encerrado em {formatBrazilDate(processo.data_encerramento)}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Badge className={`text-[10px] border ${getStatusBadge(processo.status)}`}>
                    {PROCESSO_STATUS_LABELS[processo.status] || processo.status}
                  </Badge>
                  {processo.resultado && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span>Resultado: {PROCESSO_RESULTADO_LABELS[processo.resultado] || processo.resultado}</span>
                    </>
                  )}
                  {processo.valor_acordo != null && processo.valor_acordo > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span>Acordo: {formatCurrency(processo.valor_acordo)}</span>
                    </>
                  )}
                  {processo.valor_condenacao != null && processo.valor_condenacao > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span>Condenação: {formatCurrency(processo.valor_condenacao)}</span>
                    </>
                  )}
                  {processo.encerrado_por_nome && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span>por {processo.encerrado_por_nome}</span>
                    </>
                  )}
                </div>
                {processo.resumo_encerramento && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                    &ldquo;{processo.resumo_encerramento}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Banner: processo derivado (recurso/incidente de outro processo) */}
        {processoDerived && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700 rounded-lg">
            <GitBranch className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Este processo é um{' '}
              <strong>
                {processoDerived.tipo === 'recurso' ? 'Recurso' : 'Incidente'}
              </strong>{' '}
              do processo{' '}
              <button
                onClick={() => router.push(`/dashboard/processos/${processoDerived.principal_id}`)}
                className="font-mono font-semibold underline hover:text-amber-900 dark:hover:text-amber-200"
              >
                {processoDerived.principal_cnj}
              </button>
            </p>
          </div>
        )}

        {/* Conteúdo Principal - Ficha Processual */}
        <ProcessoResumo
          processo={processo}
          topSectionsSlot={<ProcessoPartes processoId={processo.id} autoHide collapsible />}
          vinculosSlot={processoRaw ? (() => {
            const polo = processoRaw.polo_cliente
            const clienteNome = processo.cliente_nome
            const parteContraria = processoRaw.parte_contraria ?? ''
            const autor = polo === 'ativo' ? clienteNome : polo === 'passivo' ? parteContraria : ''
            const reu = polo === 'ativo' ? parteContraria : polo === 'passivo' ? clienteNome : ''
            const ppData: ProcessoPrincipalData = {
              id: processo.id,
              numero_cnj: processoRaw.numero_cnj,
              numero_pasta: processo.numero_pasta,
              cliente_id: processoRaw.cliente_id,
              cliente_nome: clienteNome,
              autor,
              reu,
              polo_cliente: polo,
              parte_contraria: parteContraria,
              area: processoRaw.area,
              instancia: processoRaw.instancia,
              comarca: processoRaw.comarca,
              responsavel_id: processoRaw.responsavel_id,
              responsavel_nome: processo.responsavel_nome,
              colaboradores_ids: processoRaw.colaboradores_ids,
              tags: processoRaw.tags,
              contrato_id: processoRaw.contrato_id,
              modalidade_cobranca: processoRaw.modalidade_cobranca,
              valor_causa: processoRaw.valor_causa,
              objeto_acao: processoRaw.objeto_acao,
            }
            return (
              <ProcessoRelacionados
                processoId={processo.id}
                processoPrincipalData={ppData}
              />
            )
          })() : undefined}
        />

      </div>

      {/* Sheet: Histórico de Alterações */}
      <Sheet open={showHistorico} onOpenChange={setShowHistorico}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
              <History className="w-4 h-4 text-[#89bcbe]" />
              Histórico de Alterações
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
              Auditoria completa de alterações neste processo
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ProcessoHistorico processoId={processo.id} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Edição de Processo */}
      {showEditModal && processoRaw && (
        <ProcessoWizard
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            loadProcesso(params.id as string)
          }}
          initialData={processoRaw}
          mode="edit"
        />
      )}

      {/* Modal de Encerramento */}
      {showEncerrarModal && (
        <EncerrarProcessoModal
          open={showEncerrarModal}
          onClose={() => setShowEncerrarModal(false)}
          processoId={processo.id}
          processoNumero={processo.numero_pasta}
          onSuccess={() => {
            setShowEncerrarModal(false)
            loadProcesso(params.id as string)
          }}
        />
      )}
    </div>
  )
}
