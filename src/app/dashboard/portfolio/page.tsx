'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Clock,
  MoreVertical,
  FileText,
  Copy,
  Pencil,
  Trash2,
  Layers,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { usePortfolioProdutos } from '@/hooks/usePortfolioProdutos'
import { formatCurrency } from '@/lib/utils'
import type {
  ProdutoCatalogo,
  AreaJuridica,
  StatusProduto,
  ProdutosFiltros,
} from '@/types/portfolio'
import {
  AREA_JURIDICA_LABELS,
  STATUS_PRODUTO_LABELS,
} from '@/types/portfolio'

// Cores minimalistas por área
const AREA_COLORS: Record<AreaJuridica, { bg: string; dot: string; border: string }> = {
  tributario: { bg: 'bg-emerald-50/60', dot: 'bg-emerald-500', border: 'border-emerald-200/60' },
  societario: { bg: 'bg-blue-50/60', dot: 'bg-blue-500', border: 'border-blue-200/60' },
  trabalhista: { bg: 'bg-teal-50/60', dot: 'bg-teal-500', border: 'border-teal-200/60' },
  civel: { bg: 'bg-violet-50/60', dot: 'bg-violet-500', border: 'border-violet-200/60' },
  outro: { bg: 'bg-slate-50/60', dot: 'bg-slate-400', border: 'border-slate-200/60' },
}

export default function PortfolioCatalogoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusProduto | 'todos'>('todos')
  const [areaAtiva, setAreaAtiva] = useState<AreaJuridica | 'todas'>('todas')

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

  const {
    produtos,
    loading: loadingProdutos,
    error,
    loadProdutos,
    getProdutosPorArea,
    deletarProduto,
  } = usePortfolioProdutos(escritorioId || '')

  const loading = !escritorioId || loadingProdutos

  const filtros: ProdutosFiltros = {
    busca: busca || undefined,
    status: filtroStatus !== 'todos' ? [filtroStatus] : undefined,
  }

  useEffect(() => {
    if (escritorioId) {
      loadProdutos(filtros)
    }
  }, [escritorioId, busca, filtroStatus])

  const produtosPorArea = getProdutosPorArea()

  const produtosFiltrados = areaAtiva === 'todas'
    ? produtos
    : produtosPorArea[areaAtiva] || []

  const handleNovoProduto = () => {
    router.push('/dashboard/portfolio/produtos/novo')
  }

  const handleVerProduto = (produtoId: string) => {
    router.push(`/dashboard/portfolio/produtos/${produtoId}`)
  }

  const handleGerarPDF = (produtoId: string) => {
    router.push(`/dashboard/portfolio/pdf/${produtoId}`)
  }

  const handleDuplicarProduto = async (produtoId: string) => {
    console.log('Duplicar produto:', produtoId)
  }

  const handleDeletarProduto = async (produtoId: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deletarProduto(produtoId)
    }
  }

  const handleIniciarProjeto = (produtoId: string) => {
    router.push(`/dashboard/portfolio/projetos/novo?produto=${produtoId}`)
  }

  // Card minimalista
  const renderProdutoCard = (produto: ProdutoCatalogo) => {
    const colors = AREA_COLORS[produto.area_juridica]

    return (
      <div
        key={produto.id}
        className={`group ${colors.bg} border ${colors.border} rounded-lg hover:shadow-md transition-all cursor-pointer`}
        onClick={() => handleVerProduto(produto.id)}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className="text-xs text-slate-400 font-medium">{produto.codigo}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleVerProduto(produto.id) }}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleIniciarProjeto(produto.id) }}>
                  <Play className="w-3.5 h-3.5 mr-2" />
                  Iniciar Projeto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleGerarPDF(produto.id) }}>
                  <FileText className="w-3.5 h-3.5 mr-2" />
                  Gerar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicarProduto(produto.id) }}>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleDeletarProduto(produto.id) }}
                  className="text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Título */}
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mb-1">
            {produto.nome}
          </h3>

          {/* Descrição */}
          {produto.descricao && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-3">
              {produto.descricao}
            </p>
          )}

          {/* Métricas */}
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {produto.total_fases} fases
            </span>
            {produto.duracao_estimada_dias && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {produto.duracao_estimada_dias}d
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-black/5">
            {produto.preco_base ? (
              <span className="text-sm font-semibold text-slate-700">
                {formatCurrency(produto.preco_base)}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Sob consulta</span>
            )}

            {produto.status !== 'ativo' && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {STATUS_PRODUTO_LABELS[produto.status]}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getAreaCount = (area: AreaJuridica) => {
    return produtosPorArea[area]?.length || 0
  }

  const areasDisponiveis = (['tributario', 'societario', 'trabalhista', 'civel', 'outro'] as AreaJuridica[])
    .filter(area => getAreaCount(area) > 0)

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Catálogo de Produtos</h1>
          <p className="text-sm text-slate-500">Serviços jurídicos padronizados</p>
        </div>

        <Button
          onClick={handleNovoProduto}
          size="sm"
          className="bg-slate-800 hover:bg-slate-700"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Produto
        </Button>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusProduto | 'todos')}
          className="h-9 px-3 border border-slate-200 rounded-md text-sm text-slate-600 bg-white"
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="rascunho">Rascunhos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Tabs de Áreas */}
      {areasDisponiveis.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setAreaAtiva('todas')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              areaAtiva === 'todas'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({produtos.length})
          </button>

          {areasDisponiveis.map((area) => {
            const count = getAreaCount(area)
            const isActive = areaAtiva === area
            const colors = AREA_COLORS[area]

            return (
              <button
                key={area}
                onClick={() => setAreaAtiva(area)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : colors.dot}`} />
                {AREA_JURIDICA_LABELS[area]} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-sm text-red-600 mb-3">Erro ao carregar produtos</p>
          <Button onClick={() => loadProdutos()} variant="outline" size="sm">
            Tentar novamente
          </Button>
        </div>
      ) : produtos.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
          <h3 className="text-base font-medium text-slate-700 mb-1">Catálogo vazio</h3>
          <p className="text-sm text-slate-500 mb-4">Crie seu primeiro produto jurídico</p>
          <Button onClick={handleNovoProduto} size="sm" className="bg-slate-800 hover:bg-slate-700">
            <Plus className="w-4 h-4 mr-1.5" />
            Criar Produto
          </Button>
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-sm text-slate-500">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {produtosFiltrados.map(renderProdutoCard)}
        </div>
      )}
    </div>
  )
}
