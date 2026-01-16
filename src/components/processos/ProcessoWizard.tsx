'use client'

import { useState } from 'react'
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
import { X, ChevronLeft, ChevronRight, Check, Search, Loader2, FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ProcessoDataJud } from '@/types/datajud'
import ModalidadeSelector from '@/components/financeiro/ModalidadeSelector'

interface ProcessoWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (processoId: string) => void
}

interface FormData {
  // Step 1: Dados Básicos
  numero_cnj: string
  tipo: string
  area: string
  fase: string
  instancia: string
  rito: string
  valor_causa: string
  data_distribuicao: string
  objeto_acao: string

  // Step 2: Partes
  cliente_id: string
  polo_cliente: string
  parte_contraria: string
  contrato_id: string
  modalidade_cobranca: string // Obrigatório quando tem contrato

  // Step 3: Localização
  tribunal: string
  comarca: string
  vara: string
  juiz: string

  // Step 4: Gestão
  responsavel_id: string
  colaboradores_ids: string[]
  tags: string[]
  status: string
  observacoes: string

  // Step 5: Valores
  valor_acordo: string
  valor_condenacao: string
  provisao_sugerida: string
}

interface FormaContrato {
  forma_cobranca: string
  config?: {
    valor_fixo?: number
    valor_hora?: number
    percentual_exito?: number
    valor_por_processo?: number
  }
}

interface ContratoOption {
  id: string
  titulo: string
  forma_cobranca: string
  formas_disponiveis: FormaContrato[] // MÚLTIPLAS formas
  valor_fixo: number | null
  percentual_exito: number | null
  valor_hora: number | null
  valor_por_processo: number | null
  dia_cobranca: number | null
}

const initialFormData: FormData = {
  numero_cnj: '',
  tipo: 'judicial',
  area: '',
  fase: 'conhecimento',
  instancia: '1ª',
  rito: 'ordinário',
  valor_causa: '',
  data_distribuicao: new Date().toISOString().split('T')[0],
  objeto_acao: '',
  cliente_id: '',
  polo_cliente: 'ativo',
  parte_contraria: '',
  contrato_id: '',
  modalidade_cobranca: '',
  tribunal: '',
  comarca: '',
  vara: '',
  juiz: '',
  responsavel_id: '',
  colaboradores_ids: [],
  tags: [],
  status: 'ativo',
  observacoes: '',
  valor_acordo: '',
  valor_condenacao: '',
  provisao_sugerida: '',
}

const FORMA_COBRANCA_LABELS: Record<string, string> = {
  fixo: 'Valor Fixo',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  por_pasta: 'Por Pasta (Mensal)',
  por_ato: 'Por Ato Processual',
  por_cargo: 'Por Cargo/Timesheet',
}

export default function ProcessoWizard({ open, onOpenChange, onSuccess }: ProcessoWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [consultandoCNJ, setConsultandoCNJ] = useState(false)
  const [contratos, setContratos] = useState<ContratoOption[]>([])
  const [loadingContratos, setLoadingContratos] = useState(false)
  const supabase = createClient()

  // Carregar contratos quando cliente é selecionado
  const loadContratosCliente = async (clienteId: string) => {
    if (!clienteId) {
      setContratos([])
      return
    }

    setLoadingContratos(true)
    try {
      // Buscar contratos com config e formas disponíveis
      const { data, error } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          id,
          titulo,
          forma_cobranca,
          config:financeiro_contratos_honorarios_config(
            tipo_config,
            valor_fixo,
            percentual_exito,
            valor_hora,
            valor_por_processo,
            dia_cobranca
          ),
          formas:financeiro_contratos_formas(
            forma_cobranca,
            ativo
          )
        `)
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('titulo')

      if (error) {
        console.error('Erro ao carregar contratos:', error)
        setContratos([])
        return
      }

      const contratosFormatados: ContratoOption[] = (data || []).map(c => {
        const config = c.config?.[0] || {}

        // Carregar formas disponíveis da tabela financeiro_contratos_formas
        // Se não houver formas na nova tabela, usar forma_cobranca do contrato
        const formasDisponiveis: FormaContrato[] = (c.formas || [])
          .filter((f: any) => f.ativo !== false)
          .map((f: any) => ({
            forma_cobranca: f.forma_cobranca,
            config: {
              valor_fixo: config.valor_fixo,
              valor_hora: config.valor_hora,
              percentual_exito: config.percentual_exito,
              valor_por_processo: config.valor_por_processo,
            }
          }))

        // Fallback: se não tiver formas na nova tabela, usar forma_cobranca do contrato
        if (formasDisponiveis.length === 0 && c.forma_cobranca) {
          formasDisponiveis.push({
            forma_cobranca: c.forma_cobranca,
            config: {
              valor_fixo: config.valor_fixo,
              valor_hora: config.valor_hora,
              percentual_exito: config.percentual_exito,
              valor_por_processo: config.valor_por_processo,
            }
          })
        }

        return {
          id: c.id,
          titulo: c.titulo,
          forma_cobranca: c.forma_cobranca || formasDisponiveis[0]?.forma_cobranca || 'fixo',
          formas_disponiveis: formasDisponiveis,
          valor_fixo: config.valor_fixo || null,
          percentual_exito: config.percentual_exito || null,
          valor_hora: config.valor_hora || null,
          valor_por_processo: config.valor_por_processo || null,
          dia_cobranca: config.dia_cobranca || null,
        }
      })

      setContratos(contratosFormatados)
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      setContratos([])
    } finally {
      setLoadingContratos(false)
    }
  }

  // Handler para seleção de cliente
  const handleClienteChange = (clienteId: string) => {
    updateField('cliente_id', clienteId)
    updateField('contrato_id', '') // Limpar contrato ao mudar cliente
    updateField('modalidade_cobranca', '') // Limpar modalidade também
    loadContratosCliente(clienteId)
  }

  // Handler para seleção de contrato
  const handleContratoChange = (contratoId: string) => {
    updateField('contrato_id', contratoId)
    updateField('modalidade_cobranca', '') // Limpar modalidade ao mudar contrato

    // Se o contrato tiver apenas uma forma, seleciona automaticamente
    const contrato = contratos.find(c => c.id === contratoId)
    if (contrato && contrato.formas_disponiveis.length === 1) {
      updateField('modalidade_cobranca', contrato.formas_disponiveis[0].forma_cobranca)
    }
  }

  // Obter contrato selecionado
  const contratoSelecionado = contratos.find(c => c.id === formData.contrato_id)

  // Formatar valor para exibição
  const formatarValor = (valor: number | null) => {
    if (!valor) return null
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Funcao para inferir area juridica pela classe processual
  const inferirArea = (classe: string, assuntos?: string[]): string | null => {
    const textoBusca = [classe, ...(assuntos || [])].join(' ').toLowerCase()
    if (textoBusca.includes('trabalhista') || textoBusca.includes('reclamacao') || textoBusca.includes('clt')) return 'Trabalhista'
    if (textoBusca.includes('familia') || textoBusca.includes('divorcio') || textoBusca.includes('alimentos')) return 'Família'
    if (textoBusca.includes('criminal') || textoBusca.includes('penal') || textoBusca.includes('crime')) return 'Criminal'
    if (textoBusca.includes('tributar') || textoBusca.includes('fiscal')) return 'Tributária'
    if (textoBusca.includes('consumidor') || textoBusca.includes('cdc')) return 'Consumidor'
    if (textoBusca.includes('empresar') || textoBusca.includes('falencia')) return 'Empresarial'
    return 'Cível'
  }

  // Funcao para mapear instancia do DataJud para o formato do sistema
  const mapearInstancia = (instancia: string): string => {
    const mapa: Record<string, string> = {
      '1a': '1ª',
      '2a': '2ª',
      'stj': 'STJ',
      'stf': 'STF',
      'tst': 'TST'
    }
    return mapa[instancia] || '1ª'
  }

  // Funcao para buscar dados no DataJud
  const handleBuscarDataJud = async () => {
    if (!formData.numero_cnj.trim()) {
      toast.error('Digite o número CNJ primeiro')
      return
    }

    setConsultandoCNJ(true)
    try {
      const response = await fetch('/api/datajud/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cnj: formData.numero_cnj })
      })

      const result = await response.json()
      console.log('[DataJud] Resposta:', response.status, result)

      if (!response.ok) {
        // Mostrar erro específico da validação
        toast.error(result.error || `Erro ${response.status}: Falha na consulta`)
        return
      }

      if (result.sucesso && result.dados) {
        const dados: ProcessoDataJud = result.dados

        // Preencher campos automaticamente
        updateField('tribunal', dados.tribunal)
        updateField('vara', dados.orgao_julgador)
        if (dados.data_ajuizamento) {
          updateField('data_distribuicao', dados.data_ajuizamento.split('T')[0])
        }
        updateField('instancia', mapearInstancia(dados.instancia))
        updateField('objeto_acao', dados.objeto_acao)

        // Inferir area pela classe
        const area = inferirArea(dados.classe, dados.assuntos)
        if (area) updateField('area', area)

        const fonte = result.fonte === 'cache' ? ' (cache)' : ''
        toast.success(`Dados encontrados e preenchidos!${fonte}`)
      } else {
        toast.error(result.error || 'Processo não encontrado no DataJud')
      }
    } catch (error) {
      console.error('Erro ao consultar DataJud:', error)
      if (error instanceof SyntaxError) {
        toast.error('Erro ao processar resposta do servidor')
      } else {
        toast.error('Erro de conexão ao consultar DataJud')
      }
    } finally {
      setConsultandoCNJ(false)
    }
  }

  const steps = [
    { number: 1, title: 'Dados Básicos' },
    { number: 2, title: 'Partes' },
    { number: 3, title: 'Localização' },
    { number: 4, title: 'Gestão' },
    { number: 5, title: 'Valores' },
  ]

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateField('tags', [...formData.tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    updateField('tags', formData.tags.filter(t => t !== tag))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.numero_cnj.trim()) {
          toast.error('Número CNJ é obrigatório')
          return false
        }
        // Validar formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
        const cnjRegex = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/
        if (!cnjRegex.test(formData.numero_cnj)) {
          toast.error('Formato do número CNJ inválido. Use: 1234567-12.2024.8.26.0100')
          return false
        }
        if (!formData.area) {
          toast.error('Área jurídica é obrigatória')
          return false
        }
        return true
      case 2:
        if (!formData.cliente_id) {
          toast.error('Cliente é obrigatório')
          return false
        }
        // Se tem contrato com múltiplas formas, exigir modalidade
        if (formData.contrato_id) {
          const contrato = contratos.find(c => c.id === formData.contrato_id)
          if (contrato && contrato.formas_disponiveis.length > 1 && !formData.modalidade_cobranca) {
            toast.error('Selecione a modalidade de cobrança para este processo')
            return false
          }
        }
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
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    try {
      setLoading(true)

      // Converter valores para números
      const processData = {
        numero_cnj: formData.numero_cnj,
        tipo: formData.tipo,
        area: formData.area,
        fase: formData.fase,
        instancia: formData.instancia,
        rito: formData.rito || null,
        valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : null,
        data_distribuicao: formData.data_distribuicao,
        objeto_acao: formData.objeto_acao || null,
        cliente_id: formData.cliente_id,
        polo_cliente: formData.polo_cliente,
        parte_contraria: formData.parte_contraria || null,
        contrato_id: formData.contrato_id || null,
        modalidade_cobranca: formData.modalidade_cobranca || null,
        tribunal: formData.tribunal,
        comarca: formData.comarca || null,
        vara: formData.vara || null,
        juiz: formData.juiz || null,
        responsavel_id: formData.responsavel_id,
        colaboradores_ids: formData.colaboradores_ids,
        tags: formData.tags,
        status: formData.status,
        observacoes: formData.observacoes || null,
        valor_acordo: formData.valor_acordo ? parseFloat(formData.valor_acordo) : null,
        valor_condenacao: formData.valor_condenacao ? parseFloat(formData.valor_condenacao) : null,
        provisao_sugerida: formData.provisao_sugerida ? parseFloat(formData.provisao_sugerida) : null,
      }

      // Aqui chamaria a function create_processo() do Supabase
      // Por enquanto simulando sucesso
      console.log('Dados do processo:', processData)

      toast.success('Processo criado com sucesso!')
      setFormData(initialFormData)
      setCurrentStep(1)
      onOpenChange(false)

      if (onSuccess) {
        onSuccess('mock-id-123')
      }
    } catch (error) {
      console.error('Erro ao criar processo:', error)
      toast.error('Erro ao criar processo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#34495e]">
            Novo Processo
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > step.number
                      ? 'bg-emerald-500 text-white'
                      : currentStep === step.number
                      ? 'bg-[#34495e] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    currentStep >= step.number ? 'text-[#34495e]' : 'text-slate-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Dados Básicos */}
          {currentStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="numero_cnj">Número CNJ *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="numero_cnj"
                      placeholder="1234567-12.2024.8.26.0100"
                      value={formData.numero_cnj}
                      onChange={(e) => updateField('numero_cnj', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBuscarDataJud}
                      disabled={!formData.numero_cnj.trim() || consultandoCNJ}
                      className="shrink-0 gap-2"
                    >
                      {consultandoCNJ ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      {consultandoCNJ ? 'Buscando...' : 'Buscar DataJud'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Formato: NNNNNNN-DD.AAAA.J.TT.OOOO - Clique em "Buscar DataJud" para preencher automaticamente
                  </p>
                </div>

                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => updateField('tipo', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="judicial">Judicial</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="arbitragem">Arbitragem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="area">Área Jurídica *</Label>
                  <Select value={formData.area} onValueChange={(v) => updateField('area', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cível">Cível</SelectItem>
                      <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                      <SelectItem value="Tributária">Tributária</SelectItem>
                      <SelectItem value="Família">Família</SelectItem>
                      <SelectItem value="Criminal">Criminal</SelectItem>
                      <SelectItem value="Consumidor">Consumidor</SelectItem>
                      <SelectItem value="Empresarial">Empresarial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fase">Fase *</Label>
                  <Select value={formData.fase} onValueChange={(v) => updateField('fase', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conhecimento">Conhecimento</SelectItem>
                      <SelectItem value="recurso">Recurso</SelectItem>
                      <SelectItem value="execucao">Execução</SelectItem>
                      <SelectItem value="cumprimento_sentenca">Cumprimento de Sentença</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="instancia">Instância *</Label>
                  <Select value={formData.instancia} onValueChange={(v) => updateField('instancia', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1ª">1ª Instância</SelectItem>
                      <SelectItem value="2ª">2ª Instância</SelectItem>
                      <SelectItem value="3ª">3ª Instância</SelectItem>
                      <SelectItem value="STJ">STJ</SelectItem>
                      <SelectItem value="STF">STF</SelectItem>
                      <SelectItem value="TST">TST</SelectItem>
                      <SelectItem value="Administrativa">Administrativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rito">Rito</Label>
                  <Select value={formData.rito} onValueChange={(v) => updateField('rito', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordinário">Ordinário</SelectItem>
                      <SelectItem value="sumário">Sumário</SelectItem>
                      <SelectItem value="especial">Especial</SelectItem>
                      <SelectItem value="sumaríssimo">Sumaríssimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="valor_causa">Valor da Causa (R$)</Label>
                  <Input
                    id="valor_causa"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.valor_causa}
                    onChange={(e) => updateField('valor_causa', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="data_distribuicao">Data de Distribuição *</Label>
                  <Input
                    id="data_distribuicao"
                    type="date"
                    value={formData.data_distribuicao}
                    onChange={(e) => updateField('data_distribuicao', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="objeto_acao">Objeto da Ação</Label>
                  <Textarea
                    id="objeto_acao"
                    placeholder="Resumo do pedido..."
                    value={formData.objeto_acao}
                    onChange={(e) => updateField('objeto_acao', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Partes */}
          {currentStep === 2 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select value={formData.cliente_id} onValueChange={handleClienteChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">João Silva</SelectItem>
                      <SelectItem value="2">Maria Santos</SelectItem>
                      <SelectItem value="3">Empresa XYZ Ltda</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Não encontrou? <button className="text-[#89bcbe] hover:underline">Cadastrar novo cliente</button>
                  </p>
                </div>

                {/* Seletor de Contrato - aparece após selecionar cliente */}
                {formData.cliente_id && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#34495e]" />
                      <span className="text-sm font-medium text-[#34495e]">Contrato de Honorários</span>
                    </div>

                    {loadingContratos ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Carregando contratos...</span>
                      </div>
                    ) : contratos.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        <p>Nenhum contrato ativo encontrado para este cliente.</p>
                        <p className="text-xs mt-1">
                          O processo será criado sem vínculo com contrato. Você pode vincular posteriormente.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="contrato_id">Qual contrato aplicar a este processo?</Label>
                          <Select
                            value={formData.contrato_id}
                            onValueChange={handleContratoChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um contrato (opcional)..." />
                            </SelectTrigger>
                            <SelectContent>
                              {contratos.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.titulo} - {c.formas_disponiveis.length > 1
                                    ? `${c.formas_disponiveis.length} formas`
                                    : FORMA_COBRANCA_LABELS[c.forma_cobranca] || c.forma_cobranca}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Preview das regras do contrato selecionado */}
                        {contratoSelecionado && (
                          <div className="p-3 bg-white rounded-lg border border-[#89bcbe]/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-[#34495e]">
                                Regras de Cobrança
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {FORMA_COBRANCA_LABELS[contratoSelecionado.forma_cobranca]}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {contratoSelecionado.valor_fixo && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Valor fixo:</span>
                                  <span className="font-medium text-emerald-600">
                                    {formatarValor(contratoSelecionado.valor_fixo)}
                                  </span>
                                </div>
                              )}
                              {contratoSelecionado.valor_hora && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Valor/hora:</span>
                                  <span className="font-medium text-emerald-600">
                                    {formatarValor(contratoSelecionado.valor_hora)}
                                  </span>
                                </div>
                              )}
                              {contratoSelecionado.percentual_exito && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Êxito:</span>
                                  <span className="font-medium text-emerald-600">
                                    {contratoSelecionado.percentual_exito}%
                                  </span>
                                </div>
                              )}
                              {contratoSelecionado.valor_por_processo && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Valor/processo:</span>
                                  <span className="font-medium text-emerald-600">
                                    {formatarValor(contratoSelecionado.valor_por_processo)}
                                  </span>
                                </div>
                              )}
                              {contratoSelecionado.dia_cobranca && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">Cobrança dia:</span>
                                  <span className="font-medium">{contratoSelecionado.dia_cobranca}</span>
                                </div>
                              )}
                            </div>

                            {contratoSelecionado.forma_cobranca === 'por_cargo' && (
                              <p className="text-xs text-slate-500 mt-1">
                                Os valores por cargo serão aplicados conforme configuração do contrato.
                              </p>
                            )}
                            {contratoSelecionado.forma_cobranca === 'por_ato' && (
                              <p className="text-xs text-slate-500 mt-1">
                                Atos processuais serão cobrados automaticamente quando detectados.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Seletor de Modalidade - aparece quando contrato tem múltiplas formas */}
                        {contratoSelecionado && contratoSelecionado.formas_disponiveis.length > 1 && (
                          <div className="mt-4">
                            <ModalidadeSelector
                              formas={contratoSelecionado.formas_disponiveis}
                              selectedModalidade={formData.modalidade_cobranca}
                              onSelect={(modalidade) => updateField('modalidade_cobranca', modalidade)}
                              error={!formData.modalidade_cobranca ? undefined : undefined}
                            />
                          </div>
                        )}

                        {/* Aviso de seleção obrigatória */}
                        {contratoSelecionado && contratoSelecionado.formas_disponiveis.length > 1 && !formData.modalidade_cobranca && (
                          <div className="flex items-center gap-2 p-2.5 mt-3 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-amber-700">
                              Selecione a modalidade de cobrança para este processo
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="polo_cliente">Polo do Cliente *</Label>
                  <Select value={formData.polo_cliente} onValueChange={(v) => updateField('polo_cliente', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Polo Ativo (Autor)</SelectItem>
                      <SelectItem value="passivo">Polo Passivo (Réu)</SelectItem>
                      <SelectItem value="terceiro">Terceiro Interessado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="parte_contraria">Parte Contrária</Label>
                  <Input
                    id="parte_contraria"
                    placeholder="Nome da parte contrária..."
                    value={formData.parte_contraria}
                    onChange={(e) => updateField('parte_contraria', e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Para casos com litisconsórcio, você poderá adicionar mais partes após criar o processo
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Localização */}
          {currentStep === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="tribunal">Tribunal *</Label>
                  <Input
                    id="tribunal"
                    placeholder="Ex: TRT 2ª Região, TJSP, etc..."
                    value={formData.tribunal}
                    onChange={(e) => updateField('tribunal', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="comarca">Comarca</Label>
                  <Input
                    id="comarca"
                    placeholder="Ex: São Paulo"
                    value={formData.comarca}
                    onChange={(e) => updateField('comarca', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="vara">Vara/Câmara</Label>
                  <Input
                    id="vara"
                    placeholder="Ex: 1ª Vara do Trabalho"
                    value={formData.vara}
                    onChange={(e) => updateField('vara', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="juiz">Juiz/Desembargador</Label>
                  <Input
                    id="juiz"
                    placeholder="Nome do magistrado..."
                    value={formData.juiz}
                    onChange={(e) => updateField('juiz', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Gestão */}
          {currentStep === 4 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="responsavel_id">Advogado Responsável *</Label>
                  <Select value={formData.responsavel_id} onValueChange={(v) => updateField('responsavel_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Dr. Carlos Souza</SelectItem>
                      <SelectItem value="2">Dra. Ana Santos</SelectItem>
                      <SelectItem value="3">Dr. Pedro Oliveira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status Inicial</Label>
                  <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="arquivado">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (Organização)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Digite uma tag e pressione Enter..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Adicionar
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1.5 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Informações relevantes sobre o processo..."
                    value={formData.observacoes}
                    onChange={(e) => updateField('observacoes', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 5: Valores */}
          {currentStep === 5 && (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-[#f0f9f9] rounded-lg border border-[#89bcbe]/30">
                  <p className="text-sm text-[#46627f] mb-2">
                    <strong>Valor da Causa:</strong> {formData.valor_causa ? `R$ ${parseFloat(formData.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Os campos abaixo são opcionais e podem ser preenchidos posteriormente
                  </p>
                </div>

                <div>
                  <Label htmlFor="valor_acordo">Valor do Acordo (R$)</Label>
                  <Input
                    id="valor_acordo"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.valor_acordo}
                    onChange={(e) => updateField('valor_acordo', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="valor_condenacao">Valor da Condenação (R$)</Label>
                  <Input
                    id="valor_condenacao"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.valor_condenacao}
                    onChange={(e) => updateField('valor_condenacao', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="provisao_sugerida">Provisão Contábil Sugerida (R$)</Label>
                  <Input
                    id="provisao_sugerida"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.provisao_sugerida}
                    onChange={(e) => updateField('provisao_sugerida', e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Valor estimado para provisão contábil da empresa
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="text-xs text-slate-500">
            Passo {currentStep} de {steps.length}
          </div>

          {currentStep < steps.length ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
            >
              {loading ? 'Salvando...' : 'Salvar Processo'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
