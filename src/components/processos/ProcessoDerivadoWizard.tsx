'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  GitBranch,
  FileText,
  Link2,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'
import {
  PROCESSO_FASE_LABELS,
  PROCESSO_INSTANCIA_LABELS,
  PROCESSO_POLO_LABELS,
  PROCESSO_PROVISAO_LABELS,
  PROCESSO_RITO_LABELS,
} from '@/lib/constants/processo-enums'
import { type CriarRelacionadoParams } from '@/hooks/useProcessoRelacionados'

export interface ProcessoPrincipalData {
  id: string
  numero_cnj: string
  numero_pasta: string
  cliente_id: string
  cliente_nome: string
  autor: string
  reu: string
  polo_cliente: string
  parte_contraria?: string
  area: string
  instancia: string
  comarca?: string
  responsavel_id: string
  responsavel_nome?: string
  colaboradores_ids?: string[]
  tags?: string[]
  contrato_id?: string
  contrato_titulo?: string
  modalidade_cobranca?: string
  valor_causa?: number
  objeto_acao?: string
}

interface Props {
  open: boolean
  onClose: () => void
  tipoRelacao: 'recurso' | 'incidente'
  processoPrincipal: ProcessoPrincipalData
  onConfirm: (params: CriarRelacionadoParams) => Promise<string | null>
  saving?: boolean
}

interface FormData {
  numero_cnj: string
  tipo: string
  area: string
  fase: string
  instancia: string
  rito: string
  valor_causa: string
  indice_correcao: string
  data_distribuicao: string
  objeto_acao: string
  polo_cliente: string
  parte_contraria: string
  tribunal: string
  comarca: string
  vara: string
  responsavel_id: string
  colaboradores_ids: string[]
  tags: string[]
  provisao_perda: string
  observacoes: string
  suspender_principal: 'manter' | 'suspenso' | 'arquivado'
}

interface Membro {
  id: string
  nome_completo: string
  cargo_nome?: string
}

// Próxima instância sugerida ao criar recurso
function proximaInstancia(instanciaAtual: string): string {
  const mapa: Record<string, string> = {
    '1a': '2a',
    '2a': 'stj',
    '2a_trt': 'tst',
    stj: 'stf',
    tst: 'stf',
  }
  return mapa[instanciaAtual] ?? '2a'
}

const TIPO_LABEL: Record<string, string> = {
  recurso: 'Recurso',
  incidente: 'Incidente',
}

const steps = [
  { number: 1, title: 'Dados Básicos' },
  { number: 2, title: 'Partes' },
  { number: 3, title: 'Localização' },
  { number: 4, title: 'Gestão' },
  { number: 5, title: 'Vínculo' },
  { number: 6, title: 'Revisão' },
]

export default function ProcessoDerivadoWizard({
  open,
  onClose,
  tipoRelacao,
  processoPrincipal,
  onConfirm,
  saving = false,
}: Props) {
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [membros, setMembros] = useState<Membro[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)
  const [valorCausaFormatado, setValorCausaFormatado] = useState('')

  const makeInitialFormData = useCallback((): FormData => ({
    numero_cnj: '',
    tipo: 'judicial',
    area: processoPrincipal.area,
    fase: tipoRelacao === 'recurso' ? 'recurso' : 'conhecimento',
    instancia: tipoRelacao === 'recurso'
      ? proximaInstancia(processoPrincipal.instancia)
      : processoPrincipal.instancia,
    rito: 'ordinario',
    valor_causa: processoPrincipal.valor_causa?.toString() ?? '',
    indice_correcao: '',
    data_distribuicao: new Date().toISOString().split('T')[0],
    objeto_acao: processoPrincipal.objeto_acao ?? '',
    polo_cliente: processoPrincipal.polo_cliente,
    parte_contraria: processoPrincipal.parte_contraria ?? '',
    tribunal: tipoRelacao === 'recurso' ? '' : '',
    comarca: processoPrincipal.comarca ?? '',
    vara: '',
    responsavel_id: processoPrincipal.responsavel_id,
    colaboradores_ids: processoPrincipal.colaboradores_ids ?? [],
    tags: processoPrincipal.tags ?? [],
    provisao_perda: '',
    observacoes: '',
    suspender_principal: tipoRelacao === 'recurso' ? 'suspenso' : 'manter',
  }), [processoPrincipal, tipoRelacao])

  const [formData, setFormData] = useState<FormData>(makeInitialFormData)

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      const initial = makeInitialFormData()
      setFormData(initial)
      setValorCausaFormatado(
        initial.valor_causa
          ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(
              parseFloat(initial.valor_causa)
            )
          : ''
      )
      setCurrentStep(1)
      loadMembros()
    }
  }, [open])

  const loadMembros = async () => {
    setLoadingMembros(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) return

      const { data } = await supabase
        .from('escritorios_usuarios')
        .select(`
          user_id,
          profiles:user_id (nome_completo),
          cargo:cargo_id (nome_display)
        `)
        .eq('escritorio_id', profile.escritorio_id)
        .eq('ativo', true)

      setMembros(
        (data || []).map((m: Record<string, unknown>) => ({
          id: m.user_id as string,
          nome_completo: (m.profiles as Record<string, unknown>)?.nome_completo as string ?? '',
          cargo_nome: (m.cargo as Record<string, unknown>)?.nome_display as string ?? undefined,
        }))
      )
    } finally {
      setLoadingMembros(false)
    }
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: {
        if (tipoRelacao === 'recurso' && !formData.numero_cnj.trim()) {
          toast.error('Informe o número CNJ do recurso')
          return false
        }
        if (formData.numero_cnj.trim()) {
          const cnjRegex = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/
          if (!cnjRegex.test(formData.numero_cnj.trim())) {
            toast.error('Formato do número CNJ inválido. Use: 1234567-12.2024.8.26.0100')
            return false
          }
        }
        if (!formData.area) {
          toast.error('Área jurídica é obrigatória')
          return false
        }
        return true
      }
      case 2:
        return true
      case 3:
        if (!formData.tribunal.trim()) {
          toast.error('Tribunal é obrigatório')
          return false
        }
        return true
      case 4:
        if (!formData.responsavel_id) {
          toast.error('Responsável é obrigatório')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    setCurrentStep((s) => Math.min(s + 1, steps.length))
  }

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    const nomeCliente = processoPrincipal.cliente_nome
    const parteContraria = formData.parte_contraria?.trim() || null
    let autor: string | null = null
    let reu: string | null = null
    if (formData.polo_cliente === 'ativo') {
      autor = nomeCliente
      reu = parteContraria
    } else if (formData.polo_cliente === 'passivo') {
      autor = parteContraria
      reu = nomeCliente
    }

    const dadosProcesso: Record<string, unknown> = {
      numero_cnj: formData.numero_cnj.trim() || null,
      tipo: formData.tipo,
      area: formData.area,
      fase: formData.fase,
      instancia: formData.instancia,
      rito: formData.rito || null,
      valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : null,
      indice_correcao: formData.indice_correcao === 'auto' ? null : (formData.indice_correcao || null),
      data_distribuicao: formData.data_distribuicao,
      objeto_acao: formData.objeto_acao || null,
      cliente_id: processoPrincipal.cliente_id,
      polo_cliente: formData.polo_cliente,
      parte_contraria: parteContraria,
      autor,
      reu,
      contrato_id: processoPrincipal.contrato_id || null,
      modalidade_cobranca: processoPrincipal.modalidade_cobranca || null,
      tribunal: formData.tribunal,
      comarca: formData.comarca || null,
      vara: formData.vara || null,
      responsavel_id: formData.responsavel_id,
      colaboradores_ids: formData.colaboradores_ids.length > 0 ? formData.colaboradores_ids : null,
      tags: formData.tags.length > 0 ? formData.tags : null,
      status: 'ativo',
      provisao_perda: formData.provisao_perda || null,
      observacoes: formData.observacoes || null,
    }

    const suspenderPrincipal =
      formData.suspender_principal === 'manter' ? null : formData.suspender_principal

    const novoId = await onConfirm({
      tipo: tipoRelacao,
      dadosProcesso,
      suspenderPrincipal,
    })

    if (novoId) {
      const label = TIPO_LABEL[tipoRelacao]
      toast.success(`${label} criado com sucesso!`)
      onClose()
    }
  }

  // Formatação do valor causa
  const handleValorCausaChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setValorCausaFormatado('')
      updateField('valor_causa', '')
      return
    }
    const num = parseFloat(digits) / 100
    setValorCausaFormatado(
      new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num)
    )
    updateField('valor_causa', num.toString())
  }

  const toggleColaborador = (id: string) => {
    const current = formData.colaboradores_ids
    if (current.includes(id)) {
      updateField('colaboradores_ids', current.filter((x) => x !== id))
    } else {
      updateField('colaboradores_ids', [...current, id])
    }
  }

  const tipoLabel = TIPO_LABEL[tipoRelacao]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <GitBranch className="w-5 h-5 text-[#89bcbe]" />
            Novo {tipoLabel}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Derivado de{' '}
            <span className="font-mono font-semibold">{processoPrincipal.numero_cnj || processoPrincipal.numero_pasta}</span>
          </p>
        </DialogHeader>

        {/* Indicador de progresso */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center gap-1">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                  currentStep === step.number
                    ? 'bg-[#34495e] text-white'
                    : currentStep > step.number
                    ? 'bg-[#89bcbe] text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {currentStep > step.number ? <Check className="w-3 h-3" /> : step.number}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  currentStep === step.number ? 'text-[#34495e] dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.title}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`h-px w-4 mx-1 ${
                    currentStep > step.number ? 'bg-[#89bcbe]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ─── STEP 1: Dados Básicos ─── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-[#f0f9f9] dark:bg-teal-900/20 border border-[#aacfd0] rounded-lg">
              <GitBranch className="w-4 h-4 text-[#46627f] dark:text-slate-400 shrink-0" />
              <p className="text-xs text-[#46627f] dark:text-slate-400">
                <strong>{tipoLabel}</strong> do processo{' '}
                <span className="font-mono">{processoPrincipal.numero_cnj || processoPrincipal.numero_pasta}</span>
                {' — '}
                {processoPrincipal.autor} x {processoPrincipal.reu}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="numero_cnj">
                  Número CNJ {tipoRelacao === 'recurso' && <span className="text-red-500 dark:text-red-400">*</span>}
                </Label>
                <Input
                  id="numero_cnj"
                  placeholder="1234567-12.2024.8.26.0100"
                  value={formData.numero_cnj}
                  onChange={(e) => updateField('numero_cnj', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Área Jurídica *</Label>
                <Select value={formData.area} onValueChange={(v) => updateField('area', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar área" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AREA_JURIDICA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Fase Processual</Label>
                <Select value={formData.fase} onValueChange={(v) => updateField('fase', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROCESSO_FASE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Instância</Label>
                <Select value={formData.instancia} onValueChange={(v) => updateField('instancia', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROCESSO_INSTANCIA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Rito</Label>
                <Select value={formData.rito} onValueChange={(v) => updateField('rito', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROCESSO_RITO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Data de Distribuição</Label>
                <Input
                  type="date"
                  value={formData.data_distribuicao}
                  onChange={(e) => updateField('data_distribuicao', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Valor da Causa</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">
                    R$
                  </span>
                  <Input
                    className="pl-8"
                    placeholder="0,00"
                    value={valorCausaFormatado}
                    onChange={(e) => handleValorCausaChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Objeto da Ação</Label>
                <Textarea
                  placeholder="Descreva o objeto desta ação..."
                  value={formData.objeto_acao}
                  onChange={(e) => updateField('objeto_acao', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Partes ─── */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Cliente (herdado, readonly) */}
            <div className="space-y-1">
              <Label>Cliente</Label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700 rounded-lg">
                <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {processoPrincipal.cliente_nome}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Herdado do processo principal</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Polo do Cliente</Label>
              <Select
                value={formData.polo_cliente}
                onValueChange={(v) => updateField('polo_cliente', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROCESSO_POLO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Parte Contrária</Label>
              <Input
                placeholder="Nome da parte contrária"
                value={formData.parte_contraria}
                onChange={(e) => updateField('parte_contraria', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ─── STEP 3: Localização ─── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                Tribunal *
              </Label>
              <Input
                placeholder={tipoRelacao === 'recurso' ? 'ex: TJSP, TST, STJ' : 'Nome do tribunal'}
                value={formData.tribunal}
                onChange={(e) => updateField('tribunal', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Comarca / Foro</Label>
              <Input
                placeholder="Comarca ou foro"
                value={formData.comarca}
                onChange={(e) => updateField('comarca', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Vara / Câmara / Turma</Label>
              <Input
                placeholder={tipoRelacao === 'recurso' ? 'ex: 3ª Câmara de Direito Privado' : 'Vara ou câmara'}
                value={formData.vara}
                onChange={(e) => updateField('vara', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ─── STEP 4: Gestão ─── */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Responsável *</Label>
              {loadingMembros ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando membros...
                </div>
              ) : (
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(v) => updateField('responsavel_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {membros.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span>{m.nome_completo}</span>
                        {m.cargo_nome && (
                          <span className="text-slate-400 dark:text-slate-500 ml-1">· {m.cargo_nome}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Colaboradores */}
            {membros.length > 0 && (
              <div className="space-y-2">
                <Label>Colaboradores</Label>
                <div className="flex flex-wrap gap-2">
                  {membros
                    .filter((m) => m.id !== formData.responsavel_id)
                    .map((m) => {
                      const selected = formData.colaboradores_ids.includes(m.id)
                      return (
                        <Badge
                          key={m.id}
                          variant={selected ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selected
                              ? 'bg-[#34495e] hover:bg-[#46627f]'
                              : 'hover:bg-slate-100 dark:hover:bg-surface-2'
                          }`}
                          onClick={() => toggleColaborador(m.id)}
                        >
                          {m.nome_completo}
                        </Badge>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Contrato (herdado) */}
            {processoPrincipal.contrato_id && (
              <div className="space-y-1">
                <Label>Contrato</Label>
                <div className="flex items-center gap-2 p-3 bg-[#f0f9f9] dark:bg-teal-900/20 border border-[#aacfd0] rounded-lg">
                  <Link2 className="w-4 h-4 text-[#46627f] dark:text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                      {processoPrincipal.contrato_titulo ?? 'Contrato do processo principal'}
                    </p>
                    <p className="text-xs text-[#46627f] dark:text-slate-400">
                      Herdado automaticamente — honorários serão lançados neste contrato
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Provisão de Perda</Label>
              <Select
                value={formData.provisao_perda || '_none'}
                onValueChange={(v) => updateField('provisao_perda', v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar provisão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Não informado</SelectItem>
                  {Object.entries(PROCESSO_PROVISAO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações internas..."
                value={formData.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* ─── STEP 5: Vínculo com Principal ─── */}
        {currentStep === 5 && (
          <div className="space-y-4">
            {/* Resumo do vínculo */}
            <div className="p-4 bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Processo Principal
              </p>
              <p className="font-mono text-sm font-semibold text-[#34495e] dark:text-slate-200">
                {processoPrincipal.numero_cnj || processoPrincipal.numero_pasta}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {processoPrincipal.autor} x {processoPrincipal.reu}
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#89bcbe] text-white text-xs">
                  {PROCESSO_INSTANCIA_LABELS[processoPrincipal.instancia] ?? processoPrincipal.instancia}
                </Badge>
                <span className="text-slate-400 dark:text-slate-500 text-xs">→</span>
                <Badge className="bg-[#34495e] text-white text-xs">
                  {tipoLabel}
                </Badge>
                <Badge className="bg-[#46627f] text-white text-xs">
                  {PROCESSO_INSTANCIA_LABELS[formData.instancia] ?? formData.instancia}
                </Badge>
              </div>
            </div>

            {/* O que fazer com o principal */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                O que acontece com o processo principal?
              </Label>

              <div className="space-y-2">
                {[
                  {
                    value: 'manter',
                    label: 'Manter ativo',
                    desc: 'O processo principal continua tramitando normalmente',
                  },
                  {
                    value: 'suspenso',
                    label: 'Suspender',
                    desc: `O processo principal fica suspenso aguardando o ${tipoLabel.toLowerCase()}`,
                  },
                  {
                    value: 'arquivado',
                    label: 'Arquivar',
                    desc: 'O processo principal é arquivado (os trabalhos seguem somente pelo ' + tipoLabel.toLowerCase() + ')',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.suspender_principal === opt.value
                        ? 'border-[#89bcbe] bg-[#f0f9f9] dark:bg-teal-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-0'
                    }`}
                  >
                    <input
                      type="radio"
                      name="suspender_principal"
                      value={opt.value}
                      checked={formData.suspender_principal === opt.value}
                      onChange={() =>
                        updateField('suspender_principal', opt.value as FormData['suspender_principal'])
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{opt.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 6: Revisão ─── */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  title: 'Identificação',
                  rows: [
                    { label: 'Tipo', value: tipoLabel },
                    { label: 'CNJ', value: formData.numero_cnj || '(a definir)' },
                    { label: 'Área', value: AREA_JURIDICA_LABELS[formData.area as keyof typeof AREA_JURIDICA_LABELS] ?? formData.area },
                    { label: 'Instância', value: PROCESSO_INSTANCIA_LABELS[formData.instancia] ?? formData.instancia },
                    { label: 'Fase', value: PROCESSO_FASE_LABELS[formData.fase] ?? formData.fase },
                  ],
                },
                {
                  title: 'Localização',
                  rows: [
                    { label: 'Tribunal', value: formData.tribunal },
                    { label: 'Comarca', value: formData.comarca || '—' },
                    { label: 'Vara/Câmara', value: formData.vara || '—' },
                  ],
                },
                {
                  title: 'Partes',
                  rows: [
                    { label: 'Cliente', value: processoPrincipal.cliente_nome },
                    { label: 'Polo', value: PROCESSO_POLO_LABELS[formData.polo_cliente] ?? formData.polo_cliente },
                    { label: 'Parte Contrária', value: formData.parte_contraria || '—' },
                  ],
                },
                {
                  title: 'Vínculo',
                  rows: [
                    {
                      label: 'Principal',
                      value: processoPrincipal.numero_cnj || processoPrincipal.numero_pasta,
                    },
                    {
                      label: 'Ação no principal',
                      value:
                        formData.suspender_principal === 'manter'
                          ? 'Manter ativo'
                          : formData.suspender_principal === 'suspenso'
                          ? 'Suspender'
                          : 'Arquivar',
                    },
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-surface-0 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      {section.title}
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {section.rows.map((row) => (
                      <div key={row.label} className="flex items-center px-3 py-2 gap-4">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{row.label}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-mono text-xs break-all">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || saving}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <span className="text-xs text-slate-400 dark:text-slate-500">
            {currentStep}/{steps.length}
          </span>

          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={saving}
              className="gap-1 bg-[#34495e] hover:bg-[#46627f]"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="gap-1 bg-[#34495e] hover:bg-[#46627f]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Criar {tipoLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
