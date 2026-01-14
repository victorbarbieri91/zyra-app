'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  XCircle,
  MoreVertical,
  Eye,
  Play,
  User,
  Calendar,
  DollarSign,
  Calculator,
  Building2,
  Users,
  Scale,
  Briefcase,
  FolderKanban,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { usePortfolioProjetos } from '@/hooks/usePortfolioProjetos'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import type { ProjetoListItem, StatusProjeto, AreaJuridica, ProjetosFiltros } from '@/types/portfolio'
import { STATUS_PROJETO_LABELS, AREA_JURIDICA_LABELS } from '@/types/portfolio'

// Configuração de status
const STATUS_CONFIG: Record<StatusProjeto, { icon: typeof Clock; color: string; bgColor: string; gradient: string }> = {
  rascunho: { icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100', gradient: 'from-slate-400 to-slate-500' },
  em_andamento: { icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-100', gradient: 'from-blue-500 to-blue-600' },
  pausado: { icon: Pause, color: 'text-amber-600', bgColor: 'bg-amber-100', gradient: 'from-amber-500 to-amber-600' },
  concluido: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100', gradient: 'from-emerald-500 to-emerald-600' },
  cancelado: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', gradient: 'from-red-500 to-red-600' },
}

// Ícones e cores por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

const AREA_COLORS: Record<AreaJuridica, string> = {
  tributario: 'bg-[#34495e]',
  societario: 'bg-[#1E3A8A]',
  trabalhista: 'bg-[#2d5a5a]',
  civel: 'bg-[#4a4168]',
  outro: 'bg-slate-500',
}

export default function ProjetosListPage() {
  const router = useRouter()
  const supabase = createClient()
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusProjeto | 'todos'>('todos')

  // Carregar escritório do usuário logado
  useEffect(() => {
    const loadEscritorioId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()
        if (profile?.escritorio_id) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadEscritorioId()
  }, [])

  const { projetos, loading: loadingProjetos, error, loadProjetos, getProjetosAtrasados, getProjetosPorStatus } =
    usePortfolioProjetos(escritorioId || '')

  const loading = !escritorioId || loadingProjetos

  // Filtrar projetos
  const filtros: ProjetosFiltros = {
    busca: busca || undefined,
    status: filtroStatus !== 'todos' ? [filtroStatus] : undefined,
  }

  useEffect(() => {
    if (escritorioId) {
      loadProjetos(filtros)
    }
  }, [escritorioId, busca, filtroStatus])

  // Métricas rápidas
  const projetosPorStatus = getProjetosPorStatus()
  const projetosAtrasados = getProjetosAtrasados()

  // Handlers
  const handleNovoProjeto = () => {
    router.push('/dashboard/portfolio')
  }

  const handleVerProjeto = (projetoId: string) => {
    router.push(`/dashboard/portfolio/projetos/${projetoId}`)
  }

  // Tabs de filtro
  const statusTabs = [
    { key: 'todos', label: 'Todos', count: projetos.length, color: 'bg-slate-500' },
    { key: 'em_andamento', label: 'Em Andamento', count: projetosPorStatus.em_andamento.length, color: 'bg-blue-500' },
    { key: 'pausado', label: 'Pausados', count: projetosPorStatus.pausado.length, color: 'bg-amber-500' },
    { key: 'concluido', label: 'Concluídos', count: projetosPorStatus.concluido.length, color: 'bg-emerald-500' },
    { key: 'cancelado', label: 'Cancelados', count: projetosPorStatus.cancelado.length, color: 'bg-red-500' },
  ]

  // Renderizar card de projeto
  const renderProjetoCard = (projeto: ProjetoListItem) => {
    const StatusIcon = STATUS_CONFIG[projeto.status].icon
    const statusConfig = STATUS_CONFIG[projeto.status]
    const AreaIcon = AREA_ICONS[projeto.area_juridica]
    const areaColor = AREA_COLORS[projeto.area_juridica]
    const isAtrasado =
      projeto.status === 'em_andamento' &&
      projeto.data_prevista_conclusao &&
      new Date(projeto.data_prevista_conclusao) < new Date()

    return (
      <div
        key={projeto.id}
        className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => handleVerProjeto(projeto.id)}
      >
        {/* Status bar no topo */}
        <div className={`h-1 bg-gradient-to-r ${statusConfig.gradient}`} />

        {/* Indicador de atrasado */}
        {isAtrasado && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-red-500 text-white text-[10px] shadow-sm">
              <AlertCircle className="w-3 h-3 mr-1" />
              Atrasado
            </Badge>
          </div>
        )}

        <div className="p-5">
          {/* Header com área e menu */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${areaColor} flex items-center justify-center`}>
                <AreaIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{projeto.codigo}</p>
                <h3 className="font-semibold text-[#34495e] line-clamp-1 group-hover:text-[#1E3A8A] transition-colors">
                  {projeto.nome}
                </h3>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleVerProjeto(projeto.id) }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Produto */}
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-slate-50 rounded-lg">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">{projeto.produto_nome}</span>
          </div>

          {/* Cliente e Responsável */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cliente</p>
                <p className="text-sm text-slate-700 truncate">{projeto.cliente_nome}</p>
              </div>
            </div>
            {projeto.responsavel_nome && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Responsável</p>
                  <p className="text-sm text-slate-700 truncate">{projeto.responsavel_nome}</p>
                </div>
              </div>
            )}
          </div>

          {/* Progresso */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {projeto.fases_concluidas} de {projeto.total_fases} fases
                </span>
              </div>
              <span className="text-sm font-semibold text-[#34495e]">{projeto.progresso_percentual}%</span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${statusConfig.gradient} rounded-full transition-all duration-500`}
                style={{ width: `${projeto.progresso_percentual}%` }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge
              className={`${statusConfig.bgColor} ${statusConfig.color} border-0 font-medium`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {STATUS_PROJETO_LABELS[projeto.status]}
            </Badge>

            {projeto.valor_negociado && projeto.valor_negociado > 0 && (
              <span className="text-sm font-semibold text-[#34495e]">
                {formatCurrency(projeto.valor_negociado)}
              </span>
            )}
          </div>

          {/* Footer com datas */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Início: {projeto.data_inicio ? formatBrazilDate(projeto.data_inicio) : '-'}</span>
            </div>
            {projeto.data_prevista_conclusao && (
              <div className={`flex items-center gap-1 ${isAtrasado ? 'text-red-500 font-medium' : ''}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>Prev: {formatBrazilDate(projeto.data_prevista_conclusao)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#34495e]">Projetos</h1>
            <p className="text-sm text-slate-500">
              Acompanhe a execução dos seus projetos jurídicos
            </p>
          </div>
        </div>

        <Button
          onClick={handleNovoProjeto}
          className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#3d566d] hover:to-[#526b8a] shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Filtros por Status */}
      <div className="flex flex-wrap items-center gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFiltroStatus(tab.key as StatusProjeto | 'todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              filtroStatus === tab.key
                ? 'bg-[#34495e] text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${tab.color}`} />
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              filtroStatus === tab.key ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, cliente ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-white border-slate-200"
        />
      </div>

      {/* Alerta de atrasados */}
      {projetosAtrasados.length > 0 && filtroStatus !== 'concluido' && filtroStatus !== 'cancelado' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {projetosAtrasados.length} projeto{projetosAtrasados.length > 1 ? 's' : ''} atrasado{projetosAtrasados.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600">
              Projetos com data prevista de conclusão já ultrapassada
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => setFiltroStatus('em_andamento')}
          >
            Ver projetos
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#34495e]" />
            <p className="text-sm text-slate-500">Carregando projetos...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Erro ao carregar projetos: {error.message}</p>
            <Button onClick={() => loadProjetos()} variant="outline" className="border-red-200 text-red-700">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : projetos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
            <FolderKanban className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#34495e] mb-2">
            {filtroStatus !== 'todos' || busca
              ? 'Nenhum projeto encontrado'
              : 'Nenhum projeto ainda'}
          </h3>
          <p className="text-slate-500 mb-6 max-w-md">
            {filtroStatus !== 'todos' || busca
              ? 'Tente ajustar os filtros de busca para encontrar seus projetos'
              : 'Inicie um projeto a partir de um produto do catálogo para começar a acompanhar suas execuções'}
          </p>
          <Button
            onClick={handleNovoProjeto}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {filtroStatus !== 'todos' || busca ? 'Limpar Filtros' : 'Ir para o Catálogo'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projetos.map(renderProjetoCard)}
        </div>
      )}
    </div>
  )
}
