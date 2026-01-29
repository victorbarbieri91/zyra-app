'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Loader2,
  Plus,
  FileText,
  Check,
  CalendarDays,
  Eye,
  Banknote,
  ArrowLeftRight,
  Pencil,
  Trash2,
  AlertTriangle,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import ReceitaModal from '@/components/financeiro/ReceitaModal'
import DespesaModal from '@/components/financeiro/DespesaModal'

interface ExtratoItem {
  id: string
  escritorio_id: string
  tipo_movimento: 'receita' | 'despesa' | 'transferencia_saida' | 'transferencia_entrada'
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
  conta_bancaria_nome: string | null
  origem_id: string | null
  processo_id: string | null
  cliente_id: string | null
}

// Categorias com labels bonitos e cores
const CATEGORIA_CONFIG: Record<string, { label: string; color: string }> = {
  // Receitas
  honorario: { label: 'Honorário', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  honorario_contrato: { label: 'Honorário', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  honorario_avulso: { label: 'Avulso', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  exito: { label: 'Êxito', color: 'bg-green-50 text-green-700 border-green-200' },
  fatura: { label: 'Fatura', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  parcela: { label: 'Parcela', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  saldo: { label: 'Saldo', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  avulso: { label: 'Avulso', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  // Despesas
  custas: { label: 'Custas', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  fornecedor: { label: 'Fornecedor', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  folha: { label: 'Folha', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  impostos: { label: 'Impostos', color: 'bg-red-50 text-red-700 border-red-200' },
  aluguel: { label: 'Aluguel', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  marketing: { label: 'Marketing', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  tecnologia: { label: 'Tecnologia', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  assinatura: { label: 'Assinatura', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  cartao_credito: { label: 'Cartão', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  infraestrutura: { label: 'Infraestrutura', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  pessoal: { label: 'Pessoal', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  despesa: { label: 'Despesa', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  outras: { label: 'Outras', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  transferencia: { label: 'Transferência', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  // Extras que podem aparecer
  retirada_socios: { label: 'Retirada Sócios', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  beneficios: { label: 'Benefícios', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  telefonia: { label: 'Telefonia', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  emprestimos: { label: 'Empréstimos', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  taxas_bancarias: { label: 'Taxas Bancárias', color: 'bg-stone-50 text-stone-700 border-stone-200' },
  associacoes: { label: 'Associações', color: 'bg-neutral-50 text-neutral-700 border-neutral-200' },
}

const getCategoriaConfig = (categoria: string) => {
  return CATEGORIA_CONFIG[categoria] || { label: categoria, color: 'bg-slate-50 text-slate-600 border-slate-200' }
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

// Helpers para período
const getInicioMes = (date: Date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
}

const getFimMes = (date: Date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
}

const getInicioAno = (date: Date = new Date()) => {
  return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0]
}

const getFimAno = (date: Date = new Date()) => {
  return new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0]
}

const subMeses = (date: Date, meses: number) => {
  const result = new Date(date)
  result.setMonth(result.getMonth() - meses)
  return result
}

type PeriodoPreset = 'mes_atual' | 'ultimos_3_meses' | 'ultimos_6_meses' | 'ano_atual' | 'ano_anterior' | 'personalizado'

export default function ExtratoFinanceiroPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [extrato, setExtrato] = useState<ExtratoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Filtros
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'receita' | 'despesa' | 'transferencia'>('todos')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendente' | 'vencido' | 'efetivado'>('todos')
  const [contaFiltro, setContaFiltro] = useState<string>('todas')  // 'todas' ou ID da conta

  // Filtro de período - padrão: mês atual
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('mes_atual')
  const [dataInicio, setDataInicio] = useState<string>(getInicioMes())
  const [dataFim, setDataFim] = useState<string>(getFimMes())
  const [periodoAberto, setPeriodoAberto] = useState(false)

  // Estados para multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Seleção múltipla
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([])
  const [modalAlterarCategoria, setModalAlterarCategoria] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [modalVincularConta, setModalVincularConta] = useState(false)
  const [contaParaVincular, setContaParaVincular] = useState('')

  // Modais
  const [modalRecebimentoParcial, setModalRecebimentoParcial] = useState<ExtratoItem | null>(null)
  const [modalAlterarVencimento, setModalAlterarVencimento] = useState<ExtratoItem | null>(null)
  const [modalDetalhes, setModalDetalhes] = useState<ExtratoItem | null>(null)
  const [modalTransferencia, setModalTransferencia] = useState(false)
  const [modalExcluir, setModalExcluir] = useState<ExtratoItem | null>(null)
  const [modalEditar, setModalEditar] = useState<ExtratoItem | null>(null)
  const [modalReceita, setModalReceita] = useState(false)
  const [modalDespesa, setModalDespesa] = useState(false)

  // Info para exclusão
  const [exclusaoInfo, setExclusaoInfo] = useState<{
    temParcelas: number
    jaPago: boolean
    temLancamentoBancario: boolean
    valorEstorno: number
  } | null>(null)

  // Form states
  const [valorParcial, setValorParcial] = useState('')
  const [novaDataVencimento, setNovaDataVencimento] = useState('')
  const [contaSelecionada, setContaSelecionada] = useState('')
  const [contasBancarias, setContasBancarias] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Form edição
  const [editForm, setEditForm] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    categoria: '',
    fornecedor: '',
    observacoes: '',
  })

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
  }, [tipoFiltro, statusFiltro, contaFiltro, dataInicio, dataFim])

  // Handler para mudança de período preset
  const handlePeriodoChange = (preset: PeriodoPreset) => {
    setPeriodoPreset(preset)
    const hoje = new Date()

    switch (preset) {
      case 'mes_atual':
        setDataInicio(getInicioMes(hoje))
        setDataFim(getFimMes(hoje))
        break
      case 'ultimos_3_meses':
        setDataInicio(getInicioMes(subMeses(hoje, 2)))
        setDataFim(getFimMes(hoje))
        break
      case 'ultimos_6_meses':
        setDataInicio(getInicioMes(subMeses(hoje, 5)))
        setDataFim(getFimMes(hoje))
        break
      case 'ano_atual':
        setDataInicio(getInicioAno(hoje))
        setDataFim(getFimAno(hoje))
        break
      case 'ano_anterior':
        const anoAnterior = new Date(hoje.getFullYear() - 1, 0, 1)
        setDataInicio(getInicioAno(anoAnterior))
        setDataFim(getFimAno(anoAnterior))
        break
      case 'personalizado':
        // Mantém as datas atuais
        break
    }
    setPeriodoAberto(false)
  }

  const getPeriodoLabel = () => {
    switch (periodoPreset) {
      case 'mes_atual':
        return 'Este mês'
      case 'ultimos_3_meses':
        return 'Últimos 3 meses'
      case 'ultimos_6_meses':
        return 'Últimos 6 meses'
      case 'ano_atual':
        return 'Este ano'
      case 'ano_anterior':
        return 'Ano anterior'
      case 'personalizado':
        return `${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
      default:
        return 'Período'
    }
  }

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        // Iniciar com TODOS selecionados (visão consolidada padrão)
        if (escritorios.length > 0) {
          setEscritoriosSelecionados(escritorios.map(e => e.id))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadEscritoriosGrupo()
  }, [])

  // Funções de seleção de escritórios
  const toggleEscritorio = (id: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev // Não permitir desmarcar o último
        return prev.filter(e => e !== id)
      }
      return [...prev, id]
    })
  }

  const selecionarTodos = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (id: string) => {
    setEscritoriosSelecionados([id])
  }

  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === 0) return 'Selecione'
    if (escritoriosSelecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    }
    return `${escritoriosSelecionados.length} escritórios`
  }

  // Load data
  const loadExtrato = useCallback(async () => {
    if (escritoriosSelecionados.length === 0) return

    setLoading(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // Query com filtro de período no servidor para melhor performance
      const { data: viewData, error: viewError } = await supabase
        .from('v_extrato_financeiro')
        .select('*')
        .in('escritorio_id', escritoriosSelecionados)
        .gte('data_referencia', dataInicio)
        .lte('data_referencia', dataFim)

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
        conta_bancaria_nome: item.conta_bancaria_nome,  // NOVO
        origem_id: item.origem_id,
        processo_id: item.processo_id,
        cliente_id: item.cliente_id,
      }))

      // Filtro por conta bancária
      if (contaFiltro !== 'todas') {
        // Quando filtra por conta específica: mostra todos os movimentos daquela conta
        // (incluindo entrada E saída de transferências conforme a conta)
        combinedData = combinedData.filter((item) => item.conta_bancaria_id === contaFiltro)
      } else {
        // Quando mostra TODAS as contas: transferências aparecem como um único registro
        // Mostramos apenas transferencia_saida (que representa a transferência completa)
        combinedData = combinedData.filter((item) => item.tipo_movimento !== 'transferencia_entrada')
      }

      // Filtro por tipo
      if (tipoFiltro !== 'todos') {
        if (tipoFiltro === 'transferencia') {
          combinedData = combinedData.filter((item) =>
            item.tipo_movimento === 'transferencia_saida' || item.tipo_movimento === 'transferencia_entrada'
          )
        } else {
          combinedData = combinedData.filter((item) => item.tipo_movimento === tipoFiltro)
        }
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

      // Ordenação: vencidos primeiro, depois por data decrescente (mais recente primeiro)
      combinedData.sort((a, b) => {
        if (a.status === 'vencido' && b.status !== 'vencido') return -1
        if (b.status === 'vencido' && a.status !== 'vencido') return 1
        if (a.status === 'vencido' && b.status === 'vencido') {
          // Vencidos: mais antigo primeiro (mais urgente)
          return new Date(a.data_vencimento || a.data_referencia).getTime() -
            new Date(b.data_vencimento || b.data_referencia).getTime()
        }
        // Demais: mais recente primeiro
        const dataA = new Date(a.data_vencimento || a.data_referencia).getTime()
        const dataB = new Date(b.data_vencimento || b.data_referencia).getTime()
        return dataB - dataA
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
  }, [escritoriosSelecionados, tipoFiltro, statusFiltro, contaFiltro, debouncedSearch, currentPage, pageSize, dataInicio, dataFim, supabase])

  const loadContasBancarias = useCallback(async () => {
    if (escritoriosSelecionados.length === 0) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, numero_conta')
      .in('escritorio_id', escritoriosSelecionados)
      .eq('ativa', true)
    setContasBancarias(data || [])
  }, [escritoriosSelecionados, supabase])

  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadExtrato()
      loadContasBancarias()
    }
  }, [escritoriosSelecionados, loadExtrato, loadContasBancarias])

  // Handlers
  // SIMPLIFICADO: Apenas atualiza status na tabela de receitas/faturas
  // O saldo da conta é calculado dinamicamente pela função calcular_saldo_conta()
  const handleReceberTotal = async (item: ExtratoItem, contaId: string) => {
    if (!contaId || !escritorioAtivo) {
      toast.error('Selecione uma conta bancária')
      return
    }

    try {
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

  // SIMPLIFICADO: Apenas atualiza status na tabela de despesas
  // O saldo da conta é calculado dinamicamente pela função calcular_saldo_conta()
  const handlePagarDespesa = async (item: ExtratoItem, contaId: string) => {
    if (!contaId || !escritorioAtivo) {
      toast.error('Selecione uma conta bancária')
      return
    }

    try {
      await supabase
        .from('financeiro_despesas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
          conta_bancaria_id: contaId,
        })
        .eq('id', item.origem_id)

      toast.success('Despesa paga!')
      loadExtrato()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao pagar')
    }
  }

  // SIMPLIFICADO: Apenas atualiza a receita e cria o saldo restante
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

      const valorRestante = item.valor - valorRecebido

      // Atualizar receita original como parcialmente paga
      await supabase
        .from('financeiro_receitas')
        .update({
          status: 'parcial',
          valor_pago: valorRecebido,
          data_pagamento: new Date().toISOString().split('T')[0],
          conta_bancaria_id: contaSelecionada,
        })
        .eq('id', item.origem_id)

      // Criar nova receita para o saldo restante
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

  // ATUALIZADO: Usa nova tabela financeiro_transferencias
  // O saldo é calculado dinamicamente - não precisa atualizar manualmente
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

      // Criar registro na tabela de transferências
      const { error } = await supabase.from('financeiro_transferencias').insert({
        escritorio_id: escritorioAtivo,
        conta_origem_id: transferenciaForm.conta_origem_id,
        conta_destino_id: transferenciaForm.conta_destino_id,
        valor: valorTransf,
        data_transferencia: new Date().toISOString().split('T')[0],
        descricao: transferenciaForm.descricao || 'Transferência entre contas',
      })

      if (error) throw error

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

  // SIMPLIFICADO: Apenas verifica parcelas vinculadas
  // Não precisa mais verificar lançamentos bancários (não existem mais)
  const handlePrepararExclusao = async (item: ExtratoItem) => {
    if (!escritorioAtivo) return

    try {
      setSubmitting(true)

      // Transferências não têm parcelas nem complicações
      if (item.tipo_movimento === 'transferencia_saida' || item.tipo_movimento === 'transferencia_entrada') {
        setExclusaoInfo({
          temParcelas: 0,
          jaPago: true,  // Transferências são sempre efetivadas
          temLancamentoBancario: false,
          valorEstorno: 0,
        })
        setModalExcluir(item)
        return
      }

      let temParcelas = 0
      const jaPago = item.status === 'efetivado'

      if (item.tipo_movimento === 'receita' && item.origem !== 'fatura') {
        // Verificar parcelas filhas
        const { count } = await supabase
          .from('financeiro_receitas')
          .select('*', { count: 'exact', head: true })
          .eq('receita_pai_id', item.origem_id)

        temParcelas = count || 0
      }

      setExclusaoInfo({
        temParcelas,
        jaPago,
        temLancamentoBancario: false,  // Não usamos mais
        valorEstorno: 0,  // Não usamos mais
      })
      setModalExcluir(item)
    } catch (error) {
      console.error('Erro ao preparar exclusão:', error)
      toast.error('Erro ao verificar dependências')
    } finally {
      setSubmitting(false)
    }
  }

  // SIMPLIFICADO: Apenas deleta o registro
  // O saldo é recalculado automaticamente pela função calcular_saldo_conta()
  const handleExcluir = async () => {
    if (!modalExcluir || !escritorioAtivo || !exclusaoInfo) return

    const item = modalExcluir

    try {
      setSubmitting(true)

      // Deletar transferência (origem_id é o id da transferência)
      if (item.tipo_movimento === 'transferencia_saida' || item.tipo_movimento === 'transferencia_entrada') {
        const { error } = await supabase
          .from('financeiro_transferencias')
          .delete()
          .eq('id', item.origem_id)

        if (error) throw error

        toast.success('Transferência excluída!')
        setModalExcluir(null)
        setExclusaoInfo(null)
        loadExtrato()
        return
      }

      // Deletar o registro principal (receita ou despesa)
      if (item.tipo_movimento === 'receita') {
        if (item.origem === 'fatura') {
          const { error } = await supabase
            .from('financeiro_faturamento_faturas')
            .update({ status: 'cancelada', cancelada_em: new Date().toISOString() })
            .eq('id', item.origem_id)

          if (error) throw error
        } else {
          // Deletar receita (CASCADE vai deletar parcelas)
          const { error } = await supabase
            .from('financeiro_receitas')
            .delete()
            .eq('id', item.origem_id)

          if (error) throw error

          // Verificar se realmente deletou (RLS pode bloquear silenciosamente)
          const { data: stillExists } = await supabase
            .from('financeiro_receitas')
            .select('id')
            .eq('id', item.origem_id)
            .single()

          if (stillExists) {
            toast.error('Sem permissão para excluir. Contate o administrador.')
            return
          }
        }
      } else {
        // Deletar despesa
        const { error } = await supabase
          .from('financeiro_despesas')
          .delete()
          .eq('id', item.origem_id)

        if (error) throw error

        // Verificar se realmente deletou (RLS pode bloquear silenciosamente)
        const { data: stillExists } = await supabase
          .from('financeiro_despesas')
          .select('id')
          .eq('id', item.origem_id)
          .single()

        if (stillExists) {
          toast.error('Sem permissão para excluir. Contate o administrador.')
          return
        }
      }

      toast.success('Lançamento excluído!')
      setModalExcluir(null)
      setExclusaoInfo(null)
      loadExtrato()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir lançamento')
    } finally {
      setSubmitting(false)
    }
  }

  // Preparar edição
  const handlePrepararEdicao = async (item: ExtratoItem) => {
    if (!escritorioAtivo) return

    try {
      setSubmitting(true)

      // Buscar dados completos do registro
      if (item.tipo_movimento === 'receita' && item.origem !== 'fatura') {
        const { data } = await supabase
          .from('financeiro_receitas')
          .select('*')
          .eq('id', item.origem_id)
          .single()

        if (data) {
          setEditForm({
            descricao: data.descricao || '',
            valor: String(data.valor || ''),
            data_vencimento: data.data_vencimento || '',
            categoria: data.categoria || '',
            fornecedor: '',
            observacoes: data.observacoes || '',
          })
        }
      } else if (item.tipo_movimento === 'despesa') {
        const { data } = await supabase
          .from('financeiro_despesas')
          .select('*')
          .eq('id', item.origem_id)
          .single()

        if (data) {
          setEditForm({
            descricao: data.descricao || '',
            valor: String(data.valor || ''),
            data_vencimento: data.data_vencimento || '',
            categoria: data.categoria || '',
            fornecedor: data.fornecedor || '',
            observacoes: '',
          })
        }
      }

      setModalEditar(item)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados para edição')
    } finally {
      setSubmitting(false)
    }
  }

  // Salvar edição
  const handleSalvarEdicao = async () => {
    if (!modalEditar || !escritorioAtivo) return

    const item = modalEditar

    try {
      setSubmitting(true)

      // Validar campos obrigatórios
      if (!editForm.descricao || !editForm.valor || !editForm.data_vencimento) {
        toast.error('Preencha os campos obrigatórios')
        return
      }

      const valor = parseFloat(editForm.valor)
      if (isNaN(valor) || valor <= 0) {
        toast.error('Valor inválido')
        return
      }

      // Verificar se já foi pago - não permitir alterar valor
      if (item.status === 'efetivado' && valor !== item.valor) {
        toast.error('Não é possível alterar o valor de um lançamento já efetivado')
        return
      }

      if (item.tipo_movimento === 'receita' && item.origem !== 'fatura') {
        await supabase
          .from('financeiro_receitas')
          .update({
            descricao: editForm.descricao,
            valor: item.status === 'efetivado' ? item.valor : valor,
            data_vencimento: editForm.data_vencimento,
            categoria: editForm.categoria,
            observacoes: editForm.observacoes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.origem_id)
      } else if (item.tipo_movimento === 'despesa') {
        await supabase
          .from('financeiro_despesas')
          .update({
            descricao: editForm.descricao,
            valor: item.status === 'efetivado' ? item.valor : valor,
            data_vencimento: editForm.data_vencimento,
            categoria: editForm.categoria,
            fornecedor: editForm.fornecedor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.origem_id)
      }

      toast.success('Lançamento atualizado!')
      setModalEditar(null)
      loadExtrato()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar alterações')
    } finally {
      setSubmitting(false)
    }
  }

  // Ações em massa
  const handleAlterarCategoriaEmMassa = async () => {
    if (!novaCategoria || itensSelecionados.length === 0) {
      toast.error('Selecione uma categoria')
      return
    }

    try {
      setSubmitting(true)

      // Separar por tipo (receitas e despesas)
      const itensSelecionadosData = extrato.filter(item => itensSelecionados.includes(item.id))

      const receitas = itensSelecionadosData.filter(i => i.tipo_movimento === 'receita' && i.origem !== 'fatura')
      const despesas = itensSelecionadosData.filter(i => i.tipo_movimento === 'despesa')

      // Atualizar receitas
      if (receitas.length > 0) {
        const { error } = await supabase
          .from('financeiro_receitas')
          .update({ categoria: novaCategoria })
          .in('id', receitas.map(r => r.origem_id))

        if (error) throw error
      }

      // Atualizar despesas
      if (despesas.length > 0) {
        const { error } = await supabase
          .from('financeiro_despesas')
          .update({ categoria: novaCategoria })
          .in('id', despesas.map(d => d.origem_id))

        if (error) throw error
      }

      toast.success(`Categoria alterada em ${receitas.length + despesas.length} lançamentos`)
      setModalAlterarCategoria(false)
      setNovaCategoria('')
      setItensSelecionados([])
      loadExtrato()
    } catch (error) {
      console.error('Erro ao alterar categoria:', error)
      toast.error('Erro ao alterar categoria')
    } finally {
      setSubmitting(false)
    }
  }

  const limparSelecao = () => {
    setItensSelecionados([])
  }

  const handleVincularContaEmMassa = async () => {
    if (!contaParaVincular || itensSelecionados.length === 0) {
      toast.error('Selecione uma conta')
      return
    }

    try {
      setSubmitting(true)

      const itensSelecionadosData = extrato.filter(item => itensSelecionados.includes(item.id))

      const receitas = itensSelecionadosData.filter(i => i.tipo_movimento === 'receita' && i.origem !== 'fatura')
      const despesas = itensSelecionadosData.filter(i => i.tipo_movimento === 'despesa')

      // Atualizar receitas
      if (receitas.length > 0) {
        const { error } = await supabase
          .from('financeiro_receitas')
          .update({ conta_bancaria_id: contaParaVincular })
          .in('id', receitas.map(r => r.origem_id))

        if (error) throw error
      }

      // Atualizar despesas
      if (despesas.length > 0) {
        const { error } = await supabase
          .from('financeiro_despesas')
          .update({ conta_bancaria_id: contaParaVincular })
          .in('id', despesas.map(d => d.origem_id))

        if (error) throw error
      }

      const contaNome = contasBancarias.find(c => c.id === contaParaVincular)?.banco || 'conta'
      toast.success(`${receitas.length + despesas.length} lançamentos vinculados à ${contaNome}`)
      setModalVincularConta(false)
      setContaParaVincular('')
      setItensSelecionados([])
      loadExtrato()
    } catch (error) {
      console.error('Erro ao vincular conta:', error)
      toast.error('Erro ao vincular conta')
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
        <div className="flex items-center gap-3">
          {/* Seletor de Escritórios - só aparece se tem mais de 1 no grupo */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 px-3 gap-2 border-slate-200 hover:bg-slate-50",
                    escritoriosSelecionados.length === escritoriosGrupo.length && "border-[#89bcbe] bg-[#f0f9f9]/50"
                  )}
                >
                  <Building2 className="h-4 w-4 text-[#89bcbe]" />
                  <span className="text-sm text-[#34495e] font-medium">
                    {getSeletorLabel()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="p-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-[#34495e]">Visualizar lançamentos de:</p>
                </div>

                {/* Opção "Todos" */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100",
                    escritoriosSelecionados.length === escritoriosGrupo.length && "bg-[#f0f9f9]"
                  )}
                  onClick={selecionarTodos}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    escritoriosSelecionados.length === escritoriosGrupo.length
                      ? "bg-[#89bcbe] border-[#89bcbe]"
                      : "border-slate-300"
                  )}>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#34495e]">Todos os escritórios</p>
                    <p className="text-[10px] text-slate-500">Visão consolidada do grupo</p>
                  </div>
                </div>

                {/* Lista de escritórios */}
                <div className="max-h-64 overflow-y-auto">
                  {escritoriosGrupo.map((escritorio) => {
                    const isSelected = escritoriosSelecionados.includes(escritorio.id)
                    const isAtivo = escritorio.id === escritorioAtivo

                    return (
                      <div
                        key={escritorio.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0",
                          isSelected && escritoriosSelecionados.length < escritoriosGrupo.length && "bg-[#f0f9f9]/50"
                        )}
                        onClick={() => toggleEscritorio(escritorio.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEscritorio(escritorio.id)}
                          className="data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#34495e] truncate">
                              {escritorio.nome}
                            </p>
                            {isAtivo && (
                              <span className="text-[9px] font-medium text-[#89bcbe] bg-[#89bcbe]/10 px-1.5 py-0.5 rounded">
                                Atual
                              </span>
                            )}
                          </div>
                          {escritorio.cnpj && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {escritorio.cnpj}
                            </p>
                          )}
                        </div>
                        {escritoriosSelecionados.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              selecionarApenas(escritorio.id)
                            }}
                            className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] hover:underline whitespace-nowrap"
                          >
                            Apenas
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rodapé com info */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] text-slate-500 text-center">
                    {escritoriosSelecionados.length === 1
                      ? 'Exibindo lançamentos de 1 escritório'
                      : `Exibindo lançamentos de ${escritoriosSelecionados.length} escritórios`}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalDespesa(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Despesa
          </Button>
          <Button
            size="sm"
            onClick={() => setModalReceita(true)}
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Receita
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
            {/* Seletor de Período */}
            <Popover open={periodoAberto} onOpenChange={setPeriodoAberto}>
              <PopoverTrigger asChild>
                <Button
                  className="h-9 px-3 gap-2 min-w-[140px] bg-[#34495e] hover:bg-[#46627f] text-white"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {getPeriodoLabel()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="p-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-[#34495e]">Selecionar período:</p>
                </div>

                {/* Opções predefinidas */}
                <div className="p-2 space-y-1">
                  {[
                    { value: 'mes_atual' as PeriodoPreset, label: 'Este mês' },
                    { value: 'ultimos_3_meses' as PeriodoPreset, label: 'Últimos 3 meses' },
                    { value: 'ultimos_6_meses' as PeriodoPreset, label: 'Últimos 6 meses' },
                    { value: 'ano_atual' as PeriodoPreset, label: 'Este ano' },
                    { value: 'ano_anterior' as PeriodoPreset, label: 'Ano anterior' },
                  ].map((opcao) => (
                    <button
                      key={opcao.value}
                      onClick={() => handlePeriodoChange(opcao.value)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                        periodoPreset === opcao.value
                          ? "bg-[#89bcbe]/20 text-[#34495e] font-medium"
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>

                {/* Período personalizado */}
                <div className="p-3 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-medium text-slate-500">Período personalizado:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-400">De</Label>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => {
                          setDataInicio(e.target.value)
                          setPeriodoPreset('personalizado')
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Até</Label>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => {
                          setDataFim(e.target.value)
                          setPeriodoPreset('personalizado')
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  {periodoPreset === 'personalizado' && (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs bg-[#34495e] hover:bg-[#46627f]"
                      onClick={() => setPeriodoAberto(false)}
                    >
                      Aplicar período
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

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

            {/* Filtro por Tipo */}
            <Tabs value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as typeof tipoFiltro)}>
              <TabsList className="bg-slate-100 h-9">
                <TabsTrigger value="todos" className="text-xs h-7 px-3">
                  <FileText className="w-3 h-3 mr-1.5" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="despesa" className="text-xs h-7 px-3">
                  <TrendingDown className="w-3 h-3 mr-1.5 text-red-600" />
                  Despesas
                </TabsTrigger>
                <TabsTrigger value="receita" className="text-xs h-7 px-3">
                  <TrendingUp className="w-3 h-3 mr-1.5 text-emerald-600" />
                  Receitas
                </TabsTrigger>
                <TabsTrigger value="transferencia" className="text-xs h-7 px-3">
                  <ArrowLeftRight className="w-3 h-3 mr-1.5 text-blue-600" />
                  Transf.
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtro por Status */}
            <Tabs value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
              <TabsList className="bg-slate-100 h-9">
                <TabsTrigger value="todos" className="text-xs h-7 px-3">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="pendente" className="text-xs h-7 px-3">
                  <Clock className="w-3 h-3 mr-1.5 text-amber-600" />
                  Pendentes
                </TabsTrigger>
                <TabsTrigger value="vencido" className="text-xs h-7 px-3">
                  <XCircle className="w-3 h-3 mr-1.5 text-red-600" />
                  Vencidos
                </TabsTrigger>
                <TabsTrigger value="efetivado" className="text-xs h-7 px-3">
                  <CheckCircle className="w-3 h-3 mr-1.5 text-emerald-600" />
                  Efetivados
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtro por Conta (mantém como select por ter opções dinâmicas) */}
            <select
              value={contaFiltro}
              onChange={(e) => setContaFiltro(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#89bcbe] h-9"
            >
              <option value="todas">Todas as contas</option>
              {contasBancarias.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.banco} - {cb.numero_conta}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Ações em Massa */}
      {itensSelecionados.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-[#34495e] rounded-lg text-white">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {itensSelecionados.length} {itensSelecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={limparSelecao}
              className="h-7 text-white/80 hover:text-white hover:bg-white/10"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalAlterarCategoria(true)}
              className="h-7 text-xs"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Alterar Categoria
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalVincularConta(true)}
              className="h-7 text-xs"
            >
              <Building2 className="w-3 h-3 mr-1" />
              Vincular Conta
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <Card className="border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center py-2.5 px-2 w-10">
                  <Checkbox
                    checked={extrato.length > 0 && itensSelecionados.length === extrato.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setItensSelecionados(extrato.map(i => i.id))
                      } else {
                        setItensSelecionados([])
                      }
                    }}
                    className="data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                  />
                </th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Venc.</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Pago</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Tipo</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide w-[30%]">Descrição</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Beneficiário</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Categoria</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Conta</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide whitespace-nowrap">Valor</th>
                <th className="text-center py-2.5 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-50' : ''}>
              {loading && extrato.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
                      <span className="text-sm text-slate-600">Carregando...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && extrato.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
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
                const categoriaConfig = getCategoriaConfig(item.categoria)
                const isSelected = itensSelecionados.includes(item.id)

                return (
                  <tr
                    key={`${item.origem}-${item.id}`}
                    className={cn(
                      "border-b border-slate-100 hover:bg-slate-50/50 transition-colors",
                      isSelected && "bg-[#f0f9f9]"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-2 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setItensSelecionados([...itensSelecionados, item.id])
                          } else {
                            setItensSelecionados(itensSelecionados.filter(id => id !== item.id))
                          }
                        }}
                        className="data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                      />
                    </td>

                    {/* Vencimento */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium whitespace-nowrap ${isVencido ? 'text-red-600' : 'text-slate-700'}`}>
                          {item.data_vencimento ? formatDate(item.data_vencimento) : '-'}
                        </span>
                        {isPendente && diasVenc !== null && (
                          <span className={`text-[10px] ${isVencido ? 'text-red-500' : 'text-slate-400'}`}>
                            {getVencimentoLabel(diasVenc)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Data Pagamento */}
                    <td className="py-2.5 px-3">
                      {item.status === 'efetivado' && item.data_efetivacao ? (
                        <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                          {formatDate(item.data_efetivacao)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="py-2.5 px-3">
                      {item.tipo_movimento === 'receita' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <TrendingUp className="w-2.5 h-2.5" />
                          Receita
                        </span>
                      ) : item.tipo_movimento === 'despesa' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                          <TrendingDown className="w-2.5 h-2.5" />
                          Despesa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          <ArrowLeftRight className="w-2.5 h-2.5" />
                          Transf.
                        </span>
                      )}
                    </td>

                    {/* Descrição */}
                    <td className="py-2.5 px-3">
                      <p
                        className="text-xs text-slate-700 truncate max-w-[300px]"
                        title={item.descricao}
                      >
                        {item.descricao}
                      </p>
                    </td>

                    {/* Beneficiário */}
                    <td className="py-2.5 px-3">
                      <span
                        className="text-xs text-slate-600 truncate block max-w-[120px]"
                        title={item.entidade || ''}
                      >
                        {item.entidade || '-'}
                      </span>
                    </td>

                    {/* Categoria */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${categoriaConfig.color}`}>
                        {categoriaConfig.label}
                      </span>
                    </td>

                    {/* Conta */}
                    <td className="py-2.5 px-3">
                      {item.conta_bancaria_nome ? (
                        <span className="text-xs text-slate-600 truncate block max-w-[90px]" title={item.conta_bancaria_nome}>
                          {item.conta_bancaria_nome}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic whitespace-nowrap">Não vinculado</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-xs font-semibold whitespace-nowrap ${
                        item.tipo_movimento === 'receita' ? 'text-emerald-600' :
                        item.tipo_movimento === 'despesa' ? 'text-red-600' :
                        item.tipo_movimento === 'transferencia_saida' ? (contaFiltro === 'todas' ? 'text-blue-600' : 'text-red-600') :
                        item.tipo_movimento === 'transferencia_entrada' ? 'text-emerald-600' :
                        'text-slate-600'
                      }`}>
                        {item.tipo_movimento === 'receita' ? '+ ' :
                         item.tipo_movimento === 'despesa' ? '- ' :
                         item.tipo_movimento === 'transferencia_saida' && contaFiltro !== 'todas' ? '- ' :
                         item.tipo_movimento === 'transferencia_entrada' ? '+ ' :
                         ''}{formatCurrency(item.valor)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-2 text-center">
                      {/* Transferências têm menu simplificado */}
                      {(item.tipo_movimento === 'transferencia_saida' || item.tipo_movimento === 'transferencia_entrada') ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setModalDetalhes(item)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handlePrepararExclusao(item)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir Transferência
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : isPendente ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
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

                            {/* Editar - apenas receitas e despesas (não faturas) */}
                            {item.origem !== 'fatura' && (
                              <DropdownMenuItem onClick={() => handlePrepararEdicao(item)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Excluir */}
                            <DropdownMenuItem
                              onClick={() => handlePrepararExclusao(item)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {/* Ver Detalhes */}
                            <DropdownMenuItem onClick={() => setModalDetalhes(item)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>

                            {/* Editar - apenas receitas e despesas (não faturas) */}
                            {item.origem !== 'fatura' && (
                              <DropdownMenuItem onClick={() => handlePrepararEdicao(item)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Excluir */}
                            <DropdownMenuItem
                              onClick={() => handlePrepararExclusao(item)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    {modalDetalhes.tipo_movimento === 'receita' ? 'Receita' :
                     modalDetalhes.tipo_movimento === 'despesa' ? 'Despesa' :
                     modalDetalhes.tipo_movimento === 'transferencia_saida' ? 'Transferência (Saída)' :
                     modalDetalhes.tipo_movimento === 'transferencia_entrada' ? 'Transferência (Entrada)' : 'Outro'}
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
                  <p className={`text-lg font-bold ${
                    modalDetalhes.tipo_movimento === 'receita' || modalDetalhes.tipo_movimento === 'transferencia_entrada'
                      ? 'text-emerald-600'
                      : modalDetalhes.tipo_movimento === 'transferencia_saida'
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}>
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

      {/* Modal Confirmação Exclusão */}
      <Dialog open={!!modalExcluir} onOpenChange={() => { setModalExcluir(null); setExclusaoInfo(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          {modalExcluir && exclusaoInfo && (
            <div className="space-y-4">
              {/* Info do item */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">{modalExcluir.descricao}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm font-bold ${
                    modalExcluir.tipo_movimento === 'receita' || modalExcluir.tipo_movimento === 'transferencia_entrada'
                      ? 'text-emerald-600'
                      : modalExcluir.tipo_movimento === 'transferencia_saida'
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(modalExcluir.valor)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {modalExcluir.tipo_movimento === 'receita' ? 'Receita' :
                     modalExcluir.tipo_movimento === 'despesa' ? 'Despesa' :
                     modalExcluir.tipo_movimento === 'transferencia_saida' ? 'Transf. Saída' :
                     modalExcluir.tipo_movimento === 'transferencia_entrada' ? 'Transf. Entrada' : 'Outro'}
                  </Badge>
                </div>
              </div>

              {/* Avisos */}
              <div className="space-y-2">
                {/* Aviso especial para transferências */}
                {(modalExcluir.tipo_movimento === 'transferencia_saida' || modalExcluir.tipo_movimento === 'transferencia_entrada') && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <ArrowLeftRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Transferência entre contas</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Ao excluir esta transferência, tanto a saída quanto a entrada serão removidas.
                        O saldo de ambas as contas será recalculado automaticamente.
                      </p>
                    </div>
                  </div>
                )}

                {exclusaoInfo.jaPago && !(modalExcluir.tipo_movimento === 'transferencia_saida' || modalExcluir.tipo_movimento === 'transferencia_entrada') && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Lançamento já efetivado</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Este {modalExcluir.tipo_movimento === 'receita' ? 'recebimento' : 'pagamento'} já foi registrado no sistema.
                        O saldo da conta será recalculado automaticamente.
                      </p>
                    </div>
                  </div>
                )}

                {exclusaoInfo.temParcelas > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Parcelas vinculadas</p>
                      <p className="text-xs text-red-700 mt-0.5">
                        Esta receita possui {exclusaoInfo.temParcelas} parcela(s) que também serão excluídas.
                      </p>
                    </div>
                  </div>
                )}

                {modalExcluir.processo_id && (
                  <div className="flex items-start gap-2 p-3 bg-slate-100 rounded-lg">
                    <FileText className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700">
                        O vínculo com o processo será removido.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmação */}
              <p className="text-sm text-slate-600">
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setModalExcluir(null); setExclusaoInfo(null) }}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleExcluir}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Edição */}
      <Dialog open={!!modalEditar} onOpenChange={() => setModalEditar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">
              Editar {modalEditar?.tipo_movimento === 'receita' ? 'Receita' : 'Despesa'}
            </DialogTitle>
          </DialogHeader>
          {modalEditar && (
            <div className="space-y-4">
              {/* Aviso se já foi pago */}
              {modalEditar.status === 'efetivado' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Este lançamento já foi efetivado. O valor não pode ser alterado.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs">Descrição *</Label>
                <Input
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  placeholder="Descrição do lançamento"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editForm.valor}
                    onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                    placeholder="0,00"
                    disabled={modalEditar.status === 'efetivado'}
                    className={modalEditar.status === 'efetivado' ? 'bg-slate-100' : ''}
                  />
                </div>
                <div>
                  <Label className="text-xs">Vencimento *</Label>
                  <Input
                    type="date"
                    value={editForm.data_vencimento}
                    onChange={(e) => setEditForm({ ...editForm, data_vencimento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Categoria</Label>
                <select
                  value={editForm.categoria}
                  onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
                >
                  {modalEditar.tipo_movimento === 'receita' ? (
                    <>
                      <option value="honorario">Honorário</option>
                      <option value="honorario_avulso">Avulso</option>
                      <option value="exito">Êxito</option>
                      <option value="outras">Outras</option>
                    </>
                  ) : (
                    <>
                      <option value="custas">Custas</option>
                      <option value="fornecedor">Fornecedor</option>
                      <option value="folha">Folha</option>
                      <option value="impostos">Impostos</option>
                      <option value="aluguel">Aluguel</option>
                      <option value="marketing">Marketing</option>
                      <option value="tecnologia">Tecnologia</option>
                      <option value="assinatura">Assinatura</option>
                      <option value="outras">Outras</option>
                    </>
                  )}
                </select>
              </div>

              {modalEditar.tipo_movimento === 'despesa' && (
                <div>
                  <Label className="text-xs">Fornecedor</Label>
                  <Input
                    value={editForm.fornecedor}
                    onChange={(e) => setEditForm({ ...editForm, fornecedor: e.target.value })}
                    placeholder="Nome do fornecedor"
                  />
                </div>
              )}

              {modalEditar.tipo_movimento === 'receita' && (
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={editForm.observacoes}
                    onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                    placeholder="Observações adicionais"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setModalEditar(null)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSalvarEdicao} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Categoria em Massa */}
      <Dialog open={modalAlterarCategoria} onOpenChange={setModalAlterarCategoria}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Alterar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Alterar categoria de <span className="font-semibold">{itensSelecionados.length}</span> {itensSelecionados.length === 1 ? 'lançamento' : 'lançamentos'}
            </p>

            <div>
              <Label className="text-xs">Nova Categoria</Label>
              <select
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm mt-1"
              >
                <option value="">Selecione...</option>
                <optgroup label="Receitas">
                  <option value="honorario">Honorário</option>
                  <option value="honorario_avulso">Avulso</option>
                  <option value="exito">Êxito</option>
                  <option value="outras">Outras</option>
                </optgroup>
                <optgroup label="Despesas">
                  <option value="custas">Custas</option>
                  <option value="fornecedor">Fornecedor</option>
                  <option value="folha">Folha</option>
                  <option value="impostos">Impostos</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="marketing">Marketing</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="assinatura">Assinatura</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="infraestrutura">Infraestrutura</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="beneficios">Benefícios</option>
                  <option value="telefonia">Telefonia</option>
                  <option value="taxas_bancarias">Taxas Bancárias</option>
                  <option value="emprestimos">Empréstimos</option>
                  <option value="retirada_socios">Retirada Sócios</option>
                  <option value="associacoes">Associações</option>
                  <option value="outras">Outras</option>
                </optgroup>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalAlterarCategoria(false)
                  setNovaCategoria('')
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAlterarCategoriaEmMassa}
                disabled={submitting || !novaCategoria}
                className="bg-[#34495e] hover:bg-[#46627f]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Categoria'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Vincular Conta em Massa */}
      <Dialog open={modalVincularConta} onOpenChange={setModalVincularConta}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Vincular Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Vincular <span className="font-semibold">{itensSelecionados.length}</span> {itensSelecionados.length === 1 ? 'lançamento' : 'lançamentos'} à conta:
            </p>

            <div>
              <Label className="text-xs">Conta Bancária</Label>
              <select
                value={contaParaVincular}
                onChange={(e) => setContaParaVincular(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm mt-1"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.banco} - {conta.numero_conta}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalVincularConta(false)
                  setContaParaVincular('')
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleVincularContaEmMassa}
                disabled={submitting || !contaParaVincular}
                className="bg-[#34495e] hover:bg-[#46627f]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  'Vincular Conta'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Receita */}
      <ReceitaModal
        open={modalReceita}
        onOpenChange={setModalReceita}
        onSuccess={() => loadExtrato()}
      />

      {/* Modal Nova Despesa */}
      <DespesaModal
        open={modalDespesa}
        onOpenChange={setModalDespesa}
        onSuccess={() => loadExtrato()}
      />
    </div>
  )
}
