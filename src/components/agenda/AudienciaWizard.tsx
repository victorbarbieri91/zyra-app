'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Video, MapPin, Users, FileText, Scale, Gavel, Handshake, Building2 } from 'lucide-react'
import { ModalWizard, WizardStep } from '@/components/wizards'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateTimeInput } from '@/components/ui/datetime-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TagSelector from '@/components/tags/TagSelector'
import VinculacaoSelector, { Vinculacao } from '@/components/agenda/VinculacaoSelector'
import ResponsaveisSelector from '@/components/agenda/ResponsaveisSelector'
import type { AudienciaFormData } from '@/hooks/useAudiencias'
import type { WizardStep as WizardStepType } from '@/components/wizards'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTags } from '@/hooks/useTags'
import { useAgendaResponsaveis } from '@/hooks/useAgendaResponsaveis'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDateTime } from '@/lib/timezone'

interface AudienciaWizardProps {
  escritorioId: string
  processoId?: string | null
  consultivoId?: string | null
  onClose: () => void
  onSubmit: (data: AudienciaFormData) => Promise<void>
  initialData?: Partial<AudienciaFormData>
}

type TipoAudiencia = 'inicial' | 'instrucao' | 'conciliacao' | 'julgamento' | 'una' | 'outra'
type Modalidade = 'presencial' | 'virtual'

const TIPO_CONFIG = {
  inicial: {
    label: 'Inicial',
    icon: Scale,
    color: 'blue',
    description: 'Primeira audiência',
  },
  instrucao: {
    label: 'Instrução',
    icon: FileText,
    color: 'purple',
    description: 'Coleta de provas',
  },
  conciliacao: {
    label: 'Conciliação',
    icon: Handshake,
    color: 'emerald',
    description: 'Tentativa de acordo',
  },
  julgamento: {
    label: 'Julgamento',
    icon: Gavel,
    color: 'red',
    description: 'Sentença',
  },
  una: {
    label: 'Una',
    icon: Building2,
    color: 'amber',
    description: 'Audiência única',
  },
  outra: {
    label: 'Outra',
    icon: Calendar,
    color: 'slate',
    description: 'Outros tipos',
  },
}

export default function AudienciaWizard({
  escritorioId,
  processoId: initialProcessoId,
  consultivoId: initialConsultivoId,
  onClose,
  onSubmit,
  initialData,
}: AudienciaWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar tags para mostrar na revisão
  const { tags } = useTags('agenda', escritorioId)

  // Carregar membros do escritório para exibição na revisão
  const { membros } = useEscritorioMembros(escritorioId)

  // Hook para salvar responsáveis
  const { setResponsaveis } = useAgendaResponsaveis()

  // Form State
  const [tipoAudiencia, setTipoAudiencia] = useState<TipoAudiencia>(initialData?.tipo_audiencia || 'inicial')
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descricao, setDescricao] = useState(initialData?.descricao || '')

  const [dataHora, setDataHora] = useState(initialData?.data_hora || '')
  const [duracaoMinutos, setDuracaoMinutos] = useState(initialData?.duracao_minutos || 60)
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(initialData?.responsavel_id ? [initialData.responsavel_id] : [])

  const [modalidade, setModalidade] = useState<Modalidade>(initialData?.modalidade || 'presencial')

  // Presencial
  const [tribunal, setTribunal] = useState(initialData?.tribunal || '')
  const [comarca, setComarca] = useState(initialData?.comarca || '')
  const [vara, setVara] = useState(initialData?.vara || '')
  const [forum, setForum] = useState(initialData?.forum || '')
  const [sala, setSala] = useState(initialData?.sala || '')
  const [endereco, setEndereco] = useState(initialData?.endereco || '')

  // Virtual
  const [linkVirtual, setLinkVirtual] = useState(initialData?.link_virtual || '')
  const [plataforma, setPlataforma] = useState(initialData?.plataforma || '')

  // Pessoas
  const [juiz, setJuiz] = useState(initialData?.juiz || '')
  const [promotor, setPromotor] = useState(initialData?.promotor || '')
  const [advogadoContrario, setAdvogadoContrario] = useState(initialData?.advogado_contrario || '')

  const [processoId, setProcessoId] = useState<string | null>(initialProcessoId || initialData?.processo_id || null)
  const [consultivoId, setConsultivoId] = useState<string | null>(initialConsultivoId || initialData?.consultivo_id || null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [observacoes, setObservacoes] = useState(initialData?.observacoes || '')
  const [cor, setCor] = useState(initialData?.cor || '#10B981')

  // Estado unificado de vinculação
  const [vinculacao, setVinculacao] = useState<Vinculacao | null>(() => {
    if (initialProcessoId || initialData?.processo_id) {
      return {
        modulo: 'processo',
        modulo_registro_id: (initialProcessoId || initialData?.processo_id)!,
      }
    }
    if (initialConsultivoId || initialData?.consultivo_id) {
      return {
        modulo: 'consultivo',
        modulo_registro_id: (initialConsultivoId || initialData?.consultivo_id)!,
      }
    }
    return null
  })

  // Buscar metadados do processo/consultivo quando vem do initialData
  useEffect(() => {
    const loadMetadados = async () => {
      const supabase = createClient()
      const processoIdToLoad = initialProcessoId || initialData?.processo_id
      const consultivoIdToLoad = initialConsultivoId || initialData?.consultivo_id

      // Se tem processo_id mas vinculação não tem metadados
      if (processoIdToLoad && (!vinculacao?.metadados || Object.keys(vinculacao.metadados).length === 0)) {
        const { data: processo } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            parte_contraria,
            crm_pessoas!processos_processos_cliente_id_fkey(nome_completo, nome_fantasia)
          `)
          .eq('id', processoIdToLoad)
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

      // Se tem consultivo_id mas vinculação não tem metadados
      if (consultivoIdToLoad && (!vinculacao?.metadados || Object.keys(vinculacao.metadados).length === 0)) {
        const { data: consultivo } = await supabase
          .from('consultivo_consultas')
          .select(`
            id,
            numero,
            titulo,
            crm_pessoas!consultivo_consultas_cliente_id_fkey(nome_completo, nome_fantasia)
          `)
          .eq('id', consultivoIdToLoad)
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
  }, [initialProcessoId, initialConsultivoId, initialData?.processo_id, initialData?.consultivo_id])

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
      subtitle: 'Qual tipo de audiência você está agendando?',
      validate: () => titulo.trim().length >= 3 && tipoAudiencia !== '',
    },
    {
      id: 'quando',
      title: 'Data e Horário',
      subtitle: 'Quando acontecerá a audiência?',
      validate: () => dataHora !== '' && duracaoMinutos > 0,
    },
    {
      id: 'local-modalidade',
      title: 'Local e Modalidade',
      subtitle: 'Como será realizada a audiência?',
      validate: () => {
        if (modalidade === 'presencial') {
          return tribunal !== '' || forum !== '' || endereco !== ''
        }
        return linkVirtual !== ''
      },
    },
    {
      id: 'vinculos-organizacao',
      title: 'Vínculos e Organização',
      subtitle: 'Vincule a processo e organize com tags',
      validate: () => processoId !== null || consultivoId !== null,
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
      const formData: AudienciaFormData = {
        escritorio_id: escritorioId,
        processo_id: processoId,
        consultivo_id: consultivoId,
        titulo,
        descricao: descricao || undefined,
        data_hora: dataHora,
        duracao_minutos: duracaoMinutos,
        tipo_audiencia: tipoAudiencia,
        modalidade,
        ...(modalidade === 'presencial' && {
          tribunal: tribunal || undefined,
          comarca: comarca || undefined,
          vara: vara || undefined,
          forum: forum || undefined,
          sala: sala || undefined,
          endereco: endereco || undefined,
        }),
        ...(modalidade === 'virtual' && {
          link_virtual: linkVirtual || undefined,
          plataforma: plataforma || undefined,
        }),
        juiz: juiz || undefined,
        promotor: promotor || undefined,
        advogado_contrario: advogadoContrario || undefined,
        // responsavel_id mantido para retrocompatibilidade
        responsavel_id: responsaveisIds.length > 0 ? responsaveisIds[0] : undefined,
        observacoes: observacoes || undefined,
        cor,
      }

      console.log('FormData sendo enviado:', formData)
      const novaAudiencia = await onSubmit(formData)

      // Salvar responsáveis na tabela N:N
      if (novaAudiencia && (novaAudiencia as any).id && responsaveisIds.length > 0) {
        await setResponsaveis('audiencia', (novaAudiencia as any).id, responsaveisIds)
      }

      onClose()
    } catch (error) {
      console.error('Erro ao criar audiência:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTipoLabel = (t: TipoAudiencia) => TIPO_CONFIG[t].label

  return (
    <ModalWizard
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Nova Audiência"
      onClose={onClose}
      onComplete={handleComplete}
      isSubmitting={isSubmitting}
    >
      {/* ETAPA 1: Tipo e Identificação */}
      {currentStep === 0 && (
        <WizardStep title={steps[0].title} subtitle={steps[0].subtitle}>
          <div className="space-y-4">
            {/* Tipo de Audiência */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">Tipo de Audiência *</Label>
              <div className="grid grid-cols-6 gap-2">
                {(Object.entries(TIPO_CONFIG) as [TipoAudiencia, typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(
                  ([key, config]) => {
                    const Icon = config.icon
                    const selected = tipoAudiencia === key

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipoAudiencia(key)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                          selected
                            ? cn(
                                'border-current shadow-sm',
                                config.color === 'blue' && 'bg-blue-50 text-blue-600 border-blue-300',
                                config.color === 'purple' && 'bg-purple-50 text-purple-600 border-purple-300',
                                config.color === 'emerald' && 'bg-emerald-50 text-emerald-600 border-emerald-300',
                                config.color === 'red' && 'bg-red-50 text-red-600 border-red-300',
                                config.color === 'amber' && 'bg-amber-50 text-amber-600 border-amber-300',
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
                Título da Audiência *
              </Label>
              <Input
                id="titulo"
                placeholder="Ex: Audiência de Conciliação - Processo 123..."
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
                placeholder="Detalhes da audiência..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
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
            {/* Data e Hora */}
            <div className="space-y-2">
              <Label htmlFor="data-hora" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#89bcbe]" />
                Data e Horário *
              </Label>
              <DateTimeInput
                value={dataHora}
                onChange={setDataHora}
                placeholder="Selecione data e horário da audiência"
              />
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <Label htmlFor="duracao" className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#89bcbe]" />
                Duração *
              </Label>
              <Select value={duracaoMinutos.toString()} onValueChange={(v) => setDuracaoMinutos(parseInt(v))}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="180">3 horas</SelectItem>
                  <SelectItem value="240">4 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Responsáveis */}
            <ResponsaveisSelector
              escritorioId={escritorioId}
              selectedIds={responsaveisIds}
              onChange={setResponsaveisIds}
              label="Advogados Responsáveis"
              placeholder="Selecionar responsáveis..."
            />
          </div>
        </WizardStep>
      )}

      {/* ETAPA 3: Local e Modalidade */}
      {currentStep === 2 && (
        <WizardStep title={steps[2].title} subtitle={steps[2].subtitle}>
          <div className="space-y-4">
            {/* Modalidade - Cards Visuais */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">Modalidade *</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalidade('presencial')}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all',
                    modalidade === 'presencial'
                      ? 'border-[#10B981] bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm">Presencial</div>
                    <div className="text-xs text-slate-500">Fórum/tribunal</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModalidade('virtual')}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all',
                    modalidade === 'virtual'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <Video className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm">Virtual</div>
                    <div className="text-xs text-slate-500">Videoconferência</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Campos Presencial */}
            {modalidade === 'presencial' && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-[320px] overflow-y-auto">
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="tribunal" className="text-xs font-medium text-[#34495e]">Tribunal *</Label>
                      <Input
                        id="tribunal"
                        placeholder="Ex: TJSP"
                        value={tribunal}
                        onChange={(e) => setTribunal(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="comarca" className="text-xs font-medium text-[#34495e]">Comarca</Label>
                      <Input
                        id="comarca"
                        placeholder="Ex: São Paulo"
                        value={comarca}
                        onChange={(e) => setComarca(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="forum" className="text-xs font-medium text-[#34495e]">Fórum *</Label>
                      <Input
                        id="forum"
                        placeholder="Nome do fórum"
                        value={forum}
                        onChange={(e) => setForum(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vara" className="text-xs font-medium text-[#34495e]">Vara</Label>
                      <Input
                        id="vara"
                        placeholder="Ex: 1ª Vara Cível"
                        value={vara}
                        onChange={(e) => setVara(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="sala" className="text-xs font-medium text-[#34495e]">Sala</Label>
                      <Input
                        id="sala"
                        placeholder="Ex: 201"
                        value={sala}
                        onChange={(e) => setSala(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endereco" className="text-xs font-medium text-[#34495e]">Endereço</Label>
                      <Input
                        id="endereco"
                        placeholder="Rua, número..."
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campos Virtual */}
            {modalidade === 'virtual' && (
              <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="link-virtual" className="text-sm font-medium text-[#34495e]">Link da Reunião *</Label>
                  <Input
                    id="link-virtual"
                    type="url"
                    placeholder="https://zoom.us/j/... ou https://teams.microsoft.com/..."
                    value={linkVirtual}
                    onChange={(e) => setLinkVirtual(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plataforma" className="text-sm font-medium text-[#34495e]">Plataforma</Label>
                  <Select value={plataforma} onValueChange={setPlataforma}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Google Meet">Google Meet</SelectItem>
                      <SelectItem value="Cisco Webex">Cisco Webex</SelectItem>
                      <SelectItem value="Outra">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </WizardStep>
      )}

      {/* ETAPA 4: Vínculos e Organização */}
      {currentStep === 3 && (
        <WizardStep title={steps[3].title} subtitle={steps[3].subtitle}>
          <div className="space-y-4">
            {/* Vínculo Obrigatório com VinculacaoSelector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e]">
                Vincular a Processo ou Consultivo *
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

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes" className="text-sm font-medium text-[#34495e]">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais sobre a audiência..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </WizardStep>
      )}

      {/* ETAPA 5: Revisão - Grid Estruturado */}
      {currentStep === 4 && (
        <WizardStep title={steps[4].title} subtitle={steps[4].subtitle}>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            {/* Grid de Informações */}
            <div className="space-y-4">
              {/* Tipo e Título */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500">Tipo</span>
                <span className="text-[#34495e] font-medium">{getTipoLabel(tipoAudiencia)}</span>

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
                <span className="text-slate-500">Data/Hora</span>
                <span className="text-[#34495e] font-medium">
                  {formatBrazilDateTime(dataHora)}
                </span>

                <span className="text-slate-500">Duração</span>
                <span className="text-[#34495e] font-medium">{duracaoMinutos} minutos</span>

                {responsaveisIds.length > 0 && (
                  <>
                    <span className="text-slate-500">Responsáveis</span>
                    <span className="text-[#34495e] font-medium">
                      {responsaveisIds.map(id => membros.find(m => m.user_id === id)?.nome || 'Não encontrado').join(', ')}
                    </span>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100" />

              {/* Local e Modalidade */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500">Modalidade</span>
                <span className="text-[#34495e] font-medium">
                  {modalidade === 'presencial' ? 'Presencial' : 'Virtual'}
                </span>

                {modalidade === 'presencial' ? (
                  <>
                    {tribunal && (
                      <>
                        <span className="text-slate-500">Tribunal</span>
                        <span className="text-[#34495e] font-medium">{tribunal}</span>
                      </>
                    )}
                    {forum && (
                      <>
                        <span className="text-slate-500">Fórum</span>
                        <span className="text-[#34495e] font-medium">{forum}</span>
                      </>
                    )}
                    {vara && (
                      <>
                        <span className="text-slate-500">Vara</span>
                        <span className="text-[#34495e] font-medium">{vara}</span>
                      </>
                    )}
                    {endereco && (
                      <>
                        <span className="text-slate-500">Endereço</span>
                        <span className="text-slate-600 text-[11px] leading-relaxed">{endereco}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">Link</span>
                    <a
                      href={linkVirtual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-[11px] truncate"
                    >
                      {linkVirtual}
                    </a>
                    {plataforma && (
                      <>
                        <span className="text-slate-500">Plataforma</span>
                        <span className="text-[#34495e] font-medium">{plataforma}</span>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Pessoas e Vínculos */}
              {(vinculacao || juiz || promotor || advogadoContrario || selectedTagIds.length > 0) && (
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

                    {juiz && (
                      <>
                        <span className="text-slate-500">Juiz(a)</span>
                        <span className="text-[#34495e] font-medium">{juiz}</span>
                      </>
                    )}

                    {promotor && (
                      <>
                        <span className="text-slate-500">Promotor(a)</span>
                        <span className="text-[#34495e] font-medium">{promotor}</span>
                      </>
                    )}

                    {advogadoContrario && (
                      <>
                        <span className="text-slate-500">Adv. Contrário</span>
                        <span className="text-[#34495e] font-medium">{advogadoContrario}</span>
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
