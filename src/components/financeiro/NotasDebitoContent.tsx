'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  DialogDescription,
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
  FolderOpen,
  ExternalLink,
  Pencil,
  Trash2,
  Info,
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
import { getEscritoriosDoGrupo } from '@/lib/supabase/escritorio-helpers'
import ContaBancariaSelect from '@/components/financeiro/ContaBancariaSelect'
import DespesaModal, { type DespesaEditData } from '@/components/financeiro/DespesaModal'

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
  const [grupoIds, setGrupoIds] = useState<string[]>([])

  useEffect(() => {
    const loadGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setGrupoIds(escritorios.map(e => e.id))
      } catch {
        if (escritorioAtivo) setGrupoIds([escritorioAtivo])
      }
    }
    loadGrupo()
  }, [escritorioAtivo])

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
    pararDeCobrar,
    excluirDespesaDeVez,
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

  const [submitting, setSubmitting] = useState(false)

  // Dialog desmontar nota
  const [notaParaDesmontar, setNotaParaDesmontar] = useState<string | null>(null)

  // Editar / excluir despesa na aba "Disponível para Gerar"
  const [despesaParaEditar, setDespesaParaEditar] = useState<DespesaReembolsavel | null>(null)
  const [despesaParaExcluir, setDespesaParaExcluir] = useState<DespesaReembolsavel | null>(null)
  const [modoExclusao, setModoExclusao] = useState<'parar' | 'apagar'>('parar')
  const [excluindoDespesa, setExcluindoDespesa] = useState(false)

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

  // Recarrega as despesas do cliente atual (após editar/excluir) e os agregados
  // da aba. Remove da seleção os ids que deixaram de existir e fecha o modal de
  // criação se o cliente não tiver mais despesas disponíveis.
  const recarregarDespesasCliente = async () => {
    await recarregar()
    if (!clienteParaNota) return
    const despesas = await buscarDespesasReembolsaveis(clienteParaNota.cliente_id)
    setDespesasDisponiveis(despesas)
    const idsValidos = new Set(despesas.map(d => d.id))
    setDespesasSelecionadas(prev => new Set([...prev].filter(id => idsValidos.has(id))))
    if (despesas.length === 0) {
      setModalCriar(false)
    }
  }

  // Monta o editData para o DespesaModal a partir de uma despesa reembolsável
  const despesaEditData: DespesaEditData | null = despesaParaEditar
    ? {
        id: despesaParaEditar.id,
        categoria: despesaParaEditar.categoria,
        descricao: despesaParaEditar.descricao,
        valor: despesaParaEditar.valor,
        data_vencimento: despesaParaEditar.data_vencimento,
        reembolsavel: true,
        conta_bancaria_id: despesaParaEditar.conta_bancaria_id,
        status: despesaParaEditar.status,
        data_pagamento: despesaParaEditar.data_pagamento,
        forma_pagamento: despesaParaEditar.forma_pagamento,
        fornecedor: despesaParaEditar.fornecedor,
        comprovante_url: despesaParaEditar.comprovante_url,
        processo_id: despesaParaEditar.processo_id,
        consultivo_id: despesaParaEditar.consultivo_id,
        cliente_id: clienteParaNota?.cliente_id || null,
      }
    : null

  const handleEditarDespesaSuccess = async () => {
    const contaId = despesaParaEditar?.conta_bancaria_id
    setDespesaParaEditar(null)
    // Editar valor de despesa paga não recalcula saldo dentro do DespesaModal —
    // garantimos a consistência do saldo aqui.
    if (contaId) {
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId })
    }
    await recarregarDespesasCliente()
  }

  const abrirExclusao = (despesa: DespesaReembolsavel) => {
    setModoExclusao('parar')
    setDespesaParaExcluir(despesa)
  }

  const handleConfirmarExclusao = async () => {
    if (!despesaParaExcluir) return
    setExcluindoDespesa(true)
    try {
      const ok = modoExclusao === 'parar'
        ? await pararDeCobrar(despesaParaExcluir.id)
        : await excluirDespesaDeVez(despesaParaExcluir)
      if (ok) {
        toast.success(
          modoExclusao === 'parar'
            ? 'Despesa removida da cobrança'
            : 'Despesa excluída'
        )
        setDespesaParaExcluir(null)
        await recarregarDespesasCliente()
      }
    } finally {
      setExcluindoDespesa(false)
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
    if (!grupoIds.length) return
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
    if (d.processo_id) {
      const partes = [d.processo_autor, d.processo_reu].filter(Boolean).join(' x ')
      const pasta = d.processo_numero_pasta || ''
      if (pasta && partes) return `${pasta} - ${partes}`
      return partes || pasta || 'Ver processo'
    }
    if (d.consulta_titulo) return d.consulta_titulo
    if (d.consultivo_id) return 'Ver consultivo'
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

      {/* === Modal Criar Nota === */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
        <DialogContent className="sm:max-w-2xl !p-0 gap-0 max-h-[88vh] flex flex-col overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-700 space-y-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f0f9f9] dark:bg-teal-500/10 flex items-center justify-center shrink-0">
                <FileOutput className="w-5 h-5 text-[#89bcbe]" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">
                  Nova Nota de Débito
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {clienteParaNota
                    ? `${clienteParaNota.cliente_nome} · ${clienteParaNota.qtd_despesas} ${clienteParaNota.qtd_despesas === 1 ? 'despesa disponível' : 'despesas disponíveis'}`
                    : 'Selecione as despesas que serão cobradas do cliente'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Despesas */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#46627f] dark:text-slate-400">
                  Despesas reembolsáveis pagas
                </p>
                {despesasDisponiveis.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-[#46627f] hover:text-[#34495e]" onClick={toggleTodasDespesas}>
                    {despesasSelecionadas.size === despesasDisponiveis.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </Button>
                )}
              </div>

              {loadingDespesas ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : despesasDisponiveis.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">Nenhuma despesa reembolsável paga disponível</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[19rem] overflow-y-auto">
                  {despesasDisponiveis.map(d => (
                    <div
                      key={d.id}
                      className={cn(
                        'group flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors',
                        despesasSelecionadas.has(d.id)
                          ? 'bg-[#1E3A8A]/5 dark:bg-blue-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-surface-1'
                      )}
                      onClick={() => toggleDespesa(d.id)}
                    >
                      <Checkbox
                        checked={despesasSelecionadas.has(d.id)}
                        onCheckedChange={() => toggleDespesa(d.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-[#34495e] dark:text-slate-200 truncate leading-snug">{d.descricao}</p>
                        {(d.processo_id || d.consultivo_id) ? (
                          <Link
                            href={d.processo_id
                              ? `/dashboard/processos/${d.processo_id}`
                              : `/dashboard/consultivo/${d.consultivo_id}`
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                          >
                            <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate max-w-[280px]">{getCasoLabel(d)}</span>
                            <ExternalLink className="h-2 w-2 text-slate-400 shrink-0" />
                          </Link>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{getCasoLabel(d)}</p>
                        )}
                      </div>
                      {/* Ações — visíveis no hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-[#1E3A8A] hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          onClick={(e) => { e.stopPropagation(); setDespesaParaEditar(d) }}
                          title="Editar despesa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={(e) => { e.stopPropagation(); abrirExclusao(d) }}
                          title="Excluir despesa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200 tabular-nums whitespace-nowrap shrink-0">
                        {formatCurrency(d.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dados da nota */}
            {despesasSelecionadas.size > 0 && (
              <div className="pt-5 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#46627f] dark:text-slate-400 mb-2.5">
                  Dados da nota
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#46627f] dark:text-slate-400">Data de vencimento *</Label>
                    <Input
                      type="date"
                      value={novaNotaVencimento}
                      onChange={e => setNovaNotaVencimento(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#46627f] dark:text-slate-400">Observações</Label>
                    <Input
                      placeholder="Opcional"
                      value={novaNotaObs}
                      onChange={e => setNovaNotaObs(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-surface-2/40 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {despesasSelecionadas.size} {despesasSelecionadas.size === 1 ? 'despesa selecionada' : 'despesas selecionadas'}
              </p>
              <p className="text-base font-bold text-[#34495e] dark:text-slate-200 tabular-nums">
                {formatCurrency(totalSelecionado)}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
              <Button
                onClick={handleCriarNota}
                disabled={submitting || despesasSelecionadas.size === 0 || !novaNotaVencimento}
                className="bg-[#34495e] hover:bg-[#46627f]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-1.5" />
                )}
                Gerar Nota de Débito
              </Button>
            </div>
          </div>
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
              <ContaBancariaSelect
                value={contaPagar}
                onValueChange={setContaPagar}
                escritorioIds={grupoIds}
                placeholder="Selecione a conta"
              />
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

      {/* === Editar despesa (reaproveita DespesaModal) === */}
      <DespesaModal
        open={!!despesaParaEditar}
        onOpenChange={(open) => { if (!open) setDespesaParaEditar(null) }}
        editData={despesaEditData}
        onSuccess={handleEditarDespesaSuccess}
      />

      {/* === Excluir despesa — duas opções === */}
      <Dialog
        open={!!despesaParaExcluir}
        onOpenChange={(open) => { if (!open) setDespesaParaExcluir(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-[#34495e] dark:text-slate-200">
              <Trash2 className="w-4 h-4 text-red-500" />
              Excluir despesa
            </DialogTitle>
            {despesaParaExcluir && (
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {despesaParaExcluir.descricao} — {formatCurrency(despesaParaExcluir.valor)}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Segmented control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-surface-2 rounded-lg">
              <button
                type="button"
                onClick={() => setModoExclusao('parar')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                  modoExclusao === 'parar'
                    ? 'bg-[#34495e] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                )}
              >
                <Ban className="w-4 h-4" />
                Parar de cobrar
              </button>
              <button
                type="button"
                onClick={() => setModoExclusao('apagar')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                  modoExclusao === 'apagar'
                    ? 'bg-[#34495e] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                )}
              >
                <Trash2 className="w-4 h-4" />
                Apagar de vez
              </button>
            </div>

            {/* Explicação da opção escolhida */}
            {modoExclusao === 'parar' ? (
              <div className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg bg-[#f0f9f9] border border-[#89bcbe]/40 dark:bg-teal-500/10 dark:border-teal-500/30">
                <Info className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                <div className="text-sm text-[#46627f] dark:text-slate-300">
                  A despesa deixa de ser <strong className="text-[#34495e] dark:text-slate-200">reembolsável</strong> e sai desta lista, mas continua existindo normalmente no extrato e no saldo da conta. Você pode reativá-la depois.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-slate-700">
                <Trash2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-[#46627f] dark:text-slate-300">
                  O registro da despesa será <strong className="text-[#34495e] dark:text-slate-200">excluído do sistema</strong>, sumindo do extrato, e o saldo da conta será recalculado. Esta ação <strong className="text-[#34495e] dark:text-slate-200">não pode ser desfeita</strong>.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDespesaParaExcluir(null)} disabled={excluindoDespesa}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarExclusao}
              disabled={excluindoDespesa}
              className={modoExclusao === 'apagar' ? '' : 'bg-[#34495e] hover:bg-[#46627f]'}
              variant={modoExclusao === 'apagar' ? 'destructive' : 'default'}
            >
              {excluindoDespesa ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : modoExclusao === 'apagar' ? (
                <Trash2 className="w-4 h-4 mr-1" />
              ) : (
                <Ban className="w-4 h-4 mr-1" />
              )}
              {modoExclusao === 'apagar' ? 'Apagar de vez' : 'Parar de cobrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
