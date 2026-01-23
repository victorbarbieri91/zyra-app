'use client'

import { useState, useEffect } from 'react'
import { Calendar, CalendarClock, Clock, Link as LinkIcon, CheckSquare, Briefcase, UserCheck, FileText, ClipboardList, Zap, TrendingUp, ChevronRight, Repeat, ListTree } from 'lucide-react'
import { ModalWizard, WizardStep, ReviewCard } from '@/components/wizards'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateInput } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TagSelector from '@/components/tags/TagSelector'
import VinculacaoSelector from '@/components/agenda/VinculacaoSelector'
import RecorrenciaConfig, { RecorrenciaData } from '@/components/agenda/RecorrenciaConfig'
import ResponsaveisSelector from '@/components/agenda/ResponsaveisSelector'
import type { TarefaFormData } from '@/hooks/useTarefas'
import type { WizardStep as WizardStepType } from '@/components/wizards'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTags } from '@/hooks/useTags'
import { useRecorrencias } from '@/hooks/useRecorrencias'
import { useTarefas } from '@/hooks/useTarefas'
import { useAgendaResponsaveis } from '@/hooks/useAgendaResponsaveis'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { createClient } from '@/lib/supabase/client'
import { parseDateInBrazil, formatBrazilDateLong } from '@/lib/timezone'

interface TarefaWizardProps {
  escritorioId: string
  onClose: () => void
  onSubmit?: (data: TarefaFormData) => Promise<void> // Callback opcional após criação
  onCreated?: () => void | Promise<void> // Callback após tarefa criada
  initialData?: Partial<TarefaFormData>
}

type TipoTarefa = 'prazo_processual' | 'acompanhamento' | 'follow_up' | 'administrativo' | 'outro'
type Prioridade = 'alta' | 'media' | 'baixa'
type PrazoTipo = 'recurso' | 'manifestacao' | 'cumprimento' | 'juntada' | 'pagamento' | 'outro'

const TIPO_CONFIG = {
  prazo_processual: {
    label: 'Prazo Processual',
    icon: Briefcase,
    color: 'red',
    description: 'Prazos judiciais',
  },
  acompanhamento: {
    label: 'Acompanhamento',
    icon: UserCheck,
    color: 'blue',
    description: 'Acompanhamento',
  },
  follow_up: {
    label: 'Follow-up',
    icon: Clock,
    color: 'emerald',
    description: 'Contato com clientes',
  },
  administrativo: {
    label: 'Administrativo',
    icon: FileText,
    color: 'purple',
    description: 'Tarefas internas',
  },
  outro: {
    label: 'Outro',
    icon: ClipboardList,
    color: 'slate',
    description: 'Outras tarefas',
  },
}

export default function TarefaWizard({ escritorioId, onClose, onSubmit, onCreated, initialData }: TarefaWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar tags para mostrar na revisão
  const { tags } = useTags('agenda', escritorioId)

  // Carregar membros do escritório para exibição na revisão
  const { membros } = useEscritorioMembros(escritorioId)

  // Hook para criar tarefas diretamente
  const { createTarefa } = useTarefas(escritorioId)

  // Hook para salvar/carregar responsáveis
  const { setResponsaveis, getResponsaveis } = useAgendaResponsaveis()

  // Form State
  const [tipo, setTipo] = useState<TipoTarefa>(initialData?.tipo || 'outro')
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descricao, setDescricao] = useState(initialData?.descricao || '')

  const [dataExecucao, setDataExecucao] = useState(initialData?.data_inicio || '')
  const [prazoFatal, setPrazoFatal] = useState(initialData?.data_fim || '')
  const [prioridade, setPrioridade] = useState<Prioridade>(initialData?.prioridade || 'media')
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(initialData?.responsavel_id ? [initialData.responsavel_id] : [])

  const [processoId, setProcessoId] = useState<string | null>(initialData?.processo_id || null)
  const [consultivoId, setConsultivoId] = useState<string | null>(initialData?.consultivo_id || null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [cor, setCor] = useState(initialData?.cor || '#3B82F6')

  // Estado de recorrência
  const [recorrencia, setRecorrencia] = useState<RecorrenciaData | null>(null)

  // Hook de recorrências
  const { createRecorrencia } = useRecorrencias(escritorioId)

  // Estado unificado de vinculação para o novo componente
  const [vinculacao, setVinculacao] = useState<{modulo: 'processo' | 'consultivo', modulo_registro_id: string, metadados?: any} | null>(() => {
    if (initialData?.processo_id) {
      return {
        modulo: 'processo',
        modulo_registro_id: initialData.processo_id,
      }
    }
    if (initialData?.consultivo_id) {
      return {
        modulo: 'consultivo',
        modulo_registro_id: initialData.consultivo_id,
      }
    }
    return null
  })

  // Buscar metadados do processo/consultivo quando vem do initialData
  useEffect(() => {
    const loadMetadados = async () => {
      const supabase = createClient()

      // Se tem processo_id no initialData mas vinculação não tem metadados
      if (initialData?.processo_id && (!vinculacao?.metadados || Object.keys(vinculacao.metadados).length === 0)) {
        const { data: processo } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            parte_contraria,
            crm_pessoas!processos_processos_cliente_id_fkey(nome_completo, nome_fantasia)
          `)
          .eq('id', initialData.processo_id)
          .single()

        if (processo) {
          const clienteNome = (processo as any).crm_pessoas?.nome_completo || (processo as any).crm_pessoas?.nome_fantasia
          const parteContraria = processo.parte_contraria

          let partes = ''
          if (clienteNome && parteContraria) {
            partes = `${clienteNome} × ${parteContraria}`
          } else if (clienteNome) {
            partes = clienteNome
          } else if (parteContraria) {
            partes = parteContraria
          }

          setVinculacao({
            modulo: 'processo',
            modulo_registro_id: processo.id,
            metadados: {
              numero_pasta: processo.numero_pasta,
              numero_cnj: processo.numero_cnj,
              partes: partes || undefined,
            },
          })
        }
      }

      // Se tem consultivo_id no initialData mas vinculação não tem metadados
      if (initialData?.consultivo_id && (!vinculacao?.metadados || Object.keys(vinculacao.metadados).length === 0)) {
        const { data: consultivo } = await supabase
          .from('consultivo_consultas')
          .select(`
            id,
            numero,
            titulo,
            crm_pessoas!consultivo_consultas_cliente_id_fkey(nome_completo, nome_fantasia)
          `)
          .eq('id', initialData.consultivo_id)
          .single()

        if (consultivo) {
          const clienteNome = (consultivo as any).crm_pessoas?.nome_completo || (consultivo as any).crm_pessoas?.nome_fantasia

          setVinculacao({
            modulo: 'consultivo',
            modulo_registro_id: consultivo.id,
            metadados: {
              numero_pasta: consultivo.numero,
              titulo: consultivo.titulo,
              partes: clienteNome || undefined,
            },
          })
        }
      }
    }

    loadMetadados()
  }, [initialData?.processo_id, initialData?.consultivo_id])

  // Sincronizar vinculacao com processoId/consultivoId
  useEffect(() => {
    if (vinculacao) {
      if (vinculacao.modulo === 'processo') {
        setProcessoId(vinculacao.modulo_registro_id)
        setConsultivoId(null)
      } else if (vinculacao.modulo === 'consultivo') {
        setConsultivoId(vinculacao.modulo_registro_id)
        setProcessoId(null)
      }
    } else {
      setProcessoId(null)
      setConsultivoId(null)
    }
  }, [vinculacao])

  // Carregar responsáveis existentes quando estamos editando (initialData tem id)
  useEffect(() => {
    const loadResponsaveis = async () => {
      if (initialData?.id) {
        console.log('[TarefaWizard] Carregando responsáveis para edição, tarefa:', initialData.id)
        const responsaveis = await getResponsaveis('tarefa', initialData.id)
        if (responsaveis.length > 0) {
          setResponsaveisIds(responsaveis.map(r => r.user_id))
          console.log('[TarefaWizard] Responsáveis carregados:', responsaveis.map(r => r.user_id))
        }
      }
    }
    loadResponsaveis()
  }, [initialData?.id])

  // Step Definitions
  const steps: WizardStepType[] = [
    {
      id: 'tipo-identificacao',
      title: 'Tipo e Identificação',
      subtitle: 'Qual tipo de tarefa você está criando?',
      validate: () => tipo !== '' && titulo.trim().length >= 3,
    },
    {
      id: 'quando-responsabilidade',
      title: 'Quando e Responsabilidade',
      subtitle: 'Quando você vai fazer esta tarefa?',
      validate: () => dataExecucao !== '',
    },
    {
      id: 'vinculos-tags',
      title: 'Vínculos e Etiquetas',
      subtitle: 'Vincule a processos e adicione organizadores',
      isOptional: true,
      validate: () => true,
    },
    {
      id: 'recorrencia',
      title: 'Recorrência',
      subtitle: 'Esta tarefa se repete?',
      isOptional: true,
      validate: () => true,
    },
    {
      id: 'revisao',
      title: 'Revisão e Confirmação',
      subtitle: 'Revise os dados antes de criar',
      validate: () => true,
    },
  ]

  const filteredSteps = steps

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      // Converter datas YYYY-MM-DD para ISO com horário meio-dia para evitar problemas de timezone
      const formatDateToISO = (dateStr: string) => {
        if (!dateStr) return undefined
        // Adicionar horário 12:00:00 para evitar mudança de dia com timezone
        return `${dateStr}T12:00:00`
      }

      const formData: TarefaFormData = {
        escritorio_id: escritorioId,
        tipo,
        titulo,
        descricao: descricao || undefined,
        data_inicio: formatDateToISO(dataExecucao),
        data_fim: prazoFatal ? formatDateToISO(prazoFatal) : undefined,
        prioridade,
        // responsavel_id mantido para retrocompatibilidade (primeiro da lista)
        responsavel_id: responsaveisIds.length > 0 ? responsaveisIds[0] : undefined,
        cor,
        processo_id: processoId,
        consultivo_id: consultivoId,
        // Para prazos processuais, enviar prazo_data_limite
        prazo_data_limite: (tipo === 'prazo_processual' && prazoFatal) ? prazoFatal : undefined,
      }

      // Verificar se estamos editando (initialData tem id)
      const isEditing = initialData?.id

      // Se tem recorrência, criar a recorrência em vez da tarefa direta
      if (recorrencia && recorrencia.ativa && !isEditing) {
        await createRecorrencia({
          nome: titulo,
          descricao: descricao || undefined,
          tipo: 'tarefa',
          templateDados: formData,
          frequencia: recorrencia.frequencia,
          intervalo: recorrencia.intervalo,
          diasSemana: recorrencia.diasSemana,
          diaMes: recorrencia.diaMes,
          mes: recorrencia.mes,
          horaPadrao: recorrencia.horaPadrao,
          dataInicio: recorrencia.dataInicio,
          terminoTipo: recorrencia.terminoTipo,
          dataFim: recorrencia.dataFim,
          numeroOcorrencias: recorrencia.numeroOcorrencias,
          apenasUteis: recorrencia.apenasUteis,
        })
      } else if (isEditing) {
        // Modo edição - usar onSubmit do pai (se fornecido) para atualizar
        if (onSubmit) {
          await onSubmit(formData)
        }
        // Salvar responsáveis na tabela N:N
        if (responsaveisIds.length > 0) {
          console.log('[TarefaWizard] Atualizando responsáveis:', responsaveisIds, 'para tarefa:', initialData.id)
          await setResponsaveis('tarefa', initialData.id as string, responsaveisIds)
        }
        // Callback opcional
        if (onCreated) {
          await onCreated()
        }
      } else {
        // Tarefa única nova - criar usando useTarefas diretamente
        const novaTarefa = await createTarefa(formData)

        // Salvar responsáveis na tabela N:N se a tarefa foi criada
        if (novaTarefa?.id && responsaveisIds.length > 0) {
          console.log('[TarefaWizard] Salvando responsáveis:', responsaveisIds, 'para tarefa:', novaTarefa.id)
          await setResponsaveis('tarefa', novaTarefa.id, responsaveisIds)
        }

        // Callback opcional para o pai saber que foi criado (para atualizar listas)
        if (onCreated) {
          await onCreated()
        }
      }

      onClose()
    } catch (error) {
      console.error('Erro ao criar tarefa:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTipoLabel = (t: TipoTarefa) => {
    const labels = {
      prazo_processual: 'Prazo Processual',
      acompanhamento: 'Acompanhamento',
      follow_up: 'Follow-up',
      administrativo: 'Administrativo',
      outro: 'Outro',
    }
    return labels[t]
  }

  const getPrioridadeLabel = (p: Prioridade) => {
    const labels = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
    return labels[p]
  }

  return (
    <ModalWizard
      steps={filteredSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Nova Tarefa"
      onClose={onClose}
      onComplete={handleComplete}
      isSubmitting={isSubmitting}
    >
      {/* ETAPA 1: Tipo e Identificação */}
      {currentStep === 0 && (
        <WizardStep title={filteredSteps[0].title} subtitle={filteredSteps[0].subtitle}>
          <div className="space-y-4">
            {/* Tipo de Tarefa */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">Tipo de Tarefa *</Label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.entries(TIPO_CONFIG) as [TipoTarefa, typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(
                  ([key, config]) => {
                    const Icon = config.icon
                    const selected = tipo === key

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipo(key)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                          selected
                            ? cn(
                                'border-current shadow-sm',
                                config.color === 'red' && 'bg-red-50 text-red-600 border-red-300',
                                config.color === 'blue' && 'bg-blue-50 text-blue-600 border-blue-300',
                                config.color === 'emerald' && 'bg-emerald-50 text-emerald-600 border-emerald-300',
                                config.color === 'purple' && 'bg-purple-50 text-purple-600 border-purple-300',
                                config.color === 'slate' && 'bg-slate-50 text-slate-600 border-slate-300'
                              )
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium text-center leading-tight">
                          {config.label}
                        </span>
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-sm font-medium text-[#34495e]">
                Título da Tarefa *
              </Label>
              <Input
                id="titulo"
                placeholder="Ex: Apresentar contestação"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-sm font-medium text-[#34495e]">
                Descrição
                <span className="text-xs text-slate-500 font-normal ml-2">(Opcional)</span>
              </Label>
              <Textarea
                id="descricao"
                placeholder="Descreva detalhes importantes sobre a tarefa..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                className="text-sm resize-none max-h-[120px]"
              />
            </div>
          </div>
        </WizardStep>
      )}

      {/* ETAPA 2: Quando e Responsabilidade */}
      {currentStep === 1 && (
        <WizardStep title={filteredSteps[1].title} subtitle={filteredSteps[1].subtitle}>
          <div className="space-y-4">
            {/* Data de Execução */}
            <div className="space-y-2">
              <Label htmlFor="data-execucao" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#89bcbe]" />
                Data que irei realizar *
              </Label>
              <DateInput
                value={dataExecucao}
                onChange={setDataExecucao}
              />
            </div>

            {/* Prazo Fatal */}
            <div className="space-y-2">
              <Label htmlFor="prazo-fatal" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#34495e]" />
                Prazo Fatal
                <span className="text-xs text-slate-500 font-normal">(Opcional)</span>
              </Label>
              <DateInput
                value={prazoFatal}
                onChange={setPrazoFatal}
              />
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">
                Prioridade *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['alta', 'media', 'baixa'] as Prioridade[]).map((p) => {
                  const selected = prioridade === p
                  const config = {
                    alta: { color: 'red', label: 'Alta', Icon: Zap },
                    media: { color: 'amber', label: 'Média', Icon: TrendingUp },
                    baixa: { color: 'emerald', label: 'Baixa', Icon: ChevronRight },
                  }[p]
                  const IconComponent = config.Icon

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridade(p)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                        selected
                          ? cn(
                              'border-current shadow-sm',
                              config.color === 'red' && 'bg-red-50 text-red-600 border-red-300',
                              config.color === 'amber' && 'bg-amber-50 text-amber-600 border-amber-300',
                              config.color === 'emerald' && 'bg-emerald-50 text-emerald-600 border-emerald-300'
                            )
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Responsáveis */}
            <ResponsaveisSelector
              escritorioId={escritorioId}
              selectedIds={responsaveisIds}
              onChange={setResponsaveisIds}
              label="Responsáveis"
              placeholder="Selecionar responsáveis..."
            />
          </div>
        </WizardStep>
      )}

      {/* ETAPA 3: Vínculos e Tags */}
      {currentStep === 2 && (
        <WizardStep
          title={filteredSteps[2].title}
          subtitle={filteredSteps[2].subtitle}
          isOptional
        >
          <div className="space-y-4">
            {/* Vínculos */}
            <div className="space-y-2">
              <VinculacaoSelector
                vinculacao={vinculacao}
                onChange={setVinculacao}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">Etiquetas</Label>
              <TagSelector
                contexto="agenda"
                escritorioId={escritorioId}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
              />
            </div>
          </div>
        </WizardStep>
      )}

      {/* ETAPA 4: Recorrência */}
      {currentStep === 3 && (
        <WizardStep
          title={filteredSteps[3].title}
          subtitle={filteredSteps[3].subtitle}
          isOptional
        >
          <RecorrenciaConfig
            value={recorrencia}
            onChange={setRecorrencia}
            tipo="tarefa"
          />
        </WizardStep>
      )}

      {/* ETAPA 5: Revisão - Ficha Completa */}
      {currentStep === 4 && (
        <WizardStep title={filteredSteps[4].title} subtitle={filteredSteps[4].subtitle}>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            {/* Grid de Informações */}
            <div className="space-y-4">
              {/* Tipo e Título */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500">Tipo</span>
                <span className="text-[#34495e] font-medium">{getTipoLabel(tipo)}</span>

                <span className="text-slate-500">Título</span>
                <span className="text-[#34495e] font-medium">{titulo}</span>

                {descricao && (
                  <>
                    <span className="text-slate-500">Descrição</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">{descricao}</span>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100" />

              {/* Datas e Prioridade */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500">Execução</span>
                <span className="text-[#34495e] font-medium">
                  {dataExecucao ? formatBrazilDateLong(parseDateInBrazil(dataExecucao, 'yyyy-MM-dd')) : 'Não definida'}
                </span>

                {prazoFatal && (
                  <>
                    <span className="text-slate-500">Prazo Fatal</span>
                    <span className="text-red-600 font-medium">
                      {prazoFatal ? formatBrazilDateLong(parseDateInBrazil(prazoFatal, 'yyyy-MM-dd')) : 'Não definido'}
                    </span>
                  </>
                )}

                <span className="text-slate-500">Prioridade</span>
                <span className={cn(
                  "font-medium",
                  prioridade === 'alta' && "text-red-600",
                  prioridade === 'media' && "text-amber-600",
                  prioridade === 'baixa' && "text-emerald-600"
                )}>
                  {getPrioridadeLabel(prioridade)}
                </span>

                {responsaveisIds.length > 0 && (
                  <>
                    <span className="text-slate-500">Responsáveis</span>
                    <span className="text-[#34495e] font-medium">
                      {responsaveisIds.map(id => membros.find(m => m.user_id === id)?.nome || 'Não encontrado').join(', ')}
                    </span>
                  </>
                )}
              </div>

              {/* Vínculos e Tags (se houver) */}
              {(vinculacao || selectedTagIds.length > 0) && (
                <>
                  <div className="border-t border-slate-100" />

                  <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                    {vinculacao && (
                      <>
                        <span className="text-slate-500">Vinculado a</span>
                        <div className="text-[#34495e]">
                          <div className="font-medium">
                            {vinculacao.metadados?.partes || vinculacao.metadados?.titulo || `Pasta ${vinculacao.metadados?.numero_pasta}`}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {vinculacao.metadados?.numero_pasta && `Pasta ${vinculacao.metadados.numero_pasta}`}
                            {vinculacao.metadados?.numero_cnj && ` • CNJ: ${vinculacao.metadados.numero_cnj}`}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedTagIds.length > 0 && (
                      <>
                        <span className="text-slate-500">Etiquetas</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedTagIds.map(tagId => {
                            const tag = tags.find(t => t.id === tagId)
                            if (!tag) return null

                            // Calcular contraste
                            const hex = tag.cor.replace('#', '')
                            const r = parseInt(hex.substr(0, 2), 16)
                            const g = parseInt(hex.substr(2, 2), 16)
                            const b = parseInt(hex.substr(4, 2), 16)
                            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                            const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF'

                            return (
                              <div
                                key={tagId}
                                className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm"
                                style={{
                                  backgroundColor: tag.cor,
                                  color: textColor
                                }}
                              >
                                {tag.nome}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </WizardStep>
      )}
    </ModalWizard>
  )
}
