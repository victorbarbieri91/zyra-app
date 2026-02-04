'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, Clock, DollarSign, Calendar, CheckCircle2, CreditCard, Banknote, Printer } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFaturamento } from '@/hooks/useFaturamento'
import type { FaturaGerada, ItemFatura } from '@/hooks/useFaturamento'
import { toast } from 'sonner'
import { formatHoras } from '@/lib/utils'

interface ContaBancaria {
  id: string
  banco: string
  agencia: string
  numero_conta: string
  saldo_atual: number
}

interface FaturaDetalhesPanelProps {
  fatura: FaturaGerada
  escritorioId: string | null
  onClose: () => void
  onPagamentoRealizado?: () => void
}

export function FaturaDetalhesPanel({ fatura, escritorioId, onClose, onPagamentoRealizado }: FaturaDetalhesPanelProps) {
  const router = useRouter()
  const { loadItensFatura, pagarFatura, loadContasBancarias, loading } = useFaturamento(escritorioId)
  const [itens, setItens] = useState<ItemFatura[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  // Estados para o modal de pagamento
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false)
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: fatura.valor_total.toString(),
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: 'pix',
    contaBancariaId: '',
    observacoes: '',
  })

  useEffect(() => {
    const fetchItens = async () => {
      setLoadingItens(true)
      console.log('🔍 Buscando itens da fatura:', fatura.fatura_id)
      const data = await loadItensFatura(fatura.fatura_id)
      console.log('📦 Itens recebidos:', data)
      setItens(data)
      setLoadingItens(false)
    }

    fetchItens()
  }, [fatura.fatura_id, loadItensFatura])

  // Carregar contas bancárias quando abrir o dialog de pagamento
  const handleOpenPagamentoDialog = async () => {
    const contas = await loadContasBancarias()
    setContasBancarias(contas)
    setPagamentoForm({
      valor: fatura.valor_total.toString(),
      dataPagamento: new Date().toISOString().split('T')[0],
      formaPagamento: 'pix',
      contaBancariaId: contas.length > 0 ? contas[0].id : '',
      observacoes: '',
    })
    setShowPagamentoDialog(true)
  }

  // Processar pagamento
  const handleConfirmarPagamento = async () => {
    const valorPago = parseFloat(pagamentoForm.valor)
    if (isNaN(valorPago) || valorPago <= 0) {
      toast.error('Valor inválido')
      return
    }

    const pagamentoId = await pagarFatura(
      fatura.fatura_id,
      valorPago,
      pagamentoForm.dataPagamento,
      pagamentoForm.formaPagamento,
      pagamentoForm.contaBancariaId || undefined,
      undefined,
      pagamentoForm.observacoes || undefined
    )

    if (pagamentoId) {
      toast.success('Pagamento registrado com sucesso! O valor foi lançado na conta bancária.')
      setShowPagamentoDialog(false)
      onPagamentoRealizado?.()
    } else {
      toast.error('Erro ao registrar pagamento. Tente novamente.')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const getStatusInfo = () => {
    switch (fatura.status) {
      case 'rascunho':
        return { label: 'Rascunho', color: 'bg-slate-100 text-slate-700' }
      case 'emitida':
        return { label: 'Emitida', color: 'bg-blue-100 text-blue-700' }
      case 'enviada':
        return { label: 'Enviada', color: 'bg-teal-100 text-teal-700' }
      case 'paga':
        return { label: 'Paga', color: 'bg-emerald-100 text-emerald-700' }
      case 'atrasada':
        return { label: 'Atrasada', color: 'bg-red-100 text-red-700' }
      case 'cancelada':
        return { label: 'Cancelada', color: 'bg-slate-100 text-slate-500' }
      default:
        return { label: 'Desconhecido', color: 'bg-slate-100 text-slate-700' }
    }
  }

  const statusInfo = getStatusInfo()
  const honorarios = itens.filter(i => i.tipo_item === 'honorario')
  const timesheet = itens.filter(i => i.tipo_item === 'timesheet')

  // Determinar aba padrão: se só tiver um tipo, mostrar ele; senão, mostrar honorários
  const getDefaultTab = () => {
    if (honorarios.length > 0 && timesheet.length === 0) return 'honorarios'
    if (timesheet.length > 0 && honorarios.length === 0) return 'horas'
    return 'honorarios' // Se tiver ambos ou nenhum, mostrar honorários
  }

  return (
    <Card className="border-slate-300 shadow-lg h-full flex flex-col bg-white">
      {/* Header - Estilo Nota Fiscal */}
      <div className="px-5 py-4 border-b-2 border-slate-300 bg-slate-50">
        {/* Linha do número da fatura - Fundo Azul */}
        <div className="flex items-start justify-between mb-4 -mx-5 -mt-4 px-5 py-3 bg-[#34495e]">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-white" />
            <div>
              <CardTitle className="text-lg font-bold text-white uppercase tracking-wide">
                {fatura.numero_fatura}
              </CardTitle>
              <p className="text-xs text-slate-200 mt-0.5">Fatura de Honorários</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 -mr-2 hover:bg-[#46627f] text-white hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Info do Cliente e Status */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-3">
          <div>
            <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Cliente</p>
            <p className="text-sm font-semibold text-[#34495e]">{fatura.cliente_nome}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Status</p>
            <Badge variant="secondary" className={`${statusInfo.color} text-xs`}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500 text-[10px]">Emissão: <span className="font-semibold text-slate-700">{formatDate(fatura.data_emissao)}</span></p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px]">Vencimento: <span className="font-semibold text-slate-700">{formatDate(fatura.data_vencimento)}</span></p>
          </div>
        </div>
      </div>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="px-5 py-4">
            {/* Seção: Discriminação dos Serviços */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-slate-300">
                Discriminação dos Serviços
              </h3>

              {loadingItens ? (
                <div className="py-8 text-center">
                  <Clock className="h-6 w-6 mx-auto text-slate-400 animate-spin mb-2" />
                  <p className="text-xs text-slate-500">Carregando itens...</p>
                </div>
              ) : itens.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600 mb-1">Nenhum item encontrado nesta fatura</p>
                  <p className="text-xs text-slate-500">
                    Os itens detalhados não foram localizados no banco de dados.
                    <br />
                    Fatura ID: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{fatura.fatura_id}</code>
                  </p>
                </div>
              ) : (
                <Tabs defaultValue={getDefaultTab()} className="w-full">
                  {/* Mostrar TabsList apenas se houver ambos os tipos */}
                  {honorarios.length > 0 && timesheet.length > 0 ? (
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100">
                      <TabsTrigger value="honorarios" className="text-xs data-[state=active]:bg-white">
                        Honorários ({honorarios.length})
                      </TabsTrigger>
                      <TabsTrigger value="horas" className="text-xs data-[state=active]:bg-white">
                        Horas Trabalhadas ({timesheet.length})
                      </TabsTrigger>
                    </TabsList>
                  ) : null}

                  <TabsContent value="honorarios" className="mt-0">
                    {honorarios.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">
                        Nenhum honorário nesta fatura
                      </p>
                    ) : (
                      <div className="space-y-0">
                        {/* Cabeçalho da Tabela */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 border-y border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                          <div className="col-span-7">Descrição</div>
                          <div className="col-span-2 text-center">Qtd</div>
                          <div className="col-span-3 text-right">Valor</div>
                        </div>

                        {/* Linhas de Itens */}
                        {honorarios.map((item, index) => (
                          <div
                            key={item.id}
                            className={`grid grid-cols-12 gap-2 px-3 py-2.5 text-xs border-b border-slate-100 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                            }`}
                          >
                            <div className="col-span-7 text-slate-700">
                              <p className="font-medium">{item.descricao}</p>
                              {item.valor_unitario && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {formatCurrency(item.valor_unitario)} / unidade
                                </p>
                              )}
                              {/* Detalhes do Processo - Descrição para o cliente */}
                              {item.processo_id && (item.processo_numero || item.processo_pasta || item.partes_resumo) && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                                  {item.processo_numero && (
                                    <p className="text-[10px] text-slate-500">
                                      Processo nº {item.processo_numero}
                                    </p>
                                  )}
                                  {!item.processo_numero && item.processo_pasta && (
                                    <p className="text-[10px] text-slate-500">
                                      Ref: {item.processo_pasta}
                                    </p>
                                  )}
                                  {item.partes_resumo && (
                                    <p className="text-[10px] text-slate-500 italic">
                                      {item.partes_resumo}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2 text-center text-slate-600 font-medium">
                              {item.quantidade || 1}
                            </div>
                            <div className="col-span-3 text-right font-semibold text-slate-700">
                              {formatCurrency(item.valor_total)}
                            </div>
                          </div>
                        ))}

                        {/* Subtotal */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-slate-100 border-b border-slate-200">
                          <div className="col-span-9 text-xs font-bold text-slate-700 uppercase text-right">
                            Subtotal Honorários:
                          </div>
                          <div className="col-span-3 text-right text-sm font-bold text-slate-700">
                            {formatCurrency(fatura.total_honorarios)}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="horas" className="mt-0">
                    {timesheet.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">
                        Nenhuma hora nesta fatura
                      </p>
                    ) : (
                      <div className="space-y-0">
                        {/* Cabeçalho da Tabela */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 border-y border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                          <div className="col-span-7">Descrição</div>
                          <div className="col-span-2 text-center">Horas</div>
                          <div className="col-span-3 text-right">Valor</div>
                        </div>

                        {/* Linhas de Itens */}
                        {timesheet.map((item, index) => (
                          <div
                            key={item.id}
                            className={`grid grid-cols-12 gap-2 px-3 py-2.5 text-xs border-b border-slate-100 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                            }`}
                          >
                            <div className="col-span-7 text-slate-700">
                              <p className="font-medium">{item.descricao}</p>
                              {/* Detalhes do Processo - Descrição para o cliente */}
                              {item.processo_id && (item.processo_numero || item.processo_pasta || item.partes_resumo) && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                                  {item.processo_numero && (
                                    <p className="text-[10px] text-slate-500">
                                      Processo nº {item.processo_numero}
                                    </p>
                                  )}
                                  {!item.processo_numero && item.processo_pasta && (
                                    <p className="text-[10px] text-slate-500">
                                      Ref: {item.processo_pasta}
                                    </p>
                                  )}
                                  {item.partes_resumo && (
                                    <p className="text-[10px] text-slate-500 italic">
                                      {item.partes_resumo}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2 text-center text-slate-600 font-medium">
                              {item.quantidade ? `${item.quantidade}h` : '-'}
                            </div>
                            <div className="col-span-3 text-right font-semibold text-slate-700">
                              {formatCurrency(item.valor_total)}
                            </div>
                          </div>
                        ))}

                        {/* Subtotal */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-slate-100 border-b border-slate-200">
                          <div className="col-span-9 text-xs font-bold text-slate-700 uppercase text-right">
                            Subtotal Horas ({formatHoras(fatura.soma_horas, 'curto')}):
                          </div>
                          <div className="col-span-3 text-right text-sm font-bold text-slate-700">
                            {formatCurrency(fatura.total_horas)}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {/* Valor Total - Destaque Final */}
            <div className="mb-4 pt-4 border-t-2 border-slate-300">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Valor Total da Fatura</p>
                <p className="text-3xl font-bold text-[#34495e]">
                  {formatCurrency(fatura.valor_total)}
                </p>
              </div>

              {/* Botão de Registrar Pagamento - Apenas se não estiver paga */}
              {fatura.status !== 'paga' && fatura.status !== 'cancelada' && (
                <div className="mt-4">
                  <Button
                    onClick={handleOpenPagamentoDialog}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Registrar Pagamento
                  </Button>
                </div>
              )}

              {/* Indicador de fatura paga */}
              {fatura.status === 'paga' && (
                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-4 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Fatura paga em {formatDate(fatura.paga_em!)}</span>
                </div>
              )}

              {/* Botão Imprimir PDF */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                  onClick={() => window.open(`/imprimir/fatura/${fatura.fatura_id}`, '_blank')}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir / Salvar PDF
                </Button>
              </div>
            </div>

            {/* Observações */}
            {fatura.observacoes && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Observações</p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {fatura.observacoes}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Dialog de Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Fatura {fatura.numero_fatura} - {fatura.cliente_nome}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Valor */}
            <div className="grid gap-2">
              <Label htmlFor="valor">Valor Pago</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={pagamentoForm.valor}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor: e.target.value })}
              />
            </div>

            {/* Data do Pagamento */}
            <div className="grid gap-2">
              <Label htmlFor="dataPagamento">Data do Pagamento</Label>
              <Input
                id="dataPagamento"
                type="date"
                value={pagamentoForm.dataPagamento}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, dataPagamento: e.target.value })}
              />
            </div>

            {/* Forma de Pagamento */}
            <div className="grid gap-2">
              <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
              <Select
                value={pagamentoForm.formaPagamento}
                onValueChange={(value) => setPagamentoForm({ ...pagamentoForm, formaPagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conta Bancária de Destino */}
            <div className="grid gap-2">
              <Label htmlFor="contaBancaria">Conta Bancária (Destino do Valor)</Label>
              <Select
                value={pagamentoForm.contaBancariaId}
                onValueChange={(value) => setPagamentoForm({ ...pagamentoForm, contaBancariaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.banco} - Ag: {conta.agencia} / CC: {conta.numero_conta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                O valor será lançado automaticamente como entrada nesta conta.
              </p>
            </div>

            {/* Observações */}
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Input
                id="observacoes"
                placeholder="Ex: Comprovante recebido por email"
                value={pagamentoForm.observacoes}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, observacoes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPagamento}
              disabled={loading || !pagamentoForm.valor || !pagamentoForm.contaBancariaId}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
