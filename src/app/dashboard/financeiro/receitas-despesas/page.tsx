'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  Search,
  CheckCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Clock,
  Receipt,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Interfaces
interface ExtratoItem {
  id: string
  escritorio_id: string
  tipo_movimento: 'receita' | 'despesa' | 'transferencia'
  status: 'pendente' | 'efetivado' | 'vencido' | 'cancelado'
  origem: 'honorario' | 'despesa' | 'cartao_credito' | 'reembolso' | 'transferencia' | 'manual'
  categoria: string
  descricao: string
  valor: number
  data_referencia: string
  data_vencimento: string | null
  data_efetivacao: string | null
  entidade: string | null
  conta_bancaria_id: string | null
  origem_id: string | null
  processo_id: string | null
}

interface ExtratoFilters {
  tipo_movimento: 'todos' | 'receita' | 'despesa' | 'transferencia'
  status: 'todos' | 'pendente' | 'efetivado' | 'vencido'
  origem: 'todos' | 'honorario' | 'despesa' | 'cartao_credito' | 'reembolso' | 'transferencia'
  periodo: 'semana' | 'mes' | 'trimestre' | 'ano' | 'todos'
  busca: string
}

interface NovaReceitaForm {
  cliente_id: string
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

// Mapeamento de labels
const ORIGEM_LABELS: Record<string, string> = {
  honorario: 'Honorário',
  despesa: 'Despesa',
  cartao_credito: 'Cartão de Crédito',
  reembolso: 'Reembolso',
  transferencia: 'Transferência',
  manual: 'Manual',
}

const CATEGORIA_LABELS: Record<string, string> = {
  honorario_contrato: 'Honorário Contratual',
  honorario_avulso: 'Honorário Avulso',
  exito: 'Êxito',
  custas: 'Custas',
  fornecedor: 'Fornecedor',
  folha: 'Folha de Pagamento',
  impostos: 'Impostos',
  aluguel: 'Aluguel',
  marketing: 'Marketing',
  capacitacao: 'Capacitação',
  material: 'Material',
  tecnologia: 'Tecnologia',
  viagem: 'Viagem',
  alimentacao: 'Alimentação',
  combustivel: 'Combustível',
  assinatura: 'Assinatura',
  cartao_credito: 'Fatura Cartão',
  outras: 'Outras',
  infraestrutura: 'Infraestrutura',
  pessoal: 'Pessoal',
  transferencia: 'Transferência',
}

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    className: 'bg-amber-50 border-amber-200 text-amber-700',
    icon: Clock,
  },
  efetivado: {
    label: 'Efetivado',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    icon: CheckCircle,
  },
  vencido: {
    label: 'Vencido',
    className: 'bg-red-50 border-red-200 text-red-700',
    icon: AlertCircle,
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-slate-50 border-slate-200 text-slate-500',
    icon: Clock,
  },
}

export default function ExtratoFinanceiroPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  // Estados principais
  const [extrato, setExtrato] = useState<ExtratoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50

  // Filtros
  const [filters, setFilters] = useState<ExtratoFilters>({
    tipo_movimento: 'todos',
    status: 'todos',
    origem: 'todos',
    periodo: 'mes',
    busca: '',
  })

  // Estados dos modais
  const [modalReceitaOpen, setModalReceitaOpen] = useState(false)
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false)
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false)

  // Estados dos formulários
  const [receitaForm, setReceitaForm] = useState<NovaReceitaForm>({
    cliente_id: '',
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

  // Dados auxiliares
  const [clientes, setClientes] = useState<any[]>([])
  const [processos, setProcessos] = useState<any[]>([])
  const [contasBancarias, setContasBancarias] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Abrir modal automaticamente se ?tipo=despesa ou ?tipo=receita
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tipo = params.get('tipo')
    if (tipo === 'despesa') {
      setModalDespesaOpen(true)
      window.history.replaceState({}, '', '/dashboard/financeiro/receitas-despesas')
    } else if (tipo === 'receita') {
      setModalReceitaOpen(true)
      window.history.replaceState({}, '', '/dashboard/financeiro/receitas-despesas')
    }
  }, [])

  // Reset página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Carregar dados principais - consulta direta às tabelas
  const loadExtrato = useCallback(async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    try {
      const hoje = new Date()
      const hojeStr = hoje.toISOString().split('T')[0]

      // 1. Buscar despesas
      const { data: despesas, error: despesasError } = await supabase
        .from('financeiro_despesas')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)

      if (despesasError) {
        console.error('Erro ao buscar despesas:', despesasError)
      }

      // 2. Buscar parcelas de honorários com dados do honorário
      const { data: parcelas, error: parcelasError } = await supabase
        .from('financeiro_honorarios_parcelas')
        .select(`
          *,
          honorario:financeiro_honorarios(
            descricao,
            tipo_honorario,
            cliente_id,
            processo_id
          )
        `)
        .eq('escritorio_id', escritorioAtivo)

      if (parcelasError) {
        console.error('Erro ao buscar parcelas:', parcelasError)
      }

      // Combinar os dados em formato unificado
      let combinedData: ExtratoItem[] = []

      // Mapear despesas
      if (despesas) {
        const despesasMapped = despesas.map((d) => ({
          id: d.id,
          escritorio_id: d.escritorio_id,
          tipo_movimento: 'despesa' as const,
          status: d.status === 'pago'
            ? 'efetivado'
            : (d.data_vencimento < hojeStr && d.status === 'pendente')
              ? 'vencido'
              : 'pendente',
          origem: d.categoria === 'cartao_credito' ? 'cartao_credito' : 'despesa',
          categoria: d.categoria,
          descricao: d.descricao,
          valor: d.valor,
          data_referencia: d.data_pagamento || d.data_vencimento,
          data_vencimento: d.data_vencimento,
          data_efetivacao: d.data_pagamento,
          entidade: d.fornecedor,
          conta_bancaria_id: null,
          origem_id: d.id,
          processo_id: d.processo_id,
        }))
        combinedData = [...combinedData, ...despesasMapped]
      }

      // Mapear parcelas de honorários (receitas)
      if (parcelas) {
        const parcelasMapped = parcelas.map((p) => ({
          id: p.id,
          escritorio_id: p.escritorio_id,
          tipo_movimento: 'receita' as const,
          status: p.status === 'pago'
            ? 'efetivado'
            : (p.data_vencimento < hojeStr && p.status !== 'pago')
              ? 'vencido'
              : 'pendente',
          origem: 'honorario',
          categoria: (p.honorario as any)?.tipo_honorario || 'honorario',
          descricao: (p.honorario as any)?.descricao || `Parcela ${p.numero_parcela}`,
          valor: p.valor,
          data_referencia: p.data_pagamento || p.data_vencimento,
          data_vencimento: p.data_vencimento,
          data_efetivacao: p.data_pagamento,
          entidade: null, // Cliente seria buscado separadamente se necessário
          conta_bancaria_id: null,
          origem_id: p.id,
          processo_id: (p.honorario as any)?.processo_id,
        }))
        combinedData = [...combinedData, ...parcelasMapped]
      }

      // Aplicar filtros
      let filteredData = combinedData

      if (filters.tipo_movimento !== 'todos') {
        filteredData = filteredData.filter((item) => item.tipo_movimento === filters.tipo_movimento)
      }

      if (filters.status !== 'todos') {
        filteredData = filteredData.filter((item) => item.status === filters.status)
      }

      if (filters.origem !== 'todos') {
        filteredData = filteredData.filter((item) => item.origem === filters.origem)
      }

      if (filters.busca) {
        const termo = filters.busca.toLowerCase()
        filteredData = filteredData.filter(
          (item) =>
            item.descricao?.toLowerCase().includes(termo) ||
            item.entidade?.toLowerCase().includes(termo)
        )
      }

      if (filters.periodo !== 'todos') {
        let dataInicio = new Date()

        switch (filters.periodo) {
          case 'semana':
            dataInicio.setDate(hoje.getDate() - 7)
            break
          case 'mes':
            dataInicio.setMonth(hoje.getMonth() - 1)
            break
          case 'trimestre':
            dataInicio.setMonth(hoje.getMonth() - 3)
            break
          case 'ano':
            dataInicio.setFullYear(hoje.getFullYear() - 1)
            break
        }

        const dataInicioStr = dataInicio.toISOString().split('T')[0]
        filteredData = filteredData.filter((item) => item.data_referencia >= dataInicioStr)
      }

      // Ordenar por data decrescente
      filteredData.sort(
        (a, b) => new Date(b.data_referencia).getTime() - new Date(a.data_referencia).getTime()
      )

      // Aplicar paginação
      const totalFiltered = filteredData.length
      const from = (currentPage - 1) * itemsPerPage
      const paginatedData = filteredData.slice(from, from + itemsPerPage)

      setExtrato(paginatedData as ExtratoItem[])
      setTotalCount(totalFiltered)
    } catch (error) {
      console.error('Erro ao carregar extrato:', error)
      toast.error('Erro ao carregar extrato financeiro')
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, filters, currentPage, supabase])

  // Carregar dados auxiliares
  const loadClientes = useCallback(async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('crm_pessoas')
      .select('id, nome_completo')
      .eq('escritorio_id', escritorioAtivo)
      .eq('status', 'ativo')
      .order('nome_completo')
    setClientes(data || [])
  }, [escritorioAtivo, supabase])

  const loadProcessos = useCallback(async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, parte_contraria')
      .eq('escritorio_id', escritorioAtivo)
      .order('created_at', { ascending: false })
    setProcessos(data || [])
  }, [escritorioAtivo, supabase])

  const loadContasBancarias = useCallback(async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, agencia, numero_conta')
      .eq('escritorio_id', escritorioAtivo)
      .eq('ativa', true)
      .order('banco')
    setContasBancarias(data || [])
  }, [escritorioAtivo, supabase])

  // Effects
  useEffect(() => {
    if (escritorioAtivo) {
      loadExtrato()
      loadClientes()
      loadProcessos()
      loadContasBancarias()
    }
  }, [escritorioAtivo, loadExtrato, loadClientes, loadProcessos, loadContasBancarias])

  // Handlers
  const handlePagarDespesa = async (item: ExtratoItem, contaId: string) => {
    if (!contaId || !escritorioAtivo) {
      toast.error('Selecione uma conta bancária')
      return
    }

    try {
      // Buscar saldo atual da conta
      const { data: conta } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual')
        .eq('id', contaId)
        .single()

      const saldoAtual = conta?.saldo_atual || 0
      const novoSaldo = saldoAtual - Number(item.valor)

      // Criar lançamento de saída na conta bancária
      const { error: lancamentoError } = await supabase
        .from('financeiro_contas_lancamentos')
        .insert({
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

      if (lancamentoError) throw lancamentoError

      // Atualizar saldo da conta
      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldo })
        .eq('id', contaId)

      // Atualizar status da despesa
      const { error: despesaError } = await supabase
        .from('financeiro_despesas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
        })
        .eq('id', item.origem_id)

      if (despesaError) throw despesaError

      toast.success('Despesa paga com sucesso!')
      loadExtrato()
    } catch (error) {
      console.error('Erro ao pagar despesa:', error)
      toast.error('Erro ao pagar despesa')
    }
  }

  const handleReceberReceita = async (item: ExtratoItem, contaId: string) => {
    if (!contaId || !escritorioAtivo) {
      toast.error('Selecione uma conta bancária')
      return
    }

    try {
      // Buscar saldo atual da conta
      const { data: conta } = await supabase
        .from('financeiro_contas_bancarias')
        .select('saldo_atual')
        .eq('id', contaId)
        .single()

      const saldoAtual = conta?.saldo_atual || 0
      const novoSaldo = saldoAtual + Number(item.valor)

      // Criar lançamento de entrada na conta bancária
      const { error: lancamentoError } = await supabase
        .from('financeiro_contas_lancamentos')
        .insert({
          escritorio_id: escritorioAtivo,
          conta_bancaria_id: contaId,
          tipo: 'entrada',
          valor: item.valor,
          descricao: item.descricao,
          categoria: item.categoria,
          data_lancamento: new Date().toISOString().split('T')[0],
          origem_tipo: 'pagamento',
          origem_id: item.origem_id,
          saldo_apos_lancamento: novoSaldo,
        })

      if (lancamentoError) throw lancamentoError

      // Atualizar saldo da conta
      await supabase
        .from('financeiro_contas_bancarias')
        .update({ saldo_atual: novoSaldo })
        .eq('id', contaId)

      // Atualizar status da parcela de honorário
      const { error: parcelaError } = await supabase
        .from('financeiro_honorarios_parcelas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
        })
        .eq('id', item.origem_id)

      if (parcelaError) throw parcelaError

      toast.success('Receita recebida com sucesso!')
      loadExtrato()
    } catch (error) {
      console.error('Erro ao receber receita:', error)
      toast.error('Erro ao receber receita')
    }
  }

  const handleSubmitReceita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioAtivo) return

    setSubmitting(true)
    try {
      // Criar honorário
      const { data: honorario, error: honorarioError } = await supabase
        .from('financeiro_honorarios')
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
          .from('financeiro_honorarios_parcelas')
          .insert(parcelas)

        if (parcelasError) throw parcelasError
      } else if (honorario) {
        const { error: parcelaError } = await supabase
          .from('financeiro_honorarios_parcelas')
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

      setReceitaForm({
        cliente_id: '',
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
      toast.success('Receita criada com sucesso!')
      loadExtrato()
    } catch (error) {
      console.error('Erro ao criar receita:', error)
      toast.error('Erro ao criar receita')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitDespesa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioAtivo) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('financeiro_despesas').insert({
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
      toast.success('Despesa criada com sucesso!')
      loadExtrato()
    } catch (error) {
      console.error('Erro ao criar despesa:', error)
      toast.error('Erro ao criar despesa')
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

      setTransferenciaForm({
        conta_origem_id: '',
        conta_destino_id: '',
        valor: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
      })
      setModalTransferenciaOpen(false)
      toast.success('Transferência realizada com sucesso!')
      loadExtrato()
    } catch (error) {
      console.error('Erro ao criar transferência:', error)
      toast.error('Erro ao criar transferência')
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  // Calcular dias até vencimento
  const getDiasVencimento = (dataVencimento: string | null) => {
    if (!dataVencimento) return null
    const venc = new Date(dataVencimento + 'T00:00:00')
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Ícone baseado na origem
  const getOrigemIcon = (origem: string) => {
    switch (origem) {
      case 'honorario':
        return DollarSign
      case 'despesa':
        return Receipt
      case 'cartao_credito':
        return CreditCard
      case 'reembolso':
        return RefreshCw
      case 'transferencia':
        return ArrowLeftRight
      default:
        return FileText
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
                        {c.nome_completo}
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
                    onChange={(e) =>
                      setReceitaForm({ ...receitaForm, categoria: e.target.value as any })
                    }
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
                    onChange={(e) =>
                      setReceitaForm({ ...receitaForm, valor_total: e.target.value })
                    }
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
                    onChange={(e) =>
                      setReceitaForm({ ...receitaForm, parcelado: e.target.checked })
                    }
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
                        onChange={(e) =>
                          setReceitaForm({ ...receitaForm, num_parcelas: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="primeira_vencimento">Primeiro Vencimento *</Label>
                      <Input
                        id="primeira_vencimento"
                        type="date"
                        value={receitaForm.primeira_vencimento}
                        onChange={(e) =>
                          setReceitaForm({ ...receitaForm, primeira_vencimento: e.target.value })
                        }
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
                      onChange={(e) =>
                        setReceitaForm({ ...receitaForm, data_vencimento_unica: e.target.value })
                      }
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
                    onChange={(e) =>
                      setReceitaForm({ ...receitaForm, processo_id: e.target.value })
                    }
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="">Nenhum</option>
                    {processos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.numero_cnj} - {p.parte_contraria}
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
                    onChange={(e) =>
                      setReceitaForm({ ...receitaForm, observacoes: e.target.value })
                    }
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
                    onChange={(e) =>
                      setDespesaForm({ ...despesaForm, fornecedor: e.target.value })
                    }
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
                    onChange={(e) =>
                      setDespesaForm({ ...despesaForm, categoria: e.target.value })
                    }
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="fornecedor">Fornecedor</option>
                    <option value="custas">Custas Processuais</option>
                    <option value="impostos">Tributo/Impostos</option>
                    <option value="infraestrutura">Infraestrutura</option>
                    <option value="folha">Folha de Pagamento</option>
                    <option value="aluguel">Aluguel</option>
                    <option value="marketing">Marketing</option>
                    <option value="capacitacao">Capacitação</option>
                    <option value="material">Material</option>
                    <option value="tecnologia">Tecnologia</option>
                    <option value="assinatura">Assinatura</option>
                    <option value="outras">Outros</option>
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <Label htmlFor="descricao_despesa">Descrição *</Label>
                  <Input
                    id="descricao_despesa"
                    value={despesaForm.descricao}
                    onChange={(e) =>
                      setDespesaForm({ ...despesaForm, descricao: e.target.value })
                    }
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
                    onChange={(e) =>
                      setDespesaForm({ ...despesaForm, data_vencimento: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                  <select
                    id="forma_pagamento"
                    value={despesaForm.forma_pagamento}
                    onChange={(e) =>
                      setDespesaForm({ ...despesaForm, forma_pagamento: e.target.value })
                    }
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>

                {/* Observações */}
                <div>
                  <Label htmlFor="observacoes_despesa">Observações</Label>
                  <Textarea
                    id="observacoes_despesa"
                    value={despesaForm.observacoes}
                    onChange={(e) =>
                      setDespesaForm({ ...despesaForm, observacoes: e.target.value })
                    }
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
                    onChange={(e) =>
                      setTransferenciaForm({
                        ...transferenciaForm,
                        conta_origem_id: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setTransferenciaForm({
                        ...transferenciaForm,
                        conta_destino_id: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setTransferenciaForm({ ...transferenciaForm, valor: e.target.value })
                    }
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
                    onChange={(e) =>
                      setTransferenciaForm({ ...transferenciaForm, descricao: e.target.value })
                    }
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar na descrição ou entidade..."
                value={filters.busca}
                onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
                className="pl-10"
              />
            </div>

            <select
              value={filters.tipo_movimento}
              onChange={(e) => setFilters({ ...filters, tipo_movimento: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todos">Todos os tipos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
              <option value="transferencia">Transferências</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendentes</option>
              <option value="efetivado">Efetivados</option>
              <option value="vencido">Vencidos</option>
            </select>

            <select
              value={filters.origem}
              onChange={(e) => setFilters({ ...filters, origem: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todos">Todas as origens</option>
              <option value="honorario">Honorários</option>
              <option value="despesa">Despesas</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="reembolso">Reembolsos</option>
              <option value="transferencia">Transferências</option>
            </select>

            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="trimestre">Último trimestre</option>
              <option value="ano">Último ano</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Extrato Unificado */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">
              Lançamentos ({extrato.length} de {totalCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          {loading ? (
            <div className="py-12 text-center">
              <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Carregando extrato...</p>
            </div>
          ) : extrato.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-20">
                      Tipo
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-24">
                      Data
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
                      Descrição
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-36">
                      Entidade
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-32">
                      Categoria
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 w-24">
                      Status
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 w-32">
                      Valor
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 w-20">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {extrato.map((item) => {
                    const OrigemIcon = getOrigemIcon(item.origem)
                    const statusConfig = STATUS_CONFIG[item.status]
                    const StatusIcon = statusConfig?.icon || Clock
                    const diasVenc = getDiasVencimento(item.data_vencimento)

                    return (
                      <tr
                        key={`${item.origem}-${item.id}`}
                        className={cn(
                          'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                          item.status === 'vencido' && 'bg-red-50/50',
                          item.status === 'pendente' &&
                            diasVenc !== null &&
                            diasVenc <= 5 &&
                            diasVenc >= 0 &&
                            'bg-amber-50/50'
                        )}
                      >
                        {/* Tipo/Origem */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center',
                                item.tipo_movimento === 'receita' && 'bg-emerald-100',
                                item.tipo_movimento === 'despesa' && 'bg-red-100',
                                item.tipo_movimento === 'transferencia' && 'bg-blue-100'
                              )}
                            >
                              <OrigemIcon
                                className={cn(
                                  'w-3.5 h-3.5',
                                  item.tipo_movimento === 'receita' && 'text-emerald-600',
                                  item.tipo_movimento === 'despesa' && 'text-red-600',
                                  item.tipo_movimento === 'transferencia' && 'text-blue-600'
                                )}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-2.5 px-3">
                          <div>
                            <span className="text-xs text-slate-700">
                              {formatDate(item.data_referencia)}
                            </span>
                            {item.data_vencimento &&
                              item.status === 'pendente' &&
                              diasVenc !== null && (
                                <p
                                  className={cn(
                                    'text-[10px]',
                                    diasVenc < 0 && 'text-red-600 font-medium',
                                    diasVenc <= 5 && diasVenc >= 0 && 'text-amber-600',
                                    diasVenc > 5 && 'text-slate-500'
                                  )}
                                >
                                  {diasVenc < 0
                                    ? `Vencido há ${Math.abs(diasVenc)}d`
                                    : diasVenc === 0
                                      ? 'Vence hoje'
                                      : `Vence em ${diasVenc}d`}
                                </p>
                              )}
                          </div>
                        </td>

                        {/* Descrição */}
                        <td className="py-2.5 px-3">
                          <p className="text-xs font-medium text-slate-700 line-clamp-1">
                            {item.descricao}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {ORIGEM_LABELS[item.origem] || item.origem}
                          </p>
                        </td>

                        {/* Entidade */}
                        <td className="py-2.5 px-3">
                          <p className="text-xs text-slate-600 line-clamp-1">
                            {item.entidade || '-'}
                          </p>
                        </td>

                        {/* Categoria */}
                        <td className="py-2.5 px-3">
                          <span className="text-xs text-slate-600">
                            {CATEGORIA_LABELS[item.categoria] || item.categoria}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-2 py-0.5 font-medium', statusConfig?.className)}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig?.label || item.status}
                          </Badge>
                        </td>

                        {/* Valor */}
                        <td className="py-2.5 px-3 text-right">
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              item.tipo_movimento === 'receita' && 'text-emerald-600',
                              item.tipo_movimento === 'despesa' && 'text-red-600',
                              item.tipo_movimento === 'transferencia' && 'text-blue-600'
                            )}
                          >
                            {item.tipo_movimento === 'receita' ? '+' : '-'}{' '}
                            {formatCurrency(Number(item.valor))}
                          </p>
                        </td>

                        {/* Ações */}
                        <td className="py-2.5 px-3 text-center">
                          {item.status === 'pendente' || item.status === 'vencido' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  className={cn(
                                    'h-7 text-xs',
                                    item.tipo_movimento === 'receita'
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-[#34495e] hover:bg-[#2c3e50] text-white'
                                  )}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  {item.tipo_movimento === 'receita' ? 'Receber' : 'Pagar'}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {contasBancarias.length === 0 ? (
                                  <DropdownMenuItem disabled>
                                    Nenhuma conta bancária
                                  </DropdownMenuItem>
                                ) : (
                                  contasBancarias.map((conta) => (
                                    <DropdownMenuItem
                                      key={conta.id}
                                      onClick={() =>
                                        item.tipo_movimento === 'receita'
                                          ? handleReceberReceita(item, conta.id)
                                          : handlePagarDespesa(item, conta.id)
                                      }
                                    >
                                      {conta.banco} - Ag {conta.agencia}
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
