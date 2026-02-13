'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Filter,
  Scale,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ListTodo,
  Calendar,
  Loader2,
  ExternalLink,
  Edit,
  Archive,
  ArchiveRestore,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ConsultaWizardModal } from '@/components/consultivo/ConsultaWizardModal'
import EditarConsultivoModal from '@/components/consultivo/EditarConsultivoModal'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import { useTarefas } from '@/hooks/useTarefas'
import { BulkActionsToolbarCRM, BulkActionCRM } from '@/components/crm/BulkActionsToolbarCRM'
import { VincularContratoModal } from '@/components/financeiro/VincularContratoModal'
import { BulkEditStatusConsultivoModal } from '@/components/consultivo/BulkEditStatusConsultivoModal'

interface Consulta {
  id: string
  numero: string | null
  titulo: string
  descricao: string | null
  cliente_id: string
  cliente_nome: string
  area: string
  status: string
  prioridade: string
  prazo: string | null
  responsavel_id: string
  responsavel_nome: string
  contrato_id: string | null
  anexos: any[]
  andamentos: any[]
  created_at: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

export default function ConsultivoPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentView, setCurrentView] = useState<'ativas' | 'arquivadas' | 'minhas'>('ativas')
  const [wizardModalOpen, setWizardModalOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Estados para wizards de agenda
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [selectedConsultivoId, setSelectedConsultivoId] = useState<string | null>(null)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Estados para selecao em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showVincularContratoModal, setShowVincularContratoModal] = useState(false)
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)

  // Estados para modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [consultaParaEditar, setConsultaParaEditar] = useState<Consulta | null>(null)

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Ref para evitar múltiplas chamadas
  const isLoadingRef = useRef(false)

  const router = useRouter()
  const supabase = createClient()

  // Abrir wizard automaticamente se ?novo=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('novo') === 'true') {
      setWizardModalOpen(true)
      window.history.replaceState({}, '', '/dashboard/consultivo')
    }
  }, [])

  // Hooks de agenda
  const { createTarefa } = useTarefas(escritorioId || '')

  // Carregar escritorioId e userId do usuario logado
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
      setCurrentPage(1)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // Load consultas when filters change
  useEffect(() => {
    loadConsultas()
  }, [currentView, debouncedSearch, currentPage, pageSize])

  // Recarregar dados quando a página volta a ter foco (ex: usuário voltou da página de detalhes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoadingRef.current) {
        loadConsultas()
      }
    }

    const handleFocus = () => {
      if (!isLoadingRef.current) {
        loadConsultas()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentView, debouncedSearch, currentPage, pageSize])

  const loadConsultas = async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      setLoading(true)

      // Usar view que já inclui cliente e responsável
      let query = supabase
        .from('v_consultivo_consultas')
        .select(`
          id,
          numero,
          titulo,
          descricao,
          cliente_id,
          area,
          status,
          prioridade,
          prazo,
          responsavel_id,
          contrato_id,
          anexos,
          andamentos,
          created_at,
          cliente_nome,
          responsavel_nome
        `, { count: 'exact' })

      // Apply search filter - busca por título, número, cliente e responsável
      const isSearching = debouncedSearch.trim().length > 0
      if (isSearching) {
        const searchTerm = `%${debouncedSearch.trim()}%`
        query = query.or(`titulo.ilike.${searchTerm},numero.ilike.${searchTerm},cliente_nome.ilike.${searchTerm},responsavel_nome.ilike.${searchTerm}`)
      }

      // Apply view filter
      if (currentView === 'arquivadas') {
        query = query.eq('status', 'arquivado')
      } else if (currentView === 'minhas' && userId) {
        query = query.eq('responsavel_id', userId)
        // Minhas consultas também filtra por ativo, a menos que esteja buscando
        if (!isSearching) {
          query = query.eq('status', 'ativo')
        }
      } else if (currentView === 'ativas' && !isSearching) {
        // Por padrão mostra apenas ativas, exceto se estiver buscando
        query = query.eq('status', 'ativo')
      }

      // Get total count first
      const { count } = await query

      // Apply pagination and ordering
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Erro ao carregar consultas:', error)
        setLoading(false)
        isLoadingRef.current = false
        return
      }

      setTotalCount(count || 0)

      // Formatar dados - cliente_nome e responsavel_nome já vêm da view
      const consultasFormatadas: Consulta[] = (data || []).map((c: any) => ({
        id: c.id,
        numero: c.numero,
        titulo: c.titulo,
        descricao: c.descricao,
        cliente_id: c.cliente_id,
        cliente_nome: c.cliente_nome || 'N/A',
        area: c.area,
        status: c.status,
        prioridade: c.prioridade,
        prazo: c.prazo,
        responsavel_id: c.responsavel_id,
        responsavel_nome: c.responsavel_nome || 'N/A',
        contrato_id: c.contrato_id,
        anexos: c.anexos || [],
        andamentos: c.andamentos || [],
        created_at: c.created_at
      }))

      setConsultas(consultasFormatadas)
      setLoading(false)
      isLoadingRef.current = false
    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível',
      'trabalhista': 'Trabalhista',
      'tributaria': 'Tributária',
      'tributario': 'Tributário', // suporte legado
      'societaria': 'Societária',
      'societario': 'Societário', // suporte legado
      'empresarial': 'Empresarial',
      'contratual': 'Contratual',
      'familia': 'Família',
      'criminal': 'Criminal',
      'previdenciaria': 'Previdenciária',
      'consumidor': 'Consumidor',
      'ambiental': 'Ambiental',
      'imobiliario': 'Imobiliário',
      'propriedade_intelectual': 'Prop. Intelectual',
      'compliance': 'Compliance',
      'outra': 'Outra',
      'outros': 'Outros' // suporte legado
    }
    return map[area] || area
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      arquivado: 'bg-slate-100 text-slate-700 border-slate-200',
    }
    const labels: Record<string, string> = {
      ativo: 'Ativo',
      arquivado: 'Arquivado',
    }
    return (
      <Badge className={cn('text-[10px] border', styles[status] || styles.ativo)}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getPrioridadeBadge = (prioridade: string) => {
    const styles: Record<string, string> = {
      baixa: 'bg-slate-100 text-slate-600 border-slate-200',
      media: 'bg-blue-100 text-blue-700 border-blue-200',
      alta: 'bg-amber-100 text-amber-700 border-amber-200',
      urgente: 'bg-red-100 text-red-700 border-red-200',
    }
    const labels: Record<string, string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      urgente: 'Urgente',
    }
    return (
      <Badge className={cn('text-[10px] border', styles[prioridade] || styles.media)}>
        {labels[prioridade] || prioridade}
      </Badge>
    )
  }

  const formatPrazo = (prazo: string | null) => {
    if (!prazo) return '-'
    const date = new Date(prazo + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="text-red-600 font-medium">{format(date, 'dd/MM/yyyy')}</span>
    } else if (diffDays === 0) {
      return <span className="text-amber-600 font-medium">Hoje</span>
    } else if (diffDays <= 3) {
      return <span className="text-amber-600">{format(date, 'dd/MM/yyyy')}</span>
    }
    return format(date, 'dd/MM/yyyy')
  }

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize))
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // ============= Handlers de Edição e Arquivamento =============
  const handleEditar = (consulta: Consulta) => {
    setConsultaParaEditar(consulta)
    setEditModalOpen(true)
  }

  const handleArquivar = async (consulta: Consulta) => {
    const novoStatus = consulta.status === 'arquivado' ? 'ativo' : 'arquivado'
    const acao = novoStatus === 'arquivado' ? 'arquivada' : 'reativada'

    try {
      const { error } = await supabase
        .from('consultivo_consultas')
        .update({ status: novoStatus })
        .eq('id', consulta.id)

      if (error) throw error

      toast.success(`Consulta ${acao} com sucesso`)
      // Recarregar a lista
      loadConsultas()
    } catch (err) {
      console.error(`Erro ao arquivar/desarquivar consulta:`, err)
      toast.error('Erro ao atualizar consulta. Tente novamente.')
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
    if (selectedIds.size === consultas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(consultas.map(c => c.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkAction = async (action: BulkActionCRM) => {
    if (action === 'vincular_contrato') {
      setShowVincularContratoModal(true)
    } else if (action === 'alterar_status') {
      setShowBulkStatusModal(true)
    } else {
      console.log('Bulk action:', action, selectedIds)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#34495e]">Consultivo</h1>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5 font-normal">
            {loading ? 'Carregando...' : `${totalCount} ${totalCount === 1 ? 'consulta' : 'consultas'}`}
          </p>
        </div>
        <Button
          onClick={() => setWizardModalOpen(true)}
          className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white shadow-lg"
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Nova Consulta</span>
        </Button>
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
                placeholder="Buscar por cliente, título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              {/* Dropdown Visualizacao */}
              <select
                value={currentView}
                onChange={(e) => {
                  setCurrentView(e.target.value as typeof currentView)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#89bcbe] flex-1 md:min-w-[160px]"
              >
                <option value="ativas">Ativas</option>
                <option value="arquivadas">Arquivadas</option>
                <option value="minhas">Minhas Consultas</option>
              </select>

              <Button variant="outline" className="whitespace-nowrap">
                <Filter className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Mais Filtros</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile: Card list view */}
      <div className="md:hidden space-y-2">
        {loading && consultas.length === 0 && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
            <span className="text-sm text-slate-600">Carregando...</span>
          </div>
        )}
        {!loading && consultas.length === 0 && (
          <div className="flex flex-col items-center py-8 gap-2">
            <Scale className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-600">Nenhuma consulta encontrada</p>
          </div>
        )}
        {consultas.map((consulta) => (
          <div
            key={consulta.id}
            onClick={() => router.push(`/dashboard/consultivo/${consulta.id}`)}
            className="bg-white rounded-xl border border-slate-200 p-3.5 active:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-medium text-[#34495e] line-clamp-2 flex-1 mr-2">{consulta.titulo}</p>
              {getStatusBadge(consulta.status)}
            </div>
            {consulta.numero && (
              <p className="text-[11px] font-mono text-slate-400 mb-1">#{consulta.numero}</p>
            )}
            <p className="text-xs text-slate-600 truncate">{consulta.cliente_nome}</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">{formatArea(consulta.area)}</span>
                {getPrioridadeBadge(consulta.prioridade)}
              </div>
              <span className="text-[11px] text-slate-400">
                {formatPrazo(consulta.prazo)}
              </span>
            </div>
          </div>
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

      {/* Desktop: Tabela de Consultas */}
      <Card className="hidden md:block border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center p-3 w-10">
                  <Checkbox
                    checked={consultas.length > 0 && selectedIds.size === consultas.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-slate-300 data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                  />
                </th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-20">Nº</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-72">Título</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-44">Cliente</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-24">Área</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-24">Status</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-20">Prior.</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-24">Prazo</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-28">Responsável</th>
                <th className="text-center p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-20">Ações</th>
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-50' : ''}>
              {/* Loading state */}
              {loading && consultas.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
                      <span className="text-sm text-slate-600">Carregando consultas...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && consultas.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Scale className="w-10 h-10 text-slate-300" />
                      <p className="text-sm text-slate-600">
                        {debouncedSearch ? 'Nenhuma consulta encontrada para esta busca' : 'Nenhuma consulta cadastrada'}
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

              {consultas.map((consulta) => (
                <tr
                  key={consulta.id}
                  onClick={() => router.push(`/dashboard/consultivo/${consulta.id}`)}
                  className={cn(
                    'border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer',
                    selectedIds.has(consulta.id) && 'bg-blue-50 hover:bg-blue-100'
                  )}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(consulta.id)}
                      onCheckedChange={() => toggleSelection(consulta.id)}
                      className="border-slate-300 data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                    />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-slate-500">
                      {consulta.numero || '-'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-medium text-[#34495e] truncate block" title={consulta.titulo}>
                      {consulta.titulo}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-slate-700 block truncate" title={consulta.cliente_nome}>
                      {consulta.cliente_nome}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="text-xs text-slate-600">
                      {formatArea(consulta.area)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {getStatusBadge(consulta.status)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {getPrioridadeBadge(consulta.prioridade)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="text-xs">
                      {formatPrazo(consulta.prazo)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-slate-600 block truncate" title={consulta.responsavel_nome}>
                      {consulta.responsavel_nome}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {/* Menu de criar agendamento */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs hover:bg-[#89bcbe] hover:text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="Criar agendamento"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Agenda
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedConsultivoId(consulta.id)
                              setShowTarefaWizard(true)
                            }}
                          >
                            <ListTodo className="w-4 h-4 mr-2 text-[#34495e]" />
                            <span className="text-sm">Nova Tarefa</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedConsultivoId(consulta.id)
                              setShowEventoWizard(true)
                            }}
                          >
                            <Calendar className="w-4 h-4 mr-2 text-[#89bcbe]" />
                            <span className="text-sm">Novo Compromisso</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Menu de acoes */}
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditar(consulta)
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2 text-[#34495e]" />
                            <span className="text-sm">Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/dashboard/consultivo/${consulta.id}`, '_blank')
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-2 text-slate-500" />
                            <span className="text-sm">Abrir em nova aba</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArquivar(consulta)
                            }}
                            className={consulta.status === 'arquivado' ? 'text-emerald-600' : 'text-amber-600'}
                          >
                            {consulta.status === 'arquivado' ? (
                              <>
                                <ArchiveRestore className="w-4 h-4 mr-2" />
                                <span className="text-sm">Desarquivar</span>
                              </>
                            ) : (
                              <>
                                <Archive className="w-4 h-4 mr-2" />
                                <span className="text-sm">Arquivar</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-600">
              {loading ? (
                'Carregando...'
              ) : totalCount > 0 ? (
                <>Mostrando <span className="font-semibold">{startItem}</span> a <span className="font-semibold">{endItem}</span> de <span className="font-semibold">{totalCount}</span> consultas</>
              ) : (
                'Nenhuma consulta encontrada'
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

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#34495e] text-white min-w-[32px]"
                  disabled
                >
                  {currentPage}
                </Button>

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

      {/* Modal Nova Consulta */}
      <ConsultaWizardModal
        open={wizardModalOpen}
        onOpenChange={setWizardModalOpen}
        onSuccess={loadConsultas}
        escritorioId={escritorioId || undefined}
      />

      {/* Modal Editar Consulta */}
      {consultaParaEditar && (
        <EditarConsultivoModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open)
            if (!open) setConsultaParaEditar(null)
          }}
          consulta={{
            id: consultaParaEditar.id,
            titulo: consultaParaEditar.titulo,
            descricao: consultaParaEditar.descricao,
            cliente_id: consultaParaEditar.cliente_id,
            cliente_nome: consultaParaEditar.cliente_nome,
            area: consultaParaEditar.area,
            prioridade: consultaParaEditar.prioridade,
            prazo: consultaParaEditar.prazo,
            responsavel_id: consultaParaEditar.responsavel_id,
          }}
          onSuccess={loadConsultas}
        />
      )}

      {/* Wizards de Agenda vinculados a consulta */}
      {showTarefaWizard && escritorioId && selectedConsultivoId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowTarefaWizard(false)
            setSelectedConsultivoId(null)
          }}
          onCreated={loadConsultas}
          initialData={{
            consultivo_id: selectedConsultivoId
          }}
        />
      )}

      {showEventoWizard && escritorioId && selectedConsultivoId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowEventoWizard(false)
            setSelectedConsultivoId(null)
          }}
          onSubmit={async () => {
            // O wizard cria o evento diretamente via useEventos
            // Este callback é apenas para refresh da lista
            loadConsultas()
          }}
          initialData={{
            consultivo_id: selectedConsultivoId
          }}
        />
      )}

      {/* Toolbar de Acoes em Massa */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbarCRM
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onAction={handleBulkAction}
          loading={bulkLoading}
        />
      )}

      {/* Modal de Alterar Status em Massa */}
      <BulkEditStatusConsultivoModal
        open={showBulkStatusModal}
        onClose={() => setShowBulkStatusModal(false)}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          loadConsultas()
          clearSelection()
        }}
      />

      {/* Modal de Vincular Contrato */}
      <VincularContratoModal
        open={showVincularContratoModal}
        onOpenChange={setShowVincularContratoModal}
        tipo="consultivo"
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          loadConsultas()
          clearSelection()
        }}
      />
    </div>
  )
}
