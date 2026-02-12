'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Filter,
  Search,
  RefreshCw,
  Settings,
  Archive,
  CheckCircle2,
  Clock,
  FileX,
  Calendar,
  Loader2,
  CalendarPlus,
  CheckSquare,
  Gavel,
  FolderPlus,
  ListChecks,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useAaspSync } from '@/hooks/useAaspSync'
import { useEscavadorTermos } from '@/hooks/useEscavadorTermos'
import { toast } from 'sonner'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import { BuscaCNJModal } from '@/components/processos/BuscaCNJModal'
import ProcessoWizardAutomatico from '@/components/processos/ProcessoWizardAutomatico'
import { useEventos } from '@/hooks/useEventos'
import { useAudiencias } from '@/hooks/useAudiencias'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'
import PublicacaoExpandedRow from '@/components/publicacoes/PublicacaoExpandedRow'
import type { AnaliseIA } from '@/components/publicacoes/PublicacaoAIPanel'

// Tipos
type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'
type TipoPublicacao = 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao' | 'citacao' | 'outro'

interface Publicacao {
  id: string
  data_publicacao: string
  tribunal: string
  vara?: string
  tipo_publicacao: TipoPublicacao
  numero_processo?: string
  processo_id?: string
  status: StatusPublicacao
  agendamento_id?: string
  agendamento_tipo?: 'tarefa' | 'compromisso' | 'audiencia'
  hash_conteudo?: string
  duplicata_revisada?: boolean
  is_snippet?: boolean
  updated_at?: string
  created_at?: string
  source?: string
  escritorio_id?: string
}

interface Stats {
  pendentes: number
  processadasHoje: number
  prazosCriados: number
  comProcesso: number
  semProcesso: number
  tratadas: number
  arquivadas: number
  total: number
}

type AbaPublicacoes = 'todas' | 'com_processo' | 'sem_processo' | 'tratadas' | 'arquivadas'

// Filtros rápidos pré-definidos
const FILTROS_RAPIDOS: Array<{
  id: string
  label: string
  filtro: { status?: string; tipo?: string; semPasta?: boolean }
}> = [
  { id: 'pendentes', label: 'Pendentes', filtro: { status: 'pendente' } },
  { id: 'intimacoes', label: 'Intimações', filtro: { tipo: 'intimacao' } },
  { id: 'sentencas', label: 'Sentenças', filtro: { tipo: 'sentenca' } },
]

export default function PublicacoesPage() {
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'todos',
    tipo: 'todos',
    semPasta: false
  })
  const [filtroRapidoAtivo, setFiltroRapidoAtivo] = useState<string | null>(null)
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([])
  const [stats, setStats] = useState<Stats>({
    pendentes: 0,
    processadasHoje: 0,
    prazosCriados: 0,
    comProcesso: 0,
    semProcesso: 0,
    tratadas: 0,
    arquivadas: 0,
    total: 0
  })
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<AbaPublicacoes>('todas')

  // Seleção em massa
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false)

  // Wizards para ações rápidas
  const [wizardTarefa, setWizardTarefa] = useState<{ open: boolean; pub: Publicacao | null }>({ open: false, pub: null })
  const [wizardEvento, setWizardEvento] = useState<{ open: boolean; pub: Publicacao | null }>({ open: false, pub: null })
  const [wizardAudiencia, setWizardAudiencia] = useState<{ open: boolean; pub: Publicacao | null }>({ open: false, pub: null })

  // Row expandida (single-expansion)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const expandedCacheRef = useRef<Map<string, { texto: string | null; analise: AnaliseIA | null }>>(new Map())

  // Estado para criação de processo (fluxo com busca automática)
  const [buscaCNJModal, setBuscaCNJModal] = useState<{ open: boolean; cnj: string }>({ open: false, cnj: '' })
  const [wizardProcessoAuto, setWizardProcessoAuto] = useState<{ open: boolean; dados: ProcessoEscavadorNormalizado | null }>({ open: false, dados: null })
  const [wizardProcessoManual, setWizardProcessoManual] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const { sincronizarTodos, sincronizando: sincronizandoAasp } = useAaspSync(escritorioAtivo || undefined)
  const { sincronizar: sincronizarEscavador, sincronizando: sincronizandoEscavador, termos: termosEscavador } = useEscavadorTermos(escritorioAtivo || undefined)
  const { createEvento } = useEventos(escritorioAtivo || undefined)
  const { createAudiencia } = useAudiencias(escritorioAtivo || undefined)

  const sincronizando = sincronizandoAasp || sincronizandoEscavador

  // Toggle expand row
  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  // Cache callback para lazy-load
  const handleExpandedDataLoaded = useCallback((id: string, data: { texto: string | null; analise: AnaliseIA | null }) => {
    expandedCacheRef.current.set(id, data)
  }, [])

  // Carregar publicações do banco
  const carregarPublicacoes = useCallback(async () => {
    if (!escritorioAtivo) return

    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('publicacoes_publicacoes')
        .select('id, data_publicacao, tribunal, vara, tipo_publicacao, numero_processo, processo_id, status, agendamento_id, agendamento_tipo, hash_conteudo, duplicata_revisada, is_snippet, updated_at, created_at, escritorio_id, source')
        .eq('escritorio_id', escritorioAtivo)
        .neq('status', 'duplicada')
        .order('data_publicacao', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar publicações:', error)
        toast.error('Erro ao carregar publicações')
        return
      }

      // Auto-deduplicação: agrupar por hash e manter apenas a mais recente de cada grupo
      const publicacoesUnicas = dedupPublicacoes(data || [])
      setPublicacoes(publicacoesUnicas)

      // Calcular estatísticas
      const hoje = new Date().toISOString().split('T')[0]
      // Ativas = pendentes ou em_analise (não tratadas nem arquivadas)
      const ativas = publicacoesUnicas.filter(p => p.status !== 'arquivada' && p.status !== 'processada')
      const pendentes = ativas.filter(p => p.status === 'pendente').length
      // Tratadas hoje = processadas hoje
      const processadasHoje = publicacoesUnicas.filter(p => p.status === 'processada' && p.updated_at?.startsWith(hoje)).length
      const comProcesso = ativas.filter(p => p.processo_id).length
      const semProcesso = ativas.filter(p => !p.processo_id && p.numero_processo).length
      const tratadas = publicacoesUnicas.filter(p => p.status === 'processada').length
      const arquivadas = publicacoesUnicas.filter(p => p.status === 'arquivada').length

      setStats({
        pendentes,
        processadasHoje,
        prazosCriados: 0,
        comProcesso,
        semProcesso,
        tratadas,
        arquivadas,
        total: ativas.length
      })
    } finally {
      setCarregando(false)
    }
  }, [escritorioAtivo, supabase])

  // Auto-deduplicação inteligente
  const dedupPublicacoes = (pubs: any[]): Publicacao[] => {
    const grupos = new Map<string, any[]>()

    pubs.forEach(pub => {
      // Criar chave de deduplicação: hash OU (numero_processo + data + tipo)
      let chave = pub.hash_conteudo
      if (!chave && pub.numero_processo && pub.data_publicacao) {
        chave = `${pub.numero_processo}-${pub.data_publicacao}-${pub.tipo_publicacao || 'outro'}`
      }

      if (chave) {
        const grupo = grupos.get(chave) || []
        grupo.push(pub)
        grupos.set(chave, grupo)
      } else {
        // Sem chave de deduplicação, adicionar direto
        grupos.set(pub.id, [pub])
      }
    })

    // De cada grupo, manter a mais recente (ou a que já foi processada)
    const resultado: Publicacao[] = []
    grupos.forEach((grupo) => {
      if (grupo.length === 1) {
        resultado.push(grupo[0])
      } else {
        // Priorizar: processada > em_analise > pendente > arquivada
        // Se mesmo status, pegar a mais recente
        const ordenado = grupo.sort((a, b) => {
          const prioridade = { processada: 1, em_analise: 2, pendente: 3, arquivada: 4 }
          const prioA = prioridade[a.status as keyof typeof prioridade] || 5
          const prioB = prioridade[b.status as keyof typeof prioridade] || 5
          if (prioA !== prioB) return prioA - prioB
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        })
        resultado.push(ordenado[0])
      }
    })

    return resultado
  }

  useEffect(() => {
    carregarPublicacoes()
  }, [carregarPublicacoes])

  // Sincronizar todas as fontes (AASP + Escavador)
  const handleSincronizar = async () => {
    toast.info('Iniciando sincronização...')

    let totalNovas = 0
    let erros: string[] = []

    // Sincronizar AASP
    try {
      const resultadoAasp = await sincronizarTodos()
      if (resultadoAasp.sucesso) {
        totalNovas += resultadoAasp.publicacoes_novas || 0
      } else {
        erros.push(`AASP: ${resultadoAasp.mensagem}`)
      }
    } catch (e: any) {
      erros.push(`AASP: ${e.message}`)
    }

    // Sincronizar Escavador (se tiver termos cadastrados)
    if (termosEscavador.length > 0) {
      try {
        const resultadoEscavador = await sincronizarEscavador()
        if (resultadoEscavador.sucesso) {
          totalNovas += resultadoEscavador.publicacoes_novas || 0
        } else {
          erros.push(`Diário Oficial: ${resultadoEscavador.mensagem}`)
        }
      } catch (e: any) {
        erros.push(`Diário Oficial: ${e.message}`)
      }
    }

    // Recarregar publicações após sync
    await carregarPublicacoes()

    // Mostrar resultado
    if (erros.length === 0) {
      toast.success('Sincronização concluída!')
      if (totalNovas > 0) {
        toast.info(`${totalNovas} novas publicações encontradas!`)
      }
    } else {
      toast.warning(`Sincronização parcial: ${erros.join(', ')}`)
    }
  }

  // Aplicar filtro rápido
  const aplicarFiltroRapido = (id: string) => {
    if (filtroRapidoAtivo === id) {
      // Desativar filtro
      setFiltroRapidoAtivo(null)
      setFiltros({ busca: '', status: 'todos', tipo: 'todos', semPasta: false })
    } else {
      setFiltroRapidoAtivo(id)
      const config = FILTROS_RAPIDOS.find(f => f.id === id)
      if (config) {
        setFiltros({
          busca: '',
          status: config.filtro.status || 'todos',
          tipo: config.filtro.tipo || 'todos',
          semPasta: config.filtro.semPasta || false
        })
      }
    }
  }

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroRapidoAtivo(null)
    setFiltros({ busca: '', status: 'todos', tipo: 'todos', semPasta: false })
  }

  // Filtrar publicações
  const publicacoesFiltradas = useMemo(() => {
    return publicacoes.filter(pub => {
      // Filtro por aba
      if (abaAtiva === 'tratadas') {
        if (pub.status !== 'processada') return false
      } else if (abaAtiva === 'arquivadas') {
        if (pub.status !== 'arquivada') return false
      } else {
        // Nas abas ativas, não mostrar tratadas, arquivadas nem duplicadas
        if (['processada', 'arquivada', 'duplicada'].includes(pub.status)) return false

        if (abaAtiva === 'com_processo' && !pub.processo_id) return false
        if (abaAtiva === 'sem_processo' && pub.processo_id) return false
      }

      // Filtros adicionais
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase()
        const matchBusca =
          pub.numero_processo?.toLowerCase().includes(busca) ||
          pub.tribunal?.toLowerCase().includes(busca) ||
          pub.vara?.toLowerCase().includes(busca)
        if (!matchBusca) return false
      }
      // Não aplicar filtro de status nas abas de status fixo
      if (!['tratadas', 'arquivadas'].includes(abaAtiva) && filtros.status !== 'todos' && pub.status !== filtros.status) return false
      if (filtros.tipo !== 'todos' && pub.tipo_publicacao !== filtros.tipo) return false
      if (filtros.semPasta && pub.processo_id) return false
      if (filtros.semPasta && !pub.numero_processo) return false // Precisa ter número mas não ter pasta
      return true
    })
  }, [publicacoes, filtros, abaAtiva])

  // Keyboard shortcuts para triagem rápida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não interferir com inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      // Não interferir se modal/wizard estiver aberto
      if (wizardTarefa.open || wizardEvento.open || wizardAudiencia.open || buscaCNJModal.open) return

      if (e.key === 'Escape' && expandedId) {
        e.preventDefault()
        setExpandedId(null)
        return
      }

      if (expandedId && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const currentIdx = publicacoesFiltradas.findIndex(p => p.id === expandedId)
        if (currentIdx === -1) return

        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, publicacoesFiltradas.length - 1)
          : Math.max(currentIdx - 1, 0)

        if (nextIdx !== currentIdx) {
          setExpandedId(publicacoesFiltradas[nextIdx].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedId, publicacoesFiltradas, wizardTarefa.open, wizardEvento.open, wizardAudiencia.open, buscaCNJModal.open])

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtros.busca || filtros.status !== 'todos' || filtros.tipo !== 'todos' || filtros.semPasta

  // ========================================
  // Seleção em Massa
  // ========================================

  const toggleSelecao = (id: string) => {
    const novoSet = new Set(selecionados)
    if (novoSet.has(id)) {
      novoSet.delete(id)
    } else {
      novoSet.add(id)
    }
    setSelecionados(novoSet)
  }

  const selecionarTodos = () => {
    if (selecionados.size === publicacoesFiltradas.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(publicacoesFiltradas.map(p => p.id)))
    }
  }

  const limparSelecao = () => {
    setSelecionados(new Set())
  }

  // ========================================
  // Ações em Massa
  // ========================================

  const arquivarSelecionados = async () => {
    if (selecionados.size === 0) return

    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'arquivada' })
        .in('id', Array.from(selecionados))

      if (error) throw error

      toast.success(`${selecionados.size} publicação(ões) arquivada(s)`)
      limparSelecao()
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
      toast.error('Erro ao arquivar publicações')
    }
  }

  const marcarComoProcessada = async () => {
    if (selecionados.size === 0) return

    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .in('id', Array.from(selecionados))

      if (error) throw error

      toast.success(`${selecionados.size} publicação(ões) marcada(s) como tratada(s)`)
      limparSelecao()
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar publicações')
    }
  }

  // ========================================
  // Ações Individuais
  // ========================================

  const arquivarPublicacao = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()

    // Capturar próxima publicação pendente ANTES de atualizar
    const pubAtual = publicacoesFiltradas.findIndex(p => p.id === id)
    const proximaPendente = publicacoesFiltradas.find((p, i) =>
      i > pubAtual && p.status !== 'processada' && p.status !== 'arquivada'
    )

    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'arquivada' })
        .eq('id', id)

      if (error) throw error
      toast.success('Publicação arquivada')

      // Auto-advance
      if (expandedId === id && proximaPendente) {
        setExpandedId(proximaPendente.id)
      } else if (expandedId === id) {
        setExpandedId(null)
      }

      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
      toast.error('Erro ao arquivar')
    }
  }

  const marcarProcessada = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()

    // Capturar próxima publicação pendente ANTES de atualizar
    const pubAtual = publicacoesFiltradas.findIndex(p => p.id === id)
    const proximaPendente = publicacoesFiltradas.find((p, i) =>
      i > pubAtual && p.status !== 'processada' && p.status !== 'arquivada'
    )

    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .eq('id', id)

      if (error) throw error
      toast.success('Publicação marcada como tratada')

      // Auto-advance: expandir próxima publicação pendente
      if (expandedId === id && proximaPendente) {
        setExpandedId(proximaPendente.id)
      } else if (expandedId === id) {
        setExpandedId(null)
      }

      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar')
    }
  }

  // Funções para abrir wizards com dados da publicação
  const abrirWizardTarefa = (pub: Publicacao, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setWizardTarefa({ open: true, pub })
  }

  const abrirWizardEvento = (pub: Publicacao, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setWizardEvento({ open: true, pub })
  }

  const abrirWizardAudiencia = (pub: Publicacao, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setWizardAudiencia({ open: true, pub })
  }

  const abrirWizardProcesso = (cnj: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    // Abre o modal de busca por CNJ com o número já preenchido
    setBuscaCNJModal({ open: true, cnj })
  }

  // Handlers para o fluxo de criação de processo
  const handleDadosEncontrados = (dados: ProcessoEscavadorNormalizado) => {
    setBuscaCNJModal({ open: false, cnj: '' })
    setWizardProcessoAuto({ open: true, dados })
  }

  const handleCadastroManual = () => {
    setBuscaCNJModal({ open: false, cnj: '' })
    setWizardProcessoManual(true)
  }

  // Gerar dados iniciais para os wizards baseado na publicação
  // Buscar texto do cache expandido se disponível
  const getTextoCache = (pubId: string) => {
    return expandedCacheRef.current.get(pubId)?.texto?.substring(0, 500) || ''
  }

  const getInitialDataTarefa = (pub: Publicacao) => ({
    titulo: `${getTipoLabel(pub.tipo_publicacao)} - ${pub.numero_processo || 'Publicação'}`,
    descricao: `Publicação: ${pub.tipo_publicacao?.toUpperCase() || 'PUBLICAÇÃO'}\nData: ${new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}\nTribunal: ${pub.tribunal}\n${pub.numero_processo ? `Processo: ${pub.numero_processo}\n` : ''}\n---\n${getTextoCache(pub.id)}`,
    processo_id: pub.processo_id || undefined,
    tipo: 'outro' as const,
    prioridade: 'media' as const,
  })

  const getInitialDataEvento = (pub: Publicacao) => ({
    titulo: `${getTipoLabel(pub.tipo_publicacao)} - ${pub.numero_processo || 'Publicação'}`,
    descricao: `Publicação: ${pub.tipo_publicacao?.toUpperCase() || 'PUBLICAÇÃO'}\nData: ${new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}\nTribunal: ${pub.tribunal}\n${pub.numero_processo ? `Processo: ${pub.numero_processo}\n` : ''}\n---\n${getTextoCache(pub.id)}`,
    processo_id: pub.processo_id || undefined,
  })

  const getInitialDataAudiencia = (pub: Publicacao) => ({
    titulo: `Audiência - ${pub.numero_processo || 'Publicação'}`,
    observacoes: `Publicação: ${pub.tipo_publicacao?.toUpperCase() || 'PUBLICAÇÃO'}\nData: ${new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}\nTribunal: ${pub.tribunal}\n${pub.numero_processo ? `Processo: ${pub.numero_processo}\n` : ''}\n---\n${getTextoCache(pub.id)}`,
    processo_id: pub.processo_id || undefined,
    local: pub.tribunal || '',
    vara: pub.vara || '',
  })

  // Registrar na pasta do processo
  const registrarNaPasta = async (pub: Publicacao, e?: React.MouseEvent) => {
    e?.stopPropagation()

    if (!pub.processo_id) {
      toast.error('Publicação não está vinculada a um processo')
      return
    }

    try {
      // Marcar como processada (tratada) automaticamente ao registrar na pasta
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .eq('id', pub.id)

      if (error) throw error

      toast.success('Publicação registrada na pasta e marcada como tratada')
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao registrar:', err)
      toast.error('Erro ao registrar na pasta')
    }
  }

  const getStatusBadge = (status: StatusPublicacao) => {
    const variants = {
      pendente: 'bg-red-100 text-red-700 border-red-200',
      em_analise: 'bg-amber-100 text-amber-700 border-amber-200',
      processada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      arquivada: 'bg-slate-100 text-slate-600 border-slate-200'
    }

    const labels = {
      pendente: 'Pendente',
      em_analise: 'Em Análise',
      processada: 'Tratada',
      arquivada: 'Arquivada'
    }

    return (
      <Badge variant="outline" className={cn('text-[10px] font-medium border', variants[status])}>
        {labels[status]}
      </Badge>
    )
  }

  const getTipoLabel = (tipo: TipoPublicacao) => {
    const labels: Record<TipoPublicacao, string> = {
      intimacao: 'Intimação',
      sentenca: 'Sentença',
      despacho: 'Despacho',
      decisao: 'Decisão',
      acordao: 'Acórdão',
      citacao: 'Citação',
      outro: 'Outro'
    }
    return labels[tipo] || tipo
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#34495e]">Publicações</h1>
            <p className="text-xs md:text-sm text-slate-600">Gestão de publicações e intimações</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSincronizar}
              disabled={sincronizando}
            >
              {sincronizando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden md:inline">{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
            </Button>
            <Link href="/dashboard/publicacoes/config">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Configurações</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <MetricCard
          title="Pendentes"
          value={stats.pendentes}
          subtitle="Aguardando análise"
          icon={Clock}
          gradient="kpi1"
        />

        <MetricCard
          title="Tratadas Hoje"
          value={stats.processadasHoje}
          subtitle="Nas últimas 24h"
          icon={CheckCircle2}
          gradient="kpi2"
        />

        <MetricCard
          title="Tratadas"
          value={stats.tratadas}
          subtitle="Total processadas"
          icon={CheckSquare}
          gradient="kpi3"
        />

        <MetricCard
          title="Prazos Criados"
          value={stats.prazosCriados}
          subtitle="A partir de publicações"
          icon={Calendar}
          gradient="kpi4"
        />
      </div>

      {/* Filtros Rápidos */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
        <span className="text-xs font-medium text-slate-500 mr-1">Filtros rápidos:</span>
        {FILTROS_RAPIDOS.map(filtro => (
          <Button
            key={filtro.id}
            variant={filtroRapidoAtivo === filtro.id ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-7 text-xs px-3',
              filtroRapidoAtivo === filtro.id && 'bg-[#34495e] hover:bg-[#46627f]'
            )}
            onClick={() => aplicarFiltroRapido(filtro.id)}
          >
            {filtro.label}
            {filtro.id === 'pendentes' && stats.pendentes > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {stats.pendentes}
              </Badge>
            )}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2 text-slate-500"
          onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
        >
          <Filter className="w-3.5 h-3.5 mr-1" />
          Mais filtros
          <ChevronDown className={cn('w-3.5 h-3.5 ml-1 transition-transform', mostrarFiltrosAvancados && 'rotate-180')} />
        </Button>

        {temFiltrosAtivos && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={limparFiltros}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Filtros Avançados (colapsável) */}
      {mostrarFiltrosAvancados && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por processo, tribunal..."
                className="pl-9 h-9"
                value={filtros.busca}
                onChange={(e) => {
                  setFiltroRapidoAtivo(null)
                  setFiltros({ ...filtros, busca: e.target.value })
                }}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-between">
                  <span className="text-sm">
                    {filtros.status === 'todos' ? 'Status' :
                      filtros.status === 'pendente' ? 'Pendente' :
                      filtros.status === 'em_analise' ? 'Em Análise' :
                      filtros.status === 'processada' ? 'Tratada' : 'Arquivada'}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                {[
                  { value: 'todos', label: 'Todos os Status' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'em_analise', label: 'Em Análise' },
                  { value: 'processada', label: 'Tratada' },
                  { value: 'arquivada', label: 'Arquivada' }
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-8 text-sm',
                      filtros.status === opt.value && 'bg-slate-100'
                    )}
                    onClick={() => {
                      setFiltroRapidoAtivo(null)
                      setFiltros({ ...filtros, status: opt.value })
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-between">
                  <span className="text-sm">
                    {filtros.tipo === 'todos' ? 'Tipo' : getTipoLabel(filtros.tipo as TipoPublicacao)}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                {[
                  { value: 'todos', label: 'Todos os Tipos' },
                  { value: 'intimacao', label: 'Intimação' },
                  { value: 'sentenca', label: 'Sentença' },
                  { value: 'despacho', label: 'Despacho' },
                  { value: 'decisao', label: 'Decisão' },
                  { value: 'acordao', label: 'Acórdão' },
                  { value: 'citacao', label: 'Citação' },
                  { value: 'outro', label: 'Outro' }
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-8 text-sm',
                      filtros.tipo === opt.value && 'bg-slate-100'
                    )}
                    onClick={() => {
                      setFiltroRapidoAtivo(null)
                      setFiltros({ ...filtros, tipo: opt.value })
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sem-pasta"
                checked={filtros.semPasta}
                onCheckedChange={(checked) => {
                  setFiltroRapidoAtivo(null)
                  setFiltros({ ...filtros, semPasta: !!checked })
                }}
              />
              <label htmlFor="sem-pasta" className="text-sm text-slate-600 cursor-pointer">
                Sem pasta vinculada
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Barra de ações em massa (quando há seleção) */}
      {selecionados.size > 0 && (
        <div className="bg-[#34495e] text-white rounded-lg p-3 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selecionados.size} selecionada{selecionados.size > 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white/80 hover:text-white hover:bg-white/10"
              onClick={limparSelecao}
            >
              Limpar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5"
              onClick={marcarComoProcessada}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Marcar como</span> Tratada
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5"
              onClick={arquivarSelecionados}
            >
              <Archive className="w-3.5 h-3.5" />
              Arquivar
            </Button>
          </div>
        </div>
      )}

      {/* Publicações */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        {/* Abas dentro do card */}
        <div className="p-3 md:p-4 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as AbaPublicacoes)}>
            <TabsList className="bg-slate-100 p-1 h-9 w-max md:w-auto">
              <TabsTrigger
                value="todas"
                className="data-[state=active]:bg-white data-[state=active]:text-[#34495e] data-[state=active]:shadow-sm px-2.5 md:px-3 text-xs md:text-sm h-7"
              >
                Todas
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px] bg-slate-200/80 text-slate-600">
                  {stats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="com_processo"
                className="data-[state=active]:bg-white data-[state=active]:text-[#34495e] data-[state=active]:shadow-sm px-2.5 md:px-3 text-xs md:text-sm h-7"
              >
                <span className="hidden md:inline">Com Pasta</span>
                <span className="md:hidden">Pasta</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px] bg-[#89bcbe]/30 text-[#34495e]">
                  {stats.comProcesso}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="sem_processo"
                className="data-[state=active]:bg-white data-[state=active]:text-[#34495e] data-[state=active]:shadow-sm px-2.5 md:px-3 text-xs md:text-sm h-7"
              >
                <span className="hidden md:inline">Sem Pasta</span>
                <span className="md:hidden">S/ Pasta</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px] bg-[#34495e]/10 text-[#46627f]">
                  {stats.semProcesso}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="tratadas"
                className="data-[state=active]:bg-white data-[state=active]:text-[#34495e] data-[state=active]:shadow-sm px-2.5 md:px-3 text-xs md:text-sm h-7"
              >
                <span className="hidden md:inline">Tratadas</span>
                <span className="md:hidden">Trat.</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px] bg-emerald-100/80 text-emerald-600">
                  {stats.tratadas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="arquivadas"
                className="data-[state=active]:bg-white data-[state=active]:text-[#34495e] data-[state=active]:shadow-sm px-2.5 md:px-3 text-xs md:text-sm h-7"
              >
                <span className="hidden md:inline">Arquivadas</span>
                <span className="md:hidden">Arq.</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px] bg-slate-200/80 text-slate-500">
                  {stats.arquivadas}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-600">
            {publicacoesFiltradas.length} {publicacoesFiltradas.length === 1 ? 'publicação' : 'publicações'}
            {temFiltrosAtivos && (
              <span className="text-slate-400 font-normal ml-1">
                (filtradas)
              </span>
            )}
          </h2>

          {publicacoesFiltradas.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-slate-500"
              onClick={selecionarTodos}
            >
              <ListChecks className="w-3.5 h-3.5" />
              {selecionados.size === publicacoesFiltradas.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          )}
        </div>

        {carregando ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-500">Carregando publicações...</p>
          </div>
        ) : publicacoesFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileX className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Nenhuma publicação encontrada</h3>
            <p className="text-xs text-slate-500 mb-4">
              {publicacoes.length === 0
                ? 'Não há publicações recebidas ainda. Configure as fontes de publicações.'
                : 'Nenhuma publicação corresponde aos filtros selecionados.'}
            </p>
            <div className="flex items-center gap-2 justify-center">
              {publicacoes.length === 0 ? (
                <Link href="/dashboard/publicacoes/config">
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]">
                    <Settings className="w-4 h-4" />
                    Configurar Fontes
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
          {/* Mobile: Card list com expansão inline */}
          <div className="md:hidden divide-y divide-slate-100">
            {publicacoesFiltradas.map((pub) => (
              <div key={pub.id}>
                <div
                  onClick={() => toggleExpand(pub.id)}
                  className={cn(
                    'p-3.5 active:bg-slate-50 transition-colors cursor-pointer',
                    expandedId === pub.id && 'bg-blue-50/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ChevronRight className={cn(
                        'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                        expandedId === pub.id && 'rotate-90'
                      )} />
                      {getStatusBadge(pub.status)}
                      {pub.is_snippet && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          Trecho
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate">{pub.tribunal}</p>
                  {pub.vara && <p className="text-[11px] text-slate-500">{pub.vara}</p>}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">{getTipoLabel(pub.tipo_publicacao)}</span>
                    {pub.numero_processo ? (
                      <span className={cn(
                        'text-[11px] font-mono truncate max-w-[160px]',
                        pub.processo_id ? 'text-blue-600' : 'text-slate-600'
                      )}>
                        {pub.numero_processo}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Sem processo</span>
                    )}
                  </div>
                </div>

                {/* Expansão mobile - single column */}
                {expandedId === pub.id && (
                  <div className="border-l-[3px] border-[#1E3A8A] bg-blue-50/30 px-3 pb-3">
                    <div className="space-y-3">
                      {/* Botões de ação mobile */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {pub.status !== 'processada' && pub.status !== 'arquivada' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-600"
                            onClick={(e) => marcarProcessada(pub.id, e)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tratada
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={(e) => abrirWizardTarefa(pub, e)}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Tarefa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={(e) => abrirWizardEvento(pub, e)}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Evento
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={(e) => abrirWizardAudiencia(pub, e)}
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          Audiência
                        </Button>
                        {pub.status !== 'arquivada' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-slate-400"
                            onClick={(e) => arquivarPublicacao(pub.id, e)}
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Arquivar
                          </Button>
                        )}
                      </div>

                      {/* Componente expandido reutilizado via table wrapper trick */}
                      <table className="w-full"><tbody>
                        <PublicacaoExpandedRow
                          publicacao={pub}
                          isExpanded={true}
                          onCriarTarefa={() => abrirWizardTarefa(pub)}
                          onCriarEvento={() => abrirWizardEvento(pub)}
                          onCriarAudiencia={() => abrirWizardAudiencia(pub)}
                          onCriarProcesso={(cnj) => abrirWizardProcesso(cnj)}
                          cachedData={expandedCacheRef.current.get(pub.id)}
                          onDataLoaded={handleExpandedDataLoaded}
                        />
                      </tbody></table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={selecionados.size === publicacoesFiltradas.length && publicacoesFiltradas.length > 0}
                      onCheckedChange={selecionarTodos}
                    />
                  </th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Data</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Tribunal</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Processo</th>
                  <th className="text-right text-xs font-medium text-slate-600 p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {publicacoesFiltradas.map((pub) => (
                  <React.Fragment key={pub.id}>
                    <tr
                      className={cn(
                        'hover:bg-slate-50 transition-colors cursor-pointer group',
                        selecionados.has(pub.id) && 'bg-blue-50 hover:bg-blue-100',
                        expandedId === pub.id && 'bg-blue-50/40 border-b-0'
                      )}
                      onClick={() => toggleExpand(pub.id)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionados.has(pub.id)}
                          onCheckedChange={() => toggleSelecao(pub.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ChevronRight className={cn(
                            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                            expandedId === pub.id && 'rotate-90 text-[#1E3A8A]'
                          )} />
                          {getStatusBadge(pub.status)}
                          {pub.agendamento_tipo && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              {pub.agendamento_tipo === 'tarefa' && <CheckSquare className="w-3 h-3 mr-1" />}
                              {pub.agendamento_tipo === 'compromisso' && <Calendar className="w-3 h-3 mr-1" />}
                              {pub.agendamento_tipo === 'audiencia' && <Gavel className="w-3 h-3 mr-1" />}
                              Agendado
                            </Badge>
                          )}
                          {pub.is_snippet && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Trecho
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-700">
                          {new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="text-sm font-medium text-slate-700 truncate max-w-[200px]" title={pub.tribunal}>{pub.tribunal}</div>
                          {pub.vara && <div className="text-xs text-slate-500">{pub.vara}</div>}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-700">{getTipoLabel(pub.tipo_publicacao)}</span>
                      </td>
                      <td className="p-3">
                        {pub.numero_processo ? (
                          pub.processo_id ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-sm font-mono font-medium text-[#3B82F6] hover:text-[#2563EB] cursor-pointer hover:underline underline-offset-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/processos/${pub.processo_id}`)
                              }}
                            >
                              {pub.numero_processo}
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-slate-700">{pub.numero_processo}</span>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                Sem pasta
                              </Badge>
                            </div>
                          )
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <TooltipProvider delayDuration={200}>
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Botão Check Verde - Marcar como Tratada */}
                            {pub.status !== 'processada' && pub.status !== 'arquivada' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                                    onClick={(e) => marcarProcessada(pub.id, e)}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar como tratada</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Botão IA - Expandir para análise */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    'h-8 w-8 p-0',
                                    expandedId === pub.id
                                      ? 'bg-[#34495e]/10 text-[#34495e]'
                                      : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                                  )}
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(pub.id) }}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{expandedId === pub.id ? 'Fechar análise' : 'Expandir e analisar'}</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Botão Calendário Azul - Dropdown para Agendamentos */}
                            <DropdownMenu>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                                    >
                                      <CalendarPlus className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Agendar</p>
                                </TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={(e) => abrirWizardTarefa(pub, e as any)}
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  Criar Tarefa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={(e) => abrirWizardEvento(pub, e as any)}
                                >
                                  <Calendar className="w-4 h-4" />
                                  Criar Compromisso
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={(e) => abrirWizardAudiencia(pub, e as any)}
                                >
                                  <Gavel className="w-4 h-4" />
                                  Criar Audiência
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Botão Criar Pasta - Só aparece se tem número mas não tem pasta */}
                            {pub.numero_processo && !pub.processo_id && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                    onClick={(e) => abrirWizardProcesso(pub.numero_processo!, e)}
                                  >
                                    <FolderPlus className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Criar pasta do processo</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Botão Arquivar - Não aparece se já está arquivada */}
                            {pub.status !== 'arquivada' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                    onClick={(e) => arquivarPublicacao(pub.id, e)}
                                  >
                                    <Archive className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Arquivar</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>

                    {/* Row expandida com texto + painel IA */}
                    <PublicacaoExpandedRow
                      publicacao={pub}
                      isExpanded={expandedId === pub.id}
                      onCriarTarefa={() => abrirWizardTarefa(pub)}
                      onCriarEvento={() => abrirWizardEvento(pub)}
                      onCriarAudiencia={() => abrirWizardAudiencia(pub)}
                      onCriarProcesso={(cnj) => abrirWizardProcesso(cnj)}
                      cachedData={expandedCacheRef.current.get(pub.id)}
                      onDataLoaded={handleExpandedDataLoaded}
                    />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Wizard de Tarefa */}
      {wizardTarefa.open && wizardTarefa.pub && escritorioAtivo && (
        <TarefaWizard
          escritorioId={escritorioAtivo}
          onClose={() => setWizardTarefa({ open: false, pub: null })}
          initialData={getInitialDataTarefa(wizardTarefa.pub)}
          onCreated={async () => {
            // Marcar publicação como tratada após criar tarefa
            if (wizardTarefa.pub) {
              await supabase
                .from('publicacoes_publicacoes')
                .update({ status: 'processada', agendamento_tipo: 'tarefa' })
                .eq('id', wizardTarefa.pub.id)
            }
            toast.success('Tarefa criada e publicação marcada como tratada')
            setWizardTarefa({ open: false, pub: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Wizard de Evento/Compromisso */}
      {wizardEvento.open && wizardEvento.pub && escritorioAtivo && (
        <EventoWizard
          escritorioId={escritorioAtivo}
          onClose={() => setWizardEvento({ open: false, pub: null })}
          initialData={getInitialDataEvento(wizardEvento.pub)}
          onSubmit={async (data) => {
            // Criar o evento
            await createEvento({
              ...data,
              escritorio_id: escritorioAtivo,
            })
            // Marcar publicação como tratada após criar evento
            if (wizardEvento.pub) {
              await supabase
                .from('publicacoes_publicacoes')
                .update({ status: 'processada', agendamento_tipo: 'compromisso' })
                .eq('id', wizardEvento.pub.id)
            }
            toast.success('Compromisso criado e publicação marcada como tratada')
            setWizardEvento({ open: false, pub: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Wizard de Audiência */}
      {wizardAudiencia.open && wizardAudiencia.pub && escritorioAtivo && (
        <AudienciaWizard
          escritorioId={escritorioAtivo}
          onClose={() => setWizardAudiencia({ open: false, pub: null })}
          initialData={getInitialDataAudiencia(wizardAudiencia.pub)}
          onSubmit={async () => {
            // O wizard já cria a audiência internamente via useAudiencias
            // Aqui apenas marcamos a publicação como tratada
            if (wizardAudiencia.pub) {
              await supabase
                .from('publicacoes_publicacoes')
                .update({ status: 'processada', agendamento_tipo: 'audiencia' })
                .eq('id', wizardAudiencia.pub.id)
            }
            toast.success('Audiência criada e publicação marcada como tratada')
            setWizardAudiencia({ open: false, pub: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Modal de Busca por CNJ (Criar Pasta) */}
      <BuscaCNJModal
        open={buscaCNJModal.open}
        onClose={() => setBuscaCNJModal({ open: false, cnj: '' })}
        onDadosEncontrados={handleDadosEncontrados}
        onCadastroManual={handleCadastroManual}
        initialCNJ={buscaCNJModal.cnj}
      />

      {/* Wizard Automático (com dados do Escavador) */}
      {wizardProcessoAuto.open && wizardProcessoAuto.dados && (
        <ProcessoWizardAutomatico
          open={wizardProcessoAuto.open}
          onClose={() => setWizardProcessoAuto({ open: false, dados: null })}
          dadosEscavador={wizardProcessoAuto.dados}
          onProcessoCriado={async (processoId: string) => {
            // Vincular publicações ao processo criado (pelo número CNJ)
            const cnj = wizardProcessoAuto.dados?.numero_cnj
            if (cnj && processoId && escritorioAtivo) {
              try {
                // Tentar vincular pelo número CNJ exato ou apenas dígitos
                const cnjSomenteDigitos = cnj.replace(/\D/g, '')

                const { data: updated, error } = await supabase
                  .from('publicacoes_publicacoes')
                  .update({ processo_id: processoId })
                  .eq('escritorio_id', escritorioAtivo)
                  .or(`numero_processo.eq.${cnj},numero_processo.eq.${cnjSomenteDigitos}`)
                  .select('id')

                if (error) {
                  console.error('Erro ao vincular publicações:', error.message, error.details, error.hint)
                } else if (updated && updated.length > 0) {
                  toast.success(`Pasta criada e ${updated.length} publicação(ões) vinculada(s)!`)
                } else {
                  toast.success('Pasta criada com sucesso!')
                }
              } catch (err) {
                console.error('Erro ao vincular publicações:', err)
              }
            }
            setWizardProcessoAuto({ open: false, dados: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Wizard Manual (fallback) */}
      {wizardProcessoManual && (
        <ProcessoWizard
          open={wizardProcessoManual}
          onClose={() => setWizardProcessoManual(false)}
          onSuccess={async (processoId) => {
            toast.success('Pasta criada com sucesso!')
            setWizardProcessoManual(false)
            carregarPublicacoes()
          }}
        />
      )}
    </div>
  )
}
