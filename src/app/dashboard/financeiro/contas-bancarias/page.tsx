'use client'

import { useState, useEffect } from 'react'
import { Building2, TrendingUp, TrendingDown, ArrowLeftRight, Plus, Minus, Calendar, Filter, Landmark } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { cn } from '@/lib/utils'

type ContaBancaria = Database['public']['Tables']['financeiro_contas_bancarias']['Row']
type Lancamento = Database['public']['Tables']['financeiro_contas_lancamentos']['Row']
type SaldoView = Database['public']['Views']['v_saldos_contas_bancarias']['Row']

interface TransferDialogData {
  contaOrigem: string
  contaDestino: string
  valor: string
  descricao: string
}

interface ManualDialogData {
  contaId: string
  tipo: 'entrada' | 'saida'
  valor: string
  descricao: string
  categoria: string
}

interface NovaContaForm {
  banco: string
  agencia: string
  numero_conta: string
  tipo_conta: 'corrente' | 'poupanca' | 'investimento'
  titular: string
  saldo_inicial: string
}

export default function ContasBancariasPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [contas, setContas] = useState<SaldoView[]>([])
  const [contaSelecionada, setContaSelecionada] = useState<string | null>(null)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [showNovaContaDialog, setShowNovaContaDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [transferData, setTransferData] = useState<TransferDialogData>({
    contaOrigem: '',
    contaDestino: '',
    valor: '',
    descricao: '',
  })
  const [manualData, setManualData] = useState<ManualDialogData>({
    contaId: '',
    tipo: 'entrada',
    valor: '',
    descricao: '',
    categoria: '',
  })
  const [novaContaForm, setNovaContaForm] = useState<NovaContaForm>({
    banco: '',
    agencia: '',
    numero_conta: '',
    tipo_conta: 'corrente',
    titular: '',
    saldo_inicial: '0',
  })
  const [dateFilter, setDateFilter] = useState<'semana' | 'mes' | 'todos'>('mes')

  useEffect(() => {
    if (escritorioAtivo) {
      loadContas()
    }
  }, [escritorioAtivo])

  useEffect(() => {
    if (contaSelecionada) {
      loadLancamentos(contaSelecionada)
    }
  }, [contaSelecionada, dateFilter])

  const loadContas = async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    try {
      // Usar tabela diretamente ao invés da view
      const { data, error } = await supabase
        .from('financeiro_contas_bancarias')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)
        .eq('ativa', true)
        .order('banco', { ascending: true })

      if (error) throw error
      setContas(data as any || [])
      if (data && data.length > 0 && !contaSelecionada) {
        setContaSelecionada(data[0].id!)
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLancamentos = async (contaId: string) => {
    try {
      let query = supabase
        .from('financeiro_contas_lancamentos')
        .select('*')
        .eq('conta_bancaria_id', contaId)

      if (dateFilter === 'semana') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('data_lancamento', weekAgo.toISOString())
      } else if (dateFilter === 'mes') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('data_lancamento', monthAgo.toISOString())
      }

      const { data, error } = await query.order('data_lancamento', { ascending: false })

      if (error) throw error
      setLancamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
    }
  }

  const handleTransfer = async () => {
    if (!transferData.contaOrigem || !transferData.contaDestino || !transferData.valor) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const user = await supabase.auth.getUser()
      const { error } = await supabase.rpc('transferir_entre_contas', {
        p_conta_origem_id: transferData.contaOrigem,
        p_conta_destino_id: transferData.contaDestino,
        p_valor: parseFloat(transferData.valor),
        p_descricao: transferData.descricao || 'Transferência interna',
        p_user_id: user.data.user?.id,
      })

      if (error) throw error

      alert('Transferência realizada com sucesso!')
      setShowTransferDialog(false)
      setTransferData({ contaOrigem: '', contaDestino: '', valor: '', descricao: '' })
      loadContas()
      if (contaSelecionada) loadLancamentos(contaSelecionada)
    } catch (error) {
      console.error('Erro ao realizar transferência:', error)
      alert('Erro ao realizar transferência')
    }
  }

  const handleManualEntry = async () => {
    if (!manualData.contaId || !manualData.valor || !manualData.descricao) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const user = await supabase.auth.getUser()
      const rpcName = manualData.tipo === 'entrada' ? 'lancar_entrada_manual' : 'lancar_saida_manual'

      const { error } = await supabase.rpc(rpcName, {
        p_conta_bancaria_id: manualData.contaId,
        p_valor: parseFloat(manualData.valor),
        p_descricao: manualData.descricao,
        p_categoria: manualData.categoria || 'outros',
        p_user_id: user.data.user?.id,
      })

      if (error) throw error

      alert('Lançamento realizado com sucesso!')
      setShowManualDialog(false)
      setManualData({ contaId: '', tipo: 'entrada', valor: '', descricao: '', categoria: '' })
      loadContas()
      if (contaSelecionada) loadLancamentos(contaSelecionada)
    } catch (error) {
      console.error('Erro ao realizar lançamento:', error)
      alert('Erro ao realizar lançamento')
    }
  }

  const handleNovaConta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioAtivo) return

    setSubmitting(true)
    try {
      // Criar conta bancária
      const { data: novaConta, error: contaError } = await supabase
        .from('financeiro_contas_bancarias')
        .insert({
          escritorio_id: escritorioAtivo,
          banco: novaContaForm.banco,
          agencia: novaContaForm.agencia,
          numero_conta: novaContaForm.numero_conta,
          tipo_conta: novaContaForm.tipo_conta,
          titular: novaContaForm.titular,
          saldo_inicial: parseFloat(novaContaForm.saldo_inicial),
          saldo_atual: parseFloat(novaContaForm.saldo_inicial),
          ativa: true,
        })
        .select()
        .single()

      if (contaError) throw contaError

      // Se tem saldo inicial, criar lançamento
      const saldoInicial = parseFloat(novaContaForm.saldo_inicial)
      if (saldoInicial !== 0 && novaConta) {
        const { error: lancamentoError } = await supabase
          .from('financeiro_contas_lancamentos')
          .insert({
            conta_bancaria_id: novaConta.id,
            tipo: saldoInicial > 0 ? 'entrada' : 'saida',
            valor: Math.abs(saldoInicial),
            descricao: 'Saldo inicial',
            data_lancamento: new Date().toISOString().split('T')[0],
            origem_tipo: 'manual',
            saldo_apos_lancamento: saldoInicial,
          })

        if (lancamentoError) throw lancamentoError
      }

      // Reset form e fechar modal
      setNovaContaForm({
        banco: '',
        agencia: '',
        numero_conta: '',
        tipo_conta: 'corrente',
        titular: '',
        saldo_inicial: '0',
      })
      setShowNovaContaDialog(false)
      loadContas()
      alert('Conta bancária criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar conta bancária:', error)
      alert('Erro ao criar conta bancária. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getTotalSaldos = () => {
    return contas.reduce((sum, c) => sum + (Number(c.saldo_atual) || 0), 0)
  }

  const contaAtiva = contas.find((c) => c.id === contaSelecionada)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Contas Bancárias</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão de contas bancárias e extratos virtuais
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button
            onClick={() => setShowNovaContaDialog(true)}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white border-0 shadow-sm"
          >
            <Landmark className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
          <Button
            onClick={() => {
              setManualData({ ...manualData, tipo: 'entrada', contaId: contaSelecionada || '' })
              setShowManualDialog(true)
            }}
            className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] text-[#34495e] border-0 shadow-sm"
            disabled={!contaSelecionada}
          >
            <Plus className="h-4 w-4 mr-2" />
            Entrada
          </Button>
          <Button
            onClick={() => {
              setManualData({ ...manualData, tipo: 'saida', contaId: contaSelecionada || '' })
              setShowManualDialog(true)
            }}
            className="bg-gradient-to-r from-[#46627f] to-[#6c757d] text-white border-0 shadow-sm"
            disabled={!contaSelecionada}
          >
            <Minus className="h-4 w-4 mr-2" />
            Saída
          </Button>
          <Button
            onClick={() => setShowTransferDialog(true)}
            className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white border-0 shadow-sm"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transferir
          </Button>
        </div>
      </div>

      {/* Saldo Total */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#34495e]">Saldo Total</p>
              <p className="text-2xl font-bold text-[#34495e] mt-1">
                {formatCurrency(getTotalSaldos())}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/40 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#34495e]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contas Bancárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center">
            <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-2">Carregando...</p>
          </div>
        ) : contas.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm text-slate-500 mt-2">Nenhuma conta cadastrada</p>
          </div>
        ) : (
          contas.map((conta) => (
            <Card
              key={conta.id}
              className={cn(
                'border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-lg',
                contaSelecionada === conta.id && 'ring-2 ring-[#1E3A8A] border-[#1E3A8A]'
              )}
              onClick={() => setContaSelecionada(conta.id!)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                      {conta.banco}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ag {conta.agencia} - C/C {conta.numero_conta}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-600">Saldo Atual</p>
                      <p className="text-base font-bold text-[#34495e] mt-0.5">
                        {formatCurrency(Number(conta.saldo_atual))}
                      </p>
                    </div>
                    {conta.total_entradas || conta.total_saidas ? (
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-emerald-600">Entradas</p>
                          <p className="text-xs font-semibold text-emerald-700">
                            {formatCurrency(Number(conta.total_entradas))}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-red-600">Saídas</p>
                          <p className="text-xs font-semibold text-red-700">
                            {formatCurrency(Number(conta.total_saidas))}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {conta.ativa ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                      Inativa
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Extrato */}
      {contaSelecionada && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">
                Extrato - {contaAtiva?.banco} ({contaAtiva?.numero_conta})
              </CardTitle>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mês</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            {lancamentos.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-slate-300" />
                <p className="text-sm text-slate-500 mt-2">Nenhum lançamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lancamentos.map((lanc) => (
                  <div
                    key={lanc.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      lanc.tipo === 'entrada' || lanc.tipo === 'transferencia_recebida'
                        ? 'border-emerald-100 bg-emerald-50/50'
                        : 'border-red-100 bg-red-50/50'
                    )}
                  >
                    {/* Ícone */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        lanc.tipo === 'entrada' || lanc.tipo === 'transferencia_recebida'
                          ? 'bg-emerald-200'
                          : 'bg-red-200'
                      )}
                    >
                      {lanc.tipo === 'transferencia_enviada' || lanc.tipo === 'transferencia_recebida' ? (
                        <ArrowLeftRight
                          className={cn(
                            'h-5 w-5',
                            lanc.tipo === 'transferencia_recebida' ? 'text-emerald-700' : 'text-red-700'
                          )}
                        />
                      ) : lanc.tipo === 'entrada' ? (
                        <TrendingUp className="h-5 w-5 text-emerald-700" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-700" />
                      )}
                    </div>

                    <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                      {/* Descrição */}
                      <div className="col-span-5">
                        <p className="text-sm font-semibold text-slate-700">
                          {lanc.descricao}
                        </p>
                        <p className="text-xs text-slate-600">
                          {lanc.categoria || 'Sem categoria'}
                        </p>
                      </div>

                      {/* Data */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-600">
                            {new Date(lanc.data_lancamento).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(lanc.data_lancamento).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* Valor */}
                      <div className="col-span-2 text-right">
                        <p
                          className={cn(
                            'text-base font-bold',
                            lanc.tipo === 'entrada' || lanc.tipo === 'transferencia_recebida'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          )}
                        >
                          {lanc.tipo === 'entrada' || lanc.tipo === 'transferencia_recebida' ? '+' : '-'}
                          {formatCurrency(Number(lanc.valor))}
                        </p>
                      </div>

                      {/* Saldo após */}
                      <div className="col-span-2 text-right">
                        <p className="text-[10px] text-slate-500">Saldo após</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatCurrency(Number(lanc.saldo_apos_lancamento))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Transferência */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-slate-200 shadow-lg">
            <CardHeader className="pb-2 pt-3 bg-gradient-to-br from-[#34495e] to-[#46627f]">
              <CardTitle className="text-sm font-medium text-white">Transferir entre Contas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Conta Origem</label>
                <select
                  value={transferData.contaOrigem}
                  onChange={(e) => setTransferData({ ...transferData, contaOrigem: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                >
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id!}>
                      {c.banco} - {c.numero_conta} - {formatCurrency(Number(c.saldo_atual))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Conta Destino</label>
                <select
                  value={transferData.contaDestino}
                  onChange={(e) => setTransferData({ ...transferData, contaDestino: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                >
                  <option value="">Selecione...</option>
                  {contas
                    .filter((c) => c.conta_id !== transferData.contaOrigem)
                    .map((c) => (
                      <option key={c.conta_id} value={c.conta_id!}>
                        {c.nome_conta} - {formatCurrency(Number(c.saldo_atual))}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Valor</label>
                <Input
                  type="number"
                  step="0.01"
                  value={transferData.valor}
                  onChange={(e) => setTransferData({ ...transferData, valor: e.target.value })}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Descrição</label>
                <Input
                  value={transferData.descricao}
                  onChange={(e) => setTransferData({ ...transferData, descricao: e.target.value })}
                  placeholder="Descrição da transferência"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  onClick={() => setShowTransferDialog(false)}
                  variant="outline"
                  className="flex-1 border-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleTransfer}
                  className="flex-1 bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white border-0"
                >
                  Transferir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Lançamento Manual */}
      {showManualDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-slate-200 shadow-lg">
            <CardHeader
              className={cn(
                'pb-2 pt-3',
                manualData.tipo === 'entrada'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700'
                  : 'bg-gradient-to-br from-red-600 to-red-700'
              )}
            >
              <CardTitle className="text-sm font-medium text-white">
                Lançamento Manual - {manualData.tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Conta</label>
                <select
                  value={manualData.contaId}
                  onChange={(e) => setManualData({ ...manualData, contaId: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                >
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id!}>
                      {c.banco} - {c.numero_conta} - {formatCurrency(Number(c.saldo_atual))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Valor</label>
                <Input
                  type="number"
                  step="0.01"
                  value={manualData.valor}
                  onChange={(e) => setManualData({ ...manualData, valor: e.target.value })}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Descrição</label>
                <Input
                  value={manualData.descricao}
                  onChange={(e) => setManualData({ ...manualData, descricao: e.target.value })}
                  placeholder="Descrição do lançamento"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Categoria</label>
                <Input
                  value={manualData.categoria}
                  onChange={(e) => setManualData({ ...manualData, categoria: e.target.value })}
                  placeholder="Ex: receita_honorario, despesa_operacional"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  onClick={() => setShowManualDialog(false)}
                  variant="outline"
                  className="flex-1 border-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleManualEntry}
                  className={cn(
                    'flex-1 text-white border-0',
                    manualData.tipo === 'entrada'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                      : 'bg-gradient-to-r from-red-600 to-red-700'
                  )}
                >
                  Lançar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Nova Conta Bancária */}
      <Dialog open={showNovaContaDialog} onOpenChange={setShowNovaContaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Nova Conta Bancária</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNovaConta} className="space-y-4">
            {/* Banco */}
            <div>
              <Label htmlFor="banco">Banco *</Label>
              <Input
                id="banco"
                value={novaContaForm.banco}
                onChange={(e) => setNovaContaForm({ ...novaContaForm, banco: e.target.value })}
                placeholder="Ex: Banco do Brasil, Itaú, Bradesco"
                required
              />
            </div>

            {/* Agência e Número */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  value={novaContaForm.agencia}
                  onChange={(e) => setNovaContaForm({ ...novaContaForm, agencia: e.target.value })}
                  placeholder="0000"
                />
              </div>
              <div>
                <Label htmlFor="numero_conta">Número da Conta</Label>
                <Input
                  id="numero_conta"
                  value={novaContaForm.numero_conta}
                  onChange={(e) => setNovaContaForm({ ...novaContaForm, numero_conta: e.target.value })}
                  placeholder="00000-0"
                />
              </div>
            </div>

            {/* Titular */}
            <div>
              <Label htmlFor="titular">Titular *</Label>
              <Input
                id="titular"
                value={novaContaForm.titular}
                onChange={(e) => setNovaContaForm({ ...novaContaForm, titular: e.target.value })}
                placeholder="Nome do titular da conta"
                required
              />
            </div>

            {/* Tipo de Conta */}
            <div>
              <Label htmlFor="tipo_conta">Tipo de Conta *</Label>
              <select
                id="tipo_conta"
                value={novaContaForm.tipo_conta}
                onChange={(e) => setNovaContaForm({ ...novaContaForm, tipo_conta: e.target.value as any })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="investimento">Investimento</option>
              </select>
            </div>

            {/* Saldo Inicial */}
            <div>
              <Label htmlFor="saldo_inicial">Saldo Inicial</Label>
              <Input
                id="saldo_inicial"
                type="number"
                step="0.01"
                value={novaContaForm.saldo_inicial}
                onChange={(e) => setNovaContaForm({ ...novaContaForm, saldo_inicial: e.target.value })}
                placeholder="0,00"
              />
              <p className="text-xs text-slate-500 mt-1">
                Informe o saldo atual da conta. Será registrado como lançamento inicial.
              </p>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNovaContaDialog(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:from-[#2c3e50] hover:to-[#3d5469]"
                disabled={submitting}
              >
                {submitting ? 'Criando...' : 'Criar Conta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
