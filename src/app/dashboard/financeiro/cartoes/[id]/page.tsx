'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  CreditCard,
  ArrowLeft,
  Plus,
  FileText,
  Receipt,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  XCircle,
  Repeat,
  Tag,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  useCartoesCredito,
  CartaoCredito,
  LancamentoCartao,
  FaturaCartao,
  CategoriaCartaoPersonalizada,
  CATEGORIAS_DESPESA_CARTAO,
  BANDEIRAS_CARTAO,
  sanearNomeCategoria,
} from '@/hooks/useCartoesCredito'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import CartaoModal from '@/components/financeiro/cartoes/CartaoModal'
import DespesaCartaoModal from '@/components/financeiro/cartoes/DespesaCartaoModal'
import EditarLancamentoCartaoModal from '@/components/financeiro/cartoes/EditarLancamentoCartaoModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'

export default function CartaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cartaoId = params.id as string
  const tabInicial = searchParams.get('tab') || 'lancamentos'

  const { escritorioAtivo, isOwner } = useEscritorioAtivo()

  // States
  const [cartao, setCartao] = useState<CartaoCredito | null>(null)
  const [lancamentos, setLancamentos] = useState<LancamentoCartao[]>([])
  const [faturas, setFaturas] = useState<FaturaCartao[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabInicial)

  // Navegação de meses
  const [mesAtual, setMesAtual] = useState<Date>(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })

  // Modais
  const [modalCartaoOpen, setModalCartaoOpen] = useState(false)
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false)
  const [lancamentoParaEditar, setLancamentoParaEditar] = useState<LancamentoCartao | null>(null)
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<string | null>(null)
  const [recorrenteParaCancelar, setRecorrenteParaCancelar] = useState<string | null>(null)
  const [recorrenteParaReativar, setRecorrenteParaReativar] = useState<string | null>(null)
  const [faturaParaFechar, setFaturaParaFechar] = useState<string | null>(null)

  // Seleção múltipla / Ações em massa
  const [lancamentosSelecionados, setLancamentosSelecionados] = useState<Set<string>>(new Set())
  const [mostrarDialogExcluirEmMassa, setMostrarDialogExcluirEmMassa] = useState(false)
  const [mostrarDialogAlterarCategoria, setMostrarDialogAlterarCategoria] = useState(false)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')

  // Categorias personalizadas
  const [categoriasPersonalizadas, setCategoriasPersonalizadas] = useState<CategoriaCartaoPersonalizada[]>([])
  const [mostrarDialogNovaCategoria, setMostrarDialogNovaCategoria] = useState(false)
  const [novaCategoriaLabel, setNovaCategoriaLabel] = useState('')
  const [criandoCategoria, setCriandoCategoria] = useState(false)

  const {
    getCartao,
    loadLancamentosMes,
    loadFaturas,
    deleteLancamento,
    cancelarRecorrente,
    reativarRecorrente,
    fecharFatura,
    pagarFatura,
    deleteLancamentosEmMassa,
    atualizarCategoriaEmMassa,
    loadCategoriasPersonalizadas,
    criarCategoriaPersonalizada,
  } = useCartoesCredito(escritorioAtivo)

  // Formatação do mês de referência
  const mesReferenciaStr = useMemo(() => {
    return mesAtual.toISOString().slice(0, 10)
  }, [mesAtual])

  const mesNome = useMemo(() => {
    const raw = mesAtual.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [mesAtual])

  // Carregar dados
  const loadCartaoData = useCallback(async () => {
    if (!escritorioAtivo || !cartaoId) return

    try {
      const cartaoData = await getCartao(cartaoId)
      setCartao(cartaoData)
    } catch (error) {
      console.error('Erro ao carregar cartão:', error)
      toast.error('Erro ao carregar dados do cartão')
    }
  }, [escritorioAtivo, cartaoId, getCartao])

  const loadLancamentosData = useCallback(async () => {
    if (!escritorioAtivo || !cartaoId) return

    try {
      const lancamentosData = await loadLancamentosMes(cartaoId, mesReferenciaStr)
      setLancamentos(lancamentosData)
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
      toast.error('Erro ao carregar lançamentos')
    }
  }, [escritorioAtivo, cartaoId, mesReferenciaStr, loadLancamentosMes])

  const loadFaturasData = useCallback(async () => {
    if (!escritorioAtivo || !cartaoId) return

    try {
      const faturasData = await loadFaturas(cartaoId)
      setFaturas(faturasData)
    } catch (error) {
      console.error('Erro ao carregar faturas:', error)
    }
  }, [escritorioAtivo, cartaoId, loadFaturas])

  const loadCategoriasData = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      const categorias = await loadCategoriasPersonalizadas()
      setCategoriasPersonalizadas(categorias)
    } catch (error) {
      console.error('Erro ao carregar categorias personalizadas:', error)
    }
  }, [escritorioAtivo, loadCategoriasPersonalizadas])

  const loadData = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadCartaoData(), loadLancamentosData(), loadFaturasData(), loadCategoriasData()])
    setLoading(false)
  }, [loadCartaoData, loadLancamentosData, loadFaturasData, loadCategoriasData])

  // Combina categorias fixas com personalizadas
  const todasCategorias = useMemo(() => {
    const fixas = CATEGORIAS_DESPESA_CARTAO
    const personalizadas = categoriasPersonalizadas.map(c => ({
      value: c.value,
      label: c.label,
    }))

    // Mantém "outros" no final
    const semOutros = fixas.filter(c => c.value !== 'outros')
    const outros = fixas.find(c => c.value === 'outros')

    return [...semOutros, ...personalizadas, ...(outros ? [outros] : [])]
  }, [categoriasPersonalizadas])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Recarregar lançamentos quando mudar o mês
  useEffect(() => {
    if (cartao) {
      loadLancamentosData()
      setLancamentosSelecionados(new Set()) // Limpa seleção ao mudar de mês
    }
  }, [mesReferenciaStr, cartao, loadLancamentosData])

  // Navegação de meses
  const irMesAnterior = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))
  }

  const irProximoMes = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))
  }

  const irMesAtual = () => {
    const hoje = new Date()
    setMesAtual(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  }

  // Handlers
  const handleDeleteLancamento = async () => {
    if (!lancamentoParaExcluir) return

    const success = await deleteLancamento(lancamentoParaExcluir)
    if (success) {
      toast.success('Lançamento excluído com sucesso')
      loadLancamentosData()
    } else {
      toast.error('Erro ao excluir lançamento')
    }
    setLancamentoParaExcluir(null)
  }

  const handleCancelarRecorrente = async () => {
    if (!recorrenteParaCancelar) return

    const success = await cancelarRecorrente(recorrenteParaCancelar)
    if (success) {
      toast.success('Recorrência cancelada com sucesso')
      loadLancamentosData()
    } else {
      toast.error('Erro ao cancelar recorrência')
    }
    setRecorrenteParaCancelar(null)
  }

  const handleReativarRecorrente = async () => {
    if (!recorrenteParaReativar) return

    const success = await reativarRecorrente(recorrenteParaReativar)
    if (success) {
      toast.success('Recorrência reativada com sucesso')
      loadLancamentosData()
    } else {
      toast.error('Erro ao reativar recorrência')
    }
    setRecorrenteParaReativar(null)
  }

  const handleFecharFatura = async () => {
    if (!faturaParaFechar || !cartao) return

    const faturaId = await fecharFatura(cartao.id, mesReferenciaStr)

    if (faturaId) {
      toast.success('Fatura fechada com sucesso! Um lançamento foi criado em Despesas.')
      loadData()
    } else {
      toast.error('Erro ao fechar fatura')
    }
    setFaturaParaFechar(null)
  }

  const handlePagarFatura = async (faturaId: string) => {
    const success = await pagarFatura(faturaId, 'pix')
    if (success) {
      toast.success('Fatura marcada como paga!')
      loadFaturasData()
    } else {
      toast.error('Erro ao pagar fatura')
    }
  }

  // Handlers de seleção múltipla
  const toggleSelecionarTodos = () => {
    if (lancamentosSelecionados.size === lancamentos.length) {
      setLancamentosSelecionados(new Set())
    } else {
      setLancamentosSelecionados(new Set(lancamentos.map(l => l.id)))
    }
  }

  const toggleSelecionarLancamento = (id: string) => {
    const novaSeleção = new Set(lancamentosSelecionados)
    if (novaSeleção.has(id)) {
      novaSeleção.delete(id)
    } else {
      novaSeleção.add(id)
    }
    setLancamentosSelecionados(novaSeleção)
  }

  const limparSelecao = () => {
    setLancamentosSelecionados(new Set())
  }

  // Handlers de ações em massa
  const handleExcluirEmMassa = async () => {
    const ids = Array.from(lancamentosSelecionados)
    const excluidos = await deleteLancamentosEmMassa(ids)

    if (excluidos > 0) {
      toast.success(`${excluidos} lançamento${excluidos > 1 ? 's' : ''} excluído${excluidos > 1 ? 's' : ''}`)
      limparSelecao()
      loadLancamentosData()
    } else {
      toast.error('Erro ao excluir lançamentos')
    }
    setMostrarDialogExcluirEmMassa(false)
  }

  const handleAlterarCategoriaEmMassa = async () => {
    if (!categoriaSelecionada) {
      toast.error('Selecione uma categoria')
      return
    }

    const ids = Array.from(lancamentosSelecionados)
    const atualizados = await atualizarCategoriaEmMassa(ids, categoriaSelecionada)

    if (atualizados > 0) {
      toast.success(`Categoria alterada em ${atualizados} lançamento${atualizados > 1 ? 's' : ''}`)
      limparSelecao()
      loadLancamentosData()
    } else {
      toast.error('Erro ao alterar categorias')
    }
    setMostrarDialogAlterarCategoria(false)
    setCategoriaSelecionada('')
  }

  // Handler para criar nova categoria
  const handleCriarCategoria = async () => {
    if (!novaCategoriaLabel.trim()) {
      toast.error('Digite o nome da categoria')
      return
    }

    setCriandoCategoria(true)
    try {
      const novaCategoria = await criarCategoriaPersonalizada(novaCategoriaLabel)

      if (novaCategoria) {
        toast.success(`Categoria "${novaCategoria.label}" criada com sucesso`)
        setNovaCategoriaLabel('')
        setMostrarDialogNovaCategoria(false)
        loadCategoriasData()
      } else {
        toast.error('Erro ao criar categoria')
      }
    } catch {
      toast.error('Erro ao criar categoria')
    } finally {
      setCriandoCategoria(false)
    }
  }

  // Formatações
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getCategoriaLabel = (categoria: string) => {
    return todasCategorias.find((c) => c.value === categoria)?.label || categoria
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Aberta</Badge>
      case 'fechada':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Fechada</Badge>
      case 'paga':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paga</Badge>
      case 'cancelada':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Cancelada</Badge>
      default:
        return null
    }
  }

  const getTipoBadge = (lancamento: LancamentoCartao) => {
    switch (lancamento.tipo) {
      case 'unica':
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
            À vista
          </Badge>
        )
      case 'parcelada':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            {lancamento.parcela_numero}/{lancamento.parcela_total}
          </Badge>
        )
      case 'recorrente':
        return (
          <Badge className={cn(
            "border",
            lancamento.recorrente_ativo
              ? "bg-purple-100 text-purple-700 border-purple-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          )}>
            <Repeat className="w-3 h-3 mr-1" />
            {lancamento.recorrente_ativo ? 'Recorrente' : 'Cancelado'}
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="py-12 text-center">
          <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!cartao) {
    return (
      <div className="p-6">
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm text-slate-500 mt-2">Cartão não encontrado</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/dashboard/financeiro/cartoes')}
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const bandeira = BANDEIRAS_CARTAO.find((b) => b.value === cartao.bandeira)

  // Calcular valores do mês atual
  const valorFaturaAtual = lancamentos.reduce((acc, l) => acc + l.valor, 0)
  const faturaAtual = faturas.find((f) =>
    f.mes_referencia.startsWith(mesReferenciaStr.slice(0, 7))
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push('/dashboard/financeiro/cartoes')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: cartao.cor }}
            >
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-medium text-[#34495e]">{cartao.nome}</h1>
              <p className="text-xs text-slate-500">
                {cartao.banco} •••• {cartao.ultimos_digitos}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => setModalCartaoOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            onClick={() => setModalDespesaOpen(true)}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="lancamentos">Lançamentos ({lancamentos.length})</TabsTrigger>
          <TabsTrigger value="faturas">Faturas ({faturas.length})</TabsTrigger>
        </TabsList>

        {/* Lançamentos */}
        <TabsContent value="lancamentos" className="space-y-4">
          {/* Navegador de Meses */}
          <div className="flex items-center justify-between">
            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={irMesAnterior}
                className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm font-medium text-[#34495e] min-w-[140px] text-center">
                {mesNome}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={irProximoMes}
                className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] hover:bg-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex justify-end">
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Total</p>
                <p className="text-sm font-semibold text-[#34495e]">{formatCurrency(valorFaturaAtual)}</p>
              </div>
            </div>
          </div>

          {/* Barra de ações em massa */}
          {lancamentosSelecionados.size > 0 && (
            <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  {lancamentosSelecionados.size} selecionado{lancamentosSelecionados.size > 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500"
                  onClick={limparSelecao}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setMostrarDialogAlterarCategoria(true)}
                >
                  <Tag className="h-3.5 w-3.5 mr-1.5" />
                  Alterar Categoria
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setMostrarDialogExcluirEmMassa(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Excluir
                </Button>
              </div>
            </div>
          )}

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-3">
              {lancamentos.length === 0 ? (
                <div className="py-8 text-center">
                  <Receipt className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500 mt-2">
                    Nenhum lançamento em {mesNome}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={lancamentos.length > 0 && lancamentosSelecionados.size === lancamentos.length}
                          onCheckedChange={toggleSelecionarTodos}
                        />
                      </TableHead>
                      <TableHead>Data Compra</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentos.map((lancamento) => (
                      <TableRow
                        key={lancamento.id}
                        className={cn(lancamentosSelecionados.has(lancamento.id) && 'bg-slate-50')}
                      >
                        <TableCell>
                          <Checkbox
                            checked={lancamentosSelecionados.has(lancamento.id)}
                            onCheckedChange={() => toggleSelecionarLancamento(lancamento.id)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatBrazilDate(lancamento.data_compra)}
                        </TableCell>
                        <TableCell className="font-medium">{lancamento.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getCategoriaLabel(lancamento.categoria)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {lancamento.fornecedor || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {getTipoBadge(lancamento)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(lancamento.valor)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Menu</span>
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                  />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLancamentoParaEditar(lancamento)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {lancamento.tipo === 'recorrente' && (
                                <>
                                  {lancamento.recorrente_ativo ? (
                                    <DropdownMenuItem
                                      onClick={() => setRecorrenteParaCancelar(lancamento.compra_id)}
                                      className="text-amber-600"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancelar Recorrência
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => setRecorrenteParaReativar(lancamento.compra_id)}
                                      className="text-emerald-600"
                                    >
                                      <RefreshCcw className="h-4 w-4 mr-2" />
                                      Reativar Recorrência
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => setLancamentoParaExcluir(lancamento.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* Faturas */}
        <TabsContent value="faturas">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">
                Histórico de Faturas
              </CardTitle>
              {!faturaAtual && valorFaturaAtual > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFaturaParaFechar(cartao.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Fechar Fatura Atual
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {faturas.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500 mt-2">Nenhuma fatura gerada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência</TableHead>
                      <TableHead>Fechamento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Lançamentos</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturas.map((fatura) => (
                      <TableRow key={fatura.id}>
                        <TableCell className="font-medium capitalize">
                          {new Date(fatura.mes_referencia).toLocaleDateString('pt-BR', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{formatBrazilDate(fatura.data_fechamento)}</TableCell>
                        <TableCell>{formatBrazilDate(fatura.data_vencimento)}</TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(fatura.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          {fatura.total_lancamentos || 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(fatura.valor_total)}
                        </TableCell>
                        <TableCell>
                          {fatura.status === 'fechada' && (
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handlePagarFatura(fatura.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {escritorioAtivo && (
        <>
          <CartaoModal
            open={modalCartaoOpen}
            onOpenChange={setModalCartaoOpen}
            escritorioId={escritorioAtivo}
            cartaoParaEditar={cartao as any}
            onSuccess={loadData}
          />
          <DespesaCartaoModal
            open={modalDespesaOpen}
            onOpenChange={setModalDespesaOpen}
            escritorioId={escritorioAtivo}
            cartaoId={cartao.id}
            onSuccess={() => {
              loadLancamentosData()
              loadFaturasData()
            }}
          />
          <EditarLancamentoCartaoModal
            open={!!lancamentoParaEditar}
            onOpenChange={(open) => !open && setLancamentoParaEditar(null)}
            escritorioId={escritorioAtivo}
            lancamento={lancamentoParaEditar}
            onSuccess={loadLancamentosData}
          />
        </>
      )}

      {/* Dialog Excluir Lançamento */}
      <AlertDialog open={!!lancamentoParaExcluir} onOpenChange={() => setLancamentoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
              {lancamentos.find(l => l.id === lancamentoParaExcluir)?.tipo === 'parcelada' && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Atenção: Esta é uma parcela. Todas as parcelas desta compra serão removidas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLancamento}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Cancelar Recorrente */}
      <AlertDialog open={!!recorrenteParaCancelar} onOpenChange={() => setRecorrenteParaCancelar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta recorrência? O lançamento não aparecerá mais
              nos meses futuros, mas os lançamentos já gerados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelarRecorrente}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Cancelar Recorrência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Reativar Recorrente */}
      <AlertDialog open={!!recorrenteParaReativar} onOpenChange={() => setRecorrenteParaReativar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reativar esta recorrência? O lançamento voltará a aparecer nos meses futuros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReativarRecorrente}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Reativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Fechar Fatura */}
      <AlertDialog open={!!faturaParaFechar} onOpenChange={() => setFaturaParaFechar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar a fatura, um lançamento único será criado em Despesas com o valor
              total de {formatCurrency(valorFaturaAtual)}. Os novos lançamentos irão para a
              próxima fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFecharFatura}>Fechar Fatura</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Excluir em Massa */}
      <AlertDialog open={mostrarDialogExcluirEmMassa} onOpenChange={setMostrarDialogExcluirEmMassa}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {lancamentosSelecionados.size} lançamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir os {lancamentosSelecionados.size} lançamentos selecionados?
              Esta ação não pode ser desfeita.
              <span className="block mt-2 text-amber-600 font-medium">
                Atenção: Se algum lançamento for parcelado, todas as parcelas serão removidas.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirEmMassa}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir {lancamentosSelecionados.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Alterar Categoria em Massa */}
      <AlertDialog open={mostrarDialogAlterarCategoria} onOpenChange={setMostrarDialogAlterarCategoria}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar categoria de {lancamentosSelecionados.size} lançamentos</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Selecione a nova categoria para os {lancamentosSelecionados.size} lançamentos selecionados:</p>
                <Select value={categoriaSelecionada} onValueChange={setCategoriaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {todasCategorias.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                    {isOwner && (
                      <>
                        <div className="border-t my-1" />
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-sm text-[#1E3A8A] hover:bg-slate-100 rounded flex items-center gap-2"
                          onClick={() => {
                            setMostrarDialogAlterarCategoria(false)
                            setMostrarDialogNovaCategoria(true)
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nova categoria
                        </button>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoriaSelecionada('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAlterarCategoriaEmMassa}
              disabled={!categoriaSelecionada}
            >
              Alterar Categoria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Nova Categoria (apenas owner) */}
      <Dialog open={mostrarDialogNovaCategoria} onOpenChange={setMostrarDialogNovaCategoria}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma categoria personalizada para o escritório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nova-categoria">Nome da categoria</Label>
              <Input
                id="nova-categoria"
                placeholder="Ex: Telefonia"
                value={novaCategoriaLabel}
                onChange={(e) => setNovaCategoriaLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCriarCategoria()}
              />
              {novaCategoriaLabel && (
                <p className="text-xs text-slate-500">
                  Será salvo como: <span className="font-medium">{sanearNomeCategoria(novaCategoriaLabel)}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNovaCategoriaLabel('')
                setMostrarDialogNovaCategoria(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCategoria}
              disabled={!novaCategoriaLabel.trim() || criandoCategoria}
            >
              {criandoCategoria ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
