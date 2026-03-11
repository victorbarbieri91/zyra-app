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
  Receipt,
  Search,
  MoreHorizontal,
  Calendar,
  X,
  Pencil,
  Ban,
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Banknote,
  ShieldCheck,
} from 'lucide-react'
import { useCustasDespesas, type CustaDespesa } from '@/hooks/useCustasDespesas'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import DespesaModal from '@/components/financeiro/DespesaModal'

const CATEGORIAS_LABELS: Record<string, string> = {
  custas: 'Custas Processuais',
  honorarios_perito: 'Honorários de Perito',
  oficial_justica: 'Oficial de Justiça',
  correios: 'Correios / Envios',
  cartorio: 'Cartório',
  copia: 'Cópias / Impressões',
  publicacao: 'Publicação',
  certidao: 'Certidão',
  protesto: 'Protesto',
  deslocamento: 'Deslocamento',
  estacionamento: 'Estacionamento',
  hospedagem: 'Hospedagem',
  alimentacao: 'Alimentação',
  combustivel: 'Combustível',
  viagem: 'Viagem',
  outra: 'Outra',
  outros: 'Outros',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  pendente: {
    label: 'Pendente',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <Clock className="w-3 h-3" />,
  },
  agendado: {
    label: 'Agendado',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Calendar className="w-3 h-3" />,
  },
  liberado: {
    label: 'Liberado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  pago: {
    label: 'Pago',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  rejeitado: {
    label: 'Rejeitado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <X className="w-3 h-3" />,
  },
}

export default function CustasDespesasPage() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const {
    custas,
    loading,
    filtros,
    setFiltros,
    totais,
    recarregar,
    agendar,
    liberar,
    rejeitar,
    pagar,
    cancelar,
    agendarLote,
    liberarLote,
  } = useCustasDespesas()

  // Modais
  const [modalDespesa, setModalDespesa] = useState(false)
  const [modalAgendar, setModalAgendar] = useState<CustaDespesa | null>(null)
  const [modalRejeitar, setModalRejeitar] = useState<CustaDespesa | null>(null)
  const [modalPagar, setModalPagar] = useState<CustaDespesa | null>(null)
  const [modalEditar, setModalEditar] = useState<CustaDespesa | null>(null)

  // Forms
  const [agendarForm, setAgendarForm] = useState({ data: '', conta: '', obs: '' })
  const [rejeitarMotivo, setRejeitarMotivo] = useState('')
  const [pagarForm, setPagarForm] = useState({ conta: '', forma: '' })

  // Contas bancárias
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; banco: string; numero_conta: string }>>([])

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const [submitting, setSubmitting] = useState(false)

  // Carregar contas bancárias
  const carregarContas = async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, numero_conta')
      .eq('escritorio_id', escritorioAtivo)
      .eq('ativa', true)
      .order('banco')
    setContasBancarias(data || [])
  }

  // === Handlers ===

  const handleAbrirAgendar = (item: CustaDespesa) => {
    setAgendarForm({ data: item.data_vencimento || '', conta: '', obs: '' })
    carregarContas()
    setModalAgendar(item)
  }

  const handleAgendar = async () => {
    if (!modalAgendar || !agendarForm.data) {
      toast.error('Informe a data de pagamento')
      return
    }
    setSubmitting(true)
    try {
      await agendar(modalAgendar.id, agendarForm.data, agendarForm.conta || null, agendarForm.obs)
      setModalAgendar(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLiberar = async (item: CustaDespesa) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSubmitting(true)
    try {
      await liberar(item.id, user.id)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAbrirRejeitar = (item: CustaDespesa) => {
    setRejeitarMotivo('')
    setModalRejeitar(item)
  }

  const handleRejeitar = async () => {
    if (!modalRejeitar || !rejeitarMotivo.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    setSubmitting(true)
    try {
      await rejeitar(modalRejeitar.id, rejeitarMotivo.trim())
      setModalRejeitar(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAbrirPagar = (item: CustaDespesa) => {
    setPagarForm({ conta: item.conta_bancaria_id || '', forma: '' })
    carregarContas()
    setModalPagar(item)
  }

  const handlePagar = async () => {
    if (!modalPagar || !pagarForm.conta) {
      toast.error('Selecione a conta bancária')
      return
    }
    setSubmitting(true)
    try {
      await pagar(modalPagar.id, pagarForm.conta, pagarForm.forma || null)
      setModalPagar(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAbrirEditar = (item: CustaDespesa) => {
    setModalEditar(item)
  }

  const handleCancelar = async (item: CustaDespesa) => {
    if (!confirm('Tem certeza que deseja cancelar esta despesa?')) return
    await cancelar(item.id)
  }

  // Seleção em lote
  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTodosSelecionados = () => {
    if (selecionados.size === custas.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(custas.map(c => c.id)))
    }
  }

  const handleAgendarLote = async () => {
    if (selecionados.size === 0) return
    const pendentes = custas.filter(c => selecionados.has(c.id) && c.fluxo_status === 'pendente')
    if (pendentes.length === 0) {
      toast.error('Selecione despesas pendentes para agendar')
      return
    }
    // Usar a data de hoje como padrão
    const hoje = new Date().toISOString().split('T')[0]
    await agendarLote(pendentes.map(p => p.id), hoje, null)
    setSelecionados(new Set())
  }

  const handleLiberarLote = async () => {
    if (selecionados.size === 0) return
    const agendados = custas.filter(c => selecionados.has(c.id) && c.fluxo_status === 'agendado')
    if (agendados.length === 0) {
      toast.error('Selecione despesas agendadas para liberar')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await liberarLote(agendados.map(a => a.id), user.id)
    setSelecionados(new Set())
  }

  const getCasoLabel = (item: CustaDespesa) => {
    if (item.processo_autor && item.processo_reu) {
      const pasta = item.processo_numero_pasta ? `${item.processo_numero_pasta} - ` : ''
      return `${pasta}${item.processo_autor} x ${item.processo_reu}`
    }
    if (item.consulta_titulo) return item.consulta_titulo
    return '—'
  }

  const valorEditavel = () => {
    return true
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Custas e Despesas Processuais</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie custas judiciais e extrajudiciais vinculadas aos processos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={recarregar} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-1', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button onClick={() => setModalDespesa(true)} className="bg-[#34495e] hover:bg-[#46627f]">
            <Receipt className="w-4 h-4 mr-2" />
            Lançar Custa
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por descrição..."
                value={filtros.busca}
                onChange={e => setFiltros({ ...filtros, busca: e.target.value })}
                className="pl-9"
              />
            </div>
            <Select
              value={filtros.fluxo_status}
              onValueChange={v => setFiltros({ ...filtros, fluxo_status: v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="agendado">Agendados</SelectItem>
                <SelectItem value="liberado">Liberados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ações em lote */}
      {selecionados.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">{selecionados.size} selecionado(s)</span>
          <Button size="sm" variant="outline" onClick={handleAgendarLote}>
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Agendar
          </Button>
          <Button size="sm" variant="outline" onClick={handleLiberarLote}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Liberar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : custas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Receipt className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Nenhuma custa encontrada</p>
              <p className="text-xs mt-1">Lance custas processuais para vê-las aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-3 text-left w-8">
                      <Checkbox
                        checked={selecionados.size === custas.length && custas.length > 0}
                        onCheckedChange={toggleTodosSelecionados}
                      />
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Data</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Processo / Caso</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Descrição</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500">Categoria</th>
                    <th className="p-3 text-right text-xs font-medium text-slate-500">Valor</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500">Reemb.</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500">Status</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500 w-10">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {custas.map(item => {
                    const statusConf = STATUS_CONFIG[item.fluxo_status] || STATUS_CONFIG.pendente

                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <Checkbox
                            checked={selecionados.has(item.id)}
                            onCheckedChange={() => toggleSelecionado(item.id)}
                          />
                        </td>
                        <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                          {formatBrazilDate(item.created_at)}
                        </td>
                        <td className="p-3">
                          <p className="text-xs font-medium text-[#34495e] max-w-[200px] truncate" title={getCasoLabel(item)}>
                            {getCasoLabel(item)}
                          </p>
                          {item.cliente_nome && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.cliente_nome}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <p className="text-xs text-slate-700 max-w-[200px] truncate" title={item.descricao}>
                            {item.descricao}
                          </p>
                          {item.motivo_rejeicao && (
                            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Rejeitada: {item.motivo_rejeicao}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {CATEGORIAS_LABELS[item.categoria] || item.categoria}
                        </td>
                        <td className="p-3 text-right text-xs font-semibold text-[#34495e] whitespace-nowrap">
                          {formatCurrency(item.valor)}
                        </td>
                        <td className="p-3 text-center">
                          {item.reembolsavel ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-400">Não</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={cn('text-[10px] gap-1', statusConf.color)}>
                            {statusConf.icon}
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
                              {/* Editar */}
                              <DropdownMenuItem onClick={() => handleAbrirEditar(item)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>

                              {/* Pendente → Agendar */}
                              {item.fluxo_status === 'pendente' && (
                                <DropdownMenuItem onClick={() => handleAbrirAgendar(item)}>
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Agendar Pagamento
                                </DropdownMenuItem>
                              )}

                              {/* Agendado → Liberar */}
                              {item.fluxo_status === 'agendado' && (
                                <DropdownMenuItem onClick={() => handleLiberar(item)}>
                                  <ShieldCheck className="w-4 h-4 mr-2" />
                                  Liberar no Banco
                                </DropdownMenuItem>
                              )}

                              {/* Agendado → Rejeitar */}
                              {item.fluxo_status === 'agendado' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleAbrirRejeitar(item)} className="text-red-600">
                                    <X className="w-4 h-4 mr-2" />
                                    Rejeitar
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* Liberado → Pagar */}
                              {item.fluxo_status === 'liberado' && (
                                <DropdownMenuItem onClick={() => handleAbrirPagar(item)}>
                                  <Banknote className="w-4 h-4 mr-2" />
                                  Registrar Pagamento
                                </DropdownMenuItem>
                              )}

                              {/* Cancelar - disponível até agendado */}
                              {['pendente', 'agendado'].includes(item.fluxo_status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleCancelar(item)} className="text-red-600">
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

      {/* Modal Lançar Despesa */}
      <DespesaModal
        open={modalDespesa}
        onOpenChange={setModalDespesa}
        onSuccess={recarregar}
      />

      {/* Modal Agendar */}
      <Dialog open={!!modalAgendar} onOpenChange={(open) => !open && setModalAgendar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Agendar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Despesa</p>
              <p className="text-sm font-medium">{modalAgendar?.descricao}</p>
              <p className="text-sm font-bold text-[#34495e]">{modalAgendar ? formatCurrency(modalAgendar.valor) : ''}</p>
            </div>
            <div>
              <Label className="text-xs">Data de Pagamento *</Label>
              <Input
                type="date"
                value={agendarForm.data}
                onChange={e => setAgendarForm({ ...agendarForm, data: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Conta Bancária</Label>
              <Select value={agendarForm.conta} onValueChange={v => setAgendarForm({ ...agendarForm, conta: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.banco} - {c.numero_conta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input
                placeholder="Observações do financeiro..."
                value={agendarForm.obs}
                onChange={e => setAgendarForm({ ...agendarForm, obs: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAgendar(null)}>Cancelar</Button>
            <Button onClick={handleAgendar} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calendar className="w-4 h-4 mr-1" />}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rejeitar */}
      <Dialog open={!!modalRejeitar} onOpenChange={(open) => !open && setModalRejeitar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Rejeitar Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-700">
                A despesa será devolvida para &quot;pendente&quot; com o motivo da rejeição.
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Despesa</p>
              <p className="text-sm font-medium">{modalRejeitar?.descricao}</p>
              <p className="text-sm font-bold text-[#34495e]">{modalRejeitar ? formatCurrency(modalRejeitar.valor) : ''}</p>
            </div>
            <div>
              <Label className="text-xs">Motivo da rejeição *</Label>
              <Input
                placeholder="Informe o motivo..."
                value={rejeitarMotivo}
                onChange={e => setRejeitarMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRejeitar(null)}>Cancelar</Button>
            <Button onClick={handleRejeitar} disabled={submitting} variant="destructive">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pagar */}
      <Dialog open={!!modalPagar} onOpenChange={(open) => !open && setModalPagar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Despesa</p>
              <p className="text-sm font-medium">{modalPagar?.descricao}</p>
              <p className="text-sm font-bold text-[#34495e]">{modalPagar ? formatCurrency(modalPagar.valor) : ''}</p>
            </div>
            <div>
              <Label className="text-xs">Conta Bancária *</Label>
              <Select value={pagarForm.conta} onValueChange={v => setPagarForm({ ...pagarForm, conta: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.banco} - {c.numero_conta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={pagarForm.forma} onValueChange={v => setPagarForm({ ...pagarForm, forma: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="ted">TED</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPagar(null)}>Cancelar</Button>
            <Button onClick={handlePagar} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Banknote className="w-4 h-4 mr-1" />}
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar - reutiliza DespesaModal */}
      {modalEditar && (
        <DespesaModal
          open={!!modalEditar}
          onOpenChange={(open) => !open && setModalEditar(null)}
          editData={{
            id: modalEditar.id,
            categoria: modalEditar.categoria,
            descricao: modalEditar.descricao,
            valor: modalEditar.valor,
            data_vencimento: modalEditar.data_vencimento,
            comprovante_url: modalEditar.comprovante_url,
            reembolsavel: modalEditar.reembolsavel,
            processo_id: modalEditar.processo_id,
            consultivo_id: modalEditar.consultivo_id,
            cliente_id: modalEditar.cliente_id,
            fluxo_status: modalEditar.fluxo_status,
            status: modalEditar.status,
            data_pagamento: modalEditar.data_pagamento,
            conta_bancaria_id: modalEditar.conta_bancaria_id,
            forma_pagamento: modalEditar.forma_pagamento,
          }}
          onSuccess={recarregar}
        />
      )}
    </div>
  )
}
