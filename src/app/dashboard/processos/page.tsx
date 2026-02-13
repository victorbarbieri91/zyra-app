'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  FileText,
  Clock,
  AlertCircle,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ListTodo,
  Calendar,
  Gavel,
  Loader2,
  RefreshCw,
  ExternalLink,
  Trash2,
  Eye,
  Copy,
  Check,
  X
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { NovoProcessoDropdown } from '@/components/processos/NovoProcessoDropdown'
import AtualizarCapaModal from '@/components/processos/AtualizarCapaModal'
import { BulkActionsToolbar, BulkAction } from '@/components/processos/BulkActionsToolbar'
import { BulkEditModal } from '@/components/processos/BulkEditModal'
import { MonitoramentoModal } from '@/components/processos/MonitoramentoModal'
import { AndamentosModal } from '@/components/processos/AndamentosModal'
import { VincularContratoModal } from '@/components/financeiro/VincularContratoModal'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import { useTarefas } from '@/hooks/useTarefas'
import { useEventos } from '@/hooks/useEventos'
import { useAudiencias } from '@/hooks/useAudiencias'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  cliente_nome: string
  parte_contraria: string
  area: string
  fase: string
  instancia: string
  responsavel_nome: string
  status: string
  ultima_movimentacao?: string
  movimentacoes_nao_lidas: number
  tem_prazo_critico: boolean
  tem_documento_pendente: boolean
  escavador_monitoramento_id?: number | null
}

type EditField = 'area' | 'responsavel' | 'status' | 'prioridade' | 'tags'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

export default function ProcessosPage() {
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const initialView = viewParam === 'sem_contrato'
    ? 'sem_contrato' as const
    : viewParam === 'todos'
      ? 'todos' as const
      : 'ativos' as const

  const [processos, setProcessos] = useState<Processo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('processos_search') || ''
    }
    return ''
  })
  const [debouncedSearch, setDebouncedSearch] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('processos_search') || ''
    }
    return ''
  })
  const [currentView, setCurrentView] = useState<'todos' | 'ativos' | 'criticos' | 'meus' | 'encerrados' | 'sem_contrato'>(initialView)
  const [showFilters, setShowFilters] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Estados para wizards de agenda
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [showAudienciaWizard, setShowAudienciaWizard] = useState(false)
  const [selectedProcessoId, setSelectedProcessoId] = useState<string | null>(null)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Estado para modal de atualizar capa
  const [showAtualizarCapa, setShowAtualizarCapa] = useState(false)
  const [processoParaAtualizar, setProcessoParaAtualizar] = useState<{
    id: string
    numero_cnj: string
    numero_pasta: string
  } | null>(null)

  // Estados para selecao em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditField, setBulkEditField] = useState<EditField | null>(null)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [showMonitoramentoModal, setShowMonitoramentoModal] = useState(false)
  const [monitoramentoAction, setMonitoramentoAction] = useState<'ativar' | 'desativar'>('ativar')
  const [showAndamentosModal, setShowAndamentosModal] = useState(false)
  const [showVincularContratoModal, setShowVincularContratoModal] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  // Estado para feedback de cópia do CNJ
  const [copiedCnj, setCopiedCnj] = useState<string | null>(null)

  const handleCopyCnj = useCallback((cnj: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(cnj)
    setCopiedCnj(cnj)
    setTimeout(() => setCopiedCnj(null), 1500)
  }, [])

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // TODO: Se precisar abrir wizard automaticamente via ?novo=true,
  // implementar com ref no NovoProcessoDropdown

  // Hooks de agenda
  const { createTarefa } = useTarefas(escritorioId || '')
  const { createEvento } = useEventos(escritorioId || '')
  const { createAudiencia } = useAudiencias(escritorioId || '')

  // Carregar escritórioId e userId do usuário logado
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadUserData()
  }, [])

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to first page on new search
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // Persist search to sessionStorage
  useEffect(() => {
    if (debouncedSearch.trim()) {
      sessionStorage.setItem('processos_search', debouncedSearch.trim())
    } else {
      sessionStorage.removeItem('processos_search')
    }
  }, [debouncedSearch])

  // Load processos when filters change
  useEffect(() => {
    loadProcessos()
  }, [currentView, debouncedSearch, currentPage, pageSize])

  const loadProcessos = async () => {
    try {
      setLoading(true)

      // Usar view que já inclui última movimentação, contagem de não lidas, cliente e responsável
      let query = supabase
        .from('v_processos_com_movimentacoes')
        .select(`
          id,
          numero_pasta,
          numero_cnj,
          parte_contraria,
          area,
          fase,
          instancia,
          status,
          updated_at,
          responsavel_id,
          cliente_id,
          escavador_monitoramento_id,
          cliente_nome,
          responsavel_nome,
          ultima_movimentacao,
          movimentacoes_nao_lidas
        `, { count: 'exact' })

      // Apply search filter - busca por CNJ, pasta, parte contrária, cliente e responsável
      if (debouncedSearch.trim()) {
        const searchTerm = `%${debouncedSearch.trim()}%`
        query = query.or(`numero_cnj.ilike.${searchTerm},numero_pasta.ilike.${searchTerm},parte_contraria.ilike.${searchTerm},cliente_nome.ilike.${searchTerm},responsavel_nome.ilike.${searchTerm}`)
      }

      // Apply view filter
      if (currentView === 'ativos') {
        query = query.eq('status', 'ativo')
      } else if (currentView === 'encerrados') {
        query = query.in('status', ['arquivado', 'baixado', 'transito_julgado', 'acordo'])
      } else if (currentView === 'meus' && userId) {
        query = query.eq('responsavel_id', userId)
      } else if (currentView === 'sem_contrato') {
        query = query.is('contrato_id', null).eq('status', 'ativo')
      }

      // Get total count first (for pagination)
      const { count } = await query

      // Apply pagination and ordering (última movimentação mais recente primeiro)
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error } = await query
        .order('ultima_movimentacao', { ascending: false, nullsFirst: false })
        .range(from, to)

      if (error) {
        console.error('Erro ao carregar processos:', error)
        setLoading(false)
        return
      }

      setTotalCount(count || 0)

      // Transformar dados do banco para o formato da interface
      // cliente_nome e responsavel_nome já vêm diretamente da view
      const processosFormatados: Processo[] = (data || []).map((p: any) => ({
        id: p.id,
        numero_pasta: p.numero_pasta,
        numero_cnj: p.numero_cnj,
        cliente_nome: p.cliente_nome || 'N/A',
        parte_contraria: p.parte_contraria || 'Não informado',
        area: formatArea(p.area),
        fase: formatFase(p.fase),
        instancia: formatInstancia(p.instancia),
        responsavel_nome: p.responsavel_nome || 'N/A',
        status: p.status,
        ultima_movimentacao: p.ultima_movimentacao,
        movimentacoes_nao_lidas: p.movimentacoes_nao_lidas || 0,
        tem_prazo_critico: false, // TODO: Implementar lógica de prazos críticos
        tem_documento_pendente: false,
        escavador_monitoramento_id: p.escavador_monitoramento_id
      }))

      setProcessos(processosFormatados)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar processos:', error)
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
      ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      suspenso: 'bg-amber-100 text-amber-700 border-amber-200',
      arquivado: 'bg-slate-100 text-slate-700 border-slate-200',
      baixado: 'bg-blue-100 text-blue-700 border-blue-200',
      transito_julgado: 'bg-purple-100 text-purple-700 border-purple-200',
      acordo: 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return styles[status as keyof typeof styles] || styles.ativo
  }

  const getAreaBadge = (area: string) => {
    const styles = {
      'Trabalhista': 'bg-amber-100 text-amber-700 border-amber-200',
      'Cível': 'bg-blue-100 text-blue-700 border-blue-200',
      'Tributária': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Família': 'bg-pink-100 text-pink-700 border-pink-200',
      'Criminal': 'bg-red-100 text-red-700 border-red-200',
      'Consumidor': 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return styles[area as keyof typeof styles] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Sem movimentações'
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `há ${diffInHours}h`
    } else if (diffInHours < 48) {
      return 'ontem'
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR })
    }
  }

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Handler for page size change
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize))
    setCurrentPage(1) // Reset to first page
  }

  // Handler for page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // ============= Handlers de Selecao =============
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === processos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(processos.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkAction = (action: BulkAction) => {
    if (action === 'ativar_monitoramento') {
      setMonitoramentoAction('ativar')
      setShowMonitoramentoModal(true)
    } else if (action === 'desativar_monitoramento') {
      setMonitoramentoAction('desativar')
      setShowMonitoramentoModal(true)
    } else if (action === 'atualizar_andamentos') {
      setShowAndamentosModal(true)
    } else if (action === 'alterar_area') {
      setBulkEditField('area')
      setShowBulkEditModal(true)
    } else if (action === 'alterar_responsavel') {
      setBulkEditField('responsavel')
      setShowBulkEditModal(true)
    } else if (action === 'alterar_status') {
      setBulkEditField('status')
      setShowBulkEditModal(true)
    } else if (action === 'alterar_prioridade') {
      setBulkEditField('prioridade')
      setShowBulkEditModal(true)
    } else if (action === 'adicionar_tags') {
      setBulkEditField('tags')
      setShowBulkEditModal(true)
    } else if (action === 'vincular_contrato') {
      setShowVincularContratoModal(true)
    }
  }

  const selectedProcessos = processos.filter(p => selectedIds.has(p.id))

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#34495e]">Processos</h1>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 font-normal">
              {loading ? 'Carregando...' : `${totalCount} ${totalCount === 1 ? 'processo' : 'processos'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/processos/relatorios')}
              className="hidden md:flex h-10"
            >
              <FileText className="w-4 h-4 mr-2" />
              Relatorios
            </Button>
            <NovoProcessoDropdown onProcessoCriado={loadProcessos} />
          </div>
        </div>

        {/* Busca e Filtros */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                {loading && searchQuery ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
                <Input
                  placeholder="Buscar por cliente, CNJ, pasta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                {/* Dropdown Visualização */}
                <select
                  value={currentView}
                  onChange={(e) => {
                    setCurrentView(e.target.value as typeof currentView)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#89bcbe] flex-1 md:min-w-[160px]"
                >
                  <option value="ativos">Ativos</option>
                  <option value="todos">Todos</option>
                  <option value="criticos">Críticos</option>
                  <option value="meus">Meus Processos</option>
                  <option value="sem_contrato">Sem Contrato</option>
                  <option value="encerrados">Encerrados</option>
                </select>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="whitespace-nowrap"
                >
                  <Filter className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Mais Filtros</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active search badge */}
        {debouncedSearch.trim() && (
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#aacfd0]/20 text-[#34495e] border border-[#89bcbe]/30"
            >
              <Search className="w-3 h-3" />
              Busca: &quot;{debouncedSearch.trim()}&quot;
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 rounded-full p-0.5 hover:bg-[#89bcbe]/20 transition-colors"
                aria-label="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* Mobile: Card list view */}
        <div className="md:hidden space-y-2">
          {loading && processos.length === 0 && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
              <span className="text-sm text-slate-600">Carregando...</span>
            </div>
          )}
          {!loading && processos.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-2">
              <FileText className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-600">Nenhum processo encontrado</p>
            </div>
          )}
          {processos.map((processo) => (
            <Link
              key={processo.id}
              href={`/dashboard/processos/${processo.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-3.5 active:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#34495e]">{processo.numero_pasta}</span>
                  {processo.escavador_monitoramento_id && (
                    <Eye className="w-3 h-3 text-emerald-500" />
                  )}
                </div>
                <Badge className={`text-[10px] border ${getStatusBadge(processo.status)}`}>
                  {processo.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-slate-500">{processo.numero_cnj}</p>
                {processo.numero_cnj && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleCopyCnj(processo.numero_cnj, e) }}
                    className="p-0.5 rounded hover:bg-slate-100"
                    title="Copiar nº CNJ"
                  >
                    {copiedCnj === processo.numero_cnj ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700 truncate">{processo.cliente_nome || '-'}</p>
              {processo.parte_contraria && (
                <p className="text-[11px] text-slate-400 truncate">vs {processo.parte_contraria}</p>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] border ${getAreaBadge(processo.area)}`}>
                    {processo.area}
                  </Badge>
                  {processo.tem_prazo_critico && (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {formatTimestamp(processo.ultima_movimentacao)}
                </span>
              </div>
            </Link>
          ))}

          {/* Mobile Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {startItem}-{endItem} de {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-slate-700 px-2">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0 || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Tabela de Processos */}
        <Card className="hidden md:block border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center p-3 w-10">
                    <Checkbox
                      checked={processos.length > 0 && selectedIds.size === processos.length}
                      onCheckedChange={toggleSelectAll}
                      className="border-slate-300 data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                    />
                  </th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-20">Pasta</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-52">CNJ</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-56">Cliente</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-44">Parte Contraria</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-24">Area</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-32">Responsavel</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-16">Status</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-20">Ult. Mov.</th>
                  <th className="text-center p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-12">Acoes</th>
                </tr>
              </thead>
              <tbody className={loading ? 'opacity-50' : ''}>
                {/* Loading state */}
                {loading && processos.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
                        <span className="text-sm text-slate-600">Carregando processos...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!loading && processos.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-slate-300" />
                        <p className="text-sm text-slate-600">
                          {debouncedSearch ? 'Nenhum processo encontrado para esta busca' : 'Nenhum processo cadastrado'}
                        </p>
                        {debouncedSearch && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setSearchQuery('')}
                            className="text-[#34495e]"
                          >
                            Limpar busca
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {processos.map((processo) => {
                  const processoHref = `/dashboard/processos/${processo.id}`
                  return (
                  <tr
                    key={processo.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      selectedIds.has(processo.id) ? 'bg-blue-50 hover:bg-blue-100' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={selectedIds.has(processo.id)}
                        onCheckedChange={() => toggleSelection(processo.id)}
                        className="border-slate-300 data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                      />
                    </td>
                    <td className="p-0 whitespace-nowrap">
                      <Link href={processoHref} className="flex items-center gap-1.5 p-3">
                        {processo.escavador_monitoramento_id && (
                          <span title="Monitorado via Escavador">
                            <Eye className="w-3 h-3 text-emerald-500" />
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#34495e]">
                          {processo.numero_pasta}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0 whitespace-nowrap relative">
                      <Link href={processoHref} className="flex items-center p-3 text-xs text-slate-600">
                        {processo.numero_cnj}
                      </Link>
                      {processo.numero_cnj && (
                        <button
                          onClick={(e) => handleCopyCnj(processo.numero_cnj, e)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100 transition-colors z-10"
                          title="Copiar nº CNJ"
                        >
                          {copiedCnj === processo.numero_cnj ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="p-0">
                      <Link href={processoHref} className="block p-3 text-xs text-slate-700 truncate" title={processo.cliente_nome || ''}>
                        {processo.cliente_nome || '-'}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={processoHref} className="block p-3 text-xs text-slate-600 truncate" title={processo.parte_contraria || ''}>
                        {processo.parte_contraria || '-'}
                      </Link>
                    </td>
                    <td className="p-0 whitespace-nowrap">
                      <Link href={processoHref} className="block p-3">
                        <Badge className={`text-[10px] border ${getAreaBadge(processo.area)}`}>
                          {processo.area}
                        </Badge>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={processoHref} className="block p-3 text-xs text-slate-600 truncate" title={processo.responsavel_nome || ''}>
                        {processo.responsavel_nome || '-'}
                      </Link>
                    </td>
                    <td className="p-0 whitespace-nowrap">
                      <Link href={processoHref} className="block p-3">
                        <Badge className={`text-[10px] border ${getStatusBadge(processo.status)}`}>
                          {processo.status}
                        </Badge>
                      </Link>
                    </td>
                    <td className="p-0 whitespace-nowrap">
                      <Link href={processoHref} className="block p-3 text-xs text-slate-500">
                        {formatTimestamp(processo.ultima_movimentacao)}
                      </Link>
                    </td>
                    <td className="p-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProcessoId(processo.id)
                              setShowTarefaWizard(true)
                            }}
                          >
                            <ListTodo className="w-4 h-4 mr-2 text-[#34495e]" />
                            <span className="text-sm">Nova Tarefa</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProcessoId(processo.id)
                              setShowEventoWizard(true)
                            }}
                          >
                            <Calendar className="w-4 h-4 mr-2 text-[#89bcbe]" />
                            <span className="text-sm">Novo Compromisso</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProcessoId(processo.id)
                              setShowAudienciaWizard(true)
                            }}
                          >
                            <Gavel className="w-4 h-4 mr-2 text-emerald-600" />
                            <span className="text-sm">Nova Audiência</span>
                          </DropdownMenuItem>
                          {processo.numero_cnj && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setProcessoParaAtualizar({
                                    id: processo.id,
                                    numero_cnj: processo.numero_cnj,
                                    numero_pasta: processo.numero_pasta
                                  })
                                  setShowAtualizarCapa(true)
                                }}
                              >
                                <RefreshCw className="w-4 h-4 mr-2 text-[#89bcbe]" />
                                <span className="text-sm">Atualizar Capa</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedIds(new Set([processo.id]))
                                  setShowAndamentosModal(true)
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                <span className="text-sm">Atualizar Andamentos</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/dashboard/processos/${processo.id}`, '_blank')
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-2 text-slate-500" />
                            <span className="text-sm">Abrir em nova aba</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-600">
                {loading ? (
                  'Carregando...'
                ) : totalCount > 0 ? (
                  <>Mostrando <span className="font-semibold">{startItem}</span> a <span className="font-semibold">{endItem}</span> de <span className="font-semibold">{totalCount}</span> processos</>
                ) : (
                  'Nenhum processo encontrado'
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Por página:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page numbers */}
              {totalPages > 0 && (
                <>
                  {/* First page */}
                  {currentPage > 2 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        className="min-w-[32px]"
                      >
                        1
                      </Button>
                      {currentPage > 3 && <span className="text-slate-400 px-1">...</span>}
                    </>
                  )}

                  {/* Previous page */}
                  {currentPage > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      className="min-w-[32px]"
                    >
                      {currentPage - 1}
                    </Button>
                  )}

                  {/* Current page */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-[#34495e] text-white min-w-[32px]"
                    disabled
                  >
                    {currentPage}
                  </Button>

                  {/* Next page */}
                  {currentPage < totalPages && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      className="min-w-[32px]"
                    >
                      {currentPage + 1}
                    </Button>
                  )}

                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="text-slate-400 px-1">...</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        className="min-w-[32px]"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0 || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

      {/* Wizards de Agenda vinculados ao processo */}
      {showTarefaWizard && escritorioId && selectedProcessoId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowTarefaWizard(false)
            setSelectedProcessoId(null)
          }}
          onCreated={loadProcessos}
          initialData={{
            processo_id: selectedProcessoId
          }}
        />
      )}

      {showEventoWizard && escritorioId && selectedProcessoId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowEventoWizard(false)
            setSelectedProcessoId(null)
          }}
          onSubmit={async (data) => {
            await createEvento(data)
            loadProcessos()
          }}
          initialData={{
            processo_id: selectedProcessoId
          }}
        />
      )}

      {showAudienciaWizard && escritorioId && selectedProcessoId && (
        <AudienciaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowAudienciaWizard(false)
            setSelectedProcessoId(null)
          }}
          onSubmit={async (data) => {
            await createAudiencia(data)
            loadProcessos()
          }}
          initialData={{
            processo_id: selectedProcessoId
          }}
        />
      )}

      {/* Modal de Atualizar Capa via Escavador */}
      {showAtualizarCapa && processoParaAtualizar && (
        <AtualizarCapaModal
          open={showAtualizarCapa}
          onClose={() => {
            setShowAtualizarCapa(false)
            setProcessoParaAtualizar(null)
          }}
          processoId={processoParaAtualizar.id}
          numeroCnj={processoParaAtualizar.numero_cnj}
          numeroPasta={processoParaAtualizar.numero_pasta}
          onAtualizado={loadProcessos}
        />
      )}

      {/* Toolbar de Acoes em Massa */}
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onAction={handleBulkAction}
        loading={bulkLoading}
      />

      {/* Modal de Edicao em Massa */}
      {showBulkEditModal && bulkEditField && (
        <BulkEditModal
          open={showBulkEditModal}
          onClose={() => {
            setShowBulkEditModal(false)
            setBulkEditField(null)
          }}
          field={bulkEditField}
          selectedIds={Array.from(selectedIds)}
          onSuccess={() => {
            loadProcessos()
            clearSelection()
          }}
        />
      )}

      {/* Modal de Monitoramento */}
      {showMonitoramentoModal && (
        <MonitoramentoModal
          open={showMonitoramentoModal}
          onClose={() => setShowMonitoramentoModal(false)}
          action={monitoramentoAction}
          selectedProcessos={selectedProcessos.map(p => ({
            id: p.id,
            numero_cnj: p.numero_cnj,
            numero_pasta: p.numero_pasta
          }))}
          onSuccess={() => {
            loadProcessos()
            clearSelection()
          }}
        />
      )}

      {/* Modal de Atualizar Andamentos */}
      {showAndamentosModal && (
        <AndamentosModal
          open={showAndamentosModal}
          onClose={() => setShowAndamentosModal(false)}
          selectedProcessos={selectedProcessos.map(p => ({
            id: p.id,
            numero_cnj: p.numero_cnj,
            numero_pasta: p.numero_pasta
          }))}
          onSuccess={() => {
            loadProcessos()
            clearSelection()
          }}
        />
      )}

      {/* Modal de Vincular Contrato */}
      <VincularContratoModal
        open={showVincularContratoModal}
        onOpenChange={setShowVincularContratoModal}
        tipo="processo"
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          loadProcessos()
          clearSelection()
        }}
      />
    </div>
  )
}
