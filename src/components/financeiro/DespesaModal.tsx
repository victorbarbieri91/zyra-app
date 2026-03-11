'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Receipt,
  Loader2,
  AlertCircle,
  FileText,
  DollarSign,
  Search,
  Briefcase,
  X,
  Upload,
  ExternalLink,
  Paperclip,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDateForDB, formatBrazilDate } from '@/lib/timezone'

export interface DespesaEditData {
  id: string
  categoria: string
  descricao: string
  valor: number
  data_vencimento: string
  comprovante_url?: string | null
  reembolsavel: boolean
  processo_id?: string | null
  consultivo_id?: string | null
  cliente_id?: string | null
  fluxo_status?: string | null
  status?: string | null
  data_pagamento?: string | null
  conta_bancaria_id?: string | null
  forma_pagamento?: string | null
}

interface DespesaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId?: string | null
  consultaId?: string | null
  clienteId?: string | null
  onSuccess?: () => void
  editData?: DespesaEditData | null
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

interface ContaBancaria {
  id: string
  banco: string
  numero_conta: string
}

interface FormData {
  categoria: string
  descricao: string
  valor: number
  data_vencimento: string
  comprovante_file: File | null
  comprovante_url: string
  reembolsavel: boolean
  ja_pago: boolean
  data_pagamento: string
  conta_bancaria_id: string
  forma_pagamento: string
}

const CATEGORIAS_PROCESSUAIS = [
  { value: 'custas', label: 'Custas Processuais' },
  { value: 'honorarios_perito', label: 'Honorários de Perito' },
  { value: 'oficial_justica', label: 'Oficial de Justiça' },
  { value: 'correios', label: 'Correios / Envios' },
  { value: 'cartorio', label: 'Cartório' },
  { value: 'copia', label: 'Cópias / Impressões' },
  { value: 'publicacao', label: 'Publicação' },
  { value: 'certidao', label: 'Certidões' },
  { value: 'protesto', label: 'Protesto' },
  { value: 'deslocamento', label: 'Deslocamento / Transporte' },
  { value: 'estacionamento', label: 'Estacionamento' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'viagem', label: 'Viagem' },
]

const CATEGORIAS_OPERACIONAIS = [
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'folha', label: 'Folha de Pagamento' },
  { value: 'prolabore', label: 'Pró-labore' },
  { value: 'retirada_socios', label: 'Retirada de Sócios' },
  { value: 'beneficios', label: 'Benefícios' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'taxas_bancarias', label: 'Taxas Bancárias' },
  { value: 'tecnologia', label: 'Tecnologia / Software' },
  { value: 'assinatura', label: 'Assinaturas' },
  { value: 'telefonia', label: 'Telefonia' },
  { value: 'material', label: 'Material de Escritório' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'capacitacao', label: 'Capacitação / Cursos' },
  { value: 'associacoes', label: 'Associações' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'emprestimos', label: 'Empréstimos' },
  { value: 'juros', label: 'Juros' },
  { value: 'cartao_credito', label: 'Fatura Cartão de Crédito' },
  { value: 'comissao', label: 'Comissão' },
]

const CATEGORIAS_OUTRAS = [
  { value: 'outra', label: 'Outra Despesa' },
  { value: 'outros', label: 'Outros' },
]

const formatDateForInput = (date: Date = new Date()): string => {
  return formatBrazilDate(date, 'yyyy-MM-dd')
}

const makeInitialFormData = (hasVinculo: boolean): FormData => ({
  categoria: '',
  descricao: '',
  valor: 0,
  data_vencimento: formatDateForInput(),
  comprovante_file: null,
  comprovante_url: '',
  reembolsavel: hasVinculo,
  ja_pago: false,
  data_pagamento: formatDateForInput(),
  conta_bancaria_id: '',
  forma_pagamento: '',
})

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DespesaModal({
  open,
  onOpenChange,
  processoId,
  consultaId,
  clienteId,
  onSuccess,
  editData,
}: DespesaModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState<FormData>(makeInitialFormData(false))
  const [loading, setLoading] = useState(false)

  // Vinculo state
  const [vinculoEnabled, setVinculoEnabled] = useState(false)
  const [vinculoTipo, setVinculoTipo] = useState<'processo' | 'consulta'>('processo')
  const [searchTerm, setSearchTerm] = useState('')

  // Selected state
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoOption | null>(null)
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaOption | null>(null)

  // Search results
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [consultas, setConsultas] = useState<ConsultaOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Loading state para vinculo pre-carregado
  const [loadingVinculo, setLoadingVinculo] = useState(false)

  // Contas bancárias
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])

  const isEditing = !!editData

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

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

  // Carregar processo por ID
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

  // Carregar consulta por ID
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

  // Reset form quando abrir
  useEffect(() => {
    if (open) {
      carregarContas()

      if (editData) {
        // Modo edição: preencher form com dados existentes
        const isPago = editData.status === 'pago' || editData.fluxo_status === 'pago'
        setFormData({
          categoria: editData.categoria || '',
          descricao: editData.descricao || '',
          valor: editData.valor || 0,
          data_vencimento: editData.data_vencimento || formatDateForInput(),
          comprovante_file: null,
          comprovante_url: editData.comprovante_url || '',
          reembolsavel: editData.reembolsavel || false,
          ja_pago: isPago,
          data_pagamento: editData.data_pagamento || formatDateForInput(),
          conta_bancaria_id: editData.conta_bancaria_id || '',
          forma_pagamento: editData.forma_pagamento || '',
        })
        setSearchTerm('')
        setProcessoSelecionado(null)
        setConsultaSelecionada(null)
        setVinculoEnabled(!!(editData.processo_id || editData.consultivo_id))

        // Carregar vínculo existente
        if (editData.processo_id) {
          setVinculoTipo('processo')
          setLoadingVinculo(true)
          loadProcessoById(editData.processo_id).finally(() => setLoadingVinculo(false))
        } else if (editData.consultivo_id) {
          setVinculoTipo('consulta')
          setLoadingVinculo(true)
          loadConsultaById(editData.consultivo_id).finally(() => setLoadingVinculo(false))
        }
      } else {
        // Modo criação
        const hasVinculo = !!(processoId || consultaId)
        setFormData(makeInitialFormData(hasVinculo))
        setSearchTerm('')
        setProcessoSelecionado(null)
        setConsultaSelecionada(null)
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
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processoId, consultaId, editData])

  // Buscar processos/consultas
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

  // Selecionar processo
  const handleSelectProcesso = (processo: ProcessoOption) => {
    setProcessoSelecionado(processo)
    setConsultaSelecionada(null)
    setSearchTerm('')
    updateField('reembolsavel', true)
  }

  // Selecionar consulta
  const handleSelectConsulta = (consulta: ConsultaOption) => {
    setConsultaSelecionada(consulta)
    setProcessoSelecionado(null)
    setSearchTerm('')
    updateField('reembolsavel', true)
  }

  // Limpar selecao
  const handleClearSelection = () => {
    setProcessoSelecionado(null)
    setConsultaSelecionada(null)
    updateField('reembolsavel', false)
  }

  // Toggle vinculo
  const handleToggleVinculo = (enabled: boolean) => {
    setVinculoEnabled(enabled)
    if (!enabled) {
      handleClearSelection()
      setSearchTerm('')
      setProcessos([])
      setConsultas([])
    }
  }

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB')
      return
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF ou imagem (JPG, PNG, GIF, WebP).')
      return
    }

    updateField('comprovante_file', file)
    // Reset input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = () => {
    updateField('comprovante_file', null)
    updateField('comprovante_url', '')
  }

  // Upload comprovante ao Storage
  const uploadComprovante = async (): Promise<string | null> => {
    if (!formData.comprovante_file) return formData.comprovante_url || null

    const fileExt = formData.comprovante_file.name.split('.').pop()
    const fileName = `comprovante-${Date.now()}.${fileExt}`
    const filePath = `${escritorioAtivo}/${fileName}`

    const { error } = await supabase.storage
      .from('comprovantes-despesas')
      .upload(filePath, formData.comprovante_file, { upsert: true })

    if (error) throw new Error(`Erro no upload: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('comprovantes-despesas')
      .getPublicUrl(filePath)

    return publicUrl
  }

  // Derivar cliente_id do vinculo
  const derivedClienteId = processoSelecionado?.cliente_id || consultaSelecionada?.cliente_id || null
  const hasSelection = processoSelecionado || consultaSelecionada
  const hasPresetVinculo = !!(processoId || consultaId)
  const opcoes = vinculoTipo === 'processo' ? processos : consultas

  const handleSubmit = async () => {
    if (!formData.categoria) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição da despesa')
      return
    }
    if (!formData.valor || formData.valor <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data_vencimento) {
      toast.error('Informe a data de vencimento')
      return
    }
    if (!escritorioAtivo) {
      toast.error('Escritório não identificado')
      return
    }
    if (formData.ja_pago) {
      if (!formData.data_pagamento) {
        toast.error('Informe a data do pagamento')
        return
      }
      if (!formData.conta_bancaria_id) {
        toast.error('Selecione a conta bancária')
        return
      }
    }

    try {
      setLoading(true)

      // Upload do comprovante se houver
      const comprovanteUrl = await uploadComprovante()

      if (isEditing && editData) {
        // Modo edição: UPDATE
        const updateData: Record<string, unknown> = {
          categoria: formData.categoria,
          descricao: formData.descricao.trim(),
          valor: formData.valor,
          data_vencimento: formatDateForDB(formData.data_vencimento),
          comprovante_url: comprovanteUrl,
          reembolsavel: formData.reembolsavel,
          reembolso_status: formData.reembolsavel ? 'pendente' : null,
          processo_id: processoSelecionado?.id || null,
          consultivo_id: consultaSelecionada?.id || null,
          cliente_id: derivedClienteId || clienteId || null,
          updated_at: new Date().toISOString(),
        }

        if (formData.ja_pago) {
          updateData.status = 'pago'
          updateData.fluxo_status = 'pago'
          updateData.data_pagamento = formatDateForDB(formData.data_pagamento)
          updateData.conta_bancaria_id = formData.conta_bancaria_id || null
          updateData.forma_pagamento = formData.forma_pagamento || null
        }

        const { error } = await supabase
          .from('financeiro_despesas')
          .update(updateData)
          .eq('id', editData.id)

        if (error) throw error

        toast.success('Despesa atualizada com sucesso!')
      } else {
        // Modo criação: INSERT
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        const despesaData: Record<string, unknown> = {
          escritorio_id: escritorioAtivo,
          processo_id: processoSelecionado?.id || null,
          consultivo_id: consultaSelecionada?.id || null,
          cliente_id: derivedClienteId || clienteId || null,
          categoria: formData.categoria,
          descricao: formData.descricao.trim(),
          valor: formData.valor,
          data_vencimento: formatDateForDB(formData.data_vencimento),
          comprovante_url: comprovanteUrl,
          reembolsavel: formData.reembolsavel,
          reembolso_status: formData.reembolsavel ? 'pendente' : null,
          advogado_id: currentUser?.id || null,
        }

        if (formData.ja_pago) {
          // Já pago: pula o fluxo de aprovação, vai direto como pago
          despesaData.status = 'pago'
          despesaData.fluxo_status = 'pago'
          despesaData.data_pagamento = formatDateForDB(formData.data_pagamento)
          despesaData.conta_bancaria_id = formData.conta_bancaria_id || null
          despesaData.forma_pagamento = formData.forma_pagamento || null
        } else {
          // Toda despesa entra no fluxo: pendente → agendado → liberado → pago
          despesaData.status = 'pendente'
          despesaData.fluxo_status = 'pendente'
        }

        const { error } = await supabase.from('financeiro_despesas').insert(despesaData)

        if (error) throw error

        toast.success('Despesa lançada com sucesso!')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar despesa:', error)
      toast.error(isEditing ? 'Erro ao atualizar despesa.' : 'Erro ao lançar despesa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <Receipt className="w-5 h-5 text-[#89bcbe]" />
            {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* === SEÇÃO 1: VÍNCULO === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            {/* Toggle ou card de vínculo */}
            {loadingVinculo ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#89bcbe]" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Carregando vínculo...</span>
              </div>
            ) : hasPresetVinculo || hasSelection ? (
              /* Card do vínculo selecionado */
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
                    <button
                      onClick={handleClearSelection}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-surface-3 transition-colors"
                    >
                      <X className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  )}
                </div>
                <div className="px-3 py-2">
                  {processoSelecionado && (
                    <>
                      <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                        {processoSelecionado.numero_cnj}
                      </p>
                      {processoSelecionado.numero_pasta && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Pasta: {processoSelecionado.numero_pasta}</p>
                      )}
                    </>
                  )}
                  {consultaSelecionada && (
                    <>
                      <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                        {consultaSelecionada.titulo}
                      </p>
                      {consultaSelecionada.numero && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">#{consultaSelecionada.numero}</p>
                      )}
                    </>
                  )}
                  {(processoSelecionado?.cliente_nome || consultaSelecionada?.cliente_nome) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cliente: {processoSelecionado?.cliente_nome || consultaSelecionada?.cliente_nome}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Toggle + busca */
              <>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={vinculoEnabled}
                        onCheckedChange={handleToggleVinculo}
                      />
                      <Label className="text-sm font-medium text-[#34495e] dark:text-slate-200 cursor-pointer" onClick={() => handleToggleVinculo(!vinculoEnabled)}>
                        Vincular a uma pasta
                      </Label>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-11">
                      Associar esta despesa a um processo judicial ou consultivo
                    </p>
                  </div>
                </div>

                {vinculoEnabled ? (
                  /* Busca de processo/consulta */
                  <div className="space-y-2 pt-1">
                    {/* Tabs */}
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

                    {/* Search input */}
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

                    {/* Search results */}
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
                ) : (
                  /* Aviso: despesa geral */
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <p className="font-medium">Despesa sem vínculo a caso</p>
                      <p>Será registrada como despesa geral do escritório.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* === SEÇÃO 2: CAMPOS PRINCIPAIS === */}
          {/* Categoria */}
          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <Select value={formData.categoria} onValueChange={(v) => updateField('categoria', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Processuais / Reembolsáveis</SelectLabel>
                  {CATEGORIAS_PROCESSUAIS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Operacionais</SelectLabel>
                  {CATEGORIAS_OPERACIONAIS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Outras</SelectLabel>
                  {CATEGORIAS_OUTRAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Descricao */}
          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva a despesa..."
              value={formData.descricao}
              onChange={(e) => updateField('descricao', e.target.value)}
              rows={2}
            />
          </div>

          {/* Valor e Data de Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor *</Label>
              <CurrencyInput
                id="valor"
                value={formData.valor}
                onChange={(val) => updateField('valor', val)}
              />
            </div>
            <div>
              <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => updateField('data_vencimento', e.target.value)}
              />
            </div>
          </div>

          {/* === SEÇÃO 3: UPLOAD DE COMPROVANTE === */}
          <div>
            <Label className="text-xs text-slate-600 dark:text-slate-400">Comprovante / Guia</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {formData.comprovante_file ? (
              /* Arquivo selecionado */
              <div className="mt-1.5 flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
                <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate">{formData.comprovante_file.name}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{formatFileSize(formData.comprovante_file.size)}</p>
                </div>
                <button
                  onClick={() => updateField('comprovante_file', null)}
                  className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            ) : formData.comprovante_url ? (
              /* Arquivo existente (modo edição) */
              <div className="mt-1.5 flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-0">
                <Paperclip className="w-4 h-4 text-[#46627f] shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={formData.comprovante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#34495e] dark:text-slate-200 hover:underline flex items-center gap-1"
                  >
                    Ver arquivo anexado
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Substituir
                  </Button>
                  <button
                    onClick={handleRemoveFile}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-surface-3 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            ) : (
              /* Zona de upload */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#89bcbe] dark:hover:border-[#89bcbe] hover:bg-slate-50 dark:hover:bg-surface-0 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-surface-2 flex items-center justify-center group-hover:bg-[#aacfd0]/30 transition-colors">
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-[#89bcbe] transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Anexar comprovante ou guia</p>
                  <p className="text-[10px] text-slate-400">PDF ou imagem, até 5MB</p>
                </div>
              </button>
            )}
          </div>

          {/* === SEÇÃO 4: REEMBOLSÁVEL === */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-surface-0',
            hasSelection || hasPresetVinculo
              ? 'border-slate-200 dark:border-slate-700'
              : 'border-slate-200/60 dark:border-slate-700/60 opacity-60'
          )}>
            <Checkbox
              id="reembolsavel"
              checked={formData.reembolsavel}
              onCheckedChange={(checked) => updateField('reembolsavel', !!checked)}
              disabled={!hasSelection && !hasPresetVinculo}
            />
            <div className="flex-1">
              <Label htmlFor="reembolsavel" className={cn('text-sm font-medium', (!hasSelection && !hasPresetVinculo) ? 'cursor-not-allowed' : 'cursor-pointer')}>
                Cobrar do cliente
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {hasSelection || hasPresetVinculo
                  ? 'Despesa será incluída em nota de débito para reembolso'
                  : 'Disponível apenas para despesas vinculadas a uma pasta (processo ou consultivo)'
                }
              </p>
            </div>
            {formData.reembolsavel && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 shrink-0">
                <DollarSign className="w-3 h-3 mr-0.5" />
                Reembolsável
              </Badge>
            )}
          </div>

          {/* === SEÇÃO 5: JÁ FOI PAGO === */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.ja_pago}
                onCheckedChange={(checked) => updateField('ja_pago', checked)}
              />
              <div className="flex-1">
                <Label className="text-sm font-medium text-[#34495e] dark:text-slate-200 cursor-pointer" onClick={() => updateField('ja_pago', !formData.ja_pago)}>
                  Já foi pago
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registrar despesa com pagamento já realizado
                </p>
              </div>
              {formData.ja_pago && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                  Pago
                </Badge>
              )}
            </div>

            {formData.ja_pago && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data do Pagamento *</Label>
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
                  <Label className="text-xs">Forma de Pagamento</Label>
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

                {formData.ja_pago && formData.reembolsavel && hasSelection && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Despesa ficará disponível imediatamente para nota de débito ao cliente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botoes */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                {isEditing ? 'Salvar Alterações' : 'Lançar Despesa'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
