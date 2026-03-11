'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Plus,
  Search,
  MoreHorizontal,
  Loader2,
  Send,
  Check,
  Ban,
  Printer,
  Banknote,
  RefreshCw,
  Eye,
} from 'lucide-react'
import {
  useNotasDebito,
  type NotaDebito,
  type DespesaReembolsavel,
  type NotaDebitoItem,
} from '@/hooks/useNotasDebito'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  emitida: { label: 'Emitida', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  enviada: { label: 'Enviada', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  paga: { label: 'Paga', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
}

interface NotasDebitoContentProps {
  /** When true, hides the page header (useful when embedded in tabs) */
  embedded?: boolean
}

export default function NotasDebitoContent({ embedded = false }: NotasDebitoContentProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const {
    notas,
    loading,
    filtroStatus,
    setFiltroStatus,
    recarregar,
    buscarDespesasReembolsaveis,
    criarNota,
    emitirNota,
    marcarEnviada,
    marcarPaga,
    cancelarNota,
    carregarItens,
  } = useNotasDebito()

  // Modal criar nota
  const [modalCriar, setModalCriar] = useState(false)
  const [clientes, setClientes] = useState<Array<{ id: string; nome_completo: string }>>([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
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

  // === Handlers Criar ===

  const handleAbrirCriar = async () => {
    if (!escritorioAtivo) return
    setClienteSelecionado('')
    setBuscaCliente('')
    setDespesasDisponiveis([])
    setDespesasSelecionadas(new Set())
    setNovaNotaVencimento('')
    setNovaNotaObs('')

    const { data } = await supabase
      .from('crm_pessoas')
      .select('id, nome_completo')
      .eq('escritorio_id', escritorioAtivo)
      .order('nome_completo')

    setClientes(data || [])
    setModalCriar(true)
  }

  const handleSelecionarCliente = async (clienteId: string) => {
    setClienteSelecionado(clienteId)
    setDespesasSelecionadas(new Set())
    setLoadingDespesas(true)
    try {
      const despesas = await buscarDespesasReembolsaveis(clienteId)
      setDespesasDisponiveis(despesas)
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
    if (!clienteSelecionado || despesasSelecionadas.size === 0 || !novaNotaVencimento) {
      toast.error('Selecione cliente, despesas e data de vencimento')
      return
    }
    setSubmitting(true)
    try {
      await criarNota(
        clienteSelecionado,
        Array.from(despesasSelecionadas),
        novaNotaVencimento,
        novaNotaObs
      )
      setModalCriar(false)
    } catch (error) {
      console.error('Erro ao criar nota:', error)
      toast.error('Erro ao criar nota de débito')
    } finally {
      setSubmitting(false)
    }
  }

  // === Handlers Ações ===

  const handleEmitir = async (nota: NotaDebito) => {
    setSubmitting(true)
    try {
      await emitirNota(nota.id)
    } catch (error) {
      toast.error('Erro ao emitir nota')
    } finally {
      setSubmitting(false)
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

  const handleCancelar = async (nota: NotaDebito) => {
    if (!confirm('Tem certeza que deseja cancelar esta nota de débito? As despesas serão revertidas para reembolso pendente.')) return
    setSubmitting(true)
    try {
      await cancelarNota(nota.id)
    } catch (error) {
      toast.error('Erro ao cancelar nota')
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

  const clientesFiltrados = buscaCliente
    ? clientes.filter(c => c.nome_completo.toLowerCase().includes(buscaCliente.toLowerCase()))
    : clientes

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 md:p-6 space-y-6'}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">Notas de Débito</h1>
            <p className="text-sm text-slate-500 mt-1">
              Cobre despesas reembolsáveis dos clientes com notas de débito formais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={recarregar} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4 mr-1', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button onClick={handleAbrirCriar} className="bg-[#34495e] hover:bg-[#46627f]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Nota de Débito
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar for embedded mode */}
      {embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="emitida">Emitida</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={recarregar} disabled={loading} className="h-9">
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button onClick={handleAbrirCriar} size="sm" className="bg-[#34495e] hover:bg-[#46627f] h-9">
              <Plus className="w-4 h-4 mr-1" />
              Nova Nota de Débito
            </Button>
          </div>
        </div>
      )}

      {/* Filtros (standalone mode) */}
      {!embedded && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FileOutput className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Nenhuma nota de débito</p>
              <p className="text-xs mt-1">Crie uma nota para cobrar despesas reembolsáveis</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Número</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Cliente</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500">Itens</th>
                    <th className="p-3 text-right text-xs font-medium text-slate-500">Valor Total</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Emissão</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Vencimento</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500">Status</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500 w-10">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map(nota => {
                    const statusConf = STATUS_CONFIG[nota.status] || STATUS_CONFIG.rascunho

                    return (
                      <tr key={nota.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-xs font-mono font-semibold text-[#34495e]">{nota.numero}</td>
                        <td className="p-3 text-xs text-slate-700">{nota.cliente_nome || '—'}</td>
                        <td className="p-3 text-center text-xs text-slate-500">{nota.qtd_itens}</td>
                        <td className="p-3 text-right text-xs font-semibold text-[#34495e]">{formatCurrency(nota.valor_total)}</td>
                        <td className="p-3 text-xs text-slate-500">{nota.data_emissao ? formatBrazilDate(nota.data_emissao) : '—'}</td>
                        <td className="p-3 text-xs text-slate-500">{formatBrazilDate(nota.data_vencimento)}</td>
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

                              {nota.status === 'rascunho' && (
                                <DropdownMenuItem onClick={() => handleEmitir(nota)}>
                                  <Check className="w-4 h-4 mr-2" />
                                  Emitir
                                </DropdownMenuItem>
                              )}

                              {nota.status === 'emitida' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEnviar(nota)}>
                                    <Send className="w-4 h-4 mr-2" />
                                    Marcar como Enviada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/financeiro/notas-debito/${nota.id}/imprimir`}>
                                      <Printer className="w-4 h-4 mr-2" />
                                      Imprimir / PDF
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {nota.status === 'enviada' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAbrirPagar(nota)}>
                                    <Banknote className="w-4 h-4 mr-2" />
                                    Marcar como Paga
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/financeiro/notas-debito/${nota.id}/imprimir`}>
                                      <Printer className="w-4 h-4 mr-2" />
                                      Imprimir / PDF
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {nota.status === 'paga' && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/financeiro/notas-debito/${nota.id}/imprimir`}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir / PDF
                                  </Link>
                                </DropdownMenuItem>
                              )}

                              {['rascunho', 'emitida'].includes(nota.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleCancelar(nota)} className="text-red-600">
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancelar
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

      {/* Modal Criar Nota */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Nova Nota de Débito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selecionar cliente */}
            <div>
              <Label className="text-xs">Cliente *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  className="pl-9"
                />
              </div>
              {!clienteSelecionado && (
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md">
                  {clientesFiltrados.slice(0, 10).map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        handleSelecionarCliente(c.id)
                        setBuscaCliente(c.nome_completo)
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b last:border-b-0"
                    >
                      {c.nome_completo}
                    </button>
                  ))}
                </div>
              )}
              {clienteSelecionado && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {clientes.find(c => c.id === clienteSelecionado)?.nome_completo}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => {
                      setClienteSelecionado('')
                      setBuscaCliente('')
                      setDespesasDisponiveis([])
                      setDespesasSelecionadas(new Set())
                    }}
                  >
                    <Ban className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Despesas disponíveis */}
            {clienteSelecionado && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Despesas Reembolsáveis Pagas</Label>
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
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {despesasDisponiveis.map(d => (
                      <div
                        key={d.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors',
                          despesasSelecionadas.has(d.id) && 'bg-blue-50'
                        )}
                        onClick={() => toggleDespesa(d.id)}
                      >
                        <Checkbox
                          checked={despesasSelecionadas.has(d.id)}
                          onCheckedChange={() => toggleDespesa(d.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{d.descricao}</p>
                          <p className="text-[10px] text-slate-400">{getCasoLabel(d)}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#34495e] whitespace-nowrap">
                          {formatCurrency(d.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {despesasSelecionadas.size > 0 && (
                  <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-700">
                        {despesasSelecionadas.size} despesa(s) selecionada(s)
                      </span>
                      <span className="text-sm font-bold text-emerald-800">
                        {formatCurrency(totalSelecionado)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vencimento e obs */}
            {clienteSelecionado && despesasSelecionadas.size > 0 && (
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
              disabled={submitting || !clienteSelecionado || despesasSelecionadas.size === 0 || !novaNotaVencimento}
              className="bg-[#34495e] hover:bg-[#46627f]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Criar Nota de Débito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
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
                  <p className="text-slate-500">Cliente</p>
                  <p className="font-medium">{modalDetalhes.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[modalDetalhes.status]?.color)}>
                    {STATUS_CONFIG[modalDetalhes.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500">Emissão</p>
                  <p className="font-medium">{modalDetalhes.data_emissao ? formatBrazilDate(modalDetalhes.data_emissao) : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Vencimento</p>
                  <p className="font-medium">{formatBrazilDate(modalDetalhes.data_vencimento)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2">Itens</p>
                <div className="border rounded-md">
                  {itensDetalhes.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2.5 border-b last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{item.descricao}</p>
                        {item.processo_titulo && (
                          <p className="text-[10px] text-slate-400">{item.processo_titulo}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[#34495e] ml-3">
                        {formatCurrency(item.valor)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t">
                  <span className="text-sm font-bold text-[#34495e]">
                    Total: {formatCurrency(modalDetalhes.valor_total)}
                  </span>
                </div>
              </div>

              {modalDetalhes.observacoes && (
                <div>
                  <p className="text-xs text-slate-500">Observações</p>
                  <p className="text-xs text-slate-700 mt-1">{modalDetalhes.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Pagar */}
      <Dialog open={!!modalPagar} onOpenChange={(open) => !open && setModalPagar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Marcar como Paga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500">Nota de Débito</p>
              <p className="text-sm font-medium">{modalPagar?.numero}</p>
              <p className="text-sm font-bold text-[#34495e]">{modalPagar ? formatCurrency(modalPagar.valor_total) : ''}</p>
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
    </div>
  )
}
