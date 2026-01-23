'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  Loader2,
  Search,
  Folders,
  Gavel,
  Users,
  X,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { ContratoHonorario, ContratoFormData, FormaCobranca, ValorPorCargo, AtoContrato } from '@/hooks/useContratosHonorarios'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import { format } from 'date-fns'

interface ContratoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato?: ContratoHonorario | null
  onSave: (data: ContratoFormData) => Promise<string | null | boolean>
  defaultClienteId?: string | null // Para pré-selecionar cliente (vindo de outro módulo)
}

interface Cliente {
  id: string
  nome_completo: string
  cpf_cnpj: string | null
  tipo_pessoa: 'fisica' | 'juridica'
}

const TIPO_SERVICO_OPTIONS = [
  { value: 'processo', label: 'Processo Judicial', description: 'Representação em processo judicial' },
  { value: 'consultoria', label: 'Consultoria', description: 'Consultoria jurídica avulsa ou recorrente' },
  { value: 'avulso', label: 'Serviço Avulso', description: 'Serviço único sem vínculo processual' },
  { value: 'misto', label: 'Misto', description: 'Combinação de serviços' },
]

const FORMA_COBRANCA_OPTIONS = [
  { value: 'fixo', label: 'Valor Fixo', description: 'Valor único ou parcelado', icon: DollarSign },
  { value: 'por_cargo', label: 'Por Cargo/Timesheet', description: 'Valor hora por cargo (sênior, pleno, etc)', icon: Users },
  { value: 'por_pasta', label: 'Por Pasta Mensal', description: 'Valor fixo × número de processos', icon: Folders },
  { value: 'por_ato', label: 'Por Ato Processual', description: '% do valor da causa por ato', icon: Gavel },
]

const AREAS_JURIDICAS = [
  { value: 'civel', label: 'Cível' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'tributaria', label: 'Tributária' },
  { value: 'familia', label: 'Família' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'previdenciaria', label: 'Previdenciária' },
  { value: 'consumidor', label: 'Consumidor' },
]


export function ContratoModal({ open, onOpenChange, contrato, onSave, defaultClienteId }: ContratoModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Estados do formulário
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [searchCliente, setSearchCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)

  // Estados para novos tipos de cobrança
  const [cargos, setCargos] = useState<Array<{
    id: string
    nome: string
    nome_display: string
    nivel: number
    cor: string | null
    valor_hora_padrao: number | null
  }>>([])
  const [loadingCargos, setLoadingCargos] = useState(false)
  const [atosTipos, setAtosTipos] = useState<Array<{
    id: string
    codigo: string
    nome: string
    percentual_padrao: number | null
    valor_fixo_padrao: number | null
  }>>([])
  const [loadingAtos, setLoadingAtos] = useState(false)

  // Estados para multi-escritório (grupo)
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [loadingEscritorios, setLoadingEscritorios] = useState(false)

  // Dados do formulário
  const [formData, setFormData] = useState<ContratoFormData>({
    cliente_id: '',
    titulo: '',
    tipo_servico: 'processo',
    forma_cobranca: 'fixo',
    formas_selecionadas: ['fixo'], // Múltiplas formas
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: '',
    observacoes: '',
    valor_fixo: undefined,
    valor_hora: undefined,
    horas_estimadas: undefined,
    etapas_valores: {},
    percentual_exito: undefined,
    valor_minimo_exito: undefined,
    // Novos campos
    valor_por_processo: undefined,
    dia_cobranca: undefined,
    valores_por_cargo: [],
    area_juridica: 'civel',
    atos_configurados: [],
    escritorio_id: undefined, // Escritório faturador (para multi-escritório)
  })

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  // Carregar dados do contrato se estiver editando
  useEffect(() => {
    const loadContratoData = async () => {
      if (contrato) {
        // Buscar contrato com campos JSONB
        const { data: contratoData } = await supabase
          .from('financeiro_contratos_honorarios')
          .select('formas_pagamento, config')
          .eq('id', contrato.id)
          .single()

        // Extrair formas de cobrança do JSONB
        const formasPagamento = (contratoData?.formas_pagamento || []) as Array<{ forma: string }>
        const formasValidas = ['fixo', 'por_cargo', 'por_pasta', 'por_ato']
        const formasSelecionadas = formasPagamento.length > 0
          ? formasPagamento.map(f => f.forma).filter(f => formasValidas.includes(f))
          : [contrato.forma_cobranca].filter(f => formasValidas.includes(f))

        // Extrair config do JSONB
        const configJsonb = (contratoData?.config || {}) as Record<string, unknown>

        // Extrair valores por cargo do JSONB config
        let valoresPorCargo: ValorPorCargo[] = []
        if (formasSelecionadas.includes('por_cargo') && configJsonb.valores_por_cargo) {
          const cargosData = configJsonb.valores_por_cargo as Array<{
            cargo_id: string
            cargo_nome?: string
            valor_negociado?: number
          }>
          valoresPorCargo = cargosData.map(c => ({
            cargo_id: c.cargo_id,
            cargo_nome: c.cargo_nome || '',
            valor_padrao: undefined,
            valor_negociado: c.valor_negociado,
          }))
        }

        // Extrair atos configurados do JSONB config
        let atosConfigurados: AtoContrato[] = []
        if (formasSelecionadas.includes('por_ato') && configJsonb.atos_configurados) {
          const atosData = configJsonb.atos_configurados as Array<{
            ato_tipo_id: string
            ato_nome?: string
            percentual_valor_causa?: number
            valor_fixo?: number
          }>
          atosConfigurados = atosData.map(a => ({
            ato_tipo_id: a.ato_tipo_id,
            ato_nome: a.ato_nome || '',
            percentual_valor_causa: a.percentual_valor_causa || undefined,
            valor_fixo: a.valor_fixo || undefined,
          }))
        }

        // Config de pasta vem do JSONB
        const valorPorProcesso = configJsonb.valor_por_processo as number | undefined
        const diaCobranca = configJsonb.dia_cobranca as number | undefined

        setFormData({
          cliente_id: contrato.cliente_id,
          titulo: contrato.titulo || '',
          tipo_servico: contrato.tipo_servico,
          forma_cobranca: contrato.forma_cobranca,
          formas_selecionadas: formasSelecionadas,
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim || '',
          observacoes: contrato.observacoes || '',
          valor_fixo: (configJsonb.valor_fixo as number) || undefined,
          valor_hora: (configJsonb.valor_hora as number) || undefined,
          horas_estimadas: (configJsonb.horas_estimadas as number) || undefined,
          etapas_valores: (configJsonb.etapas_valores as Record<string, number>) || {},
          percentual_exito: (configJsonb.percentual_exito as number) || undefined,
          valor_minimo_exito: (configJsonb.valor_minimo_exito as number) || undefined,
          valor_por_processo: valorPorProcesso || undefined,
          dia_cobranca: diaCobranca || undefined,
          valores_por_cargo: valoresPorCargo,
          atos_configurados: atosConfigurados,
        })
        setSelectedCliente({
          id: contrato.cliente_id,
          nome_completo: contrato.cliente_nome || '',
          cpf_cnpj: null,
          tipo_pessoa: 'fisica',
        })
        setStep(1)
      } else {
        // Reset form para novo contrato
        setFormData({
          cliente_id: '',
          titulo: '',
          tipo_servico: 'processo',
          forma_cobranca: 'fixo',
          formas_selecionadas: [],
          data_inicio: format(new Date(), 'yyyy-MM-dd'),
          data_fim: '',
          observacoes: '',
          valor_fixo: undefined,
          valor_hora: undefined,
          horas_estimadas: undefined,
          etapas_valores: {},
          percentual_exito: undefined,
          valor_minimo_exito: undefined,
          // Campos para por_cargo e por_ato
          valores_por_cargo: [],
          area_juridica: 'civel',
          atos_configurados: [],
        })
        setSelectedCliente(null)
        setStep(1)
      }
    }

    if (open) {
      loadContratoData()
    }
  }, [contrato, open, supabase])

  // Pré-selecionar cliente quando defaultClienteId for fornecido
  useEffect(() => {
    const loadDefaultCliente = async () => {
      if (!defaultClienteId || !open || contrato) return

      try {
        const { data, error } = await supabase
          .from('crm_pessoas')
          .select('id, nome_completo, cpf_cnpj, tipo_pessoa')
          .eq('id', defaultClienteId)
          .single()

        if (error) throw error
        if (data) {
          setSelectedCliente(data)
          setFormData((prev) => ({ ...prev, cliente_id: data.id }))
        }
      } catch (error) {
        console.error('Erro ao carregar cliente padrão:', error)
      }
    }

    loadDefaultCliente()
  }, [defaultClienteId, open, contrato, supabase])

  // Carregar escritórios do grupo (para multi-escritório)
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      if (!open) return

      setLoadingEscritorios(true)
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)

        // Se não tem escritório_id definido e tem escritório ativo, usar o ativo
        if (!formData.escritorio_id && escritorioAtivo) {
          setFormData(prev => ({ ...prev, escritorio_id: escritorioAtivo }))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      } finally {
        setLoadingEscritorios(false)
      }
    }

    loadEscritoriosGrupo()
  }, [open, escritorioAtivo])

  // Buscar clientes do CRM
  const searchClientes = async (query: string) => {
    if (!escritorioAtivo || query.length < 2) {
      setClientes([])
      return
    }

    setLoadingClientes(true)
    try {
      const { data, error } = await supabase
        .from('crm_pessoas')
        .select('id, nome_completo, cpf_cnpj, tipo_pessoa')
        .eq('escritorio_id', escritorioAtivo)
        .eq('tipo_contato', 'cliente')
        .or(`nome_completo.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
        .order('nome_completo', { ascending: true })
        .limit(10)

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setLoadingClientes(false)
    }
  }

  // Debounce na busca de clientes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchCliente.length >= 2) {
        searchClientes(searchCliente)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchCliente])

  // Carregar cargos do escritório
  const loadCargos = async () => {
    if (!escritorioAtivo) return

    setLoadingCargos(true)
    try {
      const { data, error } = await supabase
        .from('escritorios_cargos')
        .select('id, nome, nome_display, nivel, cor, valor_hora_padrao')
        .eq('escritorio_id', escritorioAtivo)
        .eq('ativo', true)
        .order('nivel', { ascending: true })

      if (error) throw error
      setCargos(data || [])

      if (data) {
        // Pegar valores já salvos (se for edição)
        const valoresExistentes = formData.valores_por_cargo || []

        // Mesclar cargos do escritório com valores existentes
        const valoresCargo: ValorPorCargo[] = data.map((c) => {
          // Procurar se já existe valor salvo para este cargo
          const existente = valoresExistentes.find(v => v.cargo_id === c.id)
          return {
            cargo_id: c.id,
            cargo_nome: c.nome_display,
            valor_padrao: c.valor_hora_padrao,
            valor_negociado: existente?.valor_negociado ?? null,
          }
        })
        setFormData((prev) => ({ ...prev, valores_por_cargo: valoresCargo }))
      }
    } catch (error) {
      console.error('Erro ao buscar cargos:', error)
    } finally {
      setLoadingCargos(false)
    }
  }

  // Carregar atos processuais por área jurídica
  const loadAtos = async (area: string) => {
    if (!escritorioAtivo) return

    setLoadingAtos(true)
    try {
      const { data, error } = await supabase
        .from('financeiro_atos_processuais_tipos')
        .select('id, codigo, nome, percentual_padrao, valor_fixo_padrao')
        .eq('escritorio_id', escritorioAtivo)
        .eq('area_juridica', area)
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (error) throw error
      setAtosTipos(data || [])

      if (data) {
        // Pegar valores já salvos (se for edição)
        const atosExistentes = formData.atos_configurados || []

        // Mesclar atos do escritório com valores existentes
        const atosConfig: AtoContrato[] = data.map((a) => {
          // Procurar se já existe configuração para este ato
          const existente = atosExistentes.find(e => e.ato_tipo_id === a.id)
          return {
            ato_tipo_id: a.id,
            ato_nome: a.nome,
            percentual_valor_causa: existente?.percentual_valor_causa ?? a.percentual_padrao ?? undefined,
            valor_fixo: existente?.valor_fixo ?? a.valor_fixo_padrao ?? undefined,
            ativo: existente ? true : true, // Por padrão todos vêm ativos
          }
        })
        setFormData((prev) => ({ ...prev, atos_configurados: atosConfig }))
      }
    } catch (error) {
      console.error('Erro ao buscar atos processuais:', error)
    } finally {
      setLoadingAtos(false)
    }
  }

  // Carregar cargos quando necessário
  useEffect(() => {
    const formas = formData.formas_selecionadas || []
    if (open && escritorioAtivo && formas.includes('por_cargo')) {
      loadCargos()
    }
  }, [open, escritorioAtivo, JSON.stringify(formData.formas_selecionadas)])

  // Carregar atos quando por_ato for selecionado ou área mudar
  useEffect(() => {
    const formas = formData.formas_selecionadas || []
    if (open && escritorioAtivo && formas.includes('por_ato')) {
      const area = formData.area_juridica || 'civel'
      loadAtos(area)
    }
  }, [open, escritorioAtivo, JSON.stringify(formData.formas_selecionadas), formData.area_juridica])

  // Handler para salvar
  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await onSave(formData)
      if (result) {
        onOpenChange(false)
      }
    } finally {
      setSaving(false)
    }
  }

  // Validação por step
  const canProceed = () => {
    const formas = formData.formas_selecionadas || []
    switch (step) {
      case 1:
        return formData.cliente_id !== ''
      case 2:
        return Boolean(formData.tipo_servico) && formas.length > 0
      case 3:
        // Valida que pelo menos uma forma selecionada tem valor configurado
        let hasValidValue = false

        if (formas.includes('fixo') && (formData.valor_fixo || 0) > 0) {
          hasValidValue = true
        }
        if (formas.includes('por_pasta') && (formData.valor_por_processo || 0) > 0) {
          hasValidValue = true
        }
        if (formas.includes('por_cargo')) {
          const valores = formData.valores_por_cargo || []
          if (valores.some((v) => (v.valor_padrao || v.valor_negociado || 0) > 0)) {
            hasValidValue = true
          }
        }
        if (formas.includes('por_ato')) {
          const atos = formData.atos_configurados || []
          if (atos.some((a) => (a.percentual_valor_causa || a.valor_fixo || 0) > 0)) {
            hasValidValue = true
          }
        }
        return hasValidValue || formas.length === 0
      default:
        return true
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const calcularValorTotal = () => {
    let total = 0
    if (formData.valor_fixo) total += formData.valor_fixo
    return total
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <FileText className="h-5 w-5 text-[#89bcbe]" />
            {contrato ? 'Editar Contrato' : 'Novo Contrato de Honorários'}
          </DialogTitle>
          <DialogDescription>
            {contrato
              ? `Editando contrato ${contrato.numero_contrato}`
              : 'Preencha os dados para criar um novo contrato'}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s
                    ? 'bg-[#89bcbe] text-white'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-1',
                    step > s ? 'bg-[#89bcbe]' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-slate-500 mb-4">
          {step === 1 && 'Selecione o Cliente'}
          {step === 2 && 'Tipo de Serviço'}
          {step === 3 && 'Valores'}
          {step === 4 && 'Revisão'}
        </div>

        <Separator />

        {/* Step 1: Seleção de Cliente */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Buscar Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Digite o nome do cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loadingClientes && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#89bcbe]" />
              </div>
            )}

            {!loadingClientes && clientes.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {clientes.map((cliente) => (
                  <Card
                    key={cliente.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-slate-50',
                      formData.cliente_id === cliente.id && 'border-[#89bcbe] bg-[#f0f9f9]'
                    )}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, cliente_id: cliente.id }))
                      setSelectedCliente(cliente)
                    }}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#89bcbe]/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-[#89bcbe]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#34495e]">{cliente.nome_completo}</p>
                          <p className="text-xs text-slate-500">
                            {cliente.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                            {cliente.cpf_cnpj && ` - ${cliente.cpf_cnpj}`}
                          </p>
                        </div>
                      </div>
                      {formData.cliente_id === cliente.id && (
                        <CheckCircle className="h-5 w-5 text-[#89bcbe]" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loadingClientes && searchCliente.length >= 2 && clientes.length === 0 && (
              <p className="text-center text-slate-500 py-4">Nenhum cliente encontrado</p>
            )}

            {selectedCliente && (
              <Card className="bg-[#f0f9f9]/50 border-[#89bcbe]/30">
                <CardContent className="p-3">
                  <p className="text-xs text-slate-500 mb-1">Cliente selecionado:</p>
                  <p className="font-medium text-[#34495e]">{selectedCliente.nome_completo}</p>
                </CardContent>
              </Card>
            )}

            {/* Campo de Título do Contrato */}
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Contrato</Label>
              <Input
                id="titulo"
                placeholder="Ex: Ação Trabalhista - Rescisão Indireta"
                value={formData.titulo || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                }
              />
              <p className="text-xs text-slate-500">
                Título de referência para identificar o contrato (opcional)
              </p>
            </div>

            {/* Seleção de Escritório Faturador (só aparece se tem mais de 1 no grupo) */}
            {escritoriosGrupo.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="escritorio_faturador" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#89bcbe]" />
                  Escritório Faturador
                </Label>
                <Select
                  value={formData.escritorio_id || escritorioAtivo || ''}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, escritorio_id: value }))
                  }
                >
                  <SelectTrigger id="escritorio_faturador">
                    <SelectValue placeholder="Selecione o escritório" />
                  </SelectTrigger>
                  <SelectContent>
                    {escritoriosGrupo.map((esc) => (
                      <SelectItem key={esc.id} value={esc.id}>
                        <div className="flex items-center gap-2">
                          <span>{esc.nome}</span>
                          {esc.cnpj && (
                            <span className="text-xs text-slate-400">
                              ({esc.cnpj})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Selecione qual CNPJ será usado para faturar este contrato
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Tipo de Serviço e Forma de Cobrança */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Tipo de Serviço</Label>
              <div className="grid grid-cols-4 gap-2">
                {TIPO_SERVICO_OPTIONS.map((option) => (
                  <Card
                    key={option.value}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-slate-50',
                      formData.tipo_servico === option.value &&
                        'border-[#89bcbe] bg-[#f0f9f9]'
                    )}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tipo_servico: option.value as ContratoFormData['tipo_servico'],
                      }))
                    }
                  >
                    <CardContent className="p-2 text-center">
                      <p className="font-medium text-xs text-[#34495e]">{option.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label>Formas de Cobrança</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione uma ou mais formas de cobrança disponíveis para este contrato
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FORMA_COBRANCA_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = (formData.formas_selecionadas || []).includes(option.value)
                  return (
                    <Card
                      key={option.value}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-slate-50 relative',
                        isSelected && 'border-[#89bcbe] bg-[#f0f9f9]'
                      )}
                      onClick={() => {
                        const formas = formData.formas_selecionadas || []
                        const newFormas = isSelected
                          ? formas.filter((f) => f !== option.value)
                          : [...formas, option.value]
                        // Atualiza forma_cobranca para a primeira selecionada (para compatibilidade)
                        const primaryForma = newFormas[0] || 'fixo'
                        setFormData((prev) => ({
                          ...prev,
                          formas_selecionadas: newFormas,
                          forma_cobranca: primaryForma as ContratoFormData['forma_cobranca'],
                        }))
                      }}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="absolute top-2 right-2">
                          <Checkbox
                            checked={isSelected}
                            className="data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                          />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-[#89bcbe]/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-[#89bcbe]" />
                        </div>
                        <div className="pr-6">
                          <p className="font-medium text-sm text-[#34495e]">{option.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              {(formData.formas_selecionadas || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(formData.formas_selecionadas || []).map((forma) => {
                    const opt = FORMA_COBRANCA_OPTIONS.find((o) => o.value === forma)
                    return (
                      <Badge key={forma} variant="secondary" className="text-xs">
                        {opt?.label || forma}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data_inicio: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Término (opcional)</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data_fim: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Valores */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            {/* Grid para Valor Fixo e Por Pasta lado a lado */}
            {((formData.formas_selecionadas || []).includes('fixo') || (formData.formas_selecionadas || []).includes('por_pasta')) && (
              <div className="grid grid-cols-2 gap-4">
                {/* Valor Fixo */}
                {(formData.formas_selecionadas || []).includes('fixo') && (
                  <Card>
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#89bcbe]" />
                        Valor Fixo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <Label htmlFor="valor_fixo" className="text-xs">Valor Total (R$)</Label>
                      <Input
                        id="valor_fixo"
                        type="number"
                        placeholder="0,00"
                        value={formData.valor_fixo || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            valor_fixo: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        className="mt-1"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Por Pasta Mensal */}
                {(formData.formas_selecionadas || []).includes('por_pasta') && (
                  <Card>
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Folders className="h-4 w-4 text-[#89bcbe]" />
                        Por Pasta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="valor_por_processo" className="text-xs">R$/Processo</Label>
                          <Input
                            id="valor_por_processo"
                            type="number"
                            placeholder="0,00"
                            value={formData.valor_por_processo || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                valor_por_processo: e.target.value ? parseFloat(e.target.value) : undefined,
                              }))
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dia_cobranca" className="text-xs">Dia Cobrança</Label>
                          <Select
                            value={formData.dia_cobranca?.toString() || ''}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                dia_cobranca: value ? parseInt(value) : undefined,
                              }))
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((dia) => (
                                <SelectItem key={dia} value={dia.toString()}>
                                  Dia {dia}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Por Cargo/Timesheet - Grid 2 colunas */}
            {(formData.formas_selecionadas || []).includes('por_cargo') && (
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#89bcbe]" />
                    Valores por Cargo (Timesheet)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  {loadingCargos ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-[#89bcbe]" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {formData.valores_por_cargo?.map((valorCargo, index) => (
                        <div key={valorCargo.cargo_id} className="flex items-center gap-2 p-2 rounded bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#34495e] truncate">{valorCargo.cargo_nome}</p>
                            <p className="text-[10px] text-slate-400">
                              Padrão: {valorCargo.valor_padrao ? formatCurrency(valorCargo.valor_padrao) : '—'}
                            </p>
                          </div>
                          <Input
                            type="number"
                            placeholder="R$/h"
                            value={valorCargo.valor_negociado ?? valorCargo.valor_padrao ?? ''}
                            onChange={(e) => {
                              const newValores = [...(formData.valores_por_cargo || [])]
                              newValores[index] = {
                                ...newValores[index],
                                valor_negociado: e.target.value ? parseFloat(e.target.value) : null,
                              }
                              setFormData((prev) => ({ ...prev, valores_por_cargo: newValores }))
                            }}
                            className="h-7 w-24"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Por Ato Processual - Otimizado */}
            {(formData.formas_selecionadas || []).includes('por_ato') && (
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-[#89bcbe]" />
                      Cobrança por Ato Processual
                    </CardTitle>
                    <Select
                      value={formData.area_juridica || 'civel'}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          area_juridica: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                      <SelectContent>
                        {AREAS_JURIDICAS.map((area) => (
                          <SelectItem key={area.value} value={area.value}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {loadingAtos ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-[#89bcbe]" />
                    </div>
                  ) : formData.atos_configurados?.filter(a => a.ativo !== false).length === 0 ? (
                    <div className="text-center py-3 text-slate-500">
                      <p className="text-xs">Nenhum ato cadastrado para esta área</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {formData.atos_configurados?.filter(a => a.ativo !== false).map((ato, index) => {
                        const realIndex = formData.atos_configurados?.findIndex(a => a.ato_tipo_id === ato.ato_tipo_id) ?? index
                        return (
                          <div key={ato.ato_tipo_id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <Input
                                type="text"
                                value={ato.ato_nome || ''}
                                onChange={(e) => {
                                  const newAtos = [...(formData.atos_configurados || [])]
                                  newAtos[realIndex] = {
                                    ...newAtos[realIndex],
                                    ato_nome: e.target.value,
                                  }
                                  setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                                }}
                                placeholder="Nome do ato"
                                className="h-7 text-xs font-medium text-[#34495e] bg-white border border-slate-200 hover:border-[#89bcbe] focus:border-[#89bcbe] px-2 flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                                onClick={() => {
                                  const newAtos = [...(formData.atos_configurados || [])]
                                  newAtos[realIndex] = { ...newAtos[realIndex], ativo: false }
                                  setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="0"
                                  value={ato.percentual_valor_causa || ''}
                                  onChange={(e) => {
                                    const newAtos = [...(formData.atos_configurados || [])]
                                    newAtos[realIndex] = {
                                      ...newAtos[realIndex],
                                      percentual_valor_causa: e.target.value ? parseFloat(e.target.value) : undefined,
                                    }
                                    setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                                  }}
                                  className="h-8 w-20 text-center"
                                />
                                <span className="text-xs text-slate-500">%</span>
                              </div>
                              <span className="text-slate-300">ou</span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">R$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={ato.valor_fixo || ''}
                                  onChange={(e) => {
                                    const newAtos = [...(formData.atos_configurados || [])]
                                    newAtos[realIndex] = {
                                      ...newAtos[realIndex],
                                      valor_fixo: e.target.value ? parseFloat(e.target.value) : undefined,
                                    }
                                    setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                                  }}
                                  className="h-8 w-24"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre o contrato..."
                value={formData.observacoes || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 4: Revisão */}
        {step === 4 && (
          <div className="space-y-4 py-4">
            <Card className="bg-[#f0f9f9]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#34495e]">Resumo do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Cliente</p>
                    <p className="font-medium text-[#34495e]">
                      {selectedCliente?.nome_completo || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tipo de Serviço</p>
                    <Badge variant="outline" className="mt-1">
                      {TIPO_SERVICO_OPTIONS.find((o) => o.value === formData.tipo_servico)?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Formas de Cobrança</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(formData.formas_selecionadas || []).map((forma) => (
                        <Badge key={forma} variant="outline" className="text-xs">
                          {FORMA_COBRANCA_OPTIONS.find((o) => o.value === forma)?.label || forma}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Período</p>
                    <p className="font-medium text-[#34495e]">
                      {formData.data_inicio
                        ? formatBrazilDate(parseDateInBrazil(formData.data_inicio))
                        : '-'}
                      {formData.data_fim && ` até ${formatBrazilDate(parseDateInBrazil(formData.data_fim))}`}
                    </p>
                  </div>
                  {/* Mostrar escritório faturador se tem múltiplos no grupo */}
                  {escritoriosGrupo.length > 1 && (
                    <div>
                      <p className="text-xs text-slate-500">Escritório Faturador</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="h-3.5 w-3.5 text-[#89bcbe]" />
                        <p className="font-medium text-[#34495e]">
                          {escritoriosGrupo.find((e) => e.id === (formData.escritorio_id || escritorioAtivo))?.nome || '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-slate-500 mb-2">Valores Configurados</p>
                  <div className="space-y-1">
                    {formData.valor_fixo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Valor Fixo:</span>
                        <span className="font-medium">{formatCurrency(formData.valor_fixo)}</span>
                      </div>
                    )}
                    {formData.valor_por_processo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Valor por Processo:</span>
                        <span className="font-medium">{formatCurrency(formData.valor_por_processo)}</span>
                      </div>
                    )}
                    {formData.dia_cobranca && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Dia da Cobrança:</span>
                        <span className="font-medium">Dia {formData.dia_cobranca}</span>
                      </div>
                    )}
                    {formData.valores_por_cargo && formData.valores_por_cargo.length > 0 && (formData.formas_selecionadas || []).includes('por_cargo') && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">Valores por Cargo:</p>
                        {formData.valores_por_cargo
                          .filter((v) => v.valor_padrao || v.valor_negociado)
                          .map((v) => (
                            <div key={v.cargo_id} className="flex justify-between text-sm">
                              <span className="text-slate-600">{v.cargo_nome}:</span>
                              <span className="font-medium">
                                {v.valor_negociado
                                  ? `${formatCurrency(v.valor_negociado)} (negociado)`
                                  : v.valor_padrao
                                  ? `${formatCurrency(v.valor_padrao)} (padrão)`
                                  : '—'}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    {formData.atos_configurados && formData.atos_configurados.length > 0 && (formData.formas_selecionadas || []).includes('por_ato') && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">
                          Atos ({AREAS_JURIDICAS.find((a) => a.value === formData.area_juridica)?.label}):
                        </p>
                        {formData.atos_configurados
                          .filter((a) => a.percentual_valor_causa || a.valor_fixo)
                          .map((a) => (
                            <div key={a.ato_tipo_id} className="flex justify-between text-sm">
                              <span className="text-slate-600">{a.ato_nome}:</span>
                              <span className="font-medium">
                                {a.percentual_valor_causa ? `${a.percentual_valor_causa}%` : ''}
                                {a.percentual_valor_causa && a.valor_fixo ? ' ou ' : ''}
                                {a.valor_fixo ? formatCurrency(a.valor_fixo) : ''}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {calcularValorTotal() > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[#34495e]">Valor Total Estimado:</span>
                      <span className="text-xl font-bold text-[#89bcbe]">
                        {formatCurrency(calcularValorTotal())}
                      </span>
                    </div>
                  </>
                )}

                {formData.observacoes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Observações</p>
                      <p className="text-sm text-slate-600">{formData.observacoes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              Voltar
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-[#34495e] hover:bg-[#46627f] text-white shadow-sm"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#34495e] hover:bg-[#46627f] text-white shadow-sm"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contrato ? 'Salvar Alterações' : 'Criar Contrato'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
