'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  User,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  CheckCircle2,
  Calculator,
  Building2,
  Users,
  Scale,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { ProdutoCompleto, AreaJuridica } from '@/types/portfolio'
import { AREA_JURIDICA_LABELS } from '@/types/portfolio'

// Ícones por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

// Cores por área
const AREA_COLORS: Record<AreaJuridica, string> = {
  tributario: 'from-[#34495e] to-[#46627f]',
  societario: 'from-[#1E3A8A] to-[#3659a8]',
  trabalhista: 'from-[#2d5a5a] to-[#4a7c7c]',
  civel: 'from-[#4a4168] to-[#6a6188]',
  outro: 'from-slate-500 to-slate-600',
}

interface Cliente {
  id: string
  nome: string
  tipo_pessoa: string
}

interface Membro {
  id: string
  nome: string
  email: string
}

function NovoProjetoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const produtoId = searchParams.get('produto')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Dados do produto
  const [produto, setProduto] = useState<ProdutoCompleto | null>(null)

  // Listas para selects
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [membros, setMembros] = useState<Membro[]>([])

  // Form state
  const [form, setForm] = useState({
    nome: '',
    cliente_id: '',
    responsavel_id: '',
    preco_id: '',
    valor_negociado: '',
    data_inicio: new Date().toISOString().split('T')[0],
    observacoes: '',
  })

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)

        // Buscar usuário e escritório
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (!profile?.escritorio_id) {
          setError('Escritório não encontrado')
          return
        }
        setEscritorioId(profile.escritorio_id)

        // Carregar produto
        if (produtoId) {
          const { data: produtoData, error: produtoError } = await supabase
            .from('portfolio_produtos')
            .select(`
              *,
              fases:portfolio_produtos_fases(
                *,
                checklist:portfolio_produtos_checklist(*)
              ),
              precos:portfolio_produtos_precos(*),
              papeis:portfolio_produtos_equipe_papeis(*)
            `)
            .eq('id', produtoId)
            .single()

          if (produtoError) {
            setError('Produto não encontrado')
            return
          }

          setProduto(produtoData as ProdutoCompleto)
          setForm(f => ({ ...f, nome: produtoData.nome }))

          // Se tem preço padrão, selecionar
          const precoPadrao = produtoData.precos?.find((p: any) => p.padrao)
          if (precoPadrao) {
            setForm(f => ({
              ...f,
              preco_id: precoPadrao.id,
              valor_negociado: precoPadrao.valor_fixo?.toString() || precoPadrao.valor_minimo?.toString() || ''
            }))
          }
        }

        // Carregar clientes
        const { data: clientesData } = await supabase
          .from('crm_pessoas')
          .select('id, nome, tipo_pessoa')
          .eq('escritorio_id', profile.escritorio_id)
          .eq('tipo_relacionamento', 'cliente')
          .order('nome')

        setClientes(clientesData || [])

        // Carregar membros do escritório
        const { data: membrosData } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .eq('escritorio_id', profile.escritorio_id)
          .order('nome')

        setMembros(membrosData || [])

        // Definir responsável como usuário atual por padrão
        setForm(f => ({ ...f, responsavel_id: user.id }))

      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [produtoId])

  // Criar projeto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!produto || !escritorioId || !userId) return

    if (!form.cliente_id) {
      setError('Selecione um cliente')
      return
    }

    if (!form.responsavel_id) {
      setError('Selecione um responsável')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Gerar código do projeto
      const ano = new Date().getFullYear()
      const { data: countData } = await supabase
        .from('portfolio_projetos')
        .select('id', { count: 'exact', head: true })
        .eq('escritorio_id', escritorioId)
        .gte('created_at', `${ano}-01-01`)

      const nextNumber = ((countData as any)?.count || 0) + 1
      const codigo = `PROJ-${ano}-${String(nextNumber).padStart(3, '0')}`

      // Calcular data prevista de conclusão
      const dataInicio = new Date(form.data_inicio)
      const diasEstimados = produto.duracao_estimada_dias || 30
      const dataPrevista = new Date(dataInicio)
      dataPrevista.setDate(dataPrevista.getDate() + diasEstimados)

      // Criar projeto
      const { data: projeto, error: projetoError } = await supabase
        .from('portfolio_projetos')
        .insert({
          escritorio_id: escritorioId,
          produto_id: produto.id,
          produto_versao: produto.versao_atual,
          cliente_id: form.cliente_id,
          codigo,
          nome: form.nome || produto.nome,
          preco_selecionado_id: form.preco_id || null,
          valor_negociado: form.valor_negociado ? parseFloat(form.valor_negociado) : null,
          status: 'em_andamento',
          progresso_percentual: 0,
          data_inicio: form.data_inicio,
          data_prevista_conclusao: dataPrevista.toISOString().split('T')[0],
          responsavel_id: form.responsavel_id,
          observacoes: form.observacoes || null,
          created_by: userId,
        })
        .select()
        .single()

      if (projetoError) throw projetoError

      // Criar fases do projeto baseado nas fases do produto
      if (produto.fases && produto.fases.length > 0) {
        let dataFaseInicio = new Date(form.data_inicio)

        for (const fase of produto.fases.sort((a, b) => a.ordem - b.ordem)) {
          const dataFaseFim = new Date(dataFaseInicio)
          dataFaseFim.setDate(dataFaseFim.getDate() + (fase.duracao_estimada_dias || 7))

          const { data: faseProjeto, error: faseError } = await supabase
            .from('portfolio_projetos_fases')
            .insert({
              projeto_id: projeto.id,
              fase_produto_id: fase.id,
              ordem: fase.ordem,
              nome: fase.nome,
              descricao: fase.descricao,
              status: 'pendente',
              progresso_percentual: 0,
              data_inicio_prevista: dataFaseInicio.toISOString().split('T')[0],
              data_fim_prevista: dataFaseFim.toISOString().split('T')[0],
            })
            .select()
            .single()

          if (faseError) throw faseError

          // Criar checklist items da fase
          if (fase.checklist && fase.checklist.length > 0) {
            const checklistItems = fase.checklist.map((item: any) => ({
              fase_projeto_id: faseProjeto.id,
              checklist_produto_id: item.id,
              ordem: item.ordem,
              item: item.item,
              obrigatorio: item.obrigatorio,
              concluido: false,
            }))

            await supabase.from('portfolio_projetos_fases_checklist').insert(checklistItems)
          }

          // Próxima fase começa quando esta termina
          dataFaseInicio = new Date(dataFaseFim)
          dataFaseInicio.setDate(dataFaseInicio.getDate() + 1)
        }
      }

      // Adicionar responsável como membro da equipe
      await supabase.from('portfolio_projetos_equipe').insert({
        projeto_id: projeto.id,
        user_id: form.responsavel_id,
        papel_nome: 'Responsável',
        pode_editar: true,
        recebe_notificacoes: true,
      })

      // Redirecionar para o projeto criado
      router.push(`/dashboard/portfolio/projetos/${projeto.id}`)

    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      setError('Erro ao criar projeto. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Selecionar preço
  const handleSelectPreco = (precoId: string) => {
    const preco = produto?.precos?.find(p => p.id === precoId)
    setForm(f => ({
      ...f,
      preco_id: precoId,
      valor_negociado: preco?.valor_fixo?.toString() || preco?.valor_minimo?.toString() || f.valor_negociado
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#34495e]/20 border-t-[#34495e] animate-spin" />
          <p className="text-slate-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-[#34495e] mb-2">Produto não encontrado</h2>
        <p className="text-slate-500 mb-6">Selecione um produto do catálogo para iniciar um projeto</p>
        <Button onClick={() => router.push('/dashboard/portfolio')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Catálogo
        </Button>
      </div>
    )
  }

  const AreaIcon = AREA_ICONS[produto.area_juridica]
  const areaGradient = AREA_COLORS[produto.area_juridica]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-600"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${areaGradient} flex items-center justify-center shadow-lg`}>
          <AreaIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#34495e]">Iniciar Novo Projeto</h1>
          <p className="text-slate-500">Baseado no produto: <span className="font-medium">{produto.nome}</span></p>
        </div>
      </div>

      {/* Card do Produto */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${areaGradient}`} />
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${areaGradient} flex items-center justify-center flex-shrink-0`}>
              <AreaIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">{produto.codigo}</Badge>
                <Badge className="bg-[#34495e] text-white text-xs">{AREA_JURIDICA_LABELS[produto.area_juridica]}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-[#34495e] mb-2">{produto.nome}</h3>
              {produto.descricao && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">{produto.descricao}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  {produto.fases?.length || 0} fases
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {produto.duracao_estimada_dias || '–'} dias estimados
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[#34495e]">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Nome do Projeto */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Projeto</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder={produto.nome}
                className="border-slate-200"
              />
              <p className="text-xs text-slate-500">Deixe em branco para usar o nome do produto</p>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm(f => ({ ...f, cliente_id: v }))}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Nenhum cliente cadastrado
                    </div>
                  ) : (
                    clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {cliente.nome}
                          <span className="text-xs text-slate-400">
                            ({cliente.tipo_pessoa === 'pf' ? 'PF' : 'PJ'})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável *</Label>
              <Select value={form.responsavel_id} onValueChange={(v) => setForm(f => ({ ...f, responsavel_id: v }))}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {membros.map((membro) => (
                    <SelectItem key={membro.id} value={membro.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {membro.nome || membro.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de Início */}
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                className="border-slate-200"
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={form.observacoes}
                onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Notas adicionais sobre o projeto..."
                className="border-slate-200 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preço */}
        {produto.precos && produto.precos.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-[#34495e] flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Opções de preço */}
              <div className="grid gap-3">
                {produto.precos.filter(p => p.ativo).map((preco) => (
                  <div
                    key={preco.id}
                    onClick={() => handleSelectPreco(preco.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.preco_id === preco.id
                        ? 'border-[#34495e] bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#34495e]">{preco.nome_opcao || 'Preço Padrão'}</span>
                          {preco.padrao && (
                            <Badge variant="outline" className="text-xs">Padrão</Badge>
                          )}
                        </div>
                        {preco.descricao && (
                          <p className="text-sm text-slate-500 mt-1">{preco.descricao}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {preco.tipo === 'fixo' && preco.valor_fixo && (
                          <span className="text-lg font-bold text-[#34495e]">
                            {formatCurrency(preco.valor_fixo)}
                          </span>
                        )}
                        {preco.tipo === 'faixa' && (
                          <span className="text-lg font-bold text-[#34495e]">
                            {formatCurrency(preco.valor_minimo || 0)} - {formatCurrency(preco.valor_maximo || 0)}
                          </span>
                        )}
                        {preco.tipo === 'hora' && (
                          <span className="text-lg font-bold text-[#34495e]">
                            {formatCurrency(preco.valor_hora || 0)}/hora
                          </span>
                        )}
                        {preco.tipo === 'exito' && (
                          <span className="text-lg font-bold text-[#34495e]">
                            {preco.percentual_exito}% de êxito
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Valor negociado */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="valor_negociado">Valor Negociado (R$)</Label>
                <Input
                  id="valor_negociado"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_negociado}
                  onChange={(e) => setForm(f => ({ ...f, valor_negociado: e.target.value }))}
                  placeholder="0,00"
                  className="border-slate-200"
                />
                <p className="text-xs text-slate-500">Valor final acordado com o cliente</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting || !form.cliente_id || !form.responsavel_id}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#3d566d] hover:to-[#526b8a] shadow-lg"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Iniciar Projeto
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#34495e]/20 border-t-[#34495e] animate-spin" />
        <p className="text-slate-500">Carregando...</p>
      </div>
    </div>
  )
}

// Export default with Suspense wrapper
export default function NovoProjetoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NovoProjetoContent />
    </Suspense>
  )
}
