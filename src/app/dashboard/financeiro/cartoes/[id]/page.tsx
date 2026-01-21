'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  CreditCard,
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  Trash2,
  Edit2,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
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
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  useCartoesCredito,
  CartaoCredito,
  DespesaCartao,
  FaturaCartao,
  ParcelaCartao,
  CATEGORIAS_DESPESA_CARTAO,
  BANDEIRAS_CARTAO,
} from '@/hooks/useCartoesCredito'
import CartaoModal from '@/components/financeiro/cartoes/CartaoModal'
import DespesaCartaoModal from '@/components/financeiro/cartoes/DespesaCartaoModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatBrazilDate, formatBrazilDateTime } from '@/lib/timezone'

export default function CartaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cartaoId = params.id as string
  const tabInicial = searchParams.get('tab') || 'despesas'

  const { escritorioAtivo } = useEscritorioAtivo()

  // States
  const [cartao, setCartao] = useState<CartaoCredito | null>(null)
  const [despesas, setDespesas] = useState<DespesaCartao[]>([])
  const [faturas, setFaturas] = useState<FaturaCartao[]>([])
  const [parcelas, setParcelas] = useState<ParcelaCartao[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabInicial)

  // Modais
  const [modalCartaoOpen, setModalCartaoOpen] = useState(false)
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false)
  const [despesaParaExcluir, setDespesaParaExcluir] = useState<string | null>(null)
  const [faturaParaFechar, setFaturaParaFechar] = useState<string | null>(null)

  const {
    getCartao,
    loadDespesas,
    loadFaturas,
    loadParcelas,
    deleteDespesa,
    fecharFatura,
    pagarFatura,
  } = useCartoesCredito(escritorioAtivo)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!escritorioAtivo || !cartaoId) return

    setLoading(true)
    try {
      const [cartaoData, despesasData, faturasData, parcelasData] = await Promise.all([
        getCartao(cartaoId),
        loadDespesas(cartaoId),
        loadFaturas(cartaoId),
        loadParcelas(cartaoId),
      ])

      setCartao(cartaoData)
      setDespesas(despesasData)
      setFaturas(faturasData)
      setParcelas(parcelasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do cartão')
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, cartaoId, getCartao, loadDespesas, loadFaturas, loadParcelas])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handlers
  const handleDeleteDespesa = async () => {
    if (!despesaParaExcluir) return

    const success = await deleteDespesa(despesaParaExcluir)
    if (success) {
      toast.success('Despesa excluída com sucesso')
      loadData()
    } else {
      toast.error('Erro ao excluir despesa')
    }
    setDespesaParaExcluir(null)
  }

  const handleFecharFatura = async () => {
    if (!faturaParaFechar || !cartao) return

    const mesReferencia = new Date().toISOString().slice(0, 7) + '-01'
    const faturaId = await fecharFatura(cartao.id, mesReferencia)

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
      loadData()
    } else {
      toast.error('Erro ao pagar fatura')
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
    return CATEGORIAS_DESPESA_CARTAO.find((c) => c.value === categoria)?.label || categoria
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

  // Calcular fatura atual
  const mesAtual = new Date().toISOString().slice(0, 7) + '-01'
  const faturaAtual = faturas.find((f) => f.mes_referencia.startsWith(mesAtual.slice(0, 7)))
  const valorFaturaAtual = parcelas
    .filter((p) => p.mes_referencia.startsWith(mesAtual.slice(0, 7)))
    .reduce((acc, p) => acc + p.valor, 0)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/financeiro/cartoes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: cartao.cor }}
            >
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#34495e]">{cartao.nome}</h1>
              <p className="text-sm text-slate-600">
                {cartao.banco} - •••• {cartao.ultimos_digitos} - {bandeira?.label}
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
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Vencimento</p>
                <p className="text-lg font-semibold text-[#34495e]">Dia {cartao.dia_vencimento}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Fecha</p>
                <p className="text-lg font-semibold text-[#34495e]">
                  {cartao.dias_antes_fechamento} dias antes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Fatura Atual</p>
                <p className="text-lg font-semibold text-[#34495e]">
                  {formatCurrency(valorFaturaAtual)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Despesas este mês</p>
                <p className="text-lg font-semibold text-[#34495e]">
                  {parcelas.filter((p) => p.mes_referencia.startsWith(mesAtual.slice(0, 7))).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="despesas">Despesas ({despesas.length})</TabsTrigger>
          <TabsTrigger value="faturas">Faturas ({faturas.length})</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas ({parcelas.length})</TabsTrigger>
        </TabsList>

        {/* Despesas */}
        <TabsContent value="despesas">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Despesas do Cartão
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {despesas.length === 0 ? (
                <div className="py-8 text-center">
                  <Receipt className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500 mt-2">Nenhuma despesa registrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-center">Parcelas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.map((despesa) => (
                      <TableRow key={despesa.id}>
                        <TableCell className="text-sm">
                          {formatBrazilDate(despesa.data_compra)}
                        </TableCell>
                        <TableCell className="font-medium">{despesa.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getCategoriaLabel(despesa.categoria)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {despesa.fornecedor || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {despesa.numero_parcelas > 1 ? (
                            <Badge className="bg-blue-100 text-blue-700">
                              {despesa.numero_parcelas}x
                            </Badge>
                          ) : (
                            'À vista'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(despesa.valor_total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDespesaParaExcluir(despesa.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturas.map((fatura) => (
                      <TableRow key={fatura.id}>
                        <TableCell className="font-medium">
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

        {/* Parcelas */}
        <TabsContent value="parcelas">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Todas as Parcelas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {parcelas.length === 0 ? (
                <div className="py-8 text-center">
                  <Receipt className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500 mt-2">Nenhuma parcela encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês Referência</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Parcela</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((parcela) => (
                      <TableRow key={parcela.id}>
                        <TableCell className="font-medium">
                          {new Date(parcela.mes_referencia).toLocaleDateString('pt-BR', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{parcela.despesa_descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getCategoriaLabel(parcela.despesa_categoria || '')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {parcela.numero_parcela}
                        </TableCell>
                        <TableCell className="text-center">
                          {parcela.faturada ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Faturada</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(parcela.valor)}
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
            onSuccess={loadData}
          />
        </>
      )}

      {/* Dialogs */}
      <AlertDialog open={!!despesaParaExcluir} onOpenChange={() => setDespesaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
              Se a despesa for parcelada, todas as parcelas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDespesa}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!faturaParaFechar} onOpenChange={() => setFaturaParaFechar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar a fatura, um lançamento único será criado em Despesas com o valor
              total de {formatCurrency(valorFaturaAtual)}. As novas despesas irão para a
              próxima fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFecharFatura}>Fechar Fatura</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
