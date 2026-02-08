'use client'

import { useState, useEffect } from 'react'
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
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useFaturamento } from '@/hooks/useFaturamento'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { PreviewCollapsible } from '@/components/faturamento/PreviewCollapsible'
import { FaturaGeradaCard } from '@/components/faturamento/FaturaGeradaCard'
import { FaturasTable } from '@/components/faturamento/FaturasTable'
import { FaturaDetalhesPanel } from '@/components/faturamento/FaturaDetalhesPanel'
import { ClientesTable } from '@/components/faturamento/ClientesTable'
import { cn, formatHoras } from '@/lib/utils'
import { formatDateForDB } from '@/lib/timezone'
import { toast } from 'sonner'
import type {
  ClienteParaFaturar,
  LancamentoProntoFaturar,
  FaturaGerada,
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
  } = useFaturamento(escritoriosSelecionados)

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

  // Dialog de confirmação para desmontar fatura
  const [faturaParaDesmontar, setFaturaParaDesmontar] = useState<string | null>(null)

  // Modal de confirmação para gerar fatura
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [dataEmissao, setDataEmissao] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')

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
    setClientes(clientesData)
    setFaturas(faturasData)
  }

  const handlePreview = async (cliente: ClienteParaFaturar) => {
    // Se clicar no mesmo cliente, toggle o painel de preview
    if (selectedCliente?.cliente_id === cliente.cliente_id && showPreview) {
      setShowPreview(false)
      setSelectedCliente(null)
      setLancamentos([])
      setSelectedLancamentosIds([])
      return
    }

    setSelectedCliente(cliente)
    setShowPreview(false)

    // Carregar lançamentos do cliente
    const lancamentosData = await loadLancamentosPorCliente(cliente.cliente_id)
    setLancamentos(lancamentosData)

    // Selecionar todos por padrão
    setSelectedLancamentosIds(lancamentosData.map((l) => l.lancamento_id))

    // Mostrar preview
    setShowPreview(true)
  }

  const handleToggleLancamento = (id: string) => {
    setSelectedLancamentosIds((prev) =>
      prev.includes(id) ? prev.filter((lid) => lid !== id) : [...prev, id]
    )
  }

  const handleGerarFatura = () => {
    if (!selectedCliente) return

    // Calcular defaults
    const hoje = new Date()
    const vencimento = new Date(hoje)
    vencimento.setDate(vencimento.getDate() + 30)

    setDataEmissao(formatDateForDB(hoje))
    setDataVencimento(formatDateForDB(vencimento))
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
      undefined, // escritorioIdOverride
      fechamentosIds,
      undefined, // despesasIds
      dataEmissao || undefined
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#34495e]">Faturamento Inteligente</h1>
          <p className="text-xs md:text-sm text-slate-600 mt-1">
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
                  className="border-slate-200 bg-white hover:bg-slate-50"
                >
                  <Building2 className="h-4 w-4 mr-2 text-[#34495e]" />
                  <span className="text-sm">{getSeletorLabel()}</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
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
                        : 'hover:bg-slate-100 text-slate-700'
                    )}
                  >
                    <span className="font-medium">Todos os escritórios</span>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  <div className="h-px bg-slate-200 my-2" />

                  {/* Lista de escritórios */}
                  {escritoriosGrupo.map((escritorio) => (
                    <div
                      key={escritorio.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      <Checkbox
                        id={`esc-${escritorio.id}`}
                        checked={escritoriosSelecionados.includes(escritorio.id)}
                        onCheckedChange={() => toggleEscritorio(escritorio.id)}
                      />
                      <label
                        htmlFor={`esc-${escritorio.id}`}
                        className="flex-1 text-sm text-slate-700 cursor-pointer"
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
            onClick={loadData}
            disabled={loading}
            className="border-slate-200"
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
              <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
                {clientes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="faturados">
            Faturados
            {faturas.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                {faturas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Prontos para Faturar */}
        <TabsContent value="prontos" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Coluna Esquerda - Lista de Clientes */}
            <div className={cn(showPreview ? 'xl:col-span-7' : 'xl:col-span-12')}>
              <ClientesTable
                clientes={clientes}
                selectedCliente={selectedCliente}
                onSelectCliente={handlePreview}
                loading={loading}
              />
            </div>

            {/* Coluna Direita - Preview da Fatura */}
            {showPreview && selectedCliente && (
              <div className="xl:col-span-5">
                <PreviewCollapsible
                  clienteNome={selectedCliente.cliente_nome}
                  lancamentos={lancamentos}
                  selectedIds={selectedLancamentosIds}
                  onToggleLancamento={handleToggleLancamento}
                  onGerarFatura={handleGerarFatura}
                  onCancelar={() => {
                    setShowPreview(false)
                    setSelectedCliente(null)
                    setSelectedLancamentosIds([])
                    setLancamentos([])
                  }}
                  pastas={selectedCliente.pastas}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Faturados */}
        <TabsContent value="faturados" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Coluna Esquerda - Lista de Faturas */}
            <div className={cn(showFaturaDetails ? 'xl:col-span-7' : 'xl:col-span-12')}>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Faturas Geradas
                      </CardTitle>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {faturas.length} {faturas.length === 1 ? 'fatura' : 'faturas'}
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
                </CardHeader>
                <CardContent className="pt-2 pb-3">
                  {viewMode === 'card' ? (
                    loading ? (
                      <div className="py-12 text-center">
                        <Clock className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
                        <p className="text-sm text-slate-500 mt-2">Carregando...</p>
                      </div>
                    ) : faturas.length === 0 ? (
                      <div className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-slate-300" />
                        <p className="text-sm text-slate-500 mt-2">Nenhuma fatura gerada ainda</p>
                      </div>
                    ) : (
                      <div className={cn(
                        "grid gap-4",
                        showFaturaDetails
                          ? "grid-cols-1 xl:grid-cols-2"
                          : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
                      )}>
                        {faturas.map((fatura) => (
                          <FaturaGeradaCard
                            key={fatura.fatura_id}
                            fatura={fatura}
                            onDesmontar={(id) => setFaturaParaDesmontar(id)}
                            onVisualizarItens={() => handleVisualizarFatura(fatura)}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <FaturasTable
                      faturas={faturas}
                      selectedFatura={selectedFatura}
                      onSelectFatura={handleVisualizarFatura}
                      onDesmontar={(id) => setFaturaParaDesmontar(id)}
                      loading={loading}
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
                  escritorioId={escritorioAtivo}
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
            <DialogTitle className="flex items-center gap-2 text-[#34495e] text-sm">
              <FileText className="h-4 w-4" />
              Confirmar Geração de Fatura
            </DialogTitle>
          </DialogHeader>

          {selectedCliente && (
            <div className="space-y-3">
              {/* Resumo */}
              <div className="bg-slate-50 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Cliente</span>
                  <span className="font-medium text-[#34495e]">{selectedCliente.cliente_nome}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Itens</span>
                  <span className="font-medium text-[#34495e]">
                    {selectedLancamentosIds.length} {selectedLancamentosIds.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Valor Total</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatCurrency(
                      lancamentos
                        .filter(l => selectedLancamentosIds.includes(l.lancamento_id))
                        .reduce((sum, l) => sum + (l.valor || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="data-emissao" className="text-[11px] text-slate-600">
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
                  <Label htmlFor="data-vencimento" className="text-[11px] text-slate-600">
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
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="border-slate-200 text-xs h-8"
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
    </div>
  )
}
