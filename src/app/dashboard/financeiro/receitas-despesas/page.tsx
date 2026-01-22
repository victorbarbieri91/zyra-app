'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Loader2,
  Plus,
  FileText,
  Check,
  CalendarDays,
  Eye,
  Banknote,
  ArrowLeftRight,
} from 'lucide-react'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ExtratoItem {
  id: string
  escritorio_id: string
  tipo_movimento: 'receita' | 'despesa'
  status: 'pendente' | 'efetivado' | 'vencido' | 'cancelado'
  origem: string
  categoria: string
  descricao: string
  valor: number
  valor_pago: number | null
  data_referencia: string
  data_vencimento: string | null
  data_efetivacao: string | null
  entidade: string | null
  conta_bancaria_id: string | null
  origem_id: string | null
  processo_id: string | null
  cliente_id: string | null
}

const CATEGORIA_LABELS: Record<string, string> = {
  honorario: 'Honorário',
  honorario_contrato: 'Honorário',
  honorario_avulso: 'Avulso',
  exito: 'Êxito',
  fatura: 'Fatura',
  custas: 'Custas',
  fornecedor: 'Fornecedor',
  folha: 'Folha',
  impostos: 'Impostos',
  aluguel: 'Aluguel',
  marketing: 'Marketing',
  tecnologia: 'Tecnologia',
  assinatura: 'Assinatura',
  cartao_credito: 'Cartão',
  outras: 'Outras',
  infraestrutura: 'Infra',
  pessoal: 'Pessoal',
  despesa: 'Despesa',
  avulso: 'Avulso',
  parcela: 'Parcela',
  saldo: 'Saldo',
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

export default function ExtratoFinanceiroPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [extrato, setExtrato] = useState<ExtratoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Filtros
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendente' | 'vencido' | 'efetivado'>('todos')
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Modais
  const [modalRecebimentoParcial, setModalRecebimentoParcial] = useState<ExtratoItem | null>(null)
  const [modalAlterarVencimento, setModalAlterarVencimento] = useState<ExtratoItem | null>(null)
  const [modalDetalhes, setModalDetalhes] = useState<ExtratoItem | null>(null)
  const [modalTransferencia, setModalTransferencia] = useState(false)

  // Form states
  const [valorParcial, setValorParcial] = useState('')
  const [novaDataVencimento, setNovaDataVencimento] = useState('')
  const [contaSelecionada, setContaSelecionada] = useState('')
  const [contasBancarias, setContasBancarias] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Transferência
  const [transferenciaForm, setTransferenciaForm] = useState({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: '',
    descricao: '',
  })

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchQuery])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [tipoFiltro, statusFiltro, mostrarHistorico])

  // Load data
  const loadExtrato = useCallback(async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      const { data: viewData, error: viewError } = await supabase
        .from('v_extrato_financeiro')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)

      if (viewError) {
        console.error('Erro ao carregar view:', viewError)
        toast.error('Erro ao carregar extrato')
        return
      }

      let combinedData: ExtratoItem[] = (viewData || []).map((item: any) => ({
        id: item.id,
        escritorio_id: item.escritorio_id,
        tipo_movimento: item.tipo_movimento as 'receita' | 'despesa',
        status: item.status === 'parcial' ? 'efetivado' : item.status,
        origem: item.origem,
        categoria: item.categoria,
        descricao: item.descricao,
        valor: Number(item.valor) || 0,
        valor_pago: item.valor_pago ? Number(item.valor_pago) : null,
        data_referencia: item.data_referencia,
        data_vencimento: item.data_vencimento,
        data_efetivacao: item.data_efetivacao,
        entidade: item.entidade,
        conta_bancaria_id: item.conta_bancaria_id,
        origem_id: item.origem_id,
        processo_id: item.processo_id,
        cliente_id: item.cliente_id,
      }))

      // Filtros
      if (tipoFiltro !== 'todos') {
        combinedData = combinedData.filter((item) => item.tipo_movimento === tipoFiltro)
      }

      if (statusFiltro !== 'todos') {
        combinedData = combinedData.filter((item) => item.status === statusFiltro)
      }

      if (debouncedSearch) {
        const termo = debouncedSearch.toLowerCase()
        combinedData = combinedData.filter(
          (item) =>
            item.descricao?.toLowerCase().includes(termo) ||
            item.entidade?.toLowerCase().includes(termo)
        )
      }

      // Filtrar histórico
      if (!mostrarHistorico) {
        combinedData = combinedData.filter((item) => {
          if (item.status === 'vencido' || item.status === 'pendente') return true
          if (item.status === 'efetivado' && item.data_efetivacao) {
            return item.data_efetivacao >= hoje
          }
          return false
        })
      }

      // Ordenação: vencidos primeiro (mais antigo primeiro), depois por data crescente
      combinedData.sort((a, b) => {
        if (a.status === 'vencido' && b.status !== 'vencido') return -1
        if (b.status === 'vencido' && a.status !== 'vencido') return 1
        if (a.status === 'vencido' && b.status === 'vencido') {
          return new Date(a.data_vencimento || a.data_referencia).getTime() -
            new Date(b.data_vencimento || b.data_referencia).getTime()
        }
        const dataA = new Date(a.data_vencimento || a.data_referencia).getTime()
        const dataB = new Date(b.data_vencimento || b.data_referencia).getTime()
        return dataA - dataB
      })

      const totalFiltered = combinedData.length
      const from = (currentPage - 1) * pageSize
      const paginatedData = combinedData.slice(from, from + pageSize)

      setExtrato(paginatedData)
      setTotalCount(totalFiltered)
    } catch (error) {
      console.error('Erro ao carregar extrato:', error)
      toast.error('Erro ao carregar extrato')
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, tipoFiltro, statusFiltro, debouncedSearch, mostrarHistorico, currentPage, pageSize, supabase])

  const loadContasBancarias = useCallback(async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, numero_conta')
      .eq('escritorio_id', escritorioAtivo)
      .eq('ativa', true)
    setContasBancarias(data || [])
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    if (escritorioAtivo) {
      loadExtrato()
      loadContasBancarias()
    }
  }, [escritorioAtivo, loadExtrato, loadContasBancarias])

  // Handlers
  const handleReceberTotal = async (item: ExtratoItem, contaId: string) => {
    if (!contaId || !escritorioAtivo) {
      toast.error('Selecione uma conta bancária')
      return
    }

    try {
      const { data: conta } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual')
        .eq('id', contaId)
        .single()

      const novoSaldo = (conta?.saldo_atual || 0) + Number(item.valor)

      await supabase.from('financeiro_contas_lancamentos').insert({
        escritorio_id: escritorioAtivo,
        conta_bancaria_id: contaId,
        tipo: 'entrada',
        valor: item.valor,
        descricao: item.descricao,
        categoria: item.categoria,
        data_lancamento: new Date().toISOString().split('T')[0],
        origem_tipo: 'receita',
        origem_id: item.origem_id,
        saldo_apos_lancamento: novoSaldo,
      })

      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldo })
        .eq('id', contaId)

      if (item.origem === 'fatura') {
        await supabase
          .from('financeiro_faturamento_faturas')
          .update({ status: 'paga', paga_em: new Date().toISOString() })
          .eq('id', item.origem_id)
      } else {
        await supabase
          .from('financeiro_receitas')
          .update({
            status: 'pago',
            valor_pago: item.valor,
            data_pagamento: new Date().toISOString().split('T')[0],
            conta_bancaria_id: contaId,
          })
          .eq('id', item.origem_id)
      }

      toast.success('Receita recebida!')
      loadExtrato()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao receber')
    }
  }

  const handlePagarDespesa = async (item: ExtratoItem, contaId: string) => {
    if (!contaId || !escritorioAtivo) {
      toast.error('Selecione uma conta bancária')
      return
    }

    try {
      const { data: conta } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual')
        .eq('id', contaId)
        .single()

      const novoSaldo = (conta?.saldo_atual || 0) - Number(item.valor)

      await supabase.from('financeiro_contas_lancamentos').insert({
        escritorio_id: escritorioAtivo,
        conta_bancaria_id: contaId,
        tipo: 'saida',
        valor: item.valor,
        descricao: item.descricao,
        categoria: item.categoria,
        data_lancamento: new Date().toISOString().split('T')[0],
        origem_tipo: 'despesa',
        origem_id: item.origem_id,
        saldo_apos_lancamento: novoSaldo,
      })

      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldo })
        .eq('id', contaId)

      await supabase
        .from('financeiro_despesas')
        .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
        .eq('id', item.origem_id)

      toast.success('Despesa paga!')
      loadExtrato()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao pagar')
    }
  }

  const handleRecebimentoParcial = async () => {
    if (!modalRecebimentoParcial || !contaSelecionada || !valorParcial) {
      toast.error('Preencha todos os campos')
      return
    }

    const item = modalRecebimentoParcial
    const valorRecebido = parseFloat(valorParcial)

    if (valorRecebido <= 0 || valorRecebido >= item.valor) {
      toast.error('Valor inválido')
      return
    }

    try {
      setSubmitting(true)

      const { data: conta } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual')
        .eq('id', contaSelecionada)
        .single()

      const novoSaldo = (conta?.saldo_atual || 0) + valorRecebido
      const valorRestante = item.valor - valorRecebido

      await supabase.from('financeiro_contas_lancamentos').insert({
        escritorio_id: escritorioAtivo,
        conta_bancaria_id: contaSelecionada,
        tipo: 'entrada',
        valor: valorRecebido,
        descricao: `Parcial - ${item.descricao}`,
        categoria: item.categoria,
        data_lancamento: new Date().toISOString().split('T')[0],
        origem_tipo: 'receita',
        origem_id: item.origem_id,
        saldo_apos_lancamento: novoSaldo,
      })

      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldo })
        .eq('id', contaSelecionada)

      await supabase
        .from('financeiro_receitas')
        .update({
          status: 'parcial',
          valor_pago: valorRecebido,
          data_pagamento: new Date().toISOString().split('T')[0],
          conta_bancaria_id: contaSelecionada,
        })
        .eq('id', item.origem_id)

      await supabase.from('financeiro_receitas').insert({
        escritorio_id: escritorioAtivo,
        tipo: 'saldo',
        cliente_id: item.cliente_id,
        processo_id: item.processo_id,
        receita_origem_id: item.origem_id,
        descricao: `Saldo - ${item.descricao}`,
        categoria: item.categoria,
        valor: valorRestante,
        data_competencia: new Date().toISOString().split('T')[0].substring(0, 7) + '-01',
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pendente',
      })

      toast.success('Recebimento parcial registrado')
      setModalRecebimentoParcial(null)
      setValorParcial('')
      setContaSelecionada('')
      loadExtrato()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAlterarVencimento = async () => {
    if (!modalAlterarVencimento || !novaDataVencimento) {
      toast.error('Selecione uma data')
      return
    }

    const item = modalAlterarVencimento

    try {
      setSubmitting(true)

      if (item.tipo_movimento === 'receita') {
        if (item.origem === 'fatura') {
          await supabase
            .from('financeiro_faturamento_faturas')
            .update({ data_vencimento: novaDataVencimento })
            .eq('id', item.origem_id)
        } else {
          await supabase
            .from('financeiro_receitas')
            .update({ data_vencimento: novaDataVencimento })
            .eq('id', item.origem_id)
        }
      } else {
        await supabase
          .from('financeiro_despesas')
          .update({ data_vencimento: novaDataVencimento })
          .eq('id', item.origem_id)
      }

      toast.success('Vencimento alterado')
      setModalAlterarVencimento(null)
      setNovaDataVencimento('')
      loadExtrato()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao alterar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTransferencia = async () => {
    if (!transferenciaForm.conta_origem_id || !transferenciaForm.conta_destino_id || !transferenciaForm.valor) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (transferenciaForm.conta_origem_id === transferenciaForm.conta_destino_id) {
      toast.error('Conta de origem e destino devem ser diferentes')
      return
    }

    const valorTransf = parseFloat(transferenciaForm.valor)
    if (valorTransf <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }

    try {
      setSubmitting(true)

      // Buscar saldos atuais
      const { data: contaOrigem } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual, banco, numero_conta')
        .eq('id', transferenciaForm.conta_origem_id)
        .single()

      const { data: contaDestino } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual, banco, numero_conta')
        .eq('id', transferenciaForm.conta_destino_id)
        .single()

      if (!contaOrigem || !contaDestino) {
        toast.error('Erro ao buscar contas')
        return
      }

      const novoSaldoOrigem = (contaOrigem.saldo_atual || 0) - valorTransf
      const novoSaldoDestino = (contaDestino.saldo_atual || 0) + valorTransf

      const descricaoTransf = transferenciaForm.descricao || `Transferência entre contas`

      // Lançamento de saída na conta origem
      await supabase.from('financeiro_contas_lancamentos').insert({
        escritorio_id: escritorioAtivo,
        conta_bancaria_id: transferenciaForm.conta_origem_id,
        tipo: 'saida',
        valor: valorTransf,
        descricao: `${descricaoTransf} → ${contaDestino.banco}`,
        categoria: 'transferencia',
        data_lancamento: new Date().toISOString().split('T')[0],
        origem_tipo: 'transferencia',
        saldo_apos_lancamento: novoSaldoOrigem,
      })

      // Lançamento de entrada na conta destino
      await supabase.from('financeiro_contas_lancamentos').insert({
        escritorio_id: escritorioAtivo,
        conta_bancaria_id: transferenciaForm.conta_destino_id,
        tipo: 'entrada',
        valor: valorTransf,
        descricao: `${descricaoTransf} ← ${contaOrigem.banco}`,
        categoria: 'transferencia',
        data_lancamento: new Date().toISOString().split('T')[0],
        origem_tipo: 'transferencia',
        saldo_apos_lancamento: novoSaldoDestino,
      })

      // Atualizar saldos
      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldoOrigem })
        .eq('id', transferenciaForm.conta_origem_id)

      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldoDestino })
        .eq('id', transferenciaForm.conta_destino_id)

      toast.success('Transferência realizada!')
      setModalTransferencia(false)
      setTransferenciaForm({ conta_origem_id: '', conta_destino_id: '', valor: '', descricao: '' })
      loadExtrato()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao transferir')
    } finally {
      setSubmitting(false)
    }
  }

  // Helpers
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  const formatDateFull = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')

  const getDiasVencimento = (dataVencimento: string | null) => {
    if (!dataVencimento) return null
    const venc = new Date(dataVencimento + 'T00:00:00')
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getVencimentoLabel = (dias: number | null) => {
    if (dias === null) return ''
    if (dias < 0) return `${Math.abs(dias)}d atraso`
    if (dias === 0) return 'Hoje'
    if (dias === 1) return 'Amanhã'
    return `${dias}d`
  }

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Receitas e Despesas</h1>
          <p className="text-sm text-slate-600 mt-0.5 font-normal">
            {loading ? 'Carregando...' : `${totalCount} lançamentos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.location.href = '/dashboard/financeiro/receitas-despesas?tipo=receita'}
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Receita
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = '/dashboard/financeiro/receitas-despesas?tipo=despesa'}
          >
            <Plus className="w-4 h-4 mr-1" />
            Despesa
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTransferenciaForm({
                conta_origem_id: contasBancarias[0]?.id || '',
                conta_destino_id: '',
                valor: '',
                descricao: '',
              })
              setModalTransferencia(true)
            }}
          >
            <ArrowLeftRight className="w-4 h-4 mr-1" />
            Transferir
          </Button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              {loading && searchQuery ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <Input
                placeholder="Buscar por descrição ou entidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#89bcbe]"
            >
              <option value="todos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#89bcbe]"
            >
              <option value="todos">Status: Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="vencido">Vencidos</option>
              <option value="efetivado">Efetivados</option>
            </select>

            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarHistorico}
                onChange={(e) => setMostrarHistorico(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-slate-600">Mostrar histórico</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-24">Venc.</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Descrição</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-44">Entidade</th>
                <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-24">Categ.</th>
                <th className="text-right p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-32">Valor</th>
                <th className="text-center p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-20">Ações</th>
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-50' : ''}>
              {loading && extrato.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
                      <span className="text-sm text-slate-600">Carregando...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && extrato.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <p className="text-sm text-slate-600">Nenhum lançamento encontrado</p>
                    </div>
                  </td>
                </tr>
              )}

              {extrato.map((item) => {
                const diasVenc = getDiasVencimento(item.data_vencimento)
                const isVencido = item.status === 'vencido' || (diasVenc !== null && diasVenc < 0)
                const isPendente = item.status === 'pendente' || item.status === 'vencido'

                return (
                  <tr
                    key={`${item.origem}-${item.id}`}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {/* Vencimento */}
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium ${isVencido ? 'text-red-600' : 'text-slate-700'}`}>
                          {item.data_vencimento ? formatDate(item.data_vencimento) : '-'}
                        </span>
                        {isPendente && diasVenc !== null && (
                          <span className={`text-[10px] ${isVencido ? 'text-red-500' : 'text-slate-400'}`}>
                            {getVencimentoLabel(diasVenc)}
                          </span>
                        )}
                        {item.status === 'efetivado' && item.data_efetivacao && (
                          <span className="text-[10px] text-emerald-600">
                            Pago {formatDate(item.data_efetivacao)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Descrição */}
                    <td className="p-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">{item.descricao}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.origem === 'fatura' ? 'Fatura' : item.tipo_movimento === 'receita' ? 'Receita' : 'Despesa'}
                        </p>
                      </div>
                    </td>

                    {/* Entidade */}
                    <td className="p-3">
                      <span className="text-xs text-slate-600 truncate block">{item.entidade || '-'}</span>
                    </td>

                    {/* Categoria */}
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {CATEGORIA_LABELS[item.categoria] || item.categoria}
                      </Badge>
                    </td>

                    {/* Valor */}
                    <td className="p-3 text-right">
                      <span className={`text-sm font-medium ${item.tipo_movimento === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {item.tipo_movimento === 'receita' ? '+' : '-'} {formatCurrency(item.valor)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="p-3 text-center">
                      {isPendente ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {/* Receber/Pagar */}
                            {contasBancarias.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (contasBancarias.length === 1) {
                                    item.tipo_movimento === 'receita'
                                      ? handleReceberTotal(item, contasBancarias[0].id)
                                      : handlePagarDespesa(item, contasBancarias[0].id)
                                  } else {
                                    setContaSelecionada(contasBancarias[0].id)
                                    // Para múltiplas contas, abrir modal de seleção
                                    if (item.tipo_movimento === 'receita') {
                                      handleReceberTotal(item, contasBancarias[0].id)
                                    } else {
                                      handlePagarDespesa(item, contasBancarias[0].id)
                                    }
                                  }
                                }}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                {item.tipo_movimento === 'receita' ? 'Receber' : 'Pagar'}
                              </DropdownMenuItem>
                            )}

                            {/* Recebimento Parcial */}
                            {item.tipo_movimento === 'receita' && item.origem !== 'fatura' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setModalRecebimentoParcial(item)
                                  setValorParcial('')
                                  setContaSelecionada(contasBancarias[0]?.id || '')
                                }}
                              >
                                <Banknote className="w-4 h-4 mr-2" />
                                Receber Parcial
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Alterar Vencimento */}
                            <DropdownMenuItem
                              onClick={() => {
                                setModalAlterarVencimento(item)
                                setNovaDataVencimento(item.data_vencimento || '')
                              }}
                            >
                              <CalendarDays className="w-4 h-4 mr-2" />
                              Alterar Vencimento
                            </DropdownMenuItem>

                            {/* Ver Detalhes */}
                            <DropdownMenuItem onClick={() => setModalDetalhes(item)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setModalDetalhes(item)}
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-600">
              {loading ? (
                'Carregando...'
              ) : totalCount > 0 ? (
                <>
                  Mostrando <span className="font-semibold">{startItem}</span> a{' '}
                  <span className="font-semibold">{endItem}</span> de{' '}
                  <span className="font-semibold">{totalCount}</span>
                </>
              ) : (
                'Nenhum lançamento'
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Por página:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1) }}>
                <SelectTrigger className="w-[70px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
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

            {totalPages > 0 && (
              <>
                {currentPage > 2 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => goToPage(1)} className="min-w-[32px]">
                      1
                    </Button>
                    {currentPage > 3 && <span className="text-slate-400 px-1">...</span>}
                  </>
                )}

                {currentPage > 1 && (
                  <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} className="min-w-[32px]">
                    {currentPage - 1}
                  </Button>
                )}

                <Button variant="outline" size="sm" className="bg-[#34495e] text-white min-w-[32px]" disabled>
                  {currentPage}
                </Button>

                {currentPage < totalPages && (
                  <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} className="min-w-[32px]">
                    {currentPage + 1}
                  </Button>
                )}

                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && <span className="text-slate-400 px-1">...</span>}
                    <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} className="min-w-[32px]">
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

      {/* Modal Recebimento Parcial */}
      <Dialog open={!!modalRecebimentoParcial} onOpenChange={() => setModalRecebimentoParcial(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Recebimento Parcial</DialogTitle>
          </DialogHeader>
          {modalRecebimentoParcial && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">{modalRecebimentoParcial.descricao}</p>
                <p className="text-xs text-slate-500 mt-1">Valor total: {formatCurrency(modalRecebimentoParcial.valor)}</p>
              </div>

              <div>
                <Label className="text-xs">Valor a Receber</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={modalRecebimentoParcial.valor - 0.01}
                  value={valorParcial}
                  onChange={(e) => setValorParcial(e.target.value)}
                  placeholder="0,00"
                />
                {valorParcial && parseFloat(valorParcial) > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Saldo restante: {formatCurrency(modalRecebimentoParcial.valor - parseFloat(valorParcial))}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Conta Bancária</Label>
                <select
                  value={contaSelecionada}
                  onChange={(e) => setContaSelecionada(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {contasBancarias.map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.banco} - {cb.numero_conta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalRecebimentoParcial(null)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleRecebimentoParcial} disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Vencimento */}
      <Dialog open={!!modalAlterarVencimento} onOpenChange={() => setModalAlterarVencimento(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Alterar Vencimento</DialogTitle>
          </DialogHeader>
          {modalAlterarVencimento && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">{modalAlterarVencimento.descricao}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Vencimento atual: {modalAlterarVencimento.data_vencimento ? formatDateFull(modalAlterarVencimento.data_vencimento) : '-'}
                </p>
              </div>

              <div>
                <Label className="text-xs">Nova Data de Vencimento</Label>
                <Input
                  type="date"
                  value={novaDataVencimento}
                  onChange={(e) => setNovaDataVencimento(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalAlterarVencimento(null)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAlterarVencimento} disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={!!modalDetalhes} onOpenChange={() => setModalDetalhes(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Detalhes</DialogTitle>
          </DialogHeader>
          {modalDetalhes && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Tipo</p>
                  <p className="text-sm text-slate-700">
                    {modalDetalhes.tipo_movimento === 'receita' ? 'Receita' : 'Despesa'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Status</p>
                  <Badge variant="outline" className="text-[10px]">
                    {modalDetalhes.status === 'efetivado' ? 'Efetivado' : modalDetalhes.status === 'vencido' ? 'Vencido' : 'Pendente'}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase">Descrição</p>
                <p className="text-sm text-slate-700">{modalDetalhes.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Valor</p>
                  <p className={`text-lg font-bold ${modalDetalhes.tipo_movimento === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(modalDetalhes.valor)}
                  </p>
                </div>
                {modalDetalhes.valor_pago && modalDetalhes.valor_pago > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Valor Pago</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(modalDetalhes.valor_pago)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Vencimento</p>
                  <p className="text-sm text-slate-700">
                    {modalDetalhes.data_vencimento ? formatDateFull(modalDetalhes.data_vencimento) : '-'}
                  </p>
                </div>
                {modalDetalhes.data_efetivacao && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Data Pagamento</p>
                    <p className="text-sm text-slate-700">{formatDateFull(modalDetalhes.data_efetivacao)}</p>
                  </div>
                )}
              </div>

              {modalDetalhes.entidade && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Entidade</p>
                  <p className="text-sm text-slate-700">{modalDetalhes.entidade}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-slate-400 uppercase">Categoria</p>
                <p className="text-sm text-slate-700">{CATEGORIA_LABELS[modalDetalhes.categoria] || modalDetalhes.categoria}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Transferência */}
      <Dialog open={modalTransferencia} onOpenChange={setModalTransferencia}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Transferência entre Contas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Conta de Origem</Label>
              <select
                value={transferenciaForm.conta_origem_id}
                onChange={(e) => setTransferenciaForm({ ...transferenciaForm, conta_origem_id: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="">Selecione</option>
                {contasBancarias.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.banco} - {cb.numero_conta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Conta de Destino</Label>
              <select
                value={transferenciaForm.conta_destino_id}
                onChange={(e) => setTransferenciaForm({ ...transferenciaForm, conta_destino_id: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="">Selecione</option>
                {contasBancarias
                  .filter((cb) => cb.id !== transferenciaForm.conta_origem_id)
                  .map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.banco} - {cb.numero_conta}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Valor</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={transferenciaForm.valor}
                onChange={(e) => setTransferenciaForm({ ...transferenciaForm, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input
                value={transferenciaForm.descricao}
                onChange={(e) => setTransferenciaForm({ ...transferenciaForm, descricao: e.target.value })}
                placeholder="Ex: Pagamento de fornecedor"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalTransferencia(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleTransferencia} disabled={submitting}>
                {submitting ? 'Transferindo...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
