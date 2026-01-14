'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  FileText,
  Eye,
  EyeOff,
  MoreVertical,
  Copy,
  Trash2,
  Play,
  Settings,
  ListChecks,
  Clock,
  Users,
  DollarSign,
  Paperclip,
  History,
  Calculator,
  Building2,
  Scale,
  Briefcase,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { usePortfolioProdutos } from '@/hooks/usePortfolioProdutos'
import type { ProdutoCompleto, AreaJuridica, StatusProduto, Complexidade } from '@/types/portfolio'
import {
  AREA_JURIDICA_LABELS,
  STATUS_PRODUTO_LABELS,
  COMPLEXIDADE_LABELS,
} from '@/types/portfolio'

// Ícones por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

export default function ProdutoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const produtoId = params.id as string

  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [produto, setProduto] = useState<ProdutoCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('visao-geral')

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    descricao_comercial: '',
    area_juridica: 'tributario' as AreaJuridica,
    categoria: '',
    duracao_estimada_dias: 0,
    complexidade: 'media' as Complexidade,
    visivel_catalogo: false,
  })

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

  const { loadProdutoCompleto, atualizarProduto, deletarProduto, criarVersao } =
    usePortfolioProdutos(escritorioId || '')

  // Carregar produto
  useEffect(() => {
    async function load() {
      if (!escritorioId) return
      setLoading(true)
      const data = await loadProdutoCompleto(produtoId)
      if (data) {
        setProduto(data)
        setFormData({
          nome: data.nome,
          descricao: data.descricao || '',
          descricao_comercial: data.descricao_comercial || '',
          area_juridica: data.area_juridica,
          categoria: data.categoria || '',
          duracao_estimada_dias: data.duracao_estimada_dias || 0,
          complexidade: data.complexidade || 'media',
          visivel_catalogo: data.visivel_catalogo,
        })
      }
      setLoading(false)
    }
    load()
  }, [produtoId, escritorioId])

  // Handlers
  const handleSave = async () => {
    if (!produto) return

    setSaving(true)
    try {
      await atualizarProduto(produto.id, formData)
      // Recarregar produto
      const updated = await loadProdutoCompleto(produtoId)
      if (updated) setProduto(updated)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleGerarPDF = () => {
    router.push(`/dashboard/portfolio/pdf/${produtoId}`)
  }

  const handleIniciarProjeto = () => {
    router.push(`/dashboard/portfolio/projetos/novo?produto=${produtoId}`)
  }

  const handleCriarVersao = async () => {
    if (!produto) return
    try {
      const novaVersao = await criarVersao(produto.id, 'Versão manual criada pelo usuário')
      // Recarregar produto
      const updated = await loadProdutoCompleto(produtoId)
      if (updated) setProduto(updated)
    } catch (err) {
      console.error('Erro ao criar versão:', err)
    }
  }

  const handleDelete = async () => {
    if (!produto) return
    if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      await deletarProduto(produto.id)
      router.push('/dashboard/portfolio')
    }
  }

  const handleToggleVisibilidade = async () => {
    if (!produto) return
    await atualizarProduto(produto.id, { visivel_catalogo: !produto.visivel_catalogo })
    const updated = await loadProdutoCompleto(produtoId)
    if (updated) setProduto(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34495e]" />
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Produto não encontrado</p>
        <Link href="/dashboard/portfolio">
          <Button variant="outline" className="mt-4">
            Voltar ao Catálogo
          </Button>
        </Link>
      </div>
    )
  }

  const AreaIcon = AREA_ICONS[produto.area_juridica]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/portfolio">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#89bcbe]/20 flex items-center justify-center">
              <AreaIcon className="w-6 h-6 text-[#34495e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-[#34495e]">{produto.nome}</h1>
                <Badge variant="outline" className="text-xs">
                  v{produto.versao_atual}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{produto.codigo}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Visibilidade */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleVisibilidade}
            className={produto.visivel_catalogo ? 'text-emerald-600' : 'text-slate-500'}
          >
            {produto.visivel_catalogo ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Visível
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Oculto
              </>
            )}
          </Button>

          {/* Gerar PDF */}
          <Button variant="outline" size="sm" onClick={handleGerarPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>

          {/* Iniciar Projeto */}
          <Button
            size="sm"
            onClick={handleIniciarProjeto}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Projeto
          </Button>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCriarVersao}>
                <History className="w-4 h-4 mr-2" />
                Criar Nova Versão
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar Produto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status e métricas rápidas */}
      <div className="flex flex-wrap items-center gap-4">
        <Badge
          className={`${
            produto.status === 'ativo'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : produto.status === 'rascunho'
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-amber-100 text-amber-700 border-amber-200'
          }`}
        >
          {STATUS_PRODUTO_LABELS[produto.status]}
        </Badge>

        <Badge variant="outline">
          {AREA_JURIDICA_LABELS[produto.area_juridica]}
        </Badge>

        {produto.complexidade && (
          <Badge variant="outline">
            Complexidade: {COMPLEXIDADE_LABELS[produto.complexidade]}
          </Badge>
        )}

        <span className="text-sm text-slate-500">
          {produto.fases.length} fase{produto.fases.length !== 1 ? 's' : ''}
        </span>

        {produto.duracao_estimada_dias && (
          <span className="text-sm text-slate-500">
            ~{produto.duracao_estimada_dias} dias
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-slate-200 bg-transparent p-0 h-auto">
          <TabsTrigger
            value="visao-geral"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#34495e] rounded-none"
          >
            <Settings className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="fases"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#34495e] rounded-none"
          >
            <ListChecks className="w-4 h-4 mr-2" />
            Fases
            <Badge variant="secondary" className="ml-2 text-xs">
              {produto.fases.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#34495e] rounded-none"
          >
            <Clock className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="equipe"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#34495e] rounded-none"
          >
            <Users className="w-4 h-4 mr-2" />
            Equipe
            <Badge variant="secondary" className="ml-2 text-xs">
              {produto.papeis_equipe.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="precos"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#34495e] rounded-none"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Preços
            <Badge variant="secondary" className="ml-2 text-xs">
              {produto.precos.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="recursos"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#34495e] rounded-none"
          >
            <Paperclip className="w-4 h-4 mr-2" />
            Recursos
            <Badge variant="secondary" className="ml-2 text-xs">
              {produto.recursos.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="visao-geral" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações básicas */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#34495e]">
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-600">Nome do Produto</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm text-slate-600">Área Jurídica</Label>
                  <select
                    value={formData.area_juridica}
                    onChange={(e) =>
                      setFormData({ ...formData, area_juridica: e.target.value as AreaJuridica })
                    }
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {Object.entries(AREA_JURIDICA_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm text-slate-600">Categoria</Label>
                  <Input
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ex: Planejamento, Contencioso, Due Diligence"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-slate-600">Duração Estimada (dias)</Label>
                    <Input
                      type="number"
                      value={formData.duracao_estimada_dias}
                      onChange={(e) =>
                        setFormData({ ...formData, duracao_estimada_dias: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600">Complexidade</Label>
                    <select
                      value={formData.complexidade}
                      onChange={(e) =>
                        setFormData({ ...formData, complexidade: e.target.value as Complexidade })
                      }
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      {Object.entries(COMPLEXIDADE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Descrições */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#34495e]">
                  Descrições
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-600">Descrição Interna</Label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                    placeholder="Descrição técnica para uso interno..."
                  />
                </div>

                <div>
                  <Label className="text-sm text-slate-600">Descrição Comercial (para PDF)</Label>
                  <textarea
                    value={formData.descricao_comercial}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_comercial: e.target.value })
                    }
                    rows={5}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                    placeholder="Texto de marketing para apresentação ao cliente..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Fases */}
        <TabsContent value="fases" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-[#34495e]">
                Fases do Produto
              </CardTitle>
              <Button size="sm" variant="outline">
                + Adicionar Fase
              </Button>
            </CardHeader>
            <CardContent>
              {produto.fases.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ListChecks className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhuma fase cadastrada</p>
                  <p className="text-sm">Adicione fases para estruturar o produto</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {produto.fases.map((fase, index) => (
                    <div
                      key={fase.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-[#89bcbe] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#89bcbe] text-white flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-[#34495e]">{fase.nome}</h4>
                        {fase.descricao && (
                          <p className="text-sm text-slate-500 mt-1">{fase.descricao}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          {fase.duracao_estimada_dias && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {fase.duracao_estimada_dias} dias
                            </span>
                          )}
                          {fase.checklist && fase.checklist.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ListChecks className="w-3 h-3" />
                              {fase.checklist.length} itens
                            </span>
                          )}
                          {fase.criar_evento_agenda && (
                            <Badge variant="outline" className="text-[10px]">
                              Cria evento na agenda
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Timeline */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#34495e]">
                Timeline Visual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {produto.fases.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Adicione fases para visualizar a timeline</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Linha conectora */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200" />

                  <div className="space-y-6">
                    {produto.fases.map((fase, index) => {
                      const diasAcumulados = produto.fases
                        .slice(0, index)
                        .reduce((acc, f) => acc + (f.duracao_estimada_dias || 0), 0)

                      return (
                        <div key={fase.id} className="relative flex items-start gap-4 pl-3">
                          <div className="w-6 h-6 rounded-full bg-[#34495e] text-white flex items-center justify-center text-xs font-medium z-10">
                            {index + 1}
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-[#34495e]">{fase.nome}</h4>
                              <span className="text-xs text-slate-500">
                                Dia {diasAcumulados + 1}
                                {fase.duracao_estimada_dias && ` - ${diasAcumulados + fase.duracao_estimada_dias}`}
                              </span>
                            </div>
                            {fase.descricao && (
                              <p className="text-sm text-slate-500 mt-1">{fase.descricao}</p>
                            )}
                            {fase.duracao_estimada_dias && (
                              <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#89bcbe] to-[#aacfd0]"
                                  style={{
                                    width: `${Math.min(
                                      (fase.duracao_estimada_dias / (produto.duracao_estimada_dias || 1)) * 100,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Equipe */}
        <TabsContent value="equipe" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-[#34495e]">
                Papéis da Equipe
              </CardTitle>
              <Button size="sm" variant="outline">
                + Adicionar Papel
              </Button>
            </CardHeader>
            <CardContent>
              {produto.papeis_equipe.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum papel definido</p>
                  <p className="text-sm">Defina os papéis necessários para executar este produto</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {produto.papeis_equipe.map((papel) => (
                    <div
                      key={papel.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-[#89bcbe] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[#34495e]">{papel.nome}</h4>
                          {papel.obrigatorio && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                      </div>
                      {papel.descricao && (
                        <p className="text-sm text-slate-500 mt-2">{papel.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preços */}
        <TabsContent value="precos" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-[#34495e]">
                Opções de Precificação
              </CardTitle>
              <Button size="sm" variant="outline">
                + Adicionar Preço
              </Button>
            </CardHeader>
            <CardContent>
              {produto.precos.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum preço cadastrado</p>
                  <p className="text-sm">Adicione opções de precificação para este produto</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {produto.precos.filter(p => p.ativo).map((preco) => (
                    <div
                      key={preco.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        preco.padrao
                          ? 'border-[#89bcbe] bg-[#f0f9f9]'
                          : 'border-slate-200 hover:border-[#89bcbe]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-[#34495e]">
                          {preco.nome_opcao || 'Padrão'}
                        </h4>
                        {preco.padrao && (
                          <Badge className="bg-[#89bcbe] text-white text-[10px]">
                            Padrão
                          </Badge>
                        )}
                      </div>

                      <div className="text-2xl font-semibold text-[#1E3A8A]">
                        {preco.tipo === 'fixo' && preco.valor_fixo && (
                          <>R$ {preco.valor_fixo.toLocaleString('pt-BR')}</>
                        )}
                        {preco.tipo === 'faixa' && (
                          <>
                            R$ {preco.valor_minimo?.toLocaleString('pt-BR')} - R$ {preco.valor_maximo?.toLocaleString('pt-BR')}
                          </>
                        )}
                        {preco.tipo === 'hora' && (
                          <>R$ {preco.valor_hora?.toLocaleString('pt-BR')}/hora</>
                        )}
                        {preco.tipo === 'exito' && (
                          <>{preco.percentual_exito}% de êxito</>
                        )}
                      </div>

                      {preco.descricao && (
                        <p className="text-sm text-slate-500 mt-2">{preco.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Recursos */}
        <TabsContent value="recursos" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-[#34495e]">
                Recursos e Documentos
              </CardTitle>
              <Button size="sm" variant="outline">
                + Adicionar Recurso
              </Button>
            </CardHeader>
            <CardContent>
              {produto.recursos.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum recurso cadastrado</p>
                  <p className="text-sm">Anexe templates, modelos e materiais de apoio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {produto.recursos.map((recurso) => (
                    <div
                      key={recurso.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#89bcbe] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-[#34495e]">{recurso.nome}</h4>
                        <p className="text-xs text-slate-500">{recurso.tipo}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
