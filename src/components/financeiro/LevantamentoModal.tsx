'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Search,
  FileText,
  Briefcase,
  X,
  CheckCircle2,
  Scale,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useLevantamentos } from '@/hooks/useLevantamentos'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// =====================================================
// INTERFACES
// =====================================================

interface LevantamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId?: string
  clienteId?: string
  consultaId?: string
  onSuccess?: () => void
}

interface ContaBancaria {
  id: string
  banco: string
  numero_conta: string
}

interface ProcessoOption {
  id: string
  numero_cnj: string
  numero_pasta?: string
  cliente_nome?: string
  cliente_id?: string
}

interface ConsultaOption {
  id: string
  numero?: string
  titulo: string
  cliente_nome?: string
  cliente_id?: string
}

// =====================================================
// CONSTANTES
// =====================================================

const ORIGENS_LEVANTAMENTO = [
  { value: 'alvara', label: 'Alvará' },
  { value: 'rpv', label: 'RPV' },
  { value: 'precatorio', label: 'Precatório' },
  { value: 'deposito_judicial', label: 'Depósito Judicial' },
  { value: 'outro', label: 'Outro' },
]

const CATEGORIAS_RETENCAO = [
  { value: 'honorarios', label: 'Honorários' },
  { value: 'exito', label: 'Êxito' },
  { value: 'acordo', label: 'Acordo' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'outros', label: 'Outros' },
]

const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cheque', label: 'Cheque' },
]

// =====================================================
// COMPONENTE
// =====================================================

export default function LevantamentoModal({
  open,
  onOpenChange,
  processoId,
  clienteId,
  consultaId,
  onSuccess,
}: LevantamentoModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const { criarLevantamento } = useLevantamentos()

  // Form state
  const [descricao, setDescricao] = useState('')
  const [origem, setOrigem] = useState('alvara')
  const [dataLevantamento, setDataLevantamento] = useState('')
  const [valorTotal, setValorTotal] = useState(0)
  const [valorRetido, setValorRetido] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  // Retenção
  const [retencaoRecebida, setRetencaoRecebida] = useState(false)
  const [retencaoCategoria, setRetencaoCategoria] = useState('honorarios')
  const [contaBancariaId, setContaBancariaId] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')

  // Repasse
  const [repasseRealizado, setRepasseRealizado] = useState(false)
  const [dataRepasse, setDataRepasse] = useState('')
  const [contaRepasseId, setContaRepasseId] = useState('')
  const [formaPagamentoRepasse, setFormaPagamentoRepasse] = useState('pix')

  // Vínculo state
  const [vinculoTipo, setVinculoTipo] = useState<'processo' | 'consulta'>('processo')
  const [searchTerm, setSearchTerm] = useState('')
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoOption | null>(null)
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaOption | null>(null)
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [consultas, setConsultas] = useState<ConsultaOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [loadingVinculo, setLoadingVinculo] = useState(false)
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])

  // Computed
  const valorCliente = useMemo(() => Math.max(0, valorTotal - valorRetido), [valorTotal, valorRetido])
  const percentualRetido = useMemo(() => {
    if (valorTotal <= 0) return 0
    return (valorRetido / valorTotal) * 100
  }, [valorTotal, valorRetido])
  const derivedClienteId = processoSelecionado?.cliente_id || consultaSelecionada?.cliente_id || null
  const hasSelection = processoSelecionado || consultaSelecionada

  // =====================================================
  // FUNÇÕES DE VÍNCULO (mesmo padrão ReceitaModal)
  // =====================================================

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

  const loadProcessoById = async (id: string) => {
    const { data: processoData, error } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, numero_pasta, cliente_id')
      .eq('id', id)
      .single()

    if (error || !processoData) return

    let clienteNome: string | undefined
    if (processoData.cliente_id) {
      const { data: clienteData } = await supabase
        .from('crm_pessoas')
        .select('nome_completo')
        .eq('id', processoData.cliente_id)
        .single()
      clienteNome = clienteData?.nome_completo
    }

    setProcessoSelecionado({
      id: processoData.id,
      numero_cnj: processoData.numero_cnj,
      numero_pasta: processoData.numero_pasta,
      cliente_nome: clienteNome,
      cliente_id: processoData.cliente_id,
    })
  }

  const loadConsultaById = async (id: string) => {
    const { data: consultaData, error } = await supabase
      .from('consultivo_consultas')
      .select('id, numero, titulo, cliente_id')
      .eq('id', id)
      .single()

    if (error || !consultaData) return

    let clienteNome: string | undefined
    if (consultaData.cliente_id) {
      const { data: clienteData } = await supabase
        .from('crm_pessoas')
        .select('nome_completo')
        .eq('id', consultaData.cliente_id)
        .single()
      clienteNome = clienteData?.nome_completo
    }

    setConsultaSelecionada({
      id: consultaData.id,
      numero: consultaData.numero,
      titulo: consultaData.titulo,
      cliente_nome: clienteNome,
      cliente_id: consultaData.cliente_id,
    })
  }

  // =====================================================
  // EFFECTS
  // =====================================================

  useEffect(() => {
    if (open) {
      setDescricao('')
      setOrigem('alvara')
      setDataLevantamento(new Date().toISOString().split('T')[0])
      setValorTotal(0)
      setValorRetido(0)
      setObservacoes('')
      setRetencaoRecebida(false)
      setRetencaoCategoria('honorarios')
      setContaBancariaId('')
      setFormaPagamento('pix')
      setRepasseRealizado(false)
      setDataRepasse(new Date().toISOString().split('T')[0])
      setContaRepasseId('')
      setFormaPagamentoRepasse('pix')
      setSearchTerm('')
      setProcessoSelecionado(null)
      setConsultaSelecionada(null)
      setProcessos([])
      setConsultas([])
      carregarContas()

      if (processoId) {
        setVinculoTipo('processo')
        setLoadingVinculo(true)
        loadProcessoById(processoId).finally(() => setLoadingVinculo(false))
      } else if (consultaId) {
        setVinculoTipo('consulta')
        setLoadingVinculo(true)
        loadConsultaById(consultaId).finally(() => setLoadingVinculo(false))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processoId, consultaId])

  // Buscar processos/consultas (debounce 300ms)
  useEffect(() => {
    const buscar = async () => {
      if (!escritorioAtivo || searchTerm.length < 2) {
        setProcessos([])
        setConsultas([])
        return
      }

      setSearchLoading(true)
      try {
        if (vinculoTipo === 'processo') {
          const { data: processosData } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, parte_contraria, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`numero_cnj.ilike.%${searchTerm}%,numero_pasta.ilike.%${searchTerm}%,parte_contraria.ilike.%${searchTerm}%`)
            .limit(10)

          const clienteIds = (processosData || []).filter((p: any) => p.cliente_id).map((p: any) => p.cliente_id)
          const clienteMap = new Map<string, string>()

          if (clienteIds.length > 0) {
            const { data: clientesData } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIds)
            ;(clientesData || []).forEach((c: any) => clienteMap.set(c.id, c.nome_completo))
          }

          setProcessos(
            (processosData || []).map((p: any) => ({
              id: p.id,
              numero_cnj: p.numero_cnj,
              numero_pasta: p.numero_pasta,
              cliente_nome: clienteMap.get(p.cliente_id) || p.parte_contraria,
              cliente_id: p.cliente_id,
            }))
          )
        } else {
          const { data: consultasData } = await supabase
            .from('consultivo_consultas')
            .select('id, numero, titulo, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`titulo.ilike.%${searchTerm}%,numero.ilike.%${searchTerm}%`)
            .limit(10)

          const clienteIds = (consultasData || []).filter((c: any) => c.cliente_id).map((c: any) => c.cliente_id)
          const clienteMap = new Map<string, string>()

          if (clienteIds.length > 0) {
            const { data: clientesData } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIds)
            ;(clientesData || []).forEach((c: any) => clienteMap.set(c.id, c.nome_completo))
          }

          setConsultas(
            (consultasData || []).map((c: any) => ({
              id: c.id,
              numero: c.numero,
              titulo: c.titulo,
              cliente_nome: clienteMap.get(c.cliente_id) as string | undefined,
              cliente_id: c.cliente_id,
            }))
          )
        }
      } catch (err) {
        console.error('Erro ao buscar:', err)
      } finally {
        setSearchLoading(false)
      }
    }

    const debounce = setTimeout(buscar, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, vinculoTipo, escritorioAtivo, supabase])

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async () => {
    if (!hasSelection) {
      toast.error('Selecione um processo ou consulta')
      return
    }
    if (!descricao.trim()) {
      toast.error('Informe a descrição')
      return
    }
    if (valorTotal <= 0) {
      toast.error('Informe o valor total')
      return
    }
    if (valorRetido < 0 || valorRetido > valorTotal) {
      toast.error('O valor retido deve ser entre 0 e o valor total')
      return
    }
    if (!dataLevantamento) {
      toast.error('Informe a data do levantamento')
      return
    }
    if (retencaoRecebida && !contaBancariaId) {
      toast.error('Selecione a conta bancária de entrada')
      return
    }
    if (repasseRealizado && !contaRepasseId) {
      toast.error('Selecione a conta bancária de saída para o repasse')
      return
    }

    setLoading(true)
    try {
      const result = await criarLevantamento({
        processo_id: processoSelecionado?.id || null,
        consulta_id: consultaSelecionada?.id || null,
        cliente_id: derivedClienteId || clienteId || null,
        descricao,
        origem,
        valor_total: valorTotal,
        valor_retido: valorRetido,
        valor_cliente: valorCliente,
        data_levantamento: dataLevantamento,
        retencao_recebida: retencaoRecebida,
        retencao_categoria: retencaoCategoria,
        conta_bancaria_id: retencaoRecebida ? contaBancariaId : null,
        forma_pagamento: retencaoRecebida ? formaPagamento : null,
        repasse_realizado: repasseRealizado,
        data_repasse: repasseRealizado ? dataRepasse : null,
        conta_repasse_id: repasseRealizado ? contaRepasseId : null,
        forma_pagamento_repasse: repasseRealizado ? formaPagamentoRepasse : null,
        observacoes: observacoes || null,
      })

      if (result) {
        onOpenChange(false)
        onSuccess?.()
      }
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  const opcoes = vinculoTipo === 'processo' ? processos : consultas

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base text-[#34495e] dark:text-slate-200">
            Novo Levantamento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* === SEÇÃO 1: VINCULAR A PROCESSO/CONSULTA === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-[#46627f] dark:text-slate-400">Vincular a</p>
              <div className="flex gap-1 ml-auto">
                <button
                  type="button"
                  className={cn(
                    'px-2.5 py-1 text-[11px] rounded-md transition-colors',
                    vinculoTipo === 'processo'
                      ? 'bg-[#34495e] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  )}
                  onClick={() => {
                    setVinculoTipo('processo')
                    setConsultaSelecionada(null)
                    setSearchTerm('')
                  }}
                >
                  <Briefcase className="w-3 h-3 inline mr-1" />
                  Processo
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-2.5 py-1 text-[11px] rounded-md transition-colors',
                    vinculoTipo === 'consulta'
                      ? 'bg-[#34495e] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  )}
                  onClick={() => {
                    setVinculoTipo('consulta')
                    setProcessoSelecionado(null)
                    setSearchTerm('')
                  }}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Consulta
                </button>
              </div>
            </div>

            {loadingVinculo ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : hasSelection ? (
              <div className="flex items-center gap-2 p-2.5 bg-[#f0f9f9] dark:bg-teal-500/10 rounded-md border border-[#aacfd0]/40 dark:border-teal-500/20">
                <Scale className="w-4 h-4 text-[#89bcbe] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#34495e] dark:text-slate-200 truncate">
                    {processoSelecionado
                      ? `${processoSelecionado.numero_pasta || processoSelecionado.numero_cnj}`
                      : consultaSelecionada?.titulo}
                  </p>
                  {(processoSelecionado?.cliente_nome || consultaSelecionada?.cliente_nome) && (
                    <p className="text-[10px] text-[#46627f] dark:text-slate-400">
                      Cliente: {processoSelecionado?.cliente_nome || consultaSelecionada?.cliente_nome}
                    </p>
                  )}
                </div>
                {!(processoId || consultaId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProcessoSelecionado(null)
                      setConsultaSelecionada(null)
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder={vinculoTipo === 'processo' ? 'Buscar por número, pasta ou parte...' : 'Buscar por título ou número...'}
                  className="pl-8 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchLoading && (
                  <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-slate-400" />
                )}
                {opcoes.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {vinculoTipo === 'processo'
                      ? processos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                            onClick={() => {
                              setProcessoSelecionado(p)
                              setSearchTerm('')
                            }}
                          >
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                              {p.numero_pasta || p.numero_cnj}
                            </p>
                            {p.cliente_nome && (
                              <p className="text-[10px] text-slate-400">{p.cliente_nome}</p>
                            )}
                          </button>
                        ))
                      : consultas.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                            onClick={() => {
                              setConsultaSelecionada(c)
                              setSearchTerm('')
                            }}
                          >
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                              {c.numero ? `${c.numero} - ` : ''}{c.titulo}
                            </p>
                            {c.cliente_nome && (
                              <p className="text-[10px] text-slate-400">{c.cliente_nome}</p>
                            )}
                          </button>
                        ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* === SEÇÃO 2: DADOS DO LEVANTAMENTO === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-xs font-medium text-[#46627f] dark:text-slate-400">Dados do levantamento</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Origem *</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENS_LEVANTAMENTO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Data do levantamento *</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={dataLevantamento}
                  onChange={(e) => setDataLevantamento(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Input
                className="h-9 text-xs"
                placeholder="Ex: Levantamento Alvará Proc. 1234-56..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>

          {/* === SEÇÃO 3: VALORES === */}
          <div className="rounded-lg border border-[#aacfd0]/40 dark:border-teal-500/20 bg-[#f0f9f9] dark:bg-teal-500/5 p-4 space-y-3">
            <p className="text-xs font-medium text-[#34495e] dark:text-slate-300">Valores</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Valor total levantado *</Label>
                <CurrencyInput value={valorTotal} onChange={setValorTotal} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Honorários retidos *</Label>
                <CurrencyInput value={valorRetido} onChange={setValorRetido} />
                {percentualRetido > 0 && (
                  <Badge variant="outline" className="w-fit text-[10px] bg-[#f0f9f9] dark:bg-teal-500/10 border-[#89bcbe]/30 text-[#46627f] dark:text-teal-400">
                    {percentualRetido.toFixed(1)}% retido
                  </Badge>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-[#46627f] dark:text-slate-400">Valor para o cliente</Label>
                <div className="h-9 flex items-center px-3 bg-white/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md">
                  <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                    {formatCurrency(valorCliente)}
                  </span>
                </div>
                <p className="text-[10px] text-[#46627f]/70 dark:text-slate-500">Calculado automaticamente</p>
              </div>
            </div>
          </div>

          {/* === SEÇÃO 4: HONORÁRIOS RETIDOS === */}
          <div className={cn(
            'rounded-lg border transition-colors p-4 space-y-3',
            retencaoRecebida
              ? 'border-[#89bcbe] dark:border-teal-500/30 bg-[#f0f9f9] dark:bg-teal-500/5'
              : 'border-slate-200 dark:border-slate-700'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={retencaoRecebida} onCheckedChange={setRetencaoRecebida} />
                <div>
                  <p className="text-xs font-medium text-[#34495e] dark:text-slate-200">Já recebido na conta</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Valor total entrou na conta bancária</p>
                </div>
              </div>
              {retencaoRecebida && (
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                  Recebido
                </Badge>
              )}
            </div>

            {retencaoRecebida && (
              <div className="space-y-3 pt-2 border-t border-[#89bcbe]/20 dark:border-teal-500/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Categoria da receita</Label>
                    <Select value={retencaoCategoria} onValueChange={setRetencaoCategoria}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_RETENCAO.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Conta bancária *</Label>
                    <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.banco} - CC: {c.numero_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Forma de pagamento</Label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === SEÇÃO 5: REPASSE AO CLIENTE === */}
          <div className={cn(
            'rounded-lg border transition-colors p-4 space-y-3',
            repasseRealizado
              ? 'border-[#89bcbe] dark:border-teal-500/30 bg-[#f0f9f9] dark:bg-teal-500/5'
              : 'border-slate-200 dark:border-slate-700'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={repasseRealizado} onCheckedChange={setRepasseRealizado} />
                <div>
                  <p className="text-xs font-medium text-[#34495e] dark:text-slate-200">Já repassado ao cliente</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatCurrency(valorCliente)} enviado ao cliente
                  </p>
                </div>
              </div>
              {repasseRealizado && (
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                  Repassado
                </Badge>
              )}
            </div>

            {repasseRealizado && (
              <div className="space-y-3 pt-2 border-t border-[#89bcbe]/20 dark:border-teal-500/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Data do repasse *</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={dataRepasse}
                      onChange={(e) => setDataRepasse(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Conta de saída *</Label>
                    <Select value={contaRepasseId} onValueChange={setContaRepasseId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.banco} - CC: {c.numero_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Forma de pagamento</Label>
                    <Select value={formaPagamentoRepasse} onValueChange={setFormaPagamentoRepasse}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === OBSERVAÇÕES === */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-[#46627f] dark:text-slate-400">Observações</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              placeholder="Observações sobre o levantamento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        {/* === FOOTER === */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !hasSelection || valorTotal <= 0 || !descricao.trim() || !dataLevantamento}
            className="bg-[#34495e] hover:bg-[#46627f]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Scale className="w-4 h-4 mr-1.5" />
            )}
            Registrar Levantamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
