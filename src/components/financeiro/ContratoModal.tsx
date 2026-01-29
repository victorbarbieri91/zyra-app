'use client'

import { useState, useEffect, useRef } from 'react'
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
  Clock,
  Plus,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { ContratoHonorario, ContratoFormData, FormaCobranca, ValorPorCargo, AtoContrato, ValorFixoItem, ClienteGrupo, GrupoClientes } from '@/hooks/useContratosHonorarios'
import { AtoConfigCard } from './AtoConfigCard'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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
  { value: 'por_hora', label: 'Por Hora/Timesheet', description: 'Taxa única por hora para toda equipe', icon: Clock },
  { value: 'por_cargo', label: 'Por Cargo/Timesheet', description: 'Valor hora por cargo (sênior, pleno, etc)', icon: Users },
  { value: 'por_pasta', label: 'Por Pasta Mensal', description: 'Valor fixo × número de processos', icon: Folders },
  { value: 'por_ato', label: 'Por Ato Processual', description: 'Por % da causa ou por hora trabalhada', icon: Gavel },
  { value: 'pro_bono', label: 'Pró-Bono', description: 'Sem cobrança - horas registradas para controle', icon: Heart },
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

// Funções de máscara de moeda
const formatCurrencyInput = (value: number | null | undefined): string => {
  if (value === undefined || value === null || value === 0) return ''
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const parseCurrencyInput = (value: string): number => {
  if (!value) return 0
  // Remove tudo exceto números e vírgula/ponto
  const cleaned = value.replace(/[^\d,.-]/g, '')
  // Converte vírgula para ponto e remove pontos de milhar
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : parsed
}

const handleCurrencyChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setValue: (value: number) => void
) => {
  const input = e.target
  const rawValue = input.value

  // Se está vazio, define como 0
  if (!rawValue) {
    setValue(0)
    return
  }

  // Parse o valor e atualiza o estado
  const numericValue = parseCurrencyInput(rawValue)
  setValue(numericValue)
}

export function ContratoModal({ open, onOpenChange, contrato, onSave, defaultClienteId }: ContratoModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Estados do formulário
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [searchCliente, setSearchCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(true)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  // Estados para grupo de clientes (grupo econômico)
  const [searchClienteGrupo, setSearchClienteGrupo] = useState('')
  const [clientesGrupoSearch, setClientesGrupoSearch] = useState<Cliente[]>([])
  const [loadingClientesGrupo, setLoadingClientesGrupo] = useState(false)

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
    // Grupo de clientes (grupo econômico)
    grupo_habilitado: false,
    grupo_clientes: [],
    cliente_pagador_id: undefined,
  })

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  // Carregar dados do contrato se estiver editando
  useEffect(() => {
    const loadContratoData = async () => {
      if (contrato) {
        // Buscar contrato com campos JSONB
        const { data: contratoData } = await supabase
          .from('financeiro_contratos_honorarios')
          .select('formas_pagamento, config, grupo_clientes')
          .eq('id', contrato.id)
          .single()

        // Extrair formas de cobrança do JSONB
        const formasPagamento = (contratoData?.formas_pagamento || []) as Array<{ forma: string }>
        const formasValidas = ['fixo', 'por_hora', 'por_cargo', 'por_pasta', 'por_ato', 'misto']
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

        // Extrair valores fixos múltiplos do JSONB config
        let valoresFixos: ValorFixoItem[] = []
        if (formasSelecionadas.includes('fixo') || formasSelecionadas.includes('misto')) {
          if (configJsonb.valores_fixos) {
            // Formato novo: array de valores fixos
            const valoresData = configJsonb.valores_fixos as Array<{
              id?: string
              descricao: string
              valor: number
              atualizacao_monetaria?: boolean
              atualizacao_indice?: 'ipca' | 'ipca_e' | 'inpc' | 'igpm'
            }>
            valoresFixos = valoresData.map(v => ({
              id: v.id || crypto.randomUUID(),
              descricao: v.descricao || '',
              valor: v.valor || 0,
              atualizacao_monetaria: v.atualizacao_monetaria || false,
              atualizacao_indice: v.atualizacao_indice || 'ipca',
            }))
          } else if (configJsonb.valor_fixo) {
            // Formato antigo: valor único - converter para array para compatibilidade
            const valorAntigo = configJsonb.valor_fixo as number
            const atualizacaoConfig = configJsonb.atualizacao_monetaria as {
              habilitada?: boolean
              indice?: 'ipca' | 'ipca_e' | 'inpc' | 'igpm'
            } | undefined
            valoresFixos = [{
              id: crypto.randomUUID(),
              descricao: 'Valor Fixo',
              valor: valorAntigo,
              atualizacao_monetaria: atualizacaoConfig?.habilitada || false,
              atualizacao_indice: atualizacaoConfig?.indice || 'ipca',
            }]
          }
        }

        // Extrair grupo de clientes do JSONB
        const grupoClientes = contratoData?.grupo_clientes as GrupoClientes | null

        setFormData({
          cliente_id: contrato.cliente_id,
          titulo: contrato.titulo || '',
          tipo_servico: contrato.tipo_servico,
          forma_cobranca: contrato.forma_cobranca,
          formas_selecionadas: formasSelecionadas,
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim || '',
          observacoes: contrato.observacoes || '',
          valores_fixos: valoresFixos.length > 0 ? valoresFixos : undefined,
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
          // Limites mensais
          valor_minimo_mensal: (configJsonb.valor_minimo_mensal as number) || undefined,
          valor_maximo_mensal: (configJsonb.valor_maximo_mensal as number) || undefined,
          // Atualização monetária
          atualizacao_monetaria: (configJsonb.atualizacao_monetaria as { habilitada?: boolean })?.habilitada || false,
          atualizacao_indice: (configJsonb.atualizacao_monetaria as { indice?: 'ipca' | 'ipca_e' | 'inpc' | 'igpm' })?.indice || undefined,
          atualizacao_data_base: (configJsonb.atualizacao_monetaria as { data_base?: string })?.data_base || undefined,
          // Grupo de clientes (grupo econômico)
          grupo_habilitado: grupoClientes?.habilitado || false,
          grupo_clientes: grupoClientes?.clientes || [],
          cliente_pagador_id: grupoClientes?.cliente_pagador_id || undefined,
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
          // Limites mensais
          valor_minimo_mensal: undefined,
          valor_maximo_mensal: undefined,
          // Grupo de clientes
          grupo_habilitado: false,
          grupo_clientes: [],
          cliente_pagador_id: undefined,
        })
        setSelectedCliente(null)
        setSearchClienteGrupo('')
        setClientesGrupoSearch([])
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
        .eq('tipo_cadastro', 'cliente')
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
        setShowSearchResults(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchCliente])

  // Fechar resultados ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Buscar clientes para adicionar ao grupo
  const searchClientesGrupo = async (query: string) => {
    if (!escritorioAtivo || query.length < 2) {
      setClientesGrupoSearch([])
      return
    }

    setLoadingClientesGrupo(true)
    try {
      const { data, error } = await supabase
        .from('crm_pessoas')
        .select('id, nome_completo, cpf_cnpj, tipo_pessoa')
        .eq('escritorio_id', escritorioAtivo)
        .eq('tipo_cadastro', 'cliente')
        .or(`nome_completo.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
        .order('nome_completo', { ascending: true })
        .limit(10)

      if (error) throw error
      // Filtrar clientes já no grupo e o cliente principal
      const clientesNoGrupo = formData.grupo_clientes?.map(c => c.cliente_id) || []
      const clientesFiltrados = (data || []).filter(
        c => c.id !== formData.cliente_id && !clientesNoGrupo.includes(c.id)
      )
      setClientesGrupoSearch(clientesFiltrados)
    } catch (error) {
      console.error('Erro ao buscar clientes para grupo:', error)
    } finally {
      setLoadingClientesGrupo(false)
    }
  }

  // Debounce na busca de clientes do grupo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchClienteGrupo.length >= 2) {
        searchClientesGrupo(searchClienteGrupo)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchClienteGrupo])

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
        // Pró-bono não precisa de valores - pode prosseguir diretamente
        if (formas.includes('pro_bono') && formas.length === 1) {
          return true
        }

        // Valida que pelo menos uma forma selecionada tem valor configurado
        let hasValidValue = false

        if (formas.includes('fixo')) {
          // Verificar valores_fixos (novo) ou valor_fixo (deprecated)
          const temValoresFixos = formData.valores_fixos && formData.valores_fixos.some(v => v.valor > 0)
          const temValorFixo = (formData.valor_fixo || 0) > 0
          if (temValoresFixos || temValorFixo) {
            hasValidValue = true
          }
        }
        if (formas.includes('por_hora') && (formData.valor_hora || 0) > 0) {
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
        // Pró-bono em combinação com outras formas também é válido
        if (formas.includes('pro_bono')) {
          hasValidValue = true
        }

        // Validar min <= max quando ambos são fornecidos
        if (formData.valor_minimo_mensal && formData.valor_maximo_mensal) {
          if (formData.valor_minimo_mensal > formData.valor_maximo_mensal) {
            return false // Inválido: mínimo maior que máximo
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
          <div className="space-y-3 py-4">
            {/* Toggle Único/Grupo - PRIMEIRO */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">Tipo de Contrato</span>
              </div>
              <div className="flex items-center bg-white rounded-md border border-slate-200 p-0.5">
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded transition-colors',
                    !formData.grupo_habilitado
                      ? 'bg-[#89bcbe] text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      grupo_habilitado: false,
                      grupo_clientes: [],
                      cliente_pagador_id: undefined,
                    }))
                    setSelectedCliente(null)
                  }}
                >
                  Cliente Único
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded transition-colors',
                    formData.grupo_habilitado
                      ? 'bg-[#89bcbe] text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      grupo_habilitado: true,
                      grupo_clientes: prev.cliente_id && selectedCliente ? [{
                        cliente_id: prev.cliente_id,
                        nome: selectedCliente.nome_completo,
                      }] : [],
                      cliente_pagador_id: prev.cliente_id || undefined,
                    }))
                  }}
                >
                  Grupo
                </button>
              </div>
            </div>

            {/* Busca de Cliente */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder={formData.grupo_habilitado ? "Buscar clientes para adicionar ao grupo..." : "Buscar cliente..."}
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                className="pl-9 h-9"
              />
            </div>

            {/* Clientes Selecionados (Grupo) */}
            {formData.grupo_habilitado && (formData.grupo_clientes || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#f0f9f9]/50 border border-[#89bcbe]/20">
                {(formData.grupo_clientes || []).map((cliente) => (
                  <Badge
                    key={cliente.cliente_id}
                    variant="secondary"
                    className={cn(
                      'h-6 pl-2 pr-1 gap-1 text-xs font-normal',
                      formData.cliente_pagador_id === cliente.cliente_id
                        ? 'bg-[#89bcbe]/20 text-[#34495e] border border-[#89bcbe]/40'
                        : 'bg-white text-slate-600 border border-slate-200'
                    )}
                  >
                    <span className="truncate max-w-[150px]">{cliente.nome.split(' ').slice(0, 3).join(' ')}</span>
                    <button
                      type="button"
                      className="hover:text-red-500 transition-colors"
                      onClick={() => {
                        const novosClientes = (formData.grupo_clientes || []).filter(
                          (c) => c.cliente_id !== cliente.cliente_id
                        )
                        // Se removeu todos, limpa seleção
                        if (novosClientes.length === 0) {
                          setFormData((prev) => ({
                            ...prev,
                            cliente_id: '',
                            grupo_clientes: [],
                            cliente_pagador_id: undefined,
                          }))
                          setSelectedCliente(null)
                        } else {
                          // Se removeu o pagador, define o primeiro como pagador
                          const novoPagadorId = formData.cliente_pagador_id === cliente.cliente_id
                            ? novosClientes[0].cliente_id
                            : formData.cliente_pagador_id
                          // Se removeu o cliente principal, define o primeiro como principal
                          const novoClienteId = formData.cliente_id === cliente.cliente_id
                            ? novosClientes[0].cliente_id
                            : formData.cliente_id
                          setFormData((prev) => ({
                            ...prev,
                            cliente_id: novoClienteId,
                            grupo_clientes: novosClientes,
                            cliente_pagador_id: novoPagadorId,
                          }))
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {/* Seletor de CNPJ Pagador inline */}
                {(formData.grupo_clientes || []).length > 1 && (
                  <Select
                    value={formData.cliente_pagador_id || ''}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, cliente_pagador_id: value }))
                    }
                  >
                    <SelectTrigger className="h-6 w-auto min-w-[140px] text-[10px] border-dashed bg-white">
                      <span className="text-slate-400 mr-1">Pagador:</span>
                      <SelectValue placeholder="..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.grupo_clientes || []).map((cliente) => (
                        <SelectItem key={cliente.cliente_id} value={cliente.cliente_id} className="text-xs">
                          {cliente.nome.split(' ').slice(0, 3).join(' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Cliente Selecionado (Único) */}
            {!formData.grupo_habilitado && selectedCliente && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f0f9f9]/50 border border-[#89bcbe]/30">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="h-4 w-4 text-[#89bcbe] flex-shrink-0" />
                  <span className="text-sm font-medium text-[#34495e] truncate">{selectedCliente.nome_completo}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {selectedCliente.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, cliente_id: '' }))
                    setSelectedCliente(null)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Loading */}
            {loadingClientes && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-[#89bcbe]" />
              </div>
            )}

            {/* Lista de Resultados - Compacta */}
            {!loadingClientes && clientes.length > 0 && showSearchResults && (
              <div ref={searchResultsRef} className="space-y-1 max-h-[200px] overflow-y-auto border border-slate-200 rounded-md p-1 bg-white">
                {clientes.map((cliente) => {
                  const isSelected = formData.grupo_habilitado
                    ? (formData.grupo_clientes || []).some(c => c.cliente_id === cliente.id)
                    : formData.cliente_id === cliente.id

                  return (
                    <div
                      key={cliente.id}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-[#89bcbe]/10 border border-[#89bcbe]/30'
                          : 'hover:bg-slate-50 border border-transparent'
                      )}
                      onClick={() => {
                        if (formData.grupo_habilitado) {
                          // Modo grupo: toggle seleção
                          const jaNoGrupo = (formData.grupo_clientes || []).some(c => c.cliente_id === cliente.id)
                          if (jaNoGrupo) {
                            // Remover do grupo
                            const novosClientes = (formData.grupo_clientes || []).filter(c => c.cliente_id !== cliente.id)
                            if (novosClientes.length === 0) {
                              setFormData((prev) => ({
                                ...prev,
                                cliente_id: '',
                                grupo_clientes: [],
                                cliente_pagador_id: undefined,
                              }))
                              setSelectedCliente(null)
                            } else {
                              const novoPagadorId = formData.cliente_pagador_id === cliente.id
                                ? novosClientes[0].cliente_id
                                : formData.cliente_pagador_id
                              setFormData((prev) => ({
                                ...prev,
                                cliente_id: novosClientes[0].cliente_id,
                                grupo_clientes: novosClientes,
                                cliente_pagador_id: novoPagadorId,
                              }))
                            }
                          } else {
                            // Adicionar ao grupo
                            const novoCliente: ClienteGrupo = {
                              cliente_id: cliente.id,
                              nome: cliente.nome_completo,
                            }
                            const novosClientes = [...(formData.grupo_clientes || []), novoCliente]
                            setFormData((prev) => ({
                              ...prev,
                              cliente_id: prev.cliente_id || cliente.id,
                              grupo_clientes: novosClientes,
                              cliente_pagador_id: prev.cliente_pagador_id || cliente.id,
                            }))
                            if (!selectedCliente) {
                              setSelectedCliente(cliente)
                            }
                          }
                        } else {
                          // Modo único: seleciona cliente e fecha resultados
                          setFormData((prev) => ({ ...prev, cliente_id: cliente.id }))
                          setSelectedCliente(cliente)
                          setShowSearchResults(false)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-[#34495e] truncate">{cliente.nome_completo}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {cliente.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-[#89bcbe] flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!loadingClientes && searchCliente.length >= 2 && clientes.length === 0 && showSearchResults && (
              <p className="text-center text-slate-400 text-sm py-3">Nenhum cliente encontrado</p>
            )}

            {!loadingClientes && searchCliente.length < 2 && !selectedCliente && (formData.grupo_clientes || []).length === 0 && (
              <p className="text-center text-slate-400 text-xs py-3">Digite ao menos 2 caracteres para buscar</p>
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
            {/* Valores Fixos - seção separada */}
            {(formData.formas_selecionadas || []).includes('fixo') && (
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#89bcbe]" />
                      Valores Fixos
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const novoValor: ValorFixoItem = {
                          id: crypto.randomUUID(),
                          descricao: '',
                          valor: 0,
                          atualizacao_monetaria: false,
                          atualizacao_indice: 'ipca',
                        }
                        setFormData((prev) => ({
                          ...prev,
                          valores_fixos: [...(prev.valores_fixos || []), novoValor],
                        }))
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {(!formData.valores_fixos || formData.valores_fixos.length === 0) ? (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      Clique em "Adicionar" para incluir valores fixos
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.valores_fixos.map((valorFixo, index) => (
                        <div
                          key={valorFixo.id}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] text-slate-500">Descrição</Label>
                                <Input
                                  placeholder="Ex: Inicial, Sentença..."
                                  value={valorFixo.descricao}
                                  onChange={(e) => {
                                    const novosValores = [...(formData.valores_fixos || [])]
                                    novosValores[index] = { ...novosValores[index], descricao: e.target.value }
                                    setFormData((prev) => ({ ...prev, valores_fixos: novosValores }))
                                  }}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-500">Valor (R$)</Label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={formatCurrencyInput(valorFixo.valor)}
                                    onChange={(e) => {
                                      handleCurrencyChange(e, (newValue) => {
                                        const novosValores = [...(formData.valores_fixos || [])]
                                        novosValores[index] = {
                                          ...novosValores[index],
                                          valor: newValue,
                                        }
                                        setFormData((prev) => ({ ...prev, valores_fixos: novosValores }))
                                      })
                                    }}
                                    className="h-8 text-xs pl-8"
                                  />
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 mt-4"
                              onClick={() => {
                                const novosValores = (formData.valores_fixos || []).filter((_, i) => i !== index)
                                setFormData((prev) => ({ ...prev, valores_fixos: novosValores }))
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Atualização Monetária por item */}
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`atualizacao_${valorFixo.id}`}
                                checked={valorFixo.atualizacao_monetaria || false}
                                onCheckedChange={(checked) => {
                                  const novosValores = [...(formData.valores_fixos || [])]
                                  novosValores[index] = {
                                    ...novosValores[index],
                                    atualizacao_monetaria: checked === true,
                                    atualizacao_indice: checked ? (novosValores[index].atualizacao_indice || 'ipca') : undefined,
                                  }
                                  setFormData((prev) => ({ ...prev, valores_fixos: novosValores }))
                                }}
                                className="h-3.5 w-3.5 data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                              />
                              <Label htmlFor={`atualizacao_${valorFixo.id}`} className="text-[10px] cursor-pointer text-slate-500">
                                Atualizar
                              </Label>
                            </div>
                            {valorFixo.atualizacao_monetaria && (
                              <Select
                                value={valorFixo.atualizacao_indice || 'ipca'}
                                onValueChange={(value) => {
                                  const novosValores = [...(formData.valores_fixos || [])]
                                  novosValores[index] = {
                                    ...novosValores[index],
                                    atualizacao_indice: value as 'ipca' | 'ipca_e' | 'inpc' | 'igpm',
                                  }
                                  setFormData((prev) => ({ ...prev, valores_fixos: novosValores }))
                                }}
                              >
                                <SelectTrigger className="h-6 w-24 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ipca">IPCA</SelectItem>
                                  <SelectItem value="ipca_e">IPCA-E</SelectItem>
                                  <SelectItem value="inpc">INPC</SelectItem>
                                  <SelectItem value="igpm">IGP-M</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <CardContent className="pb-3 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="valor_por_processo" className="text-xs">R$/Processo</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                            <Input
                              id="valor_por_processo"
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={formatCurrencyInput(formData.valor_por_processo)}
                              onChange={(e) =>
                                handleCurrencyChange(e, (newValue) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    valor_por_processo: newValue || undefined,
                                  }))
                                )
                              }
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="dia_cobranca" className="text-xs">Dia Cobrança</Label>
                          <Select
                            value={formData.dia_cobranca?.toString() || '1'}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                dia_cobranca: value ? parseInt(value) : 1,
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
                        <div>
                          <Label htmlFor="limite_meses" className="text-xs">Limite Meses</Label>
                          <Input
                            id="limite_meses"
                            type="number"
                            placeholder="24"
                            value={formData.limite_meses || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                limite_meses: e.target.value ? parseInt(e.target.value) : undefined,
                              }))
                            }
                            className="mt-1"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Padrão: 24 meses
                          </p>
                        </div>
                      </div>
                      {/* Mostrar contador de meses se for edição */}
                      {contrato && contrato.config?.meses_cobrados !== undefined && (
                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              Meses já cobrados: <strong className="text-[#34495e]">{contrato.config.meses_cobrados || 0}</strong>
                              {contrato.config.limite_meses && (
                                <span className="text-slate-400"> / {contrato.config.limite_meses}</span>
                              )}
                            </span>
                            {contrato.config.meses_cobrados >= (contrato.config.limite_meses || 24) && (
                              <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">
                                Limite atingido
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
              </Card>
            )}

            {/* Por Hora/Timesheet - Taxa única para toda equipe */}
            {(formData.formas_selecionadas || []).includes('por_hora') && (
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#89bcbe]" />
                    Valor Hora (Taxa Única)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div>
                    <Label htmlFor="valor_hora" className="text-xs">Valor por Hora (R$)</Label>
                    <div className="relative mt-1 max-w-[200px]">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                      <Input
                        id="valor_hora"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={formatCurrencyInput(formData.valor_hora)}
                        onChange={(e) =>
                          handleCurrencyChange(e, (newValue) =>
                            setFormData((prev) => ({
                              ...prev,
                              valor_hora: newValue || undefined,
                            }))
                          )
                        }
                        className="pl-8"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Este valor será aplicado a todas as horas, independente do cargo
                    </p>
                  </div>
                </CardContent>
              </Card>
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
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={formatCurrencyInput(valorCargo.valor_negociado ?? valorCargo.valor_padrao ?? undefined)}
                              onChange={(e) =>
                                handleCurrencyChange(e, (newValue) => {
                                  const newValores = [...(formData.valores_por_cargo || [])]
                                  newValores[index] = {
                                    ...newValores[index],
                                    valor_negociado: newValue || null,
                                  }
                                  setFormData((prev) => ({ ...prev, valores_por_cargo: newValores }))
                                })
                              }
                              className="h-7 w-28 pl-6 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Limites Mensais - para por_hora e por_cargo */}
            {((formData.formas_selecionadas || []).includes('por_hora') ||
              (formData.formas_selecionadas || []).includes('por_cargo')) && (
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#89bcbe]" />
                    Limites Mensais (Opcional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valor_minimo_mensal" className="text-xs">Mínimo Mensal (R$)</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                        <Input
                          id="valor_minimo_mensal"
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={formatCurrencyInput(formData.valor_minimo_mensal)}
                          onChange={(e) =>
                            handleCurrencyChange(e, (newValue) =>
                              setFormData((prev) => ({
                                ...prev,
                                valor_minimo_mensal: newValue || undefined,
                              }))
                            )
                          }
                          className="pl-8"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Piso garantido por mês
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="valor_maximo_mensal" className="text-xs">Máximo Mensal (R$)</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                        <Input
                          id="valor_maximo_mensal"
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={formatCurrencyInput(formData.valor_maximo_mensal)}
                          onChange={(e) =>
                            handleCurrencyChange(e, (newValue) =>
                              setFormData((prev) => ({
                                ...prev,
                                valor_maximo_mensal: newValue || undefined,
                              }))
                            )
                          }
                          className="pl-8"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Teto máximo por mês
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Por Ato Processual - Otimizado */}
            {(formData.formas_selecionadas || []).includes('por_ato') && (
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-[#89bcbe]" />
                        Cobrança por Ato Processual
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          // Determinar modo padrão baseado nos atos existentes
                          const atosAtivos = formData.atos_configurados?.filter(a => a.ativo !== false) || []
                          const modoMaisUsado = atosAtivos.length > 0
                            ? (atosAtivos.filter(a => a.modo_cobranca === 'por_hora').length > atosAtivos.length / 2 ? 'por_hora' : 'percentual')
                            : 'percentual'
                          const novoAto: AtoContrato = {
                            ato_tipo_id: crypto.randomUUID(),
                            ato_nome: '',
                            modo_cobranca: modoMaisUsado as 'percentual' | 'por_hora',
                            percentual_valor_causa: undefined,
                            valor_fixo: undefined,
                            valor_hora: undefined,
                            horas_minimas: undefined,
                            horas_maximas: undefined,
                            ativo: true,
                          }
                          setFormData((prev) => ({
                            ...prev,
                            atos_configurados: [...(prev.atos_configurados || []), novoAto],
                          }))
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                </CardHeader>

                {/* Toggle global de modo de cobrança */}
                <div className="mx-4 mb-2 p-2 bg-slate-50 rounded-md border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] text-slate-500">
                      Modo padrão:
                    </p>
                    <div className="flex gap-0.5 bg-white rounded p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          const newAtos = (formData.atos_configurados || []).map(ato => ({
                            ...ato,
                            modo_cobranca: 'percentual' as const,
                          }))
                          setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[9px] font-medium rounded transition-all",
                          (formData.atos_configurados?.filter(a => a.ativo !== false) || []).every(a => (a.modo_cobranca || 'percentual') === 'percentual')
                            ? "bg-[#34495e] text-white"
                            : "text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        % Causa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newAtos = (formData.atos_configurados || []).map(ato => ({
                            ...ato,
                            modo_cobranca: 'por_hora' as const,
                          }))
                          setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[9px] font-medium rounded transition-all",
                          (formData.atos_configurados?.filter(a => a.ativo !== false) || []).length > 0 &&
                          (formData.atos_configurados?.filter(a => a.ativo !== false) || []).every(a => a.modo_cobranca === 'por_hora')
                            ? "bg-[#34495e] text-white"
                            : "text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        Por Hora
                      </button>
                    </div>
                  </div>
                </div>

                <CardContent className="pt-0 pb-3">
                  {loadingAtos ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#89bcbe]" />
                    </div>
                  ) : formData.atos_configurados?.filter(a => a.ativo !== false).length === 0 ? (
                    <div className="text-center py-3 text-slate-400 text-[10px]">
                      Clique em "Adicionar" para incluir atos processuais
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {formData.atos_configurados?.filter(a => a.ativo !== false).map((ato) => {
                        const realIndex = formData.atos_configurados?.findIndex(a => a.ato_tipo_id === ato.ato_tipo_id) ?? 0
                        return (
                          <AtoConfigCard
                            key={ato.ato_tipo_id}
                            ato={ato}
                            onUpdate={(updates) => {
                              const newAtos = [...(formData.atos_configurados || [])]
                              newAtos[realIndex] = { ...newAtos[realIndex], ...updates }
                              setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                            }}
                            onRemove={() => {
                              const newAtos = [...(formData.atos_configurados || [])]
                              newAtos[realIndex] = { ...newAtos[realIndex], ativo: false }
                              setFormData((prev) => ({ ...prev, atos_configurados: newAtos }))
                            }}
                          />
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pró-Bono - Card informativo */}
            {(formData.formas_selecionadas || []).includes('pro_bono') && (
              <Card className="border-pink-200 bg-pink-50/30">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Contrato Pró-Bono
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-xs text-slate-600">
                    Este contrato não terá cobrança de honorários. As horas registradas serão
                    automaticamente marcadas como <strong>não faturáveis</strong>, permitindo
                    controle interno do tempo dedicado sem gerar cobranças ao cliente.
                  </p>
                  <div className="mt-3 p-2 bg-white rounded border border-pink-100">
                    <p className="text-[10px] text-slate-500 font-medium mb-1">O que você pode fazer:</p>
                    <ul className="text-[10px] text-slate-500 space-y-0.5 list-disc list-inside">
                      <li>Registrar horas de trabalho (timesheet)</li>
                      <li>Registrar despesas (se houver)</li>
                      <li>Acompanhar o histórico de atividades</li>
                    </ul>
                  </div>
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

                {/* Mostrar grupo de clientes se habilitado */}
                {formData.grupo_habilitado && formData.grupo_clientes && formData.grupo_clientes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-[#89bcbe]" />
                        <p className="text-xs text-slate-500">Grupo de Clientes</p>
                      </div>
                      <div className="space-y-1">
                        {formData.grupo_clientes.map((cliente) => (
                          <div key={cliente.cliente_id} className="flex items-center justify-between">
                            <span className="text-sm text-[#34495e]">{cliente.nome}</span>
                            {formData.cliente_pagador_id === cliente.cliente_id && (
                              <Badge variant="outline" className="text-[10px] h-5 bg-[#89bcbe]/10 text-[#46627f] border-[#89bcbe]/30">
                                CNPJ Pagador
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <p className="text-xs text-slate-500 mb-2">Valores Configurados</p>
                  <div className="space-y-1">
                    {/* Valores Fixos Múltiplos */}
                    {formData.valores_fixos && formData.valores_fixos.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-slate-500 mb-1">Valores Fixos:</p>
                        {formData.valores_fixos.filter(v => v.valor > 0).map((vf) => (
                          <div key={vf.id} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {vf.descricao || 'Valor Fixo'}
                              {vf.atualizacao_monetaria && (
                                <span className="text-[10px] text-[#89bcbe] ml-1">
                                  (atualizar por {vf.atualizacao_indice?.toUpperCase()})
                                </span>
                              )}
                            </span>
                            <span className="font-medium">{formatCurrency(vf.valor)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Valor Fixo único (deprecated - compatibilidade) */}
                    {formData.valor_fixo && (!formData.valores_fixos || formData.valores_fixos.length === 0) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Valor Fixo:</span>
                        <span className="font-medium">{formatCurrency(formData.valor_fixo)}</span>
                      </div>
                    )}
                    {formData.valor_hora && (formData.formas_selecionadas || []).includes('por_hora') && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Valor Hora (Taxa Única):</span>
                        <span className="font-medium">{formatCurrency(formData.valor_hora)}/h</span>
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
                          .filter((a) => a.ativo !== false && (a.percentual_valor_causa || a.valor_fixo || a.valor_hora))
                          .map((a) => (
                            <div key={a.ato_tipo_id} className="flex justify-between text-sm">
                              <span className="text-slate-600">{a.ato_nome}:</span>
                              <span className="font-medium">
                                {/* Modo Percentual */}
                                {(a.modo_cobranca || 'percentual') === 'percentual' && (
                                  <>
                                    {a.percentual_valor_causa ? `${a.percentual_valor_causa}%` : ''}
                                    {a.percentual_valor_causa && a.valor_fixo && (
                                      <span className="text-slate-400 text-xs ml-1">(mín: {formatCurrency(a.valor_fixo)})</span>
                                    )}
                                    {!a.percentual_valor_causa && a.valor_fixo ? formatCurrency(a.valor_fixo) : ''}
                                  </>
                                )}
                                {/* Modo Por Hora */}
                                {a.modo_cobranca === 'por_hora' && (
                                  <>
                                    {formatCurrency(a.valor_hora || 0)}/h
                                    {(a.horas_minimas || a.horas_maximas) && (
                                      <span className="text-slate-400 text-xs ml-1">
                                        ({a.horas_minimas ? `${a.horas_minimas}h` : ''}
                                        {a.horas_minimas && a.horas_maximas ? '-' : ''}
                                        {a.horas_maximas ? `${a.horas_maximas}h` : ''})
                                      </span>
                                    )}
                                  </>
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    {/* Limites Mensais */}
                    {(formData.valor_minimo_mensal || formData.valor_maximo_mensal) && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Limites Mensais:</p>
                        {formData.valor_minimo_mensal && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Mínimo Mensal:</span>
                            <span className="font-medium">{formatCurrency(formData.valor_minimo_mensal)}</span>
                          </div>
                        )}
                        {formData.valor_maximo_mensal && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Máximo Mensal:</span>
                            <span className="font-medium">{formatCurrency(formData.valor_maximo_mensal)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>


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
