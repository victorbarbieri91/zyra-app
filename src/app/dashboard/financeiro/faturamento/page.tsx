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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useFaturamento } from '@/hooks/useFaturamento'
import { PreviewCollapsible } from '@/components/faturamento/PreviewCollapsible'
import { FaturaGeradaCard } from '@/components/faturamento/FaturaGeradaCard'
import { FaturasTable } from '@/components/faturamento/FaturasTable'
import { FaturaDetalhesPanel } from '@/components/faturamento/FaturaDetalhesPanel'
import { ClientesTable } from '@/components/faturamento/ClientesTable'
import { cn } from '@/lib/utils'
import type {
  ClienteParaFaturar,
  LancamentoProntoFaturar,
  FaturaGerada,
} from '@/hooks/useFaturamento'

export default function FaturamentoPage() {
  const { escritorioAtivo } = useEscritorioAtivo()

  console.log('FaturamentoPage: escritorioAtivo =', escritorioAtivo)

  const {
    loading,
    loadClientesParaFaturar,
    loadLancamentosPorCliente,
    loadFaturasGeradas,
    gerarFatura,
    desmontarFatura,
  } = useFaturamento(escritorioAtivo)

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

  useEffect(() => {
    if (escritorioAtivo) {
      loadData()
    }
  }, [escritorioAtivo])

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

  const handleGerarFatura = async () => {
    if (!selectedCliente) return

    const honorariosIds = selectedLancamentosIds.filter((id) =>
      lancamentos.find((l) => l.lancamento_id === id && l.tipo_lancamento === 'honorario')
    )
    const timesheetIds = selectedLancamentosIds.filter((id) =>
      lancamentos.find((l) => l.lancamento_id === id && l.tipo_lancamento === 'timesheet')
    )

    const faturaId = await gerarFatura(
      selectedCliente.cliente_id,
      honorariosIds,
      timesheetIds
    )

    if (faturaId) {
      alert('Fatura gerada com sucesso!')
      setSelectedCliente(null)
      setShowPreview(false)
      setSelectedLancamentosIds([])
      setLancamentos([])
      loadData()
      setActiveTab('faturados')
    } else {
      alert('Erro ao gerar fatura. Tente novamente.')
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
      alert('Fatura desmontada com sucesso! Os itens foram retornados para faturamento.')
      setFaturaParaDesmontar(null)
      setSelectedFatura(null)
      setShowFaturaDetails(false)
      loadData()
      setActiveTab('prontos')
    } else {
      alert('Erro ao desmontar fatura. Tente novamente.')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Faturamento Inteligente</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gere faturas consolidadas automaticamente
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="border-slate-200"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Tabs: Prontos para Faturar | Faturados */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
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
    </div>
  )
}
