'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Loader2,
  Search,
  User,
  FileText,
  Briefcase,
  X,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import LancamentoModalidadeSelector, {
  DEFAULT_CONFIG_RECORRENCIA,
  type LancamentoModalidade,
} from './LancamentoModalidadeSelector'
import type { ConfigRecorrencia } from '@/hooks/useReceitas'

// =====================================================
// INTERFACES
// =====================================================

interface ReceitaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId?: string
  clienteId?: string
  consultaId?: string
  contratoId?: string
  onSuccess?: () => void
}

interface FormData {
  tipo: string
  categoria: string
  descricao: string
  valor: string
  data_competencia: string
  data_vencimento: string
  observacoes: string
  modalidade: LancamentoModalidade
  numero_parcelas: number
  config_recorrencia: ConfigRecorrencia
  ja_recebido: boolean
  data_pagamento: string
  conta_bancaria_id: string
  forma_pagamento: string
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

const TIPOS_RECEITA = [
  { value: 'avulso', label: 'Receita Avulsa' },
  { value: 'honorario', label: 'Honorário' },
  { value: 'reembolso', label: 'Reembolso de Custas' },
]

const CATEGORIAS_RECEITA = [
  { value: 'honorarios', label: 'Honorários' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'custas', label: 'Custas' },
  { value: 'exito', label: 'Êxito' },
  { value: 'outros', label: 'Outros' },
]

const makeInitialFormData = (): FormData => ({
  tipo: 'avulso',
  categoria: 'honorarios',
  descricao: '',
  valor: '',
  data_competencia: new Date().toISOString().split('T')[0],
  data_vencimento: new Date().toISOString().split('T')[0],
  observacoes: '',
  modalidade: 'unica',
  numero_parcelas: 2,
  config_recorrencia: { ...DEFAULT_CONFIG_RECORRENCIA },
  ja_recebido: false,
  data_pagamento: new Date().toISOString().split('T')[0],
  conta_bancaria_id: '',
  forma_pagamento: '',
})

// =====================================================
// COMPONENTE
// =====================================================

export default function ReceitaModal({
  open,
  onOpenChange,
  processoId,
  clienteId,
  consultaId,
  contratoId,
  onSuccess,
}: ReceitaModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Form state
  const [formData, setFormData] = useState<FormData>(makeInitialFormData())
  const [loading, setLoading] = useState(false)

  // Vinculo state
  const [vinculoEnabled, setVinculoEnabled] = useState(false)
  const [vinculoTipo, setVinculoTipo] = useState<'processo' | 'consulta'>('processo')
  const [searchTerm, setSearchTerm] = useState('')
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoOption | null>(null)
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaOption | null>(null)
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [consultas, setConsultas] = useState<ConsultaOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [loadingVinculo, setLoadingVinculo] = useState(false)
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])

  // =====================================================
  // FUNÇÕES DE VINCULO (padrão DespesaModal)
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

  const handleSelectProcesso = (processo: ProcessoOption) => {
    setProcessoSelecionado(processo)
    setConsultaSelecionada(null)
    setSearchTerm('')
  }

  const handleSelectConsulta = (consulta: ConsultaOption) => {
    setConsultaSelecionada(consulta)
    setProcessoSelecionado(null)
    setSearchTerm('')
  }

  const handleClearSelection = () => {
    setProcessoSelecionado(null)
    setConsultaSelecionada(null)
  }

  const handleToggleVinculo = (enabled: boolean) => {
    setVinculoEnabled(enabled)
    if (!enabled) {
      handleClearSelection()
      setSearchTerm('')
      setProcessos([])
      setConsultas([])
    }
  }

  // =====================================================
  // EFFECTS
  // =====================================================

  // Reset form quando abrir
  useEffect(() => {
    if (open) {
      setFormData(makeInitialFormData())
      carregarContas()
      setSearchTerm('')
      setProcessoSelecionado(null)
      setConsultaSelecionada(null)

      const hasVinculo = !!(processoId || consultaId)
      setVinculoEnabled(hasVinculo)

      if (processoId) {
        setVinculoTipo('processo')
        setLoadingVinculo(true)
        loadProcessoById(processoId).finally(() => setLoadingVinculo(false))
      } else if (consultaId) {
        setVinculoTipo('consulta')
        setLoadingVinculo(true)
        loadConsultaById(consultaId).finally(() => setLoadingVinculo(false))
      }

      if (clienteId) {
        // Se tiver clienteId mas sem processo/consulta, é receita avulsa com cliente pré-selecionado
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processoId, consultaId, clienteId])

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
            .limit(15)

          const { data: clientesData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMap = new Map((clientesData || []).map((c: any) => [c.id, c.nome_completo]))

          let processosCliente: any[] = []
          if (clienteMap.size > 0) {
            const { data: pcData } = await supabase
              .from('processos_processos')
              .select('id, numero_cnj, numero_pasta, parte_contraria, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMap.keys()))
              .limit(10)
            processosCliente = pcData || []
          }

          const todosProcessos = [...(processosData || []), ...processosCliente]
          const processosUnicos = Array.from(
            new Map(todosProcessos.map((p: any) => [p.id, p])).values()
          ).slice(0, 10)

          const clienteIdsParaBuscar = processosUnicos
            .filter((p: any) => p.cliente_id && !clienteMap.has(p.cliente_id))
            .map((p: any) => p.cliente_id)

          if (clienteIdsParaBuscar.length > 0) {
            const { data: clientesAdicionais } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsParaBuscar)
            ;(clientesAdicionais || []).forEach((c: any) => clienteMap.set(c.id, c.nome_completo))
          }

          setProcessos(
            processosUnicos.map((p: any) => ({
              id: p.id,
              numero_cnj: p.numero_cnj,
              numero_pasta: p.numero_pasta,
              cliente_nome: clienteMap.get(p.cliente_id) || p.parte_contraria,
              cliente_id: p.cliente_id,
            }))
          )
        } else {
          const { data: consultasResultado } = await supabase
            .from('consultivo_consultas')
            .select('id, numero, titulo, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`titulo.ilike.%${searchTerm}%,numero.ilike.%${searchTerm}%`)
            .limit(15)

          const { data: clientesConsultas } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMapConsultas = new Map((clientesConsultas || []).map((c: any) => [c.id, c.nome_completo]))

          let consultasDoCliente: any[] = []
          if (clienteMapConsultas.size > 0) {
            const { data: ccData } = await supabase
              .from('consultivo_consultas')
              .select('id, numero, titulo, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMapConsultas.keys()))
              .limit(10)
            consultasDoCliente = ccData || []
          }

          const todasConsultas = [...(consultasResultado || []), ...consultasDoCliente]
          const consultasUnicas = Array.from(
            new Map(todasConsultas.map((c: any) => [c.id, c])).values()
          ).slice(0, 10)

          const clienteIdsBuscarConsultas = consultasUnicas
            .filter((c: any) => c.cliente_id && !clienteMapConsultas.has(c.cliente_id))
            .map((c: any) => c.cliente_id)

          if (clienteIdsBuscarConsultas.length > 0) {
            const { data: clientesExtra } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsBuscarConsultas)
            ;(clientesExtra || []).forEach((c: any) => clienteMapConsultas.set(c.id, c.nome_completo))
          }

          setConsultas(
            consultasUnicas.map((c: any) => ({
              id: c.id,
              numero: c.numero,
              titulo: c.titulo,
              cliente_nome: clienteMapConsultas.get(c.cliente_id) as string | undefined,
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
  // HELPERS
  // =====================================================

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'tipo' && value !== 'honorario' && prev.modalidade === 'parcelada') {
        next.modalidade = 'unica'
      }
      return next
    })
  }

  const derivedClienteId = processoSelecionado?.cliente_id || consultaSelecionada?.cliente_id || null
  const hasSelection = processoSelecionado || consultaSelecionada
  const hasPresetVinculo = !!(processoId || consultaId)
  const opcoes = vinculoTipo === 'processo' ? processos : consultas

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição da receita')
      return
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data_vencimento) {
      toast.error('Informe a data de vencimento')
      return
    }
    if (formData.modalidade === 'parcelada' && (formData.numero_parcelas < 2 || formData.numero_parcelas > 60)) {
      toast.error('O número de parcelas deve ser entre 2 e 60')
      return
    }
    if (formData.modalidade === 'recorrente') {
      if (!formData.config_recorrencia.frequencia) {
        toast.error('Selecione a frequência da recorrência')
        return
      }
      if (formData.config_recorrencia.dia_vencimento < 1 || formData.config_recorrencia.dia_vencimento > 31) {
        toast.error('O dia do vencimento deve ser entre 1 e 31')
        return
      }
    }
    if (formData.ja_recebido) {
      if (!formData.data_pagamento) {
        toast.error('Informe a data do recebimento')
        return
      }
      if (!formData.conta_bancaria_id) {
        toast.error('Selecione a conta bancária')
        return
      }
    }

    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Usuário não autenticado')
        return
      }

      const isParcelada = formData.modalidade === 'parcelada'
      const isRecorrente = formData.modalidade === 'recorrente'
      const valorTotal = parseFloat(formData.valor)
      const clienteIdFinal = derivedClienteId || clienteId || null
      const processoIdFinal = processoSelecionado?.id || null
      const consultaIdFinal = consultaSelecionada?.id || consultaId || null
      const contratoIdFinal = contratoId || null
      const vencimentoDay = new Date(formData.data_vencimento + 'T12:00:00').getDate()

      if (isRecorrente || isParcelada) {
        // ──────────────────────────────────────────────────
        // RECORRENTE ou PARCELADA: criar regra + 1ª instância
        // ──────────────────────────────────────────────────
        const valorParcela = isParcelada
          ? Math.floor((valorTotal / formData.numero_parcelas) * 100) / 100
          : valorTotal

        // 1. Criar regra de recorrência
        const { data: regra, error: errRegra } = await supabase
          .from('financeiro_regras_recorrencia')
          .insert({
            escritorio_id: escritorioAtivo,
            tipo_entidade: 'receita',
            descricao: formData.descricao,
            categoria: formData.categoria,
            valor_atual: valorParcela,
            valor_total_original: isParcelada ? valorTotal : null,
            cliente_id: clienteIdFinal,
            processo_id: processoIdFinal,
            consulta_id: consultaIdFinal,
            contrato_id: contratoIdFinal,
            conta_bancaria_id: formData.ja_recebido ? formData.conta_bancaria_id : null,
            frequencia: isRecorrente ? formData.config_recorrencia.frequencia : 'mensal',
            dia_vencimento: vencimentoDay,
            vigencia_inicio: formData.data_vencimento,
            vigencia_fim: isParcelada
              ? (() => {
                  const d = new Date(formData.data_vencimento)
                  d.setMonth(d.getMonth() + formData.numero_parcelas - 1)
                  return d.toISOString().split('T')[0]
                })()
              : formData.config_recorrencia.data_fim || null,
            ativo: true,
            is_parcelamento: isParcelada,
            parcela_total: isParcelada ? formData.numero_parcelas : null,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (errRegra) throw errRegra

        // 2. Criar primeira instância real (mês atual)
        const { error: errInst } = await supabase
          .from('financeiro_receitas')
          .insert({
            escritorio_id: escritorioAtivo,
            tipo: formData.tipo,
            categoria: formData.categoria,
            descricao: isParcelada
              ? `Parcela 1/${formData.numero_parcelas} - ${formData.descricao}`
              : formData.descricao,
            valor: valorParcela,
            data_competencia: formData.data_competencia,
            data_vencimento: formData.data_vencimento,
            cliente_id: clienteIdFinal,
            processo_id: processoIdFinal,
            consulta_id: consultaIdFinal,
            contrato_id: contratoIdFinal,
            observacoes: formData.observacoes || null,
            status: formData.ja_recebido ? 'pago' : 'pendente',
            data_pagamento: formData.ja_recebido ? formData.data_pagamento : null,
            valor_pago: formData.ja_recebido ? valorParcela : null,
            conta_bancaria_id: formData.ja_recebido ? formData.conta_bancaria_id : null,
            forma_pagamento: formData.ja_recebido ? formData.forma_pagamento : null,
            responsavel_id: user.id,
            created_by: user.id,
            regra_recorrencia_id: regra.id,
            periodo_referencia: formData.data_vencimento.substring(0, 7),
            numero_parcela: isParcelada ? 1 : null,
          })

        if (errInst) throw errInst
      } else {
        // ──────────────────────────────────────────────────
        // ÚNICA: insert direto sem regra
        // ──────────────────────────────────────────────────
        const { error } = await supabase.from('financeiro_receitas').insert({
          escritorio_id: escritorioAtivo,
          tipo: formData.tipo,
          categoria: formData.categoria,
          descricao: formData.descricao,
          valor: valorTotal,
          data_competencia: formData.data_competencia,
          data_vencimento: formData.data_vencimento,
          cliente_id: clienteIdFinal,
          processo_id: processoIdFinal,
          consulta_id: consultaIdFinal,
          contrato_id: contratoIdFinal,
          observacoes: formData.observacoes || null,
          status: formData.ja_recebido ? 'pago' : 'pendente',
          data_pagamento: formData.ja_recebido ? formData.data_pagamento : null,
          valor_pago: formData.ja_recebido ? valorTotal : null,
          conta_bancaria_id: formData.ja_recebido ? formData.conta_bancaria_id : null,
          forma_pagamento: formData.ja_recebido ? formData.forma_pagamento : null,
          responsavel_id: user.id,
          created_by: user.id,
        })
        if (error) throw error
      }

      const msgs: Record<string, string> = {
        unica: 'Receita lançada com sucesso!',
        parcelada: `Receita parcelada em ${formData.numero_parcelas}x lançada com sucesso!`,
        recorrente: 'Receita recorrente criada com sucesso!',
      }
      toast.success(msgs[formData.modalidade])
      setFormData(makeInitialFormData())
      handleClearSelection()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao lançar receita:', error)
      toast.error('Erro ao lançar receita. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Nova Receita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* === SEÇÃO 1: VINCULAR A PASTA === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            {loadingVinculo ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#89bcbe]" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Carregando vínculo...</span>
              </div>
            ) : hasPresetVinculo || hasSelection ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-surface-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    {processoSelecionado ? (
                      <>
                        <FileText className="w-3 h-3 text-[#34495e] dark:text-slate-200" />
                        <span className="text-[10px] font-medium text-[#34495e] dark:text-slate-200 uppercase tracking-wide">Processo</span>
                      </>
                    ) : (
                      <>
                        <Briefcase className="w-3 h-3 text-[#34495e] dark:text-slate-200" />
                        <span className="text-[10px] font-medium text-[#34495e] dark:text-slate-200 uppercase tracking-wide">Consultivo</span>
                      </>
                    )}
                  </div>
                  {!hasPresetVinculo && (
                    <button onClick={handleClearSelection} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-surface-3 transition-colors">
                      <X className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  )}
                </div>
                <div className="px-3 py-2">
                  {processoSelecionado && (
                    <>
                      <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{processoSelecionado.numero_cnj}</p>
                      {processoSelecionado.numero_pasta && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Pasta: {processoSelecionado.numero_pasta}</p>
                      )}
                    </>
                  )}
                  {consultaSelecionada && (
                    <>
                      <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{consultaSelecionada.titulo}</p>
                      {consultaSelecionada.numero && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">#{consultaSelecionada.numero}</p>
                      )}
                    </>
                  )}
                  {(processoSelecionado?.cliente_nome || consultaSelecionada?.cliente_nome) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <User className="w-3 h-3 inline mr-1" />
                      {processoSelecionado?.cliente_nome || consultaSelecionada?.cliente_nome}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={vinculoEnabled} onCheckedChange={handleToggleVinculo} />
                  <div>
                    <Label className="text-sm font-medium text-[#34495e] dark:text-slate-200 cursor-pointer" onClick={() => handleToggleVinculo(!vinculoEnabled)}>
                      Vincular a uma pasta
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Associar a um processo judicial ou consultivo
                    </p>
                  </div>
                </div>

                {vinculoEnabled && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-surface-2 rounded-md">
                      <button
                        onClick={() => { setVinculoTipo('processo'); setSearchTerm(''); setProcessos([]); setConsultas([]) }}
                        className={cn(
                          'flex-1 text-xs py-1.5 rounded transition-colors',
                          vinculoTipo === 'processo'
                            ? 'bg-white dark:bg-surface-1 shadow-sm text-[#34495e] dark:text-slate-200 font-medium'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        )}
                      >
                        <FileText className="w-3 h-3 inline mr-1" />
                        Processo
                      </button>
                      <button
                        onClick={() => { setVinculoTipo('consulta'); setSearchTerm(''); setProcessos([]); setConsultas([]) }}
                        className={cn(
                          'flex-1 text-xs py-1.5 rounded transition-colors',
                          vinculoTipo === 'consulta'
                            ? 'bg-white dark:bg-surface-1 shadow-sm text-[#34495e] dark:text-slate-200 font-medium'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        )}
                      >
                        <Briefcase className="w-3 h-3 inline mr-1" />
                        Consultivo
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        placeholder={vinculoTipo === 'processo' ? 'Buscar por CNJ, pasta ou cliente...' : 'Buscar por título, número ou cliente...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
                      )}
                    </div>

                    {opcoes.length > 0 && (
                      <div className="max-h-[160px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                        {vinculoTipo === 'processo'
                          ? processos.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => handleSelectProcesso(p)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-surface-2 dark:bg-surface-0 transition-colors"
                              >
                                <p className="text-xs font-medium text-[#34495e] dark:text-slate-200">{p.numero_cnj}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {p.numero_pasta && `Pasta: ${p.numero_pasta} · `}
                                  {p.cliente_nome || 'Sem cliente'}
                                </p>
                              </button>
                            ))
                          : consultas.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectConsulta(c)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-surface-2 dark:bg-surface-0 transition-colors"
                              >
                                <p className="text-xs font-medium text-[#34495e] dark:text-slate-200">{c.titulo}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {c.numero && `#${c.numero} · `}
                                  {c.cliente_nome || 'Sem cliente'}
                                </p>
                              </button>
                            ))
                        }
                      </div>
                    )}

                    {searchTerm.length >= 2 && !searchLoading && opcoes.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">Nenhum resultado encontrado</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* === SEÇÃO 2: INFORMAÇÕES === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-xs font-medium text-[#46627f] dark:text-slate-400 uppercase tracking-wide">Informações</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => updateField('tipo', v)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RECEITA.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => updateField('categoria', v)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_RECEITA.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600 dark:text-slate-400">Descrição *</Label>
              <Textarea
                placeholder="Descreva a receita..."
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          {/* === SEÇÃO 3: VALORES E DATAS === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-xs font-medium text-[#46627f] dark:text-slate-400 uppercase tracking-wide">Valores e Datas</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => updateField('valor', e.target.value)}
                  className="h-9 mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Competência</Label>
                <Input
                  type="date"
                  value={formData.data_competencia}
                  onChange={(e) => updateField('data_competencia', e.target.value)}
                  className="h-9 mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => updateField('data_vencimento', e.target.value)}
                  className="h-9 mt-1 text-sm"
                />
              </div>
            </div>
          </div>

          {/* === SEÇÃO 4: MODALIDADE === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-xs font-medium text-[#46627f] dark:text-slate-400 uppercase tracking-wide">Modalidade</p>
            <LancamentoModalidadeSelector
              modalidade={formData.modalidade}
              onModalidadeChange={(m) => updateField('modalidade', m)}
              numeroParcelas={formData.numero_parcelas}
              onNumeroParcelasChange={(n) => updateField('numero_parcelas', n)}
              supportsParcelamento={true}
              valor={parseFloat(formData.valor) || 0}
              configRecorrencia={formData.config_recorrencia}
              onConfigRecorrenciaChange={(c) => updateField('config_recorrencia', c)}
              dataVencimento={formData.data_vencimento}
            />
          </div>

          {/* === OBSERVAÇÕES (sem seção, campo simples) === */}
          <div>
            <Label className="text-xs text-slate-600 dark:text-slate-400">Observações</Label>
            <Textarea
              placeholder="Observações adicionais (opcional)..."
              value={formData.observacoes}
              onChange={(e) => updateField('observacoes', e.target.value)}
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

          {/* === SEÇÃO 6: JÁ FOI RECEBIDO === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.ja_recebido}
                onCheckedChange={(checked) => updateField('ja_recebido', checked)}
              />
              <div className="flex-1">
                <Label className="text-sm font-medium text-[#34495e] dark:text-slate-200 cursor-pointer" onClick={() => updateField('ja_recebido', !formData.ja_recebido)}>
                  Já foi recebido
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registrar receita com pagamento já realizado
                </p>
              </div>
              {formData.ja_recebido && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                  Recebido
                </Badge>
              )}
            </div>

            {formData.ja_recebido && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data do Recebimento *</Label>
                    <Input
                      type="date"
                      value={formData.data_pagamento}
                      onChange={(e) => updateField('data_pagamento', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Conta Bancária *</Label>
                    <Select value={formData.conta_bancaria_id} onValueChange={(v) => updateField('conta_bancaria_id', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.banco} - {c.numero_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="w-1/2">
                  <Label className="text-xs">Forma de Recebimento</Label>
                  <Select value={formData.forma_pagamento} onValueChange={(v) => updateField('forma_pagamento', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
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
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Lançar Receita
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
