'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List,
  Building2,
  ChevronDown,
  Check,
  FolderOpen,
  Search,
  X,
  Landmark,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useFaturamento } from '@/hooks/useFaturamento'
import { useFechamentosPasta } from '@/hooks/useFechamentosPasta'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { PreviewCollapsible } from '@/components/faturamento/PreviewCollapsible'
import { FaturaGeradaCard } from '@/components/faturamento/FaturaGeradaCard'
import { FaturasTable } from '@/components/faturamento/FaturasTable'
import { FaturaDetalhesPanel } from '@/components/faturamento/FaturaDetalhesPanel'
import { ClientesTable } from '@/components/faturamento/ClientesTable'
import { cn, formatHoras } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  ClienteParaFaturar,
  LancamentoProntoFaturar,
  FaturaGerada,
  ContractLimits,
} from '@/hooks/useFaturamento'

export default function FaturamentoPage() {
  const { escritorioAtivo } = useEscritorioAtivo()

  // Multi-escritório states
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  console.log('FaturamentoPage: escritoriosSelecionados =', escritoriosSelecionados)

  const {
    loading,
    loadClientesParaFaturar,
    loadLancamentosPorCliente,
    loadFaturasGeradas,
    gerarFatura,
    desmontarFatura,
    loadContractLimits,
    loadContasBancarias,
  } = useFaturamento(escritoriosSelecionados)

  const {
    loading: loadingPasta,
    removerProcesso: removerProcessoPasta,
    cancelarFechamento,
    executarFechamentoManual,
  } = useFechamentosPasta(escritoriosSelecionados)

  const [activeTab, setActiveTab] = useState<'prontos' | 'faturados'>('prontos')

  const [clientes, setClientes] = useState<ClienteParaFaturar[]>([])
  const [faturas, setFaturas] = useState<FaturaGerada[]>([])
  const [selectedCliente, setSelectedCliente] = useState<ClienteParaFaturar | null>(null)
  const [lancamentos, setLancamentos] = useState<LancamentoProntoFaturar[]>([])
  const [selectedLancamentosIds, setSelectedLancamentosIds] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Estados para faturas geradas
  const [selectedFatura, setSelectedFatura] = useState<FaturaGerada | null>(null)
  const [showFaturaDetails, setShowFaturaDetails] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // Pesquisa e filtros de faturas
  const [searchFaturas, setSearchFaturas] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const faturasFiltradas = useMemo(() => {
    let resultado = faturas

    // Filtro por texto (número da fatura ou nome do cliente)
    if (searchFaturas.trim()) {
      const termo = searchFaturas.toLowerCase().trim()
      resultado = resultado.filter(
        (f) =>
          f.numero_fatura.toLowerCase().includes(termo) ||
          f.cliente_nome.toLowerCase().includes(termo)
      )
    }

    // Filtro por status
    if (statusFilter) {
      resultado = resultado.filter((f) => f.categoria_status === statusFilter)
    }

    return resultado
  }, [faturas, searchFaturas, statusFilter])

  const statusContagem = useMemo(() => {
    const contagem: Record<string, number> = {}
    for (const f of faturas) {
      const cat = f.categoria_status || f.status
      contagem[cat] = (contagem[cat] || 0) + 1
    }
    return contagem
  }, [faturas])

  // Dialog de confirmação para desmontar fatura
  const [faturaParaDesmontar, setFaturaParaDesmontar] = useState<string | null>(null)

  // Modal de confirmação para gerar fatura
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [dataEmissao, setDataEmissao] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [contasBancarias, setContasBancarias] = useState<{ id: string; banco: string; agencia: string; numero_conta: string; saldo_atual: number }[]>([])
  const [contaBancariaSelecionada, setContaBancariaSelecionada] = useState<string>('')

  // Limites contratuais para preview
  const [contractLimits, setContractLimits] = useState<Record<string, ContractLimits>>({})

  // Modal de execução manual de fechamento de pastas
  const [showExecutarModal, setShowExecutarModal] = useState(false)
  const [competenciaManual, setCompetenciaManual] = useState('')

  // Carregar escritórios do grupo (com todos selecionados por padrão)
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

  // Funções do seletor de escritórios
  const toggleEscritorio = (escritorioId: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(escritorioId)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== escritorioId)
      } else {
        return [...prev, escritorioId]
      }
    })
  }

  const selecionarTodos = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (escritorioId: string) => {
    setEscritoriosSelecionados([escritorioId])
  }

  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === escritoriosGrupo.length) {
      return 'Todos os escritórios'
    } else if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    } else {
      return `${escritoriosSelecionados.length} escritórios`
    }
  }

  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadData()
    }
  }, [escritoriosSelecionados])

  const loadData = async () => {
    const [clientesData, faturasData] = await Promise.all([
      loadClientesParaFaturar(),
      loadFaturasGeradas(),
    ])
    // Enriquecer cada cliente com o nome do escritório
    const enriched = clientesData.map(c => ({
      ...c,
      escritorio_nome: escritoriosGrupo.find(e => e.id === c.escritorio_id)?.nome || '',
    }))
    setClientes(enriched)
    setFaturas(faturasData)
  }

  const handlePreview = async (cliente: ClienteParaFaturar) => {
    setSelectedCliente(cliente)
    const lancamentosData = await loadLancamentosPorCliente(cliente.cliente_id, cliente.escritorio_id)
    setLancamentos(lancamentosData)
    setSelectedLancamentosIds(lancamentosData.map((l) => l.lancamento_id))

    // Carregar limites contratuais (min/max mensal) dos contratos envolvidos
    const contratoIds = [...new Set(lancamentosData.map(l => l.contrato_id).filter(Boolean))] as string[]
    const limits = await loadContractLimits(contratoIds)
    setContractLimits(limits)

    setShowPreview(true)
  }

  const handleToggleLancamento = (id: string) => {
    setSelectedLancamentosIds((prev) =>
      prev.includes(id) ? prev.filter((lid) => lid !== id) : [...prev, id]
    )
  }

  const handleGerarFatura = async () => {
    if (!selectedCliente) return

    // Calcular defaults — input type="date" precisa de yyyy-MM-dd
    const hoje = new Date()
    const vencimento = new Date(hoje)
    vencimento.setDate(vencimento.getDate() + 30)

    const toYMD = (d: Date) => d.toISOString().split('T')[0]
    setDataEmissao(toYMD(hoje))
    setDataVencimento(toYMD(vencimento))
    setContaBancariaSelecionada('')

    // Carregar contas bancárias disponíveis
    const contas = await loadContasBancarias()
    setContasBancarias(contas)

    setShowConfirmModal(true)
  }

  const handleConfirmarFatura = async () => {
    if (!selectedCliente) return

    const honorariosIds = selectedLancamentosIds.filter((id) =>
      lancamentos.find((l) => l.lancamento_id === id && l.tipo_lancamento === 'honorario')
    )
    const timesheetIds = selectedLancamentosIds.filter((id) =>
      lancamentos.find((l) => l.lancamento_id === id && l.tipo_lancamento === 'timesheet')
    )
    const fechamentosIds = lancamentos
      .filter(
        (l) =>
          l.tipo_lancamento === 'pasta' &&
          selectedLancamentosIds.includes(l.lancamento_id) &&
          l.fechamento_id
      )
      .map((l) => l.fechamento_id as string)

    const faturaId = await gerarFatura(
      selectedCliente.cliente_id,
      honorariosIds,
      timesheetIds,
      undefined, // observações
      dataVencimento || undefined,
      selectedCliente.escritorio_id, // escritorioIdOverride — gerar no escritório correto
      fechamentosIds,
      undefined, // despesasIds
      dataEmissao || undefined,
      contaBancariaSelecionada || undefined
    )

    if (faturaId) {
      toast.success('Fatura gerada com sucesso!')
      setShowConfirmModal(false)
      setSelectedCliente(null)
      setShowPreview(false)
      setSelectedLancamentosIds([])
      setLancamentos([])
      loadData()
      setActiveTab('faturados')
    } else {
      toast.error('Erro ao gerar fatura. Tente novamente.')
    }
  }

  const handleVisualizarFatura = (fatura: FaturaGerada) => {
    // Se clicar na mesma fatura, toggle o painel
    if (selectedFatura?.fatura_id === fatura.fatura_id && showFaturaDetails) {
      setShowFaturaDetails(false)
      setSelectedFatura(null)
      return
    }

    setSelectedFatura(fatura)
    setShowFaturaDetails(true)
  }

  const handleDesmontarFatura = async (faturaId: string) => {
    const success = await desmontarFatura(faturaId)

    if (success) {
      toast.success('Fatura desmontada com sucesso!')
      setFaturaParaDesmontar(null)
      setSelectedFatura(null)
      setShowFaturaDetails(false)
      loadData()
      setActiveTab('prontos')
    } else {
      toast.error('Erro ao desmontar fatura. Tente novamente.')
    }
  }

  const handleRemoverProcessoPasta = async (fechamentoId: string, processoId: string) => {
    const success = await removerProcessoPasta(fechamentoId, processoId)
    if (success) {
      if (selectedCliente) {
        const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id)
        setLancamentos(lancamentosData)
      }
      loadData()
    }
  }

  const handleExcluirPasta = async (fechamentoId: string) => {
    const success = await cancelarFechamento(fechamentoId)
    if (success) {
      toast.success('Fechamento excluído')
      if (selectedCliente) {
        const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id)
        setLancamentos(lancamentosData)
        setSelectedLancamentosIds((prev) =>
          prev.filter((id) => lancamentosData.some((l) => l.lancamento_id === id))
        )
      }
      loadData()
    } else {
      toast.error('Erro ao excluir fechamento')
    }
  }

  const handleExecutarFechamento = async () => {
    const competencia = competenciaManual ? `${competenciaManual}-01` : undefined
    const result = await executarFechamentoManual(competencia)
    if (result.success) {
      const qtd = result.fechamentos_criados ?? 0
      toast.success(
        qtd > 0
          ? `${qtd} fechamento${qtd !== 1 ? 's' : ''} gerado${qtd !== 1 ? 's' : ''} com sucesso`
          : 'Nenhum fechamento novo gerado (contratos já processados para este mês)'
      )
      setShowExecutarModal(false)
      setCompetenciaManual('')
      loadData()
    } else {
      toast.error('Erro ao executar fechamento de pastas')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#34495e] dark:text-slate-200">Faturamento Inteligente</h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gere faturas consolidadas automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Seletor de Escritórios */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1 hover:bg-slate-50 dark:hover:bg-surface-2"
                >
                  <Building2 className="h-4 w-4 mr-2 text-[#34495e] dark:text-slate-200" />
                  <span className="text-sm">{getSeletorLabel()}</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-slate-400 dark:text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="space-y-1">
                  {/* Opção: Todos */}
                  <button
                    onClick={selecionarTodos}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      escritoriosSelecionados.length === escritoriosGrupo.length
                        ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                        : 'hover:bg-slate-100 dark:hover:bg-surface-3 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <span className="font-medium">Todos os escritórios</span>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

                  {/* Lista de escritórios */}
                  {escritoriosGrupo.map((escritorio) => (
                    <div
                      key={escritorio.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2"
                    >
                      <Checkbox
                        id={`esc-${escritorio.id}`}
                        checked={escritoriosSelecionados.includes(escritorio.id)}
                        onCheckedChange={() => toggleEscritorio(escritorio.id)}
                      />
                      <label
                        htmlFor={`esc-${escritorio.id}`}
                        className="flex-1 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {escritorio.nome}
                      </label>
                      <button
                        onClick={() => selecionarApenas(escritorio.id)}
                        className="text-[10px] text-[#1E3A8A] hover:underline"
                      >
                        apenas
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const hoje = new Date()
              setCompetenciaManual(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`)
              setShowExecutarModal(true)
            }}
            className="border-amber-200 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
          >
            <FolderOpen className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Fechamento de Pastas</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={cn('h-4 w-4 md:mr-2', loading && 'animate-spin')} />
            <span className="hidden md:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabs: Prontos para Faturar | Faturados */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'prontos' | 'faturados')}>
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="prontos">
            Prontos para Faturar
            {clientes.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {clientes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="faturados">
            Faturados
            {faturas.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                {faturas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Prontos para Faturar */}
        <TabsContent value="prontos" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Lista de Clientes — sempre full-width */}
            <div className="xl:col-span-12">
              <ClientesTable
                clientes={clientes}
                selectedCliente={selectedCliente}
                onSelectCliente={handlePreview}
                loading={loading}
                showEscritorio={escritoriosGrupo.length > 1}
              />
            </div>
          </div>

          {/* Modal de Preview — Dialog fora do grid */}
          {selectedCliente && (
            <PreviewCollapsible
              open={showPreview}
              onOpenChange={(open) => {
                if (!open) {
                  setShowPreview(false)
                  setSelectedCliente(null)
                  setSelectedLancamentosIds([])
                  setLancamentos([])
                }
              }}
              clienteNome={selectedCliente.cliente_nome}
              lancamentos={lancamentos}
              selectedIds={selectedLancamentosIds}
              onToggleLancamento={handleToggleLancamento}
              onSetSelectedIds={setSelectedLancamentosIds}
              onGerarFatura={handleGerarFatura}
              pastas={selectedCliente.pastas}
              onRemoverProcessoPasta={handleRemoverProcessoPasta}
              onExcluirPasta={handleExcluirPasta}
              contractLimits={contractLimits}
            />
          )}
        </TabsContent>

        {/* Tab: Faturados */}
        <TabsContent value="faturados" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Coluna Esquerda - Lista de Faturas */}
            <div className={cn(showFaturaDetails ? 'xl:col-span-7' : 'xl:col-span-12')}>
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-2 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Faturas Geradas
                      </CardTitle>
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        {faturasFiltradas.length === faturas.length
                          ? `${faturas.length} ${faturas.length === 1 ? 'fatura' : 'faturas'}`
                          : `${faturasFiltradas.length} de ${faturas.length}`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={viewMode === 'card' ? 'default' : 'outline'}
                        onClick={() => setViewMode('card')}
                        className="h-8 px-2.5"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        onClick={() => setViewMode('list')}
                        className="h-8 px-2.5"
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Barra de pesquisa e filtros de status */}
                  <div className="space-y-2">
                    {/* Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                      <Input
                        placeholder="Buscar por n\u00famero da fatura ou nome do cliente..."
                        value={searchFaturas}
                        onChange={(e) => setSearchFaturas(e.target.value)}
                        className="pl-9 pr-8 h-9 text-sm border-slate-200 dark:border-slate-700"
                      />
                      {searchFaturas && (
                        <button
                          onClick={() => setSearchFaturas('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtros de status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setStatusFilter(null)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                          statusFilter === null
                            ? 'bg-[#34495e] text-white'
                            : 'bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-3'
                        )}
                      >
                        Todas
                      </button>
                      {statusContagem['pendente'] && (
                        <button
                          onClick={() => setStatusFilter('pendente')}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            statusFilter === 'pendente'
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                          )}
                        >
                          Pendentes ({statusContagem['pendente']})
                        </button>
                      )}
                      {statusContagem['parcial'] && (
                        <button
                          onClick={() => setStatusFilter('parcial')}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            statusFilter === 'parcial'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                          )}
                        >
                          Parciais ({statusContagem['parcial']})
                        </button>
                      )}
                      {statusContagem['atrasado'] && (
                        <button
                          onClick={() => setStatusFilter('atrasado')}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            statusFilter === 'atrasado'
                              ? 'bg-red-600 text-white'
                              : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100'
                          )}
                        >
                          Atrasadas ({statusContagem['atrasado']})
                        </button>
                      )}
                      {statusContagem['pago'] && (
                        <button
                          onClick={() => setStatusFilter('pago')}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            statusFilter === 'pago'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                          )}
                        >
                          Pagas ({statusContagem['pago']})
                        </button>
                      )}
                      {statusContagem['cancelado'] && (
                        <button
                          onClick={() => setStatusFilter('cancelado')}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            statusFilter === 'cancelado'
                              ? 'bg-slate-600 text-white'
                              : 'bg-slate-100 dark:bg-surface-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-3'
                          )}
                        >
                          Canceladas ({statusContagem['cancelado']})
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 pb-3">
                  {viewMode === 'card' ? (
                    loading ? (
                      <div className="py-12 text-center">
                        <Clock className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Carregando...</p>
                      </div>
                    ) : faturasFiltradas.length === 0 ? (
                      <div className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-slate-300" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                          {faturas.length === 0
                            ? 'Nenhuma fatura gerada ainda'
                            : 'Nenhuma fatura encontrada com os filtros aplicados'}
                        </p>
                        {(searchFaturas || statusFilter) && faturas.length > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => { setSearchFaturas(''); setStatusFilter(null) }}
                            className="mt-1 text-xs text-blue-600"
                          >
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className={cn(
                        "grid gap-4",
                        showFaturaDetails
                          ? "grid-cols-1 xl:grid-cols-2"
                          : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
                      )}>
                        {faturasFiltradas.map((fatura) => (
                          <FaturaGeradaCard
                            key={fatura.fatura_id}
                            fatura={fatura}
                            onDesmontar={(id) => setFaturaParaDesmontar(id)}
                            onVisualizarItens={() => handleVisualizarFatura(fatura)}
                            escritorioNome={escritoriosGrupo.length > 1 ? escritoriosGrupo.find(e => e.id === fatura.escritorio_id)?.nome : undefined}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <FaturasTable
                      faturas={faturasFiltradas}
                      selectedFatura={selectedFatura}
                      onSelectFatura={handleVisualizarFatura}
                      onDesmontar={(id) => setFaturaParaDesmontar(id)}
                      loading={loading}
                      showEscritorio={escritoriosGrupo.length > 1}
                      escritoriosMap={new Map(escritoriosGrupo.map(e => [e.id, e.nome]))}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Detalhes da Fatura */}
            {showFaturaDetails && selectedFatura && (
              <div className="xl:col-span-5">
                <FaturaDetalhesPanel
                  fatura={selectedFatura}
                  escritorioId={selectedFatura?.escritorio_id || escritorioAtivo}
                  onClose={() => {
                    setShowFaturaDetails(false)
                    setSelectedFatura(null)
                  }}
                  onPagamentoRealizado={() => {
                    // Recarregar dados após pagamento
                    loadData()
                    setShowFaturaDetails(false)
                    setSelectedFatura(null)
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* Dialog de Confirmação - Desmontar Fatura */}
      <AlertDialog
        open={faturaParaDesmontar !== null}
        onOpenChange={() => setFaturaParaDesmontar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmontar Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desmontar esta fatura? Os lançamentos retornarão para o
              estado "pronto para faturar" e a fatura será cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (faturaParaDesmontar) {
                  handleDesmontarFatura(faturaParaDesmontar)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, desmontar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Gerar Fatura */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200 text-sm">
              <FileText className="h-4 w-4" />
              Confirmar Geração de Fatura
            </DialogTitle>
          </DialogHeader>

          {selectedCliente && (
            <div className="space-y-3">
              {/* Resumo */}
              <div className="bg-slate-50 dark:bg-surface-0 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Cliente</span>
                  <span className="font-medium text-[#34495e] dark:text-slate-200">{selectedCliente.cliente_nome}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Itens</span>
                  <span className="font-medium text-[#34495e] dark:text-slate-200">
                    {selectedLancamentosIds.length} {selectedLancamentosIds.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Valor Total</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {(() => {
                      const selectedLancs = lancamentos.filter(l => selectedLancamentosIds.includes(l.lancamento_id))
                      let total = selectedLancs.reduce((sum, l) => sum + (l.valor || 0), 0)

                      // Aplicar ajustes contratuais (min/max)
                      const contratoIds = [...new Set(selectedLancs.map(l => l.contrato_id).filter(Boolean))] as string[]
                      for (const cid of contratoIds) {
                        const limits = contractLimits[cid]
                        if (!limits) continue
                        const subtotalHoras = selectedLancs
                          .filter(l => l.contrato_id === cid && l.tipo_lancamento === 'timesheet')
                          .reduce((sum, l) => sum + (l.valor || 0), 0)
                        if (subtotalHoras === 0) continue
                        if (limits.min !== null && subtotalHoras < limits.min) {
                          total += (limits.min - subtotalHoras)
                        } else if (limits.max !== null && subtotalHoras > limits.max) {
                          total += (limits.max - subtotalHoras)
                        }
                      }

                      return formatCurrency(total)
                    })()}
                  </span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="data-emissao" className="text-[11px] text-slate-600 dark:text-slate-400">
                    Data de Emissão
                  </Label>
                  <Input
                    id="data-emissao"
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="data-vencimento" className="text-[11px] text-slate-600 dark:text-slate-400">
                    Data de Vencimento
                  </Label>
                  <Input
                    id="data-vencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Conta Bancária */}
              {contasBancarias.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Landmark className="h-3 w-3" />
                    Conta Bancária
                  </Label>
                  <Select value={contaBancariaSelecionada} onValueChange={setContaBancariaSelecionada}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione uma conta (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id} className="text-xs">
                          {conta.banco} — Ag {conta.agencia} / CC {conta.numero_conta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="border-slate-200 dark:border-slate-700 text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarFatura}
              disabled={loading || !dataVencimento}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              {loading ? 'Gerando...' : 'Gerar Fatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Executar Fechamento de Pastas */}
      <Dialog open={showExecutarModal} onOpenChange={setShowExecutarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              Fechamento de Pastas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gera fechamentos mensais para todos os contratos por pasta ativos. Se já existe um
              fechamento ativo para o mês selecionado, ele não será duplicado.
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
              O sistema executa este processo automaticamente todo dia 1º de cada mês às 3h (horário de Brasília).
              Use este botão para execução manual quando necessário.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="competencia-manual" className="text-xs text-slate-600">
                Mês de Referência (Competência)
              </Label>
              <Input
                id="competencia-manual"
                type="month"
                value={competenciaManual}
                onChange={(e) => setCompetenciaManual(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-slate-400">
                Deixe em branco para usar o mês atual
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowExecutarModal(false)}
              className="border-slate-200 text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExecutarFechamento}
              disabled={loadingPasta}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
            >
              {loadingPasta ? 'Executando...' : 'Executar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
