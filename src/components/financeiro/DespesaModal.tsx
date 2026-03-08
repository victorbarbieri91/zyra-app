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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDateForDB, formatBrazilDate } from '@/lib/timezone'

interface DespesaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId?: string | null
  consultaId?: string | null
  clienteId?: string | null
  onSuccess?: () => void
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

interface FormData {
  categoria: string
  descricao: string
  valor: string
  data: string
  comprovante_url: string
  reembolsavel: boolean
  fornecedor: string
  documento_fiscal: string
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
  valor: '',
  data: formatDateForInput(),
  comprovante_url: '',
  reembolsavel: hasVinculo,
  fornecedor: '',
  documento_fiscal: '',
})

export default function DespesaModal({
  open,
  onOpenChange,
  processoId,
  consultaId,
  clienteId,
  onSuccess,
}: DespesaModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Form state
  const [formData, setFormData] = useState<FormData>(makeInitialFormData(false))
  const [loading, setLoading] = useState(false)

  // Vinculo state
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

  // Mostrar campos adicionais
  const [showExtras, setShowExtras] = useState(false)

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
      const hasVinculo = !!(processoId || consultaId)
      setFormData(makeInitialFormData(hasVinculo))
      setSearchTerm('')
      setProcessoSelecionado(null)
      setConsultaSelecionada(null)
      setShowExtras(false)

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
  }, [open, processoId, consultaId])

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

          // Buscar por nome do cliente
          const { data: clientesData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMap = new Map((clientesData || []).map((c: any) => [c.id, c.nome_completo]))

          // Buscar processos desses clientes
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

          // Combinar e remover duplicados
          const todosProcessos = [...(processosData || []), ...processosCliente]
          const processosUnicos = Array.from(
            new Map(todosProcessos.map((p: any) => [p.id, p])).values()
          ).slice(0, 10)

          // Buscar nomes de clientes faltantes
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

          // Buscar por nome do cliente
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
    // Ativar reembolsavel por padrão ao vincular a caso
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
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data) {
      toast.error('Informe a data da despesa')
      return
    }
    if (!escritorioAtivo) {
      toast.error('Escritório não identificado')
      return
    }

    try {
      setLoading(true)

      const despesaData = {
        escritorio_id: escritorioAtivo,
        processo_id: processoSelecionado?.id || null,
        consultivo_id: consultaSelecionada?.id || null,
        cliente_id: derivedClienteId || clienteId || null,
        categoria: formData.categoria,
        descricao: formData.descricao.trim(),
        valor: parseFloat(formData.valor),
        data_vencimento: formatDateForDB(formData.data),
        fornecedor: formData.fornecedor.trim() || null,
        documento_fiscal: formData.documento_fiscal.trim() || null,
        comprovante_url: formData.comprovante_url.trim() || null,
        reembolsavel: formData.reembolsavel,
        reembolso_status: formData.reembolsavel ? 'pendente' : null,
        status: 'pendente',
      }

      const { error } = await supabase.from('financeiro_despesas').insert(despesaData)

      if (error) throw error

      toast.success('Despesa lançada com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao lançar despesa:', error)
      toast.error('Erro ao lançar despesa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <Receipt className="w-5 h-5 text-[#89bcbe]" />
            Nova Despesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vinculo - Card quando pre-carregado ou selecionado */}
          {loadingVinculo ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#89bcbe]" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Carregando vínculo...</span>
            </div>
          ) : hasSelection ? (
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
                    className="p-0.5 rounded hover:bg-slate-200 transition-colors"
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
          ) : !hasPresetVinculo ? (
            /* Busca de processo/consulta */
            <div className="space-y-2">
              <Label className="text-xs text-slate-600 dark:text-slate-400">Vincular a (opcional)</Label>

              {/* Tabs */}
              <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-surface-2 rounded-md">
                <button
                  onClick={() => { setVinculoTipo('processo'); setSearchTerm(''); setProcessos([]); setConsultas([]) }}
                  className={cn(
                    'flex-1 text-xs py-1.5 rounded transition-colors',
                    vinculoTipo === 'processo'
                      ? 'bg-white dark:bg-surface-1 shadow-sm text-[#34495e] dark:text-slate-200 font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
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
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
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
          ) : null}

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

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) => updateField('valor', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => updateField('data', e.target.value)}
              />
            </div>
          </div>

          {/* Campos adicionais (colapsaveis) */}
          <div>
            <button
              type="button"
              onClick={() => setShowExtras(!showExtras)}
              className="text-xs text-[#46627f] dark:text-slate-400 hover:text-[#34495e] dark:text-slate-200 font-medium transition-colors"
            >
              {showExtras ? '- Ocultar detalhes adicionais' : '+ Detalhes adicionais (fornecedor, NF, comprovante)'}
            </button>

            {showExtras && (
              <div className="mt-3 space-y-3 p-3 bg-slate-50 dark:bg-surface-0 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <Label htmlFor="fornecedor">Fornecedor</Label>
                  <Input
                    id="fornecedor"
                    placeholder="Nome do fornecedor..."
                    value={formData.fornecedor}
                    onChange={(e) => updateField('fornecedor', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="documento_fiscal">Documento Fiscal (NF)</Label>
                  <Input
                    id="documento_fiscal"
                    placeholder="Número da NF ou documento..."
                    value={formData.documento_fiscal}
                    onChange={(e) => updateField('documento_fiscal', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="comprovante_url">URL do Comprovante</Label>
                  <Input
                    id="comprovante_url"
                    type="url"
                    placeholder="https://..."
                    value={formData.comprovante_url}
                    onChange={(e) => updateField('comprovante_url', e.target.value)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Link para o comprovante armazenado (ex: Drive, Dropbox)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Reembolsavel - Cobrar do cliente */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-0 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="reembolsavel"
                checked={formData.reembolsavel}
                onCheckedChange={(checked) => updateField('reembolsavel', !!checked)}
              />
              <div className="flex-1">
                <Label htmlFor="reembolsavel" className="cursor-pointer">
                  <span className="font-medium">Cobrar do cliente</span>
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Despesa será incluída na fatura para reembolso pelo cliente
                </p>
              </div>
            </div>

            {formData.reembolsavel ? (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                  Será incluída em fatura para o cliente
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                  Despesa interna do escritório
                </Badge>
              </div>
            )}
          </div>

          {/* Aviso se nao vincular a processo/consulta */}
          {!hasSelection && !hasPresetVinculo && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <p className="font-medium">Despesa sem vínculo a caso</p>
                <p>Será registrada como despesa geral do escritório.</p>
              </div>
            </div>
          )}
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
                Lançar Despesa
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
