'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  FileOutput,
  MoreHorizontal,
  Loader2,
  Send,
  Check,
  Ban,
  Printer,
  Banknote,
  RefreshCw,
  Eye,
  DollarSign,
  ChevronRight,
  Users,
} from 'lucide-react'
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
  useNotasDebito,
  type NotaDebito,
  type DespesaReembolsavel,
  type NotaDebitoItem,
  type ClienteComDespesasReembolsaveis,
} from '@/hooks/useNotasDebito'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  emitida: { label: 'Emitida', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  enviada: { label: 'Enviada', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  paga: { label: 'Paga', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
}

const STATUS_FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'emitida', label: 'Emitida' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'paga', label: 'Paga' },
  { value: 'cancelada', label: 'Cancelada' },
]

// Default vencimento: hoje + 30 dias
const getDefaultVencimento = (): string => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

interface NotasDebitoContentProps {
  embedded?: boolean
  showEscritorio?: boolean
  escritoriosMap?: Map<string, string>
  escritorioColorMap?: Map<string, string>
}

export default function NotasDebitoContent({ embedded = false, showEscritorio = false, escritoriosMap, escritorioColorMap }: NotasDebitoContentProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const {
    notas,
    loading,
    filtroStatus,
    setFiltroStatus,
    clientesComDespesas,
    loadingClientes,
    recarregar,
    buscarDespesasReembolsaveis,
    criarNota,
    desmontarNota,
    marcarEnviada,
    marcarPaga,
    carregarItens,
  } = useNotasDebito()

  const [activeTab, setActiveTab] = useState<'disponiveis' | 'geradas'>('disponiveis')

  // Modal criar nota
  const [modalCriar, setModalCriar] = useState(false)
  const [clienteParaNota, setClienteParaNota] = useState<ClienteComDespesasReembolsaveis | null>(null)
  const [despesasDisponiveis, setDespesasDisponiveis] = useState<DespesaReembolsavel[]>([])
  const [despesasSelecionadas, setDespesasSelecionadas] = useState<Set<string>>(new Set())
  const [novaNotaVencimento, setNovaNotaVencimento] = useState('')
  const [novaNotaObs, setNovaNotaObs] = useState('')
  const [loadingDespesas, setLoadingDespesas] = useState(false)

  // Modal detalhes
  const [modalDetalhes, setModalDetalhes] = useState<NotaDebito | null>(null)
  const [itensDetalhes, setItensDetalhes] = useState<NotaDebitoItem[]>([])

  // Modal pagar
  const [modalPagar, setModalPagar] = useState<NotaDebito | null>(null)
  const [contaPagar, setContaPagar] = useState('')
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; banco: string; numero_conta: string }>>([])

  const [submitting, setSubmitting] = useState(false)

  // Dialog desmontar nota
  const [notaParaDesmontar, setNotaParaDesmontar] = useState<string | null>(null)

  // === Handlers Tab 1: Disponível para Gerar ===

  const handleSelecionarCliente = async (cliente: ClienteComDespesasReembolsaveis) => {
    setClienteParaNota(cliente)
    setDespesasSelecionadas(new Set())
    setNovaNotaVencimento(getDefaultVencimento())
    setNovaNotaObs('')
    setLoadingDespesas(true)
    setModalCriar(true)

    try {
      const despesas = await buscarDespesasReembolsaveis(cliente.cliente_id)
      setDespesasDisponiveis(despesas)
      // Pré-selecionar todas
      setDespesasSelecionadas(new Set(despesas.map(d => d.id)))
    } finally {
      setLoadingDespesas(false)
    }
  }

  const toggleDespesa = (id: string) => {
    setDespesasSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTodasDespesas = () => {
    if (despesasSelecionadas.size === despesasDisponiveis.length) {
      setDespesasSelecionadas(new Set())
    } else {
      setDespesasSelecionadas(new Set(despesasDisponiveis.map(d => d.id)))
    }
  }

  const totalSelecionado = despesasDisponiveis
    .filter(d => despesasSelecionadas.has(d.id))
    .reduce((s, d) => s + d.valor, 0)

  const handleCriarNota = async () => {
    if (!clienteParaNota || despesasSelecionadas.size === 0 || !novaNotaVencimento) {
      toast.error('Selecione despesas e data de vencimento')
      return
    }
    setSubmitting(true)
    try {
      await criarNota(
        clienteParaNota.cliente_id,
        Array.from(despesasSelecionadas),
        novaNotaVencimento,
        novaNotaObs
      )
      setModalCriar(false)
      setActiveTab('geradas')
    } catch (error) {
      console.error('Erro ao criar nota:', error)
      toast.error('Erro ao criar nota de débito')
    } finally {
      setSubmitting(false)
    }
  }

  // === Handlers Ações (Tab 2) ===

  const handleDesmontar = async (notaId: string) => {
    const success = await desmontarNota(notaId)
    if (success) {
      setNotaParaDesmontar(null)
      setActiveTab('disponiveis')
    }
  }

  const handleEnviar = async (nota: NotaDebito) => {
    setSubmitting(true)
    try {
      await marcarEnviada(nota.id)
    } catch (error) {
      toast.error('Erro ao marcar como enviada')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAbrirPagar = async (nota: NotaDebito) => {
    setContaPagar(nota.conta_bancaria_id || '')
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, numero_conta')
      .eq('escritorio_id', escritorioAtivo)
      .eq('ativa', true)
      .order('banco')
    setContasBancarias(data || [])
    setModalPagar(nota)
  }

  const handlePagar = async () => {
    if (!modalPagar || !contaPagar) {
      toast.error('Selecione a conta bancária')
      return
    }
    setSubmitting(true)
    try {
      await marcarPaga(modalPagar.id, contaPagar)
      setModalPagar(null)
    } catch (error) {
      toast.error('Erro ao marcar como paga')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerDetalhes = async (nota: NotaDebito) => {
    const itens = await carregarItens(nota.id)
    setItensDetalhes(itens)
    setModalDetalhes(nota)
  }

  const getCasoLabel = (d: DespesaReembolsavel) => {
    if (d.processo_autor && d.processo_reu) {
      const pasta = d.processo_numero_pasta ? `${d.processo_numero_pasta} - ` : ''
      return `${pasta}${d.processo_autor} x ${d.processo_reu}`
    }
    if (d.consulta_titulo) return d.consulta_titulo
    return '—'
  }

  // Contagens de status para pills
  const statusContagem = notas.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Notas filtradas
  const notasFiltradas = filtroStatus === 'todos'
    ? notas
    : notas.filter(n => n.status === filtroStatus)

  return (
    <div className={cn(embedded ? 'space-y-4' : 'p-4 md:p-6 space-y-6')}>
      {/* Header — hidden when embedded */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e] dark:text-slate-200">Notas de Débito</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cobre despesas reembolsáveis dos clientes com notas de débito formais
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={recarregar} disabled={loading || loadingClientes}>
            <RefreshCw className={cn('w-4 h-4 mr-1', (loading || loadingClientes) && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'disponiveis' | 'geradas')}>
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="disponiveis">
            Disponível para Gerar
            {clientesComDespesas.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {clientesComDespesas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="geradas">
            Notas Geradas
            {notas.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                {notas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === Tab 1: Disponível para Gerar === */}
        <TabsContent value="disponiveis" className="mt-6">
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-0">
              {loadingClientes ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : clientesComDespesas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Users className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">Nenhum cliente com despesas pendentes</p>
                  <p className="text-xs mt-1">Quando despesas reembolsáveis forem pagas, os clientes aparecerão aqui</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-1">
                        <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                        {showEscritorio && (
                          <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Escritório</th>
                        )}
                        <th className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Despesas</th>
                        <th className="p-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total a Cobrar</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesComDespesas.map(cliente => (
                        <tr
                          key={`${cliente.cliente_id}::${cliente.escritorio_id}`}
                          onClick={() => handleSelecionarCliente(cliente)}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-surface-1 transition-colors cursor-pointer group"
                        >
                          <td className="p-3">
                            <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{cliente.cliente_nome}</p>
                          </td>
                          {showEscritorio && (
                            <td className="p-3">
                              <span
                                className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate max-w-[80px]", escritorioColorMap?.get(cliente.escritorio_id) || 'bg-slate-100 text-slate-600 border-slate-200')}
                                title={escritoriosMap?.get(cliente.escritorio_id) || ''}
                              >
                                {escritoriosMap?.get(cliente.escritorio_id) || '-'}
                              </span>
                            </td>
                          )}
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 text-xs">
                              {cliente.qtd_despesas} {cliente.qtd_despesas === 1 ? 'despesa' : 'despesas'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(cliente.total_valor)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#34495e] dark:group-hover:text-slate-300 transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total geral */}
                  <div className="flex items-center justify-between px-3 py-3 bg-slate-50 dark:bg-surface-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {clientesComDespesas.length} {clientesComDespesas.length === 1 ? 'cliente' : 'clientes'} com despesas pendentes
                    </span>
                    <span className="text-sm font-bold text-[#34495e] dark:text-slate-200">
                      Total: {formatCurrency(clientesComDespesas.reduce((s, c) => s + c.total_valor, 0))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Tab 2: Notas Geradas === */}
        <TabsContent value="geradas" className="mt-6 space-y-4">
          {/* Status pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTROS.map(sf => {
              const count = sf.value === 'todos' ? notas.length : (statusContagem[sf.value] || 0)
              const isActive = filtroStatus === sf.value
              return (
                <button
                  key={sf.value}
                  onClick={() => setFiltroStatus(sf.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                    isActive
                      ? 'bg-[#34495e] text-white border-[#34495e] dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                      : 'bg-white dark:bg-surface-0 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-1'
                  )}
                >
                  {sf.label}
                  {count > 0 && (
                    <span className={cn(
                      'ml-1.5 text-[10px]',
                      isActive ? 'text-white/70 dark:text-slate-900/70' : 'text-slate-400 dark:text-slate-500'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tabela de notas */}
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : notasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <FileOutput className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">Nenhuma nota de débito</p>
                  <p className="text-xs mt-1">
                    {filtroStatus !== 'todos'
                      ? `Nenhuma nota com status "${STATUS_CONFIG[filtroStatus]?.label || filtroStatus}"`
                      : 'Notas de débito geradas aparecerão aqui'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-1">
                        <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Número</th>
                        <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Cliente</th>
                        {showEscritorio && (
                          <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Escritório</th>
                        )}
                        <th className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Itens</th>
                        <th className="p-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Valor Total</th>
                        <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Emissão</th>
                        <th className="p-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Vencimento</th>
                        <th className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                        <th className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 w-10">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notasFiltradas.map(nota => {
                        const statusConf = STATUS_CONFIG[nota.status] || STATUS_CONFIG.rascunho

                        return (
                          <tr key={nota.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-surface-1 transition-colors">
                            <td className="p-3 text-xs font-mono font-semibold text-[#34495e] dark:text-slate-200">{nota.numero}</td>
                            <td className="p-3 text-xs text-slate-700 dark:text-slate-300">{nota.cliente_nome || '—'}</td>
                            {showEscritorio && (
                              <td className="p-3">
                                <span
                                  className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate max-w-[80px]", escritorioColorMap?.get(nota.escritorio_id) || 'bg-slate-100 text-slate-600 border-slate-200')}
                                  title={escritoriosMap?.get(nota.escritorio_id) || ''}
                                >
                                  {escritoriosMap?.get(nota.escritorio_id) || '-'}
                                </span>
                              </td>
                            )}
                            <td className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">{nota.qtd_itens}</td>
                            <td className="p-3 text-right text-xs font-semibold text-[#34495e] dark:text-slate-200">{formatCurrency(nota.valor_total)}</td>
                            <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{nota.data_emissao ? formatBrazilDate(nota.data_emissao) : '—'}</td>
                            <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatBrazilDate(nota.data_vencimento)}</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className={cn('text-[10px]', statusConf.color)}>
                                {statusConf.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleVerDetalhes(nota)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Detalhes
                                  </DropdownMenuItem>

                                  {nota.status === 'emitida' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleEnviar(nota)}>
                                        <Send className="w-4 h-4 mr-2" />
                                        Marcar como Enviada
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => window.open(`/imprimir/nota-debito/${nota.id}`, '_blank')}>
                                        <Printer className="w-4 h-4 mr-2" />
                                        Imprimir / PDF
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {nota.status === 'enviada' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleAbrirPagar(nota)}>
                                        <Banknote className="w-4 h-4 mr-2" />
                                        Marcar como Paga
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => window.open(`/imprimir/nota-debito/${nota.id}`, '_blank')}>
                                        <Printer className="w-4 h-4 mr-2" />
                                        Imprimir / PDF
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {nota.status === 'paga' && (
                                    <DropdownMenuItem onClick={() => window.open(`/imprimir/nota-debito/${nota.id}`, '_blank')}>
                                      <Printer className="w-4 h-4 mr-2" />
                                      Imprimir / PDF
                                    </DropdownMenuItem>
                                  )}

                                  {['emitida', 'enviada'].includes(nota.status) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setNotaParaDesmontar(nota.id)} className="text-red-600">
                                        <Ban className="w-4 h-4 mr-2" />
                                        Desmontar Nota
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === Modal Criar Nota (simplificado — sem busca de cliente) === */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-[#34495e] dark:text-slate-200">
              <FileOutput className="w-4 h-4 text-[#89bcbe]" />
              Nova Nota de Débito
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Cliente (read-only) */}
            {clienteParaNota && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-[#34495e] dark:bg-slate-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {clienteParaNota.cliente_nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">{clienteParaNota.cliente_nome}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {clienteParaNota.qtd_despesas} {clienteParaNota.qtd_despesas === 1 ? 'despesa disponível' : 'despesas disponíveis'} — Total: {formatCurrency(clienteParaNota.total_valor)}
                  </p>
                </div>
              </div>
            )}

            {/* Despesas disponíveis */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Despesas Reembolsáveis Pagas</Label>
                {despesasDisponiveis.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={toggleTodasDespesas}>
                    {despesasSelecionadas.size === despesasDisponiveis.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </Button>
                )}
              </div>

              {loadingDespesas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : despesasDisponiveis.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs">Nenhuma despesa reembolsável paga disponível</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-md max-h-60 overflow-y-auto">
                  {despesasDisponiveis.map(d => (
                    <div
                      key={d.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-1 transition-colors',
                        despesasSelecionadas.has(d.id) && 'bg-blue-50 dark:bg-blue-500/10'
                      )}
                      onClick={() => toggleDespesa(d.id)}
                    >
                      <Checkbox
                        checked={despesasSelecionadas.has(d.id)}
                        onCheckedChange={() => toggleDespesa(d.id)}
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{d.descricao}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{getCasoLabel(d)}</p>
                      </div>
                      <span className="text-xs font-semibold text-[#34495e] dark:text-slate-200 whitespace-nowrap shrink-0">
                        {formatCurrency(d.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {despesasSelecionadas.size > 0 && (
                <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {despesasSelecionadas.size} despesa(s) selecionada(s)
                    </span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {formatCurrency(totalSelecionado)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Vencimento e observações */}
            {despesasSelecionadas.size > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={novaNotaVencimento}
                    onChange={e => setNovaNotaVencimento(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Input
                    placeholder="Observações..."
                    value={novaNotaObs}
                    onChange={e => setNovaNotaObs(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button
              onClick={handleCriarNota}
              disabled={submitting || despesasSelecionadas.size === 0 || !novaNotaVencimento}
              className="bg-[#34495e] hover:bg-[#46627f]"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <DollarSign className="w-4 h-4 mr-1" />
              )}
              Gerar Nota de Débito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Modal Detalhes === */}
      <Dialog open={!!modalDetalhes} onOpenChange={(open) => !open && setModalDetalhes(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              Nota de Débito {modalDetalhes?.numero}
            </DialogTitle>
          </DialogHeader>
          {modalDetalhes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Cliente</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{modalDetalhes.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Status</p>
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[modalDetalhes.status]?.color)}>
                    {STATUS_CONFIG[modalDetalhes.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Emissão</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{modalDetalhes.data_emissao ? formatBrazilDate(modalDetalhes.data_emissao) : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Vencimento</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{formatBrazilDate(modalDetalhes.data_vencimento)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Itens</p>
                <div className="border border-slate-200 dark:border-slate-700 rounded-md">
                  {itensDetalhes.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.descricao}</p>
                        {item.processo_titulo && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.processo_titulo}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[#34495e] dark:text-slate-200 ml-3">
                        {formatCurrency(item.valor)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-[#34495e] dark:text-slate-200">
                    Total: {formatCurrency(modalDetalhes.valor_total)}
                  </span>
                </div>
              </div>

              {modalDetalhes.observacoes && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Observações</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{modalDetalhes.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Modal Pagar === */}
      <Dialog open={!!modalPagar} onOpenChange={(open) => !open && setModalPagar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Marcar como Paga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Nota de Débito</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{modalPagar?.numero}</p>
              <p className="text-sm font-bold text-[#34495e] dark:text-slate-200">{modalPagar ? formatCurrency(modalPagar.valor_total) : ''}</p>
            </div>
            <div>
              <Label className="text-xs">Conta Bancária *</Label>
              <Select value={contaPagar} onValueChange={setContaPagar}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.banco} - {c.numero_conta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPagar(null)}>Cancelar</Button>
            <Button onClick={handlePagar} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === AlertDialog Desmontar Nota === */}
      <AlertDialog
        open={notaParaDesmontar !== null}
        onOpenChange={() => setNotaParaDesmontar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmontar Nota de Débito</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desmontar esta nota? As despesas retornarão como disponíveis
              para nova nota e a receita vinculada será cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (notaParaDesmontar) {
                  handleDesmontar(notaParaDesmontar)
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
