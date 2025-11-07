'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Calendar, User, Filter, Search, CheckCircle, AlertCircle, Plus, DollarSign, CreditCard, MoreVertical, Edit2, Check, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { cn } from '@/lib/utils'

type Lancamento = Database['public']['Tables']['financeiro_contas_lancamentos']['Row']

interface LancamentosFilters {
  tipo: 'entrada' | 'saida' | 'transferencia' | 'todos'
  conta_bancaria_id: string
  periodo: 'semana' | 'mes' | 'trimestre' | 'todos'
  busca: string
}

interface NovaReceitaForm {
  cliente_id: string
  contrato_id: string
  descricao: string
  valor_total: string
  parcelado: boolean
  num_parcelas: string
  primeira_vencimento: string
  data_vencimento_unica: string
  categoria: 'honorario_contrato' | 'honorario_avulso' | 'exito'
  processo_id: string
  observacoes: string
}

interface NovaDespesaForm {
  fornecedor: string
  categoria: string
  descricao: string
  valor: string
  data_vencimento: string
  forma_pagamento: string
  observacoes: string
}

interface NovaTransferenciaForm {
  conta_origem_id: string
  conta_destino_id: string
  valor: string
  descricao: string
  data: string
}

interface LancamentoComConta extends Lancamento {
  conta_nome?: string
  conta_banco?: string
}

export default function ContasPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [lancamentos, setLancamentos] = useState<LancamentoComConta[]>([])
  const [filters, setFilters] = useState<LancamentosFilters>({
    tipo: 'todos',
    conta_bancaria_id: 'todas',
    periodo: 'todos',
    busca: '',
  })
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50

  // Estados dos modais
  const [modalReceitaOpen, setModalReceitaOpen] = useState(false)
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false)
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false)

  // Estados dos formulários
  const [receitaForm, setReceitaForm] = useState<NovaReceitaForm>({
    cliente_id: '',
    contrato_id: '',
    descricao: '',
    valor_total: '',
    parcelado: false,
    num_parcelas: '1',
    primeira_vencimento: '',
    data_vencimento_unica: '',
    categoria: 'honorario_contrato',
    processo_id: '',
    observacoes: '',
  })

  const [despesaForm, setDespesaForm] = useState<NovaDespesaForm>({
    fornecedor: '',
    categoria: 'fornecedor',
    descricao: '',
    valor: '',
    data_vencimento: '',
    forma_pagamento: 'transferencia',
    observacoes: '',
  })

  const [transferenciaForm, setTransferenciaForm] = useState<NovaTransferenciaForm>({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
  })

  const [clientes, setClientes] = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [processos, setProcessos] = useState<any[]>([])
  const [contasBancarias, setContasBancarias] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (escritorioAtivo) {
      setCurrentPage(1) // Reset página ao mudar filtros
    }
  }, [filters])

  useEffect(() => {
    if (escritorioAtivo) {
      loadLancamentos()
      loadClientes()
      loadProcessos()
      loadContasBancarias()
    }
  }, [escritorioAtivo, filters, currentPage])

  useEffect(() => {
    if (receitaForm.cliente_id) {
      loadContratos(receitaForm.cliente_id)
    }
  }, [receitaForm.cliente_id])

  const loadLancamentos = async () => {
    if (!escritorioAtivo) {
      console.log('loadLancamentos: escritorioAtivo não definido')
      return
    }

    console.log('loadLancamentos: iniciando...', { escritorioAtivo, filters })
    setLoading(true)
    try {
      // Primeiro buscar IDs das contas bancárias do escritório
      const { data: contasIds } = await supabase
        .from('financeiro_contas_bancarias')
        .select('id')
        .eq('escritorio_id', escritorioAtivo)

      console.log('loadLancamentos: contas do escritório', contasIds)

      if (!contasIds || contasIds.length === 0) {
        console.log('loadLancamentos: nenhuma conta bancária encontrada')
        setLancamentos([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      const contasIdsArray = contasIds.map(c => c.id)

      let query = supabase
        .from('financeiro_contas_lancamentos')
        .select(`
          *,
          financeiro_contas_bancarias(banco, agencia, numero_conta)
        `, { count: 'exact' })
        .in('conta_bancaria_id', contasIdsArray)

      // Aplicar filtros
      if (filters.tipo !== 'todos') {
        if (filters.tipo === 'transferencia') {
          query = query.eq('origem_tipo', 'transferencia')
        } else {
          query = query.eq('tipo', filters.tipo)
        }
      }

      if (filters.conta_bancaria_id !== 'todas') {
        query = query.eq('conta_bancaria_id', filters.conta_bancaria_id)
      }

      if (filters.busca) {
        query = query.ilike('descricao', `%${filters.busca}%`)
      }

      if (filters.periodo !== 'todos') {
        const hoje = new Date()
        let dataInicio = new Date()

        if (filters.periodo === 'semana') {
          dataInicio.setDate(hoje.getDate() - 7)
        } else if (filters.periodo === 'mes') {
          dataInicio.setMonth(hoje.getMonth() - 1)
        } else if (filters.periodo === 'trimestre') {
          dataInicio.setMonth(hoje.getMonth() - 3)
        }

        query = query.gte('data_lancamento', dataInicio.toISOString().split('T')[0])
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query
        .order('data_lancamento', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      console.log('loadLancamentos: resposta da query', { data, error, count, contasIdsArray })

      if (error) throw error

      // Processar dados para incluir info da conta
      const lancamentosProcessados = (data || []).map((lanc: any) => ({
        ...lanc,
        conta_nome: `${lanc.financeiro_contas_bancarias?.banco} - Ag ${lanc.financeiro_contas_bancarias?.agencia}`,
        conta_banco: lanc.financeiro_contas_bancarias?.numero_conta,
      }))

      console.log('loadLancamentos: lançamentos processados', lancamentosProcessados)

      setLancamentos(lancamentosProcessados)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const loadClientes = async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('clientes')
      .select('id, nome_completo, nome_fantasia')
      .eq('escritorio_id', escritorioAtivo)
      .order('nome_completo')
    setClientes(data || [])
  }

  const loadContratos = async (clienteId: string) => {
    if (!escritorioAtivo || !clienteId) return
    const { data } = await supabase
      .from('honorarios')
      .select('id, descricao, valor_total')
      .eq('escritorio_id', escritorioAtivo)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    setContratos(data || [])
  }

  const loadProcessos = async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('processos')
      .select('id, numero_processo, parte_contraria')
      .eq('escritorio_id', escritorioAtivo)
      .order('created_at', { ascending: false })
    setProcessos(data || [])
  }

  const loadContasBancarias = async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, agencia, numero_conta')
      .eq('escritorio_id', escritorioAtivo)
      .eq('ativa', true)
      .order('banco')
    setContasBancarias(data || [])
  }

  const handleSubmitReceita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioAtivo) return

    setSubmitting(true)
    try {
      // Criar honorário
      const { data: honorario, error: honorarioError } = await supabase
        .from('honorarios')
        .insert({
          escritorio_id: escritorioAtivo,
          cliente_id: receitaForm.cliente_id || null,
          processo_id: receitaForm.processo_id || null,
          descricao: receitaForm.descricao,
          valor_total: parseFloat(receitaForm.valor_total),
          categoria: receitaForm.categoria,
          observacoes: receitaForm.observacoes,
          status: 'ativo',
        })
        .select()
        .single()

      if (honorarioError) throw honorarioError

      // Criar parcelas
      if (receitaForm.parcelado && honorario) {
        const numParcelas = parseInt(receitaForm.num_parcelas)
        const valorParcela = parseFloat(receitaForm.valor_total) / numParcelas
        const parcelas = []

        for (let i = 0; i < numParcelas; i++) {
          const dataVencimento = new Date(receitaForm.primeira_vencimento)
          dataVencimento.setMonth(dataVencimento.getMonth() + i)

          parcelas.push({
            escritorio_id: escritorioAtivo,
            honorario_id: honorario.id,
            numero_parcela: i + 1,
            valor: valorParcela,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            status: 'pendente',
          })
        }

        const { error: parcelasError } = await supabase
          .from('honorarios_parcelas')
          .insert(parcelas)

        if (parcelasError) throw parcelasError
      } else if (honorario) {
        // Criar uma única parcela
        const { error: parcelaError } = await supabase
          .from('honorarios_parcelas')
          .insert({
            escritorio_id: escritorioAtivo,
            honorario_id: honorario.id,
            numero_parcela: 1,
            valor: parseFloat(receitaForm.valor_total),
            data_vencimento: receitaForm.data_vencimento_unica,
            status: 'pendente',
          })

        if (parcelaError) throw parcelaError
      }

      // Reset form e fechar modal
      setReceitaForm({
        cliente_id: '',
        contrato_id: '',
        descricao: '',
        valor_total: '',
        parcelado: false,
        num_parcelas: '1',
        primeira_vencimento: '',
        data_vencimento_unica: '',
        categoria: 'honorario_contrato',
        processo_id: '',
        observacoes: '',
      })
      setModalReceitaOpen(false)
      loadContas()
    } catch (error) {
      console.error('Erro ao criar receita:', error)
      alert('Erro ao criar receita. Verifique os campos e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitDespesa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioAtivo) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('despesas').insert({
        escritorio_id: escritorioAtivo,
        fornecedor: despesaForm.fornecedor,
        categoria: despesaForm.categoria,
        descricao: despesaForm.descricao,
        valor: parseFloat(despesaForm.valor),
        data_vencimento: despesaForm.data_vencimento,
        forma_pagamento: despesaForm.forma_pagamento,
        observacoes: despesaForm.observacoes,
        status: 'pendente',
      })

      if (error) throw error

      // Reset form e fechar modal
      setDespesaForm({
        fornecedor: '',
        categoria: 'fornecedor',
        descricao: '',
        valor: '',
        data_vencimento: '',
        forma_pagamento: 'transferencia',
        observacoes: '',
      })
      setModalDespesaOpen(false)
      loadContas()
    } catch (error) {
      console.error('Erro ao criar despesa:', error)
      alert('Erro ao criar despesa. Verifique os campos e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitTransferencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioAtivo) return

    setSubmitting(true)
    try {
      const user = await supabase.auth.getUser()
      const { error } = await supabase.rpc('transferir_entre_contas', {
        p_conta_origem_id: transferenciaForm.conta_origem_id,
        p_conta_destino_id: transferenciaForm.conta_destino_id,
        p_valor: parseFloat(transferenciaForm.valor),
        p_descricao: transferenciaForm.descricao || 'Transferência interna',
        p_user_id: user.data.user?.id,
      })

      if (error) throw error

      // Reset form e fechar modal
      setTransferenciaForm({
        conta_origem_id: '',
        conta_destino_id: '',
        valor: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
      })
      setModalTransferenciaOpen(false)
      loadLancamentos()
      alert('Transferência realizada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar transferência:', error)
      alert('Erro ao criar transferência. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Extrato Financeiro</h1>
          <p className="text-sm text-slate-600 mt-1">
            Todos os lançamentos financeiros do escritório
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Botão Nova Receita */}
          <Dialog open={modalReceitaOpen} onOpenChange={setModalReceitaOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] text-[#34495e] hover:from-[#7aacae] hover:to-[#9bbfc0] shadow-sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#34495e]">Nova Receita</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitReceita} className="space-y-4">
                {/* Cliente */}
                <div>
                  <Label htmlFor="cliente">Cliente</Label>
                  <select
                    id="cliente"
                    value={receitaForm.cliente_id}
                    onChange={(e) => setReceitaForm({ ...receitaForm, cliente_id: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_completo || c.nome_fantasia}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categoria */}
                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <select
                    id="categoria"
                    value={receitaForm.categoria}
                    onChange={(e) => setReceitaForm({ ...receitaForm, categoria: e.target.value as any })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="honorario_contrato">Honorário Contratual</option>
                    <option value="honorario_avulso">Honorário Avulso</option>
                    <option value="exito">Honorário de Êxito</option>
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    value={receitaForm.descricao}
                    onChange={(e) => setReceitaForm({ ...receitaForm, descricao: e.target.value })}
                    placeholder="Ex: Honorários advocatícios - Processo XYZ"
                    required
                  />
                </div>

                {/* Valor Total */}
                <div>
                  <Label htmlFor="valor_total">Valor Total *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={receitaForm.valor_total}
                    onChange={(e) => setReceitaForm({ ...receitaForm, valor_total: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>

                {/* Parcelado */}
                <div className="flex items-center gap-2">
                  <input
                    id="parcelado"
                    type="checkbox"
                    checked={receitaForm.parcelado}
                    onChange={(e) => setReceitaForm({ ...receitaForm, parcelado: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                  />
                  <Label htmlFor="parcelado" className="cursor-pointer">
                    Parcelar pagamento
                  </Label>
                </div>

                {/* Campos de Parcelamento */}
                {receitaForm.parcelado ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="num_parcelas">Número de Parcelas *</Label>
                      <Input
                        id="num_parcelas"
                        type="number"
                        min="2"
                        value={receitaForm.num_parcelas}
                        onChange={(e) => setReceitaForm({ ...receitaForm, num_parcelas: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="primeira_vencimento">Primeiro Vencimento *</Label>
                      <Input
                        id="primeira_vencimento"
                        type="date"
                        value={receitaForm.primeira_vencimento}
                        onChange={(e) => setReceitaForm({ ...receitaForm, primeira_vencimento: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="data_vencimento_unica">Data de Vencimento *</Label>
                    <Input
                      id="data_vencimento_unica"
                      type="date"
                      value={receitaForm.data_vencimento_unica}
                      onChange={(e) => setReceitaForm({ ...receitaForm, data_vencimento_unica: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Processo Vinculado */}
                <div>
                  <Label htmlFor="processo">Processo Vinculado (opcional)</Label>
                  <select
                    id="processo"
                    value={receitaForm.processo_id}
                    onChange={(e) => setReceitaForm({ ...receitaForm, processo_id: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="">Nenhum</option>
                    {processos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.numero_processo} - {p.parte_contraria}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Observações */}
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={receitaForm.observacoes}
                    onChange={(e) => setReceitaForm({ ...receitaForm, observacoes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalReceitaOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] text-[#34495e] hover:from-[#7aacae] hover:to-[#9bbfc0]"
                    disabled={submitting}
                  >
                    {submitting ? 'Salvando...' : 'Criar Receita'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Botão Nova Despesa */}
          <Dialog open={modalDespesaOpen} onOpenChange={setModalDespesaOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:from-[#2c3e50] hover:to-[#3d5469] shadow-sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#34495e]">Nova Despesa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitDespesa} className="space-y-4">
                {/* Fornecedor */}
                <div>
                  <Label htmlFor="fornecedor">Fornecedor/Destinatário *</Label>
                  <Input
                    id="fornecedor"
                    value={despesaForm.fornecedor}
                    onChange={(e) => setDespesaForm({ ...despesaForm, fornecedor: e.target.value })}
                    placeholder="Nome do fornecedor ou destinatário"
                    required
                  />
                </div>

                {/* Categoria */}
                <div>
                  <Label htmlFor="categoria_despesa">Categoria *</Label>
                  <select
                    id="categoria_despesa"
                    value={despesaForm.categoria}
                    onChange={(e) => setDespesaForm({ ...despesaForm, categoria: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="fornecedor">Fornecedor</option>
                    <option value="custas_processuais">Custas Processuais</option>
                    <option value="tributo">Tributo</option>
                    <option value="infraestrutura">Infraestrutura</option>
                    <option value="pessoal">Pessoal</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <Label htmlFor="descricao_despesa">Descrição *</Label>
                  <Input
                    id="descricao_despesa"
                    value={despesaForm.descricao}
                    onChange={(e) => setDespesaForm({ ...despesaForm, descricao: e.target.value })}
                    placeholder="Ex: Pagamento de custas judiciais"
                    required
                  />
                </div>

                {/* Valor */}
                <div>
                  <Label htmlFor="valor_despesa">Valor *</Label>
                  <Input
                    id="valor_despesa"
                    type="number"
                    step="0.01"
                    min="0"
                    value={despesaForm.valor}
                    onChange={(e) => setDespesaForm({ ...despesaForm, valor: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>

                {/* Data de Vencimento */}
                <div>
                  <Label htmlFor="data_vencimento_despesa">Data de Vencimento *</Label>
                  <Input
                    id="data_vencimento_despesa"
                    type="date"
                    value={despesaForm.data_vencimento}
                    onChange={(e) => setDespesaForm({ ...despesaForm, data_vencimento: e.target.value })}
                    required
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                  <select
                    id="forma_pagamento"
                    value={despesaForm.forma_pagamento}
                    onChange={(e) => setDespesaForm({ ...despesaForm, forma_pagamento: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>

                {/* Observações */}
                <div>
                  <Label htmlFor="observacoes_despesa">Observações</Label>
                  <Textarea
                    id="observacoes_despesa"
                    value={despesaForm.observacoes}
                    onChange={(e) => setDespesaForm({ ...despesaForm, observacoes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalDespesaOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:from-[#2c3e50] hover:to-[#3d5469]"
                    disabled={submitting}
                  >
                    {submitting ? 'Salvando...' : 'Criar Despesa'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Botão Nova Transferência */}
          <Dialog open={modalTransferenciaOpen} onOpenChange={setModalTransferenciaOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white hover:from-[#1a3475] hover:to-[#1c3a9b] shadow-sm">
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Transferir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-[#34495e]">Nova Transferência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitTransferencia} className="space-y-4">
                {/* Conta Origem */}
                <div>
                  <Label htmlFor="conta_origem">Conta Origem *</Label>
                  <select
                    id="conta_origem"
                    value={transferenciaForm.conta_origem_id}
                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, conta_origem_id: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    required
                  >
                    <option value="">Selecione a conta de origem</option>
                    {contasBancarias.map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.banco} - Ag {cb.agencia} - C/C {cb.numero_conta}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conta Destino */}
                <div>
                  <Label htmlFor="conta_destino">Conta Destino *</Label>
                  <select
                    id="conta_destino"
                    value={transferenciaForm.conta_destino_id}
                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, conta_destino_id: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    required
                  >
                    <option value="">Selecione a conta de destino</option>
                    {contasBancarias.map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.banco} - Ag {cb.agencia} - C/C {cb.numero_conta}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor */}
                <div>
                  <Label htmlFor="valor_transferencia">Valor *</Label>
                  <Input
                    id="valor_transferencia"
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferenciaForm.valor}
                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, valor: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <Label htmlFor="descricao_transferencia">Descrição</Label>
                  <Input
                    id="descricao_transferencia"
                    value={transferenciaForm.descricao}
                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, descricao: e.target.value })}
                    placeholder="Motivo da transferência (opcional)"
                  />
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalTransferenciaOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white hover:from-[#1a3475] hover:to-[#1c3a9b]"
                    disabled={submitting}
                  >
                    {submitting ? 'Transferindo...' : 'Transferir'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar na descrição..."
                value={filters.busca}
                onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
                className="pl-10"
              />
            </div>

            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
              <option value="transferencia">Transferências</option>
            </select>

            <select
              value={filters.conta_bancaria_id}
              onChange={(e) => setFilters({ ...filters, conta_bancaria_id: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todas">Todas as contas</option>
              {contasBancarias.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.banco} - {cb.numero_conta}
                </option>
              ))}
            </select>

            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="trimestre">Último trimestre</option>
              <option value="todos">Todos</option>
            </select>

            <Button
              onClick={loadLancamentos}
              variant="outline"
              className="border-slate-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extrato de Lançamentos */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">
              Lançamentos ({lancamentos.length} de {totalCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          {loading ? (
            <div className="py-12 text-center">
              <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Carregando...</p>
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-16">Tipo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-24">Data</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">Descrição</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-48">Conta</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-32">Categoria</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 w-32">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((lanc) => (
                    <tr
                      key={lanc.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      {/* Tipo */}
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0.5 font-medium',
                            lanc.tipo === 'entrada' && 'bg-emerald-50 border-emerald-200 text-emerald-700',
                            lanc.tipo === 'saida' && 'bg-red-50 border-red-200 text-red-700',
                            lanc.origem_tipo === 'transferencia' && 'bg-blue-50 border-blue-200 text-blue-700'
                          )}
                        >
                          {lanc.tipo === 'entrada'
                            ? 'Entrada'
                            : lanc.origem_tipo === 'transferencia'
                            ? 'Transfer'
                            : 'Saída'}
                        </Badge>
                      </td>

                      {/* Data */}
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-slate-700">
                          {new Date(lanc.data_lancamento + 'T00:00:00').toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="py-2.5 px-3">
                        <p className="text-xs font-medium text-slate-700">
                          {lanc.descricao}
                        </p>
                      </td>

                      {/* Conta */}
                      <td className="py-2.5 px-3">
                        <p className="text-xs text-slate-600">
                          {lanc.conta_nome}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {lanc.conta_banco}
                        </p>
                      </td>

                      {/* Categoria */}
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-slate-600 capitalize">
                          {lanc.origem_tipo === 'pagamento' ? 'Recebimento' :
                           lanc.origem_tipo === 'despesa' ? 'Despesa' :
                           lanc.origem_tipo === 'transferencia' ? 'Transferência' :
                           lanc.origem_tipo === 'manual' ? 'Manual' : lanc.origem_tipo}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-2.5 px-3 text-right">
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            lanc.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {lanc.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Number(lanc.valor))}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalCount > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} -{' '}
                {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-slate-600">
                  Página {currentPage} de {Math.ceil(totalCount / itemsPerPage)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
