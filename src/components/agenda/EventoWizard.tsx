'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Briefcase, Users, Coffee, Phone, FileText, Video, Repeat } from 'lucide-react'
import { ModalWizard, WizardStep } from '@/components/wizards'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DateInput } from '@/components/ui/date-picker'
import { DateTimeInput } from '@/components/ui/datetime-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TagSelector from '@/components/tags/TagSelector'
import VinculacaoSelector, { Vinculacao } from '@/components/agenda/VinculacaoSelector'
import RecorrenciaConfig, { RecorrenciaData } from '@/components/agenda/RecorrenciaConfig'
import ResponsaveisSelector from '@/components/agenda/ResponsaveisSelector'
import { useEventos, type EventoFormData } from '@/hooks/useEventos'
import type { WizardStep as WizardStepType } from '@/components/wizards'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTags } from '@/hooks/useTags'
import { useRecorrencias } from '@/hooks/useRecorrencias'
import { useAgendaResponsaveis } from '@/hooks/useAgendaResponsaveis'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { toBrazilTime, formatBrazilDateLong, formatBrazilDateTime } from '@/lib/timezone'

interface EventoWizardProps {
  escritorioId: string
  onClose: () => void
  onSubmit: (data: EventoFormData) => Promise<any> // Retorna o evento criado para salvar responsáveis N:N
  initialData?: Partial<EventoFormData>
}

type TipoEvento = 'reuniao_interna' | 'reuniao_cliente' | 'ligacao' | 'almoco' | 'videoconferencia' | 'outro'

const TIPO_CONFIG = {
  reuniao_cliente: {
    label: 'Reunião Cliente',
    icon: Briefcase,
    color: 'blue',
    description: 'Com cliente',
  },
  reuniao_interna: {
    label: 'Reunião Interna',
    icon: Users,
    color: 'purple',
    description: 'Equipe',
  },
  videoconferencia: {
    label: 'Videoconferência',
    icon: Video,
    color: 'emerald',
    description: 'Online',
  },
  ligacao: {
    label: 'Ligação',
    icon: Phone,
    color: 'amber',
    description: 'Telefone',
  },
  almoco: {
    label: 'Almoço',
    icon: Coffee,
    color: 'red',
    description: 'Refeição',
  },
  outro: {
    label: 'Outro',
    icon: FileText,
    color: 'slate',
    description: 'Outros',
  },
}

export default function EventoWizard({ escritorioId, onClose, onSubmit, initialData }: EventoWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar tags para mostrar na revisão
  const { tags } = useTags('agenda', escritorioId)

  // Carregar membros do escritório para o seletor de responsáveis
  const { membros } = useEscritorioMembros(escritorioId)

  // Hook para gerenciar responsáveis múltiplos
  const { setResponsaveis } = useAgendaResponsaveis()

  // Hook para criar/atualizar eventos diretamente (garante retorno do ID)
  const { createEvento, updateEvento } = useEventos(escritorioId)

  // Form State
  const [tipoEvento, setTipoEvento] = useState<TipoEvento>('reuniao_cliente')
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descricao, setDescricao] = useState(initialData?.descricao || '')

  const [dataInicio, setDataInicio] = useState(initialData?.data_inicio || '')
  const [dataFim, setDataFim] = useState(initialData?.data_fim || '')
  const [diaInteiro, setDiaInteiro] = useState(initialData?.dia_inteiro ?? false)
  const [local, setLocal] = useState(initialData?.local || '')

  const [processoId, setProcessoId] = useState<string | null>(initialData?.processo_id || null)
  const [consultivoId, setConsultivoId] = useState<string | null>(initialData?.consultivo_id || null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(
    initialData?.responsavel_id ? [initialData.responsavel_id] : []
  )
  const [cor, setCor] = useState(initialData?.cor || '#6366F1')

  // Estado de recorrência
  const [recorrencia, setRecorrencia] = useState<RecorrenciaData | null>(null)

  // Hook de recorrências
  const { createRecorrencia } = useRecorrencias(escritorioId)

  // Estado unificado de vinculação
  const [vinculacao, setVinculacao] = useState<Vinculacao | null>(() => {
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

  // Step Definitions
  const steps: WizardStepType[] = [
    {
      id: 'tipo-identificacao',
      title: 'Tipo e Identificação',
      subtitle: 'Qual tipo de compromisso você está criando?',
      validate: () => titulo.trim().length >= 3,
    },
    {
      id: 'quando',
      title: 'Data e Horário',
      subtitle: 'Quando acontecerá o compromisso?',
      validate: () => dataInicio !== '',
    },
    {
      id: 'detalhes',
      title: 'Local e Responsável',
      subtitle: 'Onde será e quem é o responsável',
      isOptional: true,
      validate: () => true,
    },
    {
      id: 'vinculos-tags',
      title: 'Vínculos e Organização',
      subtitle: 'Vincule e organize o compromisso',
      isOptional: true,
      validate: () => true,
    },
    {
      id: 'recorrencia',
      title: 'Recorrência',
      subtitle: 'Este compromisso se repete?',
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

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      const formData: EventoFormData = {
        escritorio_id: escritorioId,
        titulo,
        descricao: descricao || undefined,
        data_inicio: dataInicio,
        data_fim: dataFim || dataInicio,
        dia_inteiro: diaInteiro,
        local: local || undefined,
        cor,
        responsavel_id: responsaveisIds[0] || undefined, // Primeiro para compatibilidade
        processo_id: processoId,
        consultivo_id: consultivoId,
      }

      // Se tem recorrência, criar a recorrência em vez do evento direto
      if (recorrencia && recorrencia.ativa) {
        await createRecorrencia({
          nome: titulo,
          descricao: descricao || undefined,
          tipo: 'evento',
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
        toast.success('Compromisso recorrente criado com sucesso!')
      } else {
        // Evento único - criar/atualizar usando hook diretamente
        if (initialData?.id) {
          // Modo edição
          await updateEvento(initialData.id, formData)

          if (responsaveisIds.length > 0) {
            console.log('[EventoWizard] Atualizando responsáveis:', responsaveisIds, 'para evento:', initialData.id)
            await setResponsaveis('evento', initialData.id, responsaveisIds)
          }
          toast.success('Compromisso atualizado com sucesso!')
        } else {
          // Criar novo evento
          const novoEvento = await createEvento(formData)

          // Salvar múltiplos responsáveis na tabela N:N
          if (novoEvento?.id && responsaveisIds.length > 0) {
            console.log('[EventoWizard] Salvando responsáveis:', responsaveisIds, 'para evento:', novoEvento.id)
            await setResponsaveis('evento', novoEvento.id, responsaveisIds)
          }
          toast.success('Compromisso criado com sucesso!')
        }

        // Notificar o pai (para refresh de listas se necessário)
        try {
          await onSubmit(formData)
        } catch {
          // Ignora erro do callback - o evento já foi criado
        }
      }

      onClose()
    } catch (error: any) {
      console.error('Erro ao criar evento:', error)
      toast.error(error?.message || 'Erro ao criar compromisso. Verifique os dados e tente novamente.')
      // NAO chamar onClose() em caso de erro - usuario pode corrigir e tentar de novo
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTipoLabel = (t: TipoEvento) => TIPO_CONFIG[t].label

  return (
    <ModalWizard
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Novo Compromisso"
      onClose={onClose}
      onComplete={handleComplete}
      isSubmitting={isSubmitting}
    >
      {/* ETAPA 1: Tipo e Identificação */}
      {currentStep === 0 && (
        <WizardStep title={steps[0].title} subtitle={steps[0].subtitle}>
          <div className="space-y-4">
            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">Tipo de Compromisso *</Label>
              <div className="grid grid-cols-6 gap-2">
                {(Object.entries(TIPO_CONFIG) as [TipoEvento, typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(
                  ([key, config]) => {
                    const Icon = config.icon
                    const selected = tipoEvento === key

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipoEvento(key)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                          selected
                            ? cn(
                                'border-current shadow-sm',
                                config.color === 'blue' && 'bg-blue-50 text-blue-600 border-blue-300',
                                config.color === 'purple' && 'bg-purple-50 text-purple-600 border-purple-300',
                                config.color === 'emerald' && 'bg-emerald-50 text-emerald-600 border-emerald-300',
                                config.color === 'amber' && 'bg-amber-50 text-amber-600 border-amber-300',
                                config.color === 'red' && 'bg-red-50 text-red-600 border-red-300',
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
                Título do Compromisso *
              </Label>
              <Input
                id="titulo"
                placeholder="Ex: Reunião com cliente"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-slate-500">Mínimo 3 caracteres</p>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-sm font-medium text-[#34495e]">
                Descrição
                <span className="text-xs text-slate-500 font-normal ml-2">(Opcional)</span>
              </Label>
              <Textarea
                id="descricao"
                placeholder="Detalhes do compromisso..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </WizardStep>
      )}

      {/* ETAPA 2: Data e Horário */}
      {currentStep === 1 && (
        <WizardStep title={steps[1].title} subtitle={steps[1].subtitle}>
          <div className="space-y-4">
            {/* Dia Inteiro */}
            <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg">
              <Checkbox
                id="dia-inteiro"
                checked={diaInteiro}
                onCheckedChange={(checked) => setDiaInteiro(checked === true)}
              />
              <Label htmlFor="dia-inteiro" className="text-sm font-medium cursor-pointer">
                Evento de dia inteiro
              </Label>
            </div>

            {/* Data/Hora Início */}
            <div className="space-y-2">
              <Label htmlFor="data-inicio" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#89bcbe]" />
                {diaInteiro ? 'Data' : 'Data e Hora de Início'} *
              </Label>
              {diaInteiro ? (
                <DateInput
                  value={dataInicio}
                  onChange={setDataInicio}
                  placeholder="Selecione a data"
                />
              ) : (
                <DateTimeInput
                  value={dataInicio}
                  onChange={setDataInicio}
                  placeholder="Selecione data e horário"
                />
              )}
            </div>

            {/* Data/Hora Fim */}
            {!diaInteiro && (
              <div className="space-y-2">
                <Label htmlFor="data-fim" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Data e Hora de Término
                  <span className="text-xs text-slate-500 font-normal">(Opcional)</span>
                </Label>
                <DateTimeInput
                  value={dataFim}
                  onChange={setDataFim}
                  placeholder="Selecione data e horário de término"
                />
                <p className="text-xs text-slate-500">Se não informado, assume mesma data/hora do início</p>
              </div>
            )}
          </div>
        </WizardStep>
      )}

      {/* ETAPA 3: Local e Responsável */}
      {currentStep === 2 && (
        <WizardStep title={steps[2].title} subtitle={steps[2].subtitle} isOptional>
          <div className="space-y-4">
            {/* Local */}
            <div className="space-y-2">
              <Label htmlFor="local" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#89bcbe]" />
                Local
                <span className="text-xs text-slate-500 font-normal">(Opcional)</span>
              </Label>
              <Input
                id="local"
                placeholder="Ex: Escritório, Sala 201, ou link de reunião online"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Responsáveis (multi-select) */}
            <ResponsaveisSelector
              escritorioId={escritorioId}
              selectedIds={responsaveisIds}
              onChange={setResponsaveisIds}
              label="Responsáveis"
              placeholder="Selecionar responsáveis (opcional)..."
            />
          </div>
        </WizardStep>
      )}

      {/* ETAPA 4: Vínculos e Organização */}
      {currentStep === 3 && (
        <WizardStep title={steps[3].title} subtitle={steps[3].subtitle} isOptional>
          <div className="space-y-4">
            {/* Vínculos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">
                Vincular a Processo ou Consultivo
              </Label>
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

      {/* ETAPA 5: Recorrência */}
      {currentStep === 4 && (
        <WizardStep title={steps[4].title} subtitle={steps[4].subtitle} isOptional>
          <RecorrenciaConfig
            value={recorrencia}
            onChange={setRecorrencia}
            tipo="evento"
          />
        </WizardStep>
      )}

      {/* ETAPA 6: Revisão - Grid Estruturado */}
      {currentStep === 5 && (
        <WizardStep title={steps[5].title} subtitle={steps[5].subtitle}>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            {/* Grid de Informações */}
            <div className="space-y-4">
              {/* Tipo e Título */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500">Tipo</span>
                <span className="text-[#34495e] font-medium">{getTipoLabel(tipoEvento)}</span>

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

              {/* Data e Horário */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500">Tipo</span>
                <span className="text-[#34495e] font-medium">{diaInteiro ? 'Dia inteiro' : 'Com horário específico'}</span>

                <span className="text-slate-500">Início</span>
                <span className="text-[#34495e] font-medium">
                  {diaInteiro
                    ? formatBrazilDateLong(dataInicio)
                    : formatBrazilDateTime(dataInicio)}
                </span>

                {!diaInteiro && dataFim && (
                  <>
                    <span className="text-slate-500">Término</span>
                    <span className="text-[#34495e] font-medium">
                      {formatBrazilDateTime(dataFim)}
                    </span>
                  </>
                )}

                {local && (
                  <>
                    <span className="text-slate-500">Local</span>
                    <span className="text-[#34495e] font-medium">{local}</span>
                  </>
                )}

                {responsaveisIds.length > 0 && (
                  <>
                    <span className="text-slate-500">Responsáveis</span>
                    <span className="text-[#34495e] font-medium">
                      {responsaveisIds
                        .map(id => membros.find(m => m.user_id === id)?.nome)
                        .filter(Boolean)
                        .join(', ') || 'Definidos'}
                    </span>
                  </>
                )}
              </div>

              {/* Vínculos e Tags */}
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
