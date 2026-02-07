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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Check, Search, Loader2, FileText, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PessoaWizardModal } from '@/components/crm/PessoaWizardModal'
import { ContratoModal } from '@/components/financeiro/ContratoModal'
import { useContratosHonorarios } from '@/hooks/useContratosHonorarios'
import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'

interface ProcessoData {
  id?: string
  numero_cnj?: string
  outros_numeros?: { tipo: string; numero: string }[]
  tipo?: string
  area?: string
  fase?: string
  instancia?: string
  rito?: string
  valor_causa?: number
  indice_correcao?: string
  data_distribuicao?: string
  objeto_acao?: string
  cliente_id?: string
  polo_cliente?: string
  parte_contraria?: string
  contrato_id?: string
  modalidade_cobranca?: string
  tribunal?: string
  comarca?: string
  vara?: string
  responsavel_id?: string
  colaboradores_ids?: string[]
  tags?: string[]
  status?: string
  provisao_perda?: string
  observacoes?: string
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
}

interface ProcessoWizardProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onSuccess?: (processoId: string) => void
  onProcessoCriado?: () => void
  initialData?: ProcessoData
  mode?: 'create' | 'edit'
}

interface OutroNumero {
  tipo: string  // Ex: "Processo Administrativo", "Número Interno", "Protocolo"
  numero: string
}

interface FormData {
  // Step 1: Dados Básicos
  numero_cnj: string  // Opcional para processos administrativos
  outros_numeros: OutroNumero[]  // Para números não-CNJ
  tipo: string
  area: string
  fase: string
  instancia: string
  rito: string
  valor_causa: string
  indice_correcao: string  // Índice de correção monetária (INPC, IPCA, SELIC, etc)
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

  // Step 4: Gestão
  responsavel_id: string
  colaboradores_ids: string[]
  tags: string[]
  status: string
  provisao_perda: string // Remota, Possível, Provável
  observacoes: string

  // Step 5: Valores (mantidos para edição posterior)
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
  outros_numeros: [],
  tipo: 'judicial',
  area: '',
  fase: 'conhecimento',
  instancia: '1a',
  rito: 'ordinario',
  valor_causa: '',
  indice_correcao: '',  // Será definido automaticamente pelo trigger baseado na área
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
  responsavel_id: '',
  colaboradores_ids: [],
  tags: [],
  status: 'ativo',
  provisao_perda: '',
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

// Funções para máscara de moeda brasileira
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const numValue = parseInt(digits, 10) / 100
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

const parseCurrencyToNumber = (value: string): number => {
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(cleaned) || 0
}

export default function ProcessoWizard({
  open,
  onOpenChange,
  onClose,
  onSuccess,
  onProcessoCriado,
  initialData,
  mode = 'create'
}: ProcessoWizardProps) {
  const isEditMode = mode === 'edit'
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [contratos, setContratos] = useState<ContratoOption[]>([])
  const [loadingContratos, setLoadingContratos] = useState(false)
  const [pessoaModalOpen, setPessoaModalOpen] = useState(false)
  const [contratoModalOpen, setContratoModalOpen] = useState(false)
  const [clientes, setClientes] = useState<{ id: string; nome_completo: string; tipo_pessoa: string }[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [valorCausaFormatado, setValorCausaFormatado] = useState('')
  const [membros, setMembros] = useState<{ id: string; nome_completo: string; role: string }[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)
  const supabase = createClient()
  const { createContrato } = useContratosHonorarios()

  // Preencher dados iniciais quando em modo de edição
  useEffect(() => {
    if (open && isEditMode && initialData) {
      const editFormData: FormData = {
        numero_cnj: initialData.numero_cnj || '',
        outros_numeros: initialData.outros_numeros || [],
        tipo: initialData.tipo || 'judicial',
        area: initialData.area || '',
        fase: initialData.fase || 'conhecimento',
        instancia: initialData.instancia || '1a',
        rito: initialData.rito || 'ordinario',
        valor_causa: initialData.valor_causa?.toString() || '',
        indice_correcao: initialData.indice_correcao || '',
        data_distribuicao: initialData.data_distribuicao?.split('T')[0] || new Date().toISOString().split('T')[0],
        objeto_acao: initialData.objeto_acao || '',
        cliente_id: initialData.cliente_id || '',
        polo_cliente: initialData.polo_cliente || 'ativo',
        parte_contraria: initialData.parte_contraria || '',
        contrato_id: initialData.contrato_id || '',
        modalidade_cobranca: initialData.modalidade_cobranca || '',
        tribunal: initialData.tribunal || '',
        comarca: initialData.comarca || '',
        vara: initialData.vara || '',
        responsavel_id: initialData.responsavel_id || '',
        colaboradores_ids: initialData.colaboradores_ids || [],
        tags: initialData.tags || [],
        status: initialData.status || 'ativo',
        provisao_perda: initialData.provisao_perda || '',
        observacoes: initialData.observacoes || '',
        valor_acordo: initialData.valor_acordo?.toString() || '',
        valor_condenacao: initialData.valor_condenacao?.toString() || '',
        provisao_sugerida: initialData.provisao_sugerida?.toString() || '',
      }
      setFormData(editFormData)
      setCurrentStep(1) // Sempre começar no step 1 ao abrir

      // Formatar valor da causa para exibição
      if (initialData.valor_causa) {
        setValorCausaFormatado(initialData.valor_causa.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }))
      } else {
        setValorCausaFormatado('')
      }

      // Carregar contratos do cliente se existir cliente_id
      if (initialData.cliente_id) {
        loadContratosCliente(initialData.cliente_id)
      }
    } else if (open && !isEditMode) {
      // Reset para modo criação
      setFormData(initialFormData)
      setValorCausaFormatado('')
      setCurrentStep(1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]) // Apenas 'open' como dependência para garantir que roda toda vez que abre

  // Carregar clientes do escritorio
  const loadClientes = async (search?: string) => {
    setLoadingClientes(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) return

      let query = supabase
        .from('crm_pessoas')
        .select('id, nome_completo, tipo_pessoa')
        .eq('escritorio_id', profile.escritorio_id)
        .eq('status', 'ativo')
        .in('tipo_cadastro', ['cliente', 'prospecto'])
        .order('nome_completo')
        .limit(50)

      if (search) {
        query = query.ilike('nome_completo', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoadingClientes(false)
    }
  }

  // Carregar membros do escritório
  const loadMembros = async () => {
    setLoadingMembros(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) return

      const { data, error } = await supabase
        .from('escritorios_usuarios')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            nome_completo
          )
        `)
        .eq('escritorio_id', profile.escritorio_id)
        .eq('ativo', true)

      if (error) throw error

      const membrosFormatados = (data || [])
        .filter((m: any) => m.profiles)
        .map((m: any) => ({
          id: m.profiles.id,
          nome_completo: m.profiles.nome_completo,
          role: m.role
        }))

      setMembros(membrosFormatados)
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    } finally {
      setLoadingMembros(false)
    }
  }

  // Carregar clientes e membros quando modal abre
  useEffect(() => {
    if (open) {
      loadClientes()
      loadMembros()
    }
  }, [open])

  // Buscar clientes com debounce (minimo 3 caracteres)
  useEffect(() => {
    if (!clienteSearch || clienteSearch.length < 3) {
      return
    }
    const debounce = setTimeout(() => {
      if (open) {
        loadClientes(clienteSearch)
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [clienteSearch])

  // Handler unificado para fechar
  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  // Carregar contratos quando cliente é selecionado
  const loadContratosCliente = async (clienteId: string) => {
    if (!clienteId) {
      setContratos([])
      return
    }

    setLoadingContratos(true)
    try {
      // Buscar contratos - config e formas_pagamento são colunas JSONB
      const { data, error } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          id,
          titulo,
          forma_cobranca,
          config,
          formas_pagamento
        `)
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('titulo')

      if (error) {
        console.error('Erro ao carregar contratos:', error)
        setContratos([])
        return
      }

      const contratosFormatados: ContratoOption[] = (data || []).map((c: any) => {
        // config é um JSONB com os valores do contrato
        const config = c.config || {}

        // formas_pagamento é um JSONB array com formas disponíveis
        // O campo no DB é "forma" (não "forma_cobranca")
        const formasDisponiveis: FormaContrato[] = Array.isArray(c.formas_pagamento)
          ? c.formas_pagamento
              .filter((f: any) => f.ativo !== false)
              .map((f: any) => ({
                forma_cobranca: f.forma || f.forma_cobranca || f.tipo,
              }))
          : []

        // Fallback: se não tiver formas_pagamento, usar forma_cobranca do contrato
        if (formasDisponiveis.length === 0 && c.forma_cobranca) {
          formasDisponiveis.push({
            forma_cobranca: c.forma_cobranca,
          })
        }

        // Extrair valor_fixo do novo formato (valores_fixos array) ou legado
        const valorFixo = Array.isArray(config.valores_fixos) && config.valores_fixos.length > 0
          ? config.valores_fixos.reduce((sum: number, v: any) => sum + (v.valor || 0), 0)
          : config.valor_fixo || null

        return {
          id: c.id,
          titulo: c.titulo,
          forma_cobranca: c.forma_cobranca || formasDisponiveis[0]?.forma_cobranca || 'fixo',
          formas_disponiveis: formasDisponiveis,
          valor_fixo: valorFixo,
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

  // Handler para salvar novo contrato via modal
  const handleSaveContrato = async (data: any): Promise<string | null | boolean> => {
    try {
      const contratoId = await createContrato(data)
      if (contratoId) {
        // Recarregar lista de contratos
        await loadContratosCliente(formData.cliente_id)
        // Selecionar o novo contrato automaticamente
        updateField('contrato_id', contratoId)
        toast.success('Contrato criado e vinculado!')
        setContratoModalOpen(false)
        return contratoId
      }
      return null
    } catch (error) {
      console.error('Erro ao criar contrato:', error)
      toast.error('Erro ao criar contrato')
      return null
    }
  }

  // Obter contrato selecionado
  const contratoSelecionado = contratos.find(c => c.id === formData.contrato_id)

  // Formatar valor para exibição
  const formatarValor = (valor: number | null) => {
    if (!valor) return null
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const steps = [
    { number: 1, title: 'Dados Básicos' },
    { number: 2, title: 'Partes' },
    { number: 3, title: 'Localização' },
    { number: 4, title: 'Gestão' },
    { number: 5, title: 'Revisão' },
  ]

  const totalSteps = 5

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Precisa ter pelo menos um número: CNJ ou outro número
        const temCNJ = formData.numero_cnj.trim().length > 0
        const temOutrosNumeros = formData.outros_numeros.some(n => n.numero.trim().length > 0)

        if (!temCNJ && !temOutrosNumeros) {
          toast.error('Informe o número CNJ ou adicione outro número identificador')
          return false
        }

        // Se tiver CNJ, validar formato
        if (temCNJ) {
          const cnjRegex = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/
          if (!cnjRegex.test(formData.numero_cnj)) {
            toast.error('Formato do número CNJ inválido. Use: 1234567-12.2024.8.26.0100')
            return false
          }
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
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    try {
      setLoading(true)

      // Buscar escritorio_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Usuário não autenticado')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) {
        toast.error('Escritório não encontrado')
        return
      }

      // Converter valores para números e filtrar outros_numeros vazios
      const outrosNumerosValidos = formData.outros_numeros.filter(n => n.numero.trim().length > 0)

      // Derivar autor e réu a partir do polo do cliente e parte contrária
      const nomeCliente = clientes.find(c => c.id === formData.cliente_id)?.nome_completo || null
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

      const processData = {
        numero_cnj: formData.numero_cnj.trim() || null,
        outros_numeros: outrosNumerosValidos.length > 0 ? outrosNumerosValidos : [],
        tipo: formData.tipo,
        area: formData.area,
        fase: formData.fase,
        instancia: formData.instancia,
        rito: formData.rito || null,
        valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : null,
        indice_correcao: formData.indice_correcao === 'auto' ? null : (formData.indice_correcao || null),
        data_distribuicao: formData.data_distribuicao,
        objeto_acao: formData.objeto_acao || null,
        cliente_id: formData.cliente_id,
        polo_cliente: formData.polo_cliente,
        parte_contraria: parteContraria,
        autor,
        reu,
        contrato_id: formData.contrato_id || null,
        modalidade_cobranca: formData.modalidade_cobranca || null,
        tribunal: formData.tribunal,
        comarca: formData.comarca || null,
        vara: formData.vara || null,
        responsavel_id: formData.responsavel_id,
        colaboradores_ids: formData.colaboradores_ids.length > 0 ? formData.colaboradores_ids : null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        status: formData.status || 'ativo',
        provisao_perda: formData.provisao_perda || null,
        observacoes: formData.observacoes || null,
        valor_acordo: formData.valor_acordo ? parseFloat(formData.valor_acordo) : null,
        valor_condenacao: formData.valor_condenacao ? parseFloat(formData.valor_condenacao) : null,
        provisao_sugerida: formData.provisao_sugerida ? parseFloat(formData.provisao_sugerida) : null,
      }

      if (isEditMode && initialData?.id) {
        // Modo edição - UPDATE
        console.log('Atualizando processo:', initialData.id, processData)

        const { data: updateResult, error } = await supabase
          .from('processos_processos')
          .update(processData)
          .eq('id', initialData.id)
          .select()

        console.log('Resultado do update:', updateResult, error)

        if (error) {
          console.error('Erro ao atualizar processo:', error)
          toast.error(error.message || 'Erro ao atualizar processo')
          return
        }

        if (!updateResult || updateResult.length === 0) {
          console.warn('Update não retornou dados - possível problema de RLS')
          toast.error('Erro ao atualizar: sem permissão ou processo não encontrado')
          return
        }

        toast.success('Processo atualizado com sucesso!')
        handleClose()

        if (onSuccess) {
          onSuccess(initialData.id)
        }
        onProcessoCriado?.()
      } else {
        // Modo criação - INSERT
        const insertData = {
          ...processData,
          escritorio_id: profile.escritorio_id,
          created_by: user.id,
        }

        const { data: processo, error } = await supabase
          .from('processos_processos')
          .insert(insertData)
          .select('id')
          .single()

        if (error) {
          console.error('Erro ao criar processo:', error.message, error.code)
          if (error.code === '23505') {
            toast.error('Já existe um processo com este número CNJ neste escritório')
          } else {
            toast.error(error.message || 'Erro ao criar processo')
          }
          return
        }

        toast.success('Processo criado com sucesso!')
        setFormData(initialFormData)
        setValorCausaFormatado('')
        setCurrentStep(1)
        handleClose()

        if (onSuccess && processo?.id) {
          onSuccess(processo.id)
        }
        onProcessoCriado?.()
      }
    } catch (error) {
      console.error('Erro ao salvar processo:', error)
      toast.error('Erro ao salvar processo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#34495e]">
            {isEditMode ? 'Editar Processo' : 'Novo Processo'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator - Compacto */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs transition-all ${
                    currentStep > step.number
                      ? 'bg-emerald-500 text-white'
                      : currentStep === step.number
                      ? 'bg-[#34495e] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    currentStep >= step.number ? 'text-[#34495e]' : 'text-slate-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-px mx-2 ${
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
              <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                {/* Linha 1: Tipo + Número (CNJ ou Outro) */}
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

                {/* Campo de número condicional */}
                {formData.tipo === 'judicial' ? (
                  <div className="col-span-2">
                    <Label htmlFor="numero_cnj">Número CNJ *</Label>
                    <Input
                      id="numero_cnj"
                      placeholder="1234567-12.2024.8.26.0100"
                      value={formData.numero_cnj}
                      onChange={(e) => updateField('numero_cnj', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <Label>Número do Processo *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.outros_numeros[0]?.tipo || ''}
                        onValueChange={(v) => {
                          const updated = formData.outros_numeros.length > 0
                            ? [{ ...formData.outros_numeros[0], tipo: v }]
                            : [{ tipo: v, numero: '' }]
                          updateField('outros_numeros', updated)
                        }}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="processo_administrativo">Proc. Administrativo</SelectItem>
                          <SelectItem value="protocolo">Protocolo</SelectItem>
                          <SelectItem value="numero_interno">Número Interno</SelectItem>
                          <SelectItem value="inquerito">Inquérito</SelectItem>
                          <SelectItem value="auto_infracao">Auto de Infração</SelectItem>
                          <SelectItem value="arbitragem">Arbitragem</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Número do processo..."
                        value={formData.outros_numeros[0]?.numero || ''}
                        onChange={(e) => {
                          const updated = formData.outros_numeros.length > 0
                            ? [{ ...formData.outros_numeros[0], numero: e.target.value }]
                            : [{ tipo: '', numero: e.target.value }]
                          updateField('outros_numeros', updated)
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                {/* Linha 2: Data + Área + Fase */}
                <div>
                  <Label htmlFor="data_distribuicao">Data Distribuição *</Label>
                  <Input
                    id="data_distribuicao"
                    type="date"
                    value={formData.data_distribuicao}
                    onChange={(e) => updateField('data_distribuicao', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="area">Área Jurídica *</Label>
                  <Select value={formData.area} onValueChange={(v) => updateField('area', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AREA_JURIDICA_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
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

                {/* Linha 3: Instância + Rito + Valor */}
                <div>
                  <Label htmlFor="instancia">Instância *</Label>
                  <Select value={formData.instancia} onValueChange={(v) => updateField('instancia', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1a">1ª Instância</SelectItem>
                      <SelectItem value="2a">2ª Instância</SelectItem>
                      <SelectItem value="3a">3ª Instância</SelectItem>
                      <SelectItem value="stj">STJ</SelectItem>
                      <SelectItem value="stf">STF</SelectItem>
                      <SelectItem value="tst">TST</SelectItem>
                      <SelectItem value="administrativa">Administrativa</SelectItem>
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
                      <SelectItem value="ordinario">Ordinário</SelectItem>
                      <SelectItem value="sumario">Sumário</SelectItem>
                      <SelectItem value="especial">Especial</SelectItem>
                      <SelectItem value="sumarissimo">Sumaríssimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="valor_causa">Valor da Causa</Label>
                  <Input
                    id="valor_causa"
                    placeholder="R$ 0,00"
                    value={valorCausaFormatado}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value)
                      setValorCausaFormatado(formatted)
                      const numValue = parseCurrencyToNumber(formatted)
                      updateField('valor_causa', numValue > 0 ? numValue.toString() : '')
                    }}
                  />
                </div>

                {/* Linha 4: Índice Correção + Objeto da Ação */}
                <div>
                  <Label htmlFor="indice_correcao">Índice Correção</Label>
                  <Select
                    value={formData.indice_correcao}
                    onValueChange={(v) => updateField('indice_correcao', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Automático" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático</SelectItem>
                      <SelectItem value="INPC">INPC</SelectItem>
                      <SelectItem value="IPCA">IPCA</SelectItem>
                      <SelectItem value="IPCA-E">IPCA-E</SelectItem>
                      <SelectItem value="IGP-M">IGP-M</SelectItem>
                      <SelectItem value="SELIC">SELIC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="objeto_acao">Objeto da Ação</Label>
                  <Textarea
                    id="objeto_acao"
                    placeholder="Resumo do pedido..."
                    value={formData.objeto_acao}
                    onChange={(e) => updateField('objeto_acao', e.target.value)}
                    rows={1}
                    className="min-h-[38px] resize-none"
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

                  {/* Cliente selecionado */}
                  {formData.cliente_id ? (
                    <div className="relative bg-white border border-slate-200 rounded-lg p-3 pr-8 hover:border-slate-300 transition-colors mt-1">
                      <div className="text-sm font-semibold text-[#34495e]">
                        {clientes.find(c => c.id === formData.cliente_id)?.nome_completo || 'Cliente selecionado'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {clientes.find(c => c.id === formData.cliente_id)?.tipo_pessoa === 'juridica' ? 'Pessoa Juridica' : 'Pessoa Fisica'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleClienteChange('')
                          setClienteSearch('')
                        }}
                        className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                        title="Remover cliente"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {/* Input de busca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          value={clienteSearch}
                          onChange={(e) => setClienteSearch(e.target.value)}
                          placeholder="Buscar cliente por nome..."
                          className="pl-10 text-sm border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]"
                          autoFocus
                        />
                      </div>

                      {/* Botao criar novo cliente */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-8 text-[#34495e] hover:bg-slate-100 mt-1.5"
                        onClick={() => setPessoaModalOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Criar novo cliente
                      </Button>

                      {/* Lista de resultados - so aparece a partir de 3 letras */}
                      {clienteSearch.length >= 3 && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-sm max-h-64 overflow-y-auto">
                          {loadingClientes ? (
                            <div className="flex items-center justify-center gap-2 p-5 text-sm text-slate-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Buscando clientes...</span>
                            </div>
                          ) : clientes.length === 0 ? (
                            <div className="p-5 text-center">
                              <Search className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                              <p className="text-sm text-slate-400">Nenhum cliente encontrado</p>
                              <p className="text-[11px] text-slate-300 mt-1">Tente outro termo ou crie um novo cliente</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3 text-xs h-8 text-[#34495e]"
                                onClick={() => setPessoaModalOpen(true)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Criar novo cliente
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                {clientes.length} resultado{clientes.length !== 1 ? 's' : ''}
                              </div>
                              {clientes.map((cliente) => (
                                <button
                                  key={cliente.id}
                                  type="button"
                                  onClick={() => {
                                    handleClienteChange(cliente.id)
                                    setClienteSearch('')
                                  }}
                                  className="w-full text-left px-3 py-2.5 hover:bg-[#89bcbe]/8 transition-colors border-b border-slate-100 last:border-0"
                                >
                                  <div className="text-sm font-medium text-[#34495e]">
                                    {cliente.nome_completo}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {cliente.tipo_pessoa === 'juridica' ? 'Pessoa Juridica' : 'Pessoa Fisica'}
                                  </div>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                      <SelectValue placeholder={loadingMembros ? "Carregando..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {membros.length === 0 && !loadingMembros && (
                        <div className="px-2 py-1.5 text-sm text-slate-500">Nenhum membro encontrado</div>
                      )}
                      {membros.map((membro) => (
                        <SelectItem key={membro.id} value={membro.id}>
                          {membro.nome_completo}
                          <span className="ml-2 text-xs text-slate-400">
                            ({membro.role === 'owner' ? 'Proprietário' :
                              membro.role === 'admin' ? 'Admin' :
                              membro.role === 'advogado' ? 'Advogado' :
                              membro.role === 'assistente' ? 'Assistente' : 'Membro'})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contrato de Honorários */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#34495e]" />
                      <span className="text-sm font-medium text-[#34495e]">Contrato de Honorários</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-[#34495e] hover:bg-slate-200"
                      onClick={() => setContratoModalOpen(true)}
                      disabled={!formData.cliente_id}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Novo Contrato
                    </Button>
                  </div>

                  {!formData.cliente_id ? (
                    <p className="text-xs text-slate-500">Selecione um cliente primeiro (Etapa 2)</p>
                  ) : loadingContratos ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Carregando contratos...</span>
                    </div>
                  ) : contratos.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      <p>Nenhum contrato encontrado para este cliente.</p>
                      <p className="mt-1">Crie um novo contrato ou prossiga sem vínculo.</p>
                    </div>
                  ) : (
                    <>
                      <Select value={formData.contrato_id} onValueChange={handleContratoChange}>
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

                      {/* Preview do contrato */}
                      {contratoSelecionado && (
                        <div className="flex flex-wrap items-center gap-1.5 px-1 mt-1">
                          {contratoSelecionado.formas_disponiveis.map((f) => (
                            <Badge key={f.forma_cobranca} variant="outline" className="text-[10px] h-5 font-normal text-slate-600">
                              {FORMA_COBRANCA_LABELS[f.forma_cobranca] || f.forma_cobranca}
                            </Badge>
                          ))}
                          {contratoSelecionado.valor_fixo && (
                            <span className="text-[10px] text-slate-400 ml-1">{formatarValor(contratoSelecionado.valor_fixo)}</span>
                          )}
                          {contratoSelecionado.valor_hora && (
                            <span className="text-[10px] text-slate-400 ml-1">{formatarValor(contratoSelecionado.valor_hora)}/h</span>
                          )}
                        </div>
                      )}

                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="provisao_perda">Provisão de Perda</Label>
                  <Select value={formData.provisao_perda} onValueChange={(v) => updateField('provisao_perda', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a probabilidade..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remota">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Remota
                        </div>
                      </SelectItem>
                      <SelectItem value="possivel">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Possível
                        </div>
                      </SelectItem>
                      <SelectItem value="provavel">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Provável
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Classificação do risco de perda para fins de provisão contábil
                  </p>
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

          {/* Step 5: Revisão Final */}
          {currentStep === 5 && (
            <>
              <div className="space-y-2">
                <p className="text-xs text-[#46627f] font-medium mb-3">
                  {isEditMode ? 'Confira os dados antes de salvar as alterações' : 'Confira os dados antes de criar o processo'}
                </p>

                {/* Grid 2x2 com todas as seções */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Dados Básicos */}
                  <div className="border rounded p-2 space-y-1">
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Dados Básicos</h4>
                    <div className="text-xs space-y-0.5">
                      {formData.numero_cnj && (
                        <p><span className="text-slate-500">CNJ:</span> <span className="font-medium">{formData.numero_cnj}</span></p>
                      )}
                      <p><span className="text-slate-500">Área:</span> <span className="font-medium">{AREA_JURIDICA_LABELS[formData.area as keyof typeof AREA_JURIDICA_LABELS] || formData.area || '-'}</span></p>
                      <p><span className="text-slate-500">Fase:</span> <span className="font-medium capitalize">{formData.fase}</span></p>
                      {valorCausaFormatado && (
                        <p><span className="text-slate-500">Valor:</span> <span className="font-medium">{valorCausaFormatado}</span></p>
                      )}
                    </div>
                  </div>

                  {/* Partes */}
                  <div className="border rounded p-2 space-y-1">
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Partes</h4>
                    <div className="text-xs space-y-0.5">
                      <p><span className="text-slate-500">Cliente:</span> <span className="font-medium">{clientes.find(c => c.id === formData.cliente_id)?.nome_completo || '-'}</span></p>
                      <p><span className="text-slate-500">Polo:</span> <span className="font-medium">{formData.polo_cliente === 'ativo' ? 'Autor' : formData.polo_cliente === 'passivo' ? 'Réu' : 'Terceiro'}</span></p>
                      {formData.parte_contraria && (
                        <p><span className="text-slate-500">Contrária:</span> <span className="font-medium">{formData.parte_contraria}</span></p>
                      )}
                    </div>
                  </div>

                  {/* Localização */}
                  <div className="border rounded p-2 space-y-1">
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Localização</h4>
                    <div className="text-xs space-y-0.5">
                      <p><span className="text-slate-500">Tribunal:</span> <span className="font-medium">{formData.tribunal || '-'}</span></p>
                      {formData.comarca && (
                        <p><span className="text-slate-500">Comarca:</span> <span className="font-medium">{formData.comarca}</span></p>
                      )}
                      {formData.vara && (
                        <p><span className="text-slate-500">Vara:</span> <span className="font-medium">{formData.vara}</span></p>
                      )}
                    </div>
                  </div>

                  {/* Gestão */}
                  <div className="border rounded p-2 space-y-1">
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Gestão</h4>
                    <div className="text-xs space-y-0.5">
                      <p><span className="text-slate-500">Responsável:</span> <span className="font-medium">{membros.find(m => m.id === formData.responsavel_id)?.nome_completo || '-'}</span></p>
                      {contratoSelecionado && (
                        <p><span className="text-slate-500">Contrato:</span> <span className="font-medium">{contratoSelecionado.titulo}</span></p>
                      )}
                      {formData.provisao_perda && (
                        <p className="flex items-center gap-1">
                          <span className="text-slate-500">Risco:</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            formData.provisao_perda === 'remota' ? 'bg-emerald-500' :
                            formData.provisao_perda === 'possivel' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium">{formData.provisao_perda === 'remota' ? 'Remota' : formData.provisao_perda === 'possivel' ? 'Possível' : 'Provável'}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações - só se tiver */}
                {formData.observacoes && (
                  <div className="border rounded p-2 mt-1">
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Observações</h4>
                    <p className="text-xs text-slate-600">{formData.observacoes.substring(0, 150)}{formData.observacoes.length > 150 ? '...' : ''}</p>
                  </div>
                )}
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
            Passo {currentStep} de {totalSteps}
          </div>

          {currentStep < totalSteps ? (
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
              {loading ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Processo'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal para criar novo cliente */}
    <PessoaWizardModal
      open={pessoaModalOpen}
      onOpenChange={setPessoaModalOpen}
      onSave={async (data) => {
        try {
          // Buscar escritorio_id do usuario logado
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Usuario nao autenticado')

          const { data: profile } = await supabase
            .from('profiles')
            .select('escritorio_id')
            .eq('id', user.id)
            .single()

          if (!profile?.escritorio_id) throw new Error('Escritorio nao encontrado')

          // Verificar se CPF/CNPJ ja existe no mesmo escritorio
          if (data.cpf_cnpj) {
            const cpfCnpjLimpo = data.cpf_cnpj.replace(/\D/g, '')
            if (cpfCnpjLimpo.length >= 11) {
              const { data: existente } = await supabase
                .from('crm_pessoas')
                .select('id, nome_completo')
                .eq('escritorio_id', profile.escritorio_id)
                .eq('cpf_cnpj', data.cpf_cnpj)
                .maybeSingle()

              if (existente) {
                throw new Error(`Ja existe uma pessoa com este CPF/CNPJ: ${existente.nome_completo}`)
              }
            }
          }

          const insertData = {
            escritorio_id: profile.escritorio_id,
            tipo_pessoa: data.tipo_pessoa,
            tipo_cadastro: data.tipo_cadastro || 'cliente',
            status: data.status || 'ativo',
            nome_completo: data.nome_completo,
            nome_fantasia: data.nome_fantasia || null,
            cpf_cnpj: data.cpf_cnpj || null,
            telefone: data.telefone || null,
            email: data.email || null,
            cep: data.cep || null,
            logradouro: data.logradouro || null,
            numero: data.numero || null,
            complemento: data.complemento || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            uf: data.uf || null,
            origem: data.origem || null,
            observacoes: data.observacoes || null,
          }

          const { data: novoCliente, error } = await supabase
            .from('crm_pessoas')
            .insert(insertData)
            .select('id, nome_completo')
            .single()

          if (error) throw error

          toast.success('Cliente criado com sucesso!')

          // Recarregar lista de clientes
          await loadClientes()

          // Selecionar automaticamente o novo cliente
          if (novoCliente) {
            handleClienteChange(novoCliente.id)
          }
        } catch (error: any) {
          console.error('Erro ao criar cliente:', error)
          toast.error(error.message || 'Erro ao criar cliente')
        }
      }}
    />

    {/* Modal para criar novo contrato */}
    <ContratoModal
      open={contratoModalOpen}
      onOpenChange={setContratoModalOpen}
      defaultClienteId={formData.cliente_id}
      onSave={handleSaveContrato}
    />
    </>
  )
}
