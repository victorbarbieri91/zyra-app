'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, CalendarClock, Clock, Link as LinkIcon, CheckSquare, Briefcase, UserCheck, FileText, ClipboardList, Zap, TrendingUp, ChevronRight, Repeat, ListTree, Pin, Mail, Loader2, Scale, Gavel, CheckCircle2 } from 'lucide-react'
import { ModalWizard, WizardStep, ReviewCard } from '@/components/wizards'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateInput } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useDropzone } from 'react-dropzone'
import VinculacaoSelector from '@/components/agenda/VinculacaoSelector'
import RecorrenciaConfig, { RecorrenciaData, getRecorrenciaSummary } from '@/components/agenda/RecorrenciaConfig'
import ResponsaveisSelector from '@/components/agenda/ResponsaveisSelector'
import type { TarefaFormData } from '@/hooks/useTarefas'
import type { WizardStep as WizardStepType } from '@/components/wizards/types'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRecorrencias } from '@/hooks/useRecorrencias'
import { useTarefas } from '@/hooks/useTarefas'
import { useAgendaResponsaveis } from '@/hooks/useAgendaResponsaveis'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { createClient } from '@/lib/supabase/client'
import { parseDateInBrazil, formatBrazilDateLong } from '@/lib/timezone'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  CONTENCIOSO_TIPOS,
  CONSULTIVO_TIPOS,
  getTipoLabel,
  getTipoSelectedClasses,
  type TipoTarefaContencioso,
  type TipoTarefaConsultivo,
  type CategoriaTarefa,
} from '@/lib/constants/tarefa-tipos'

interface TarefaWizardProps {
  escritorioId: string
  onClose: () => void
  onSubmit?: (data: TarefaFormData) => Promise<void> // Callback opcional após criação
  onCreated?: () => void | Promise<void> // Callback após tarefa criada
  initialData?: Partial<TarefaFormData>
}

type TipoTarefa = TipoTarefaContencioso | TipoTarefaConsultivo
type Prioridade = 'alta' | 'media' | 'baixa'
type PrazoTipo = 'recurso' | 'manifestacao' | 'cumprimento' | 'juntada' | 'pagamento' | 'outro'

export default function TarefaWizard({ escritorioId, onClose, onSubmit, onCreated, initialData }: TarefaWizardProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toggle Contencioso/Consultivo
  const [modoTipo, setModoTipo] = useState<CategoriaTarefa>(() => {
    if (initialData?.consultivo_id) return 'consultivo'
    return 'contencioso'
  })

  // Email drag-and-drop
  const [emailProcessing, setEmailProcessing] = useState(false)
  const [emailFileName, setEmailFileName] = useState<string | null>(null)
  const [emailProcessed, setEmailProcessed] = useState(false)

  // Carregar membros do escritório para exibição na revisão
  const { membros } = useEscritorioMembros(escritorioId)

  // Hook para criar tarefas diretamente
  const { createTarefa } = useTarefas(escritorioId)

  // Hook para carregar responsáveis existentes (apenas para edição)
  const { getResponsaveis } = useAgendaResponsaveis()

  // Form State — se editando tarefa fixa, exibir como 'administrativo' (tipo original perdido)
  const [tipo, setTipo] = useState<TipoTarefa>(() => {
    if (initialData?.tipo === 'fixa') return 'administrativo'
    const t = initialData?.tipo as TipoTarefa | undefined
    if (t && (t in CONTENCIOSO_TIPOS || t in CONSULTIVO_TIPOS)) return t
    // Default conforme modo
    if (initialData?.consultivo_id) return 'cons_parecer'
    return 'outro'
  })
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descricao, setDescricao] = useState(initialData?.descricao || '')

  // Helper para extrair parte da data (yyyy-MM-dd) de ISO datetime
  const extractDatePart = (dateStr?: string | null) => {
    if (!dateStr) return ''
    return dateStr.split('T')[0]
  }

  const [dataExecucao, setDataExecucao] = useState(extractDatePart(initialData?.data_inicio))
  const [prazoFatal, setPrazoFatal] = useState(
    extractDatePart(initialData?.prazo_data_limite) || extractDatePart(initialData?.data_fim)
  )
  const [prioridade, setPrioridade] = useState<Prioridade>(initialData?.prioridade || 'media')
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(
    initialData?.responsavel_id ? [initialData.responsavel_id] : (user?.id ? [user.id] : [])
  )

  const [processoId, setProcessoId] = useState<string | null>(initialData?.processo_id || null)
  const [consultivoId, setConsultivoId] = useState<string | null>(initialData?.consultivo_id || null)

  const [cor, setCor] = useState(initialData?.cor || '#3B82F6')

  // Estado de recorrência — se editando tarefa fixa, inicializar com isFixa: true
  const [recorrencia, setRecorrencia] = useState<RecorrenciaData | null>(() => {
    if (initialData?.tipo === 'fixa') {
      return {
        ativa: false,
        isFixa: true,
        frequencia: 'diaria',
        intervalo: 1,
        dataInicio: new Date().toISOString().split('T')[0],
        terminoTipo: 'permanente',
        horaPadrao: '09:00',
      }
    }
    return null
  })

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

  // Sincronizar vinculacao com processoId/consultivoId + auto-switch modo
  useEffect(() => {
    if (vinculacao) {
      if (vinculacao.modulo === 'processo') {
        setProcessoId(vinculacao.modulo_registro_id)
        setConsultivoId(null)
        // Auto-switch para contencioso se estava em consultivo
        if (modoTipo === 'consultivo') {
          setModoTipo('contencioso')
          setTipo('outro')
        }
      } else if (vinculacao.modulo === 'consultivo') {
        setConsultivoId(vinculacao.modulo_registro_id)
        setProcessoId(null)
        // Auto-switch para consultivo se estava em contencioso
        if (modoTipo === 'contencioso') {
          setModoTipo('consultivo')
          setTipo('cons_parecer')
        }
      }
    } else {
      setProcessoId(null)
      setConsultivoId(null)
    }
  }, [vinculacao])

  // Drag-and-drop de e-mail (.msg do Outlook)
  const onDropEmail = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setEmailFileName(file.name)
    setEmailProcessing(true)
    setEmailProcessed(false)

    try {
      // Ler arquivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      let emailSubject = ''
      let emailBody = ''

      // Tentar parsear .msg com msgreader
      try {
        const MsgReader = (await import('@kenjiuno/msgreader')).default
        const msgReader = new MsgReader(arrayBuffer)
        const msgData = msgReader.getFileData()

        emailSubject = msgData.subject || ''
        emailBody = msgData.body || ''
      } catch {
        // Fallback: ler como texto bruto (pode ser .eml ou texto)
        const decoder = new TextDecoder('utf-8')
        const rawText = decoder.decode(arrayBuffer)
        // Tentar extrair subject de headers
        const subjectMatch = rawText.match(/(?:Subject|Assunto):\s*(.+)/i)
        emailSubject = subjectMatch?.[1]?.trim() || ''
        emailBody = rawText
      }

      const emailText = emailSubject
        ? `Assunto: ${emailSubject}\n\n${emailBody}`
        : emailBody

      if (!emailText.trim()) {
        throw new Error('Não foi possível extrair texto do e-mail')
      }

      // Enviar à edge function para processamento com IA
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('processar-email-tarefa', {
        body: { email_text: emailText, modo: modoTipo },
      })

      if (error) throw error
      if (!data?.sucesso) throw new Error(data?.erro || 'Erro ao processar e-mail')

      const resultado = data.resultado

      // Título = assunto exato do e-mail (não reinterpretado pela IA)
      setTitulo(emailSubject || resultado.titulo || '')

      // Descrição = resumo da IA + conteúdo limpo do último e-mail
      const resumoIA = resultado.descricao || ''
      const conteudoLimpo = resultado.conteudo_ultimo_email || ''
      const partes = [resumoIA, conteudoLimpo].filter(Boolean)
      const descricaoFinal = partes.length > 1
        ? `${resumoIA}\n\n--- E-mail original ---\n${conteudoLimpo}`
        : partes[0] || emailBody.slice(0, 500)
      setDescricao(descricaoFinal)
      if (resultado.tipo_sugerido) {
        const tipoSugerido = resultado.tipo_sugerido as TipoTarefa
        if (modoTipo === 'contencioso' && tipoSugerido in CONTENCIOSO_TIPOS) {
          setTipo(tipoSugerido)
        } else if (modoTipo === 'consultivo' && tipoSugerido in CONSULTIVO_TIPOS) {
          setTipo(tipoSugerido)
        }
      }
      if (resultado.prioridade_sugerida) {
        const prio = resultado.prioridade_sugerida as Prioridade
        if (['alta', 'media', 'baixa'].includes(prio)) setPrioridade(prio)
      }

      setEmailProcessed(true)
      toast.success('E-mail processado! Campos preenchidos automaticamente.')

      // Reset do estado visual após 3s
      setTimeout(() => {
        setEmailProcessed(false)
        setEmailFileName(null)
      }, 3000)
    } catch (err: any) {
      console.error('Erro ao processar e-mail:', err)
      toast.error(err?.message || 'Erro ao processar e-mail')
      setEmailFileName(null)
    } finally {
      setEmailProcessing(false)
    }
  }, [modoTipo])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropEmail,
    accept: {
      'application/vnd.ms-outlook': ['.msg'],
      'message/rfc822': ['.eml'],
    },
    maxFiles: 1,
    noClick: false,
    noKeyboard: true,
  })

  // Carregar responsáveis existentes quando estamos editando (initialData tem id)
  // Pular para instâncias virtuais (não existem no banco)
  useEffect(() => {
    const loadResponsaveis = async () => {
      if (initialData?.id && !initialData.id.startsWith('virtual_') && !initialData.is_virtual) {
        const responsaveis = await getResponsaveis('tarefa', initialData.id)
        if (responsaveis.length > 0) {
          setResponsaveisIds(responsaveis.map(r => r.user_id))
        }
      }
    }
    loadResponsaveis()
  }, [initialData?.id])

  const isFixa = recorrencia?.isFixa === true

  // Step Definitions
  const steps: WizardStepType[] = [
    {
      id: 'tipo-identificacao',
      title: 'Tipo e Identificação',
      subtitle: 'Qual tipo de tarefa você está criando?',
      validate: () => (tipo as string) !== '' && titulo.trim().length >= 3,
    },
    {
      id: 'quando-responsabilidade',
      title: isFixa ? 'Responsabilidade' : 'Quando e Responsabilidade',
      subtitle: isFixa ? 'Quem será responsável por esta tarefa fixa?' : 'Quando você vai fazer esta tarefa?',
      validate: () => isFixa ? true : dataExecucao !== '',
    },
    {
      id: 'vinculos',
      title: 'Vínculos',
      subtitle: isFixa ? 'Vincule a um processo ou consultivo (obrigatório para lançar horas)' : 'Vincule a processos ou consultivos',
      isOptional: !isFixa,
      validate: () => isFixa ? (!!processoId || !!consultivoId) : true,
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

  // (steps removido — fixa agora é selecionada dentro do step de recorrência)

  const handleComplete = async () => {
    if (responsaveisIds.length === 0) {
      toast.error('Selecione pelo menos um responsável')
      return
    }
    setIsSubmitting(true)
    try {
      // Converter datas YYYY-MM-DD para ISO com horário meio-dia para evitar problemas de timezone
      const formatDateToISO = (dateStr: string) => {
        if (!dateStr) return undefined
        // Adicionar horário 12:00:00 para evitar mudança de dia com timezone
        return `${dateStr}T12:00:00`
      }

      // Tarefas fixas usam hoje como data_inicio (a view substituirá por CURRENT_DATE)
      const dataInicioFinal = isFixa
        ? format(new Date(), 'yyyy-MM-dd')
        : dataExecucao

      const formData: TarefaFormData = {
        escritorio_id: escritorioId,
        tipo: isFixa ? 'fixa' : tipo,
        titulo,
        descricao: descricao || undefined,
        data_inicio: formatDateToISO(dataInicioFinal),
        data_fim: (isFixa || !prazoFatal) ? undefined : formatDateToISO(prazoFatal),
        prioridade,
        // Responsáveis: array direto + responsavel_id para retrocompatibilidade
        responsaveis_ids: responsaveisIds,
        responsavel_id: responsaveisIds.length > 0 ? responsaveisIds[0] : undefined,
        cor,
        processo_id: processoId,
        consultivo_id: consultivoId,
        // Para prazos processuais, enviar prazo_data_limite (nunca para fixas)
        prazo_data_limite: (!isFixa && tipo === 'prazo_processual' && prazoFatal) ? prazoFatal : undefined,
      }

      // Verificar se estamos editando (initialData tem id)
      const isEditing = initialData?.id

      // Se tem recorrência, criar a recorrência em vez da tarefa direta
      if (recorrencia && recorrencia.ativa && !isEditing) {
        // Enriquecer templateDados com dados de display para instâncias virtuais
        const templateComDisplay = {
          ...formData,
          _display: {
            responsavel_nome: membros.find(m => m.user_id === responsaveisIds[0])?.nome,
            caso_titulo: vinculacao?.metadados?.partes,
            processo_numero: vinculacao?.metadados?.numero_cnj,
            consultivo_titulo: vinculacao?.metadados?.titulo,
          }
        }

        await createRecorrencia({
          nome: titulo,
          descricao: descricao || undefined,
          tipo: 'tarefa',
          templateDados: templateComDisplay,
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
        toast.success('Tarefa recorrente criada com sucesso!')
      } else if (isEditing) {
        // Modo edição - usar onSubmit do pai (se fornecido) para atualizar
        // responsaveis_ids já está incluído no formData e será salvo diretamente
        if (onSubmit) {
          await onSubmit(formData)
        }
        // Callback opcional
        if (onCreated) {
          await onCreated()
        }
      } else {
        // Tarefa única nova - criar usando useTarefas diretamente
        // responsaveis_ids já está incluído no formData e será salvo diretamente
        await createTarefa(formData)
        toast.success(isFixa ? 'Tarefa fixa criada com sucesso!' : 'Tarefa criada com sucesso!')

        // Callback opcional para o pai saber que foi criado (para atualizar listas)
        if (onCreated) {
          await onCreated()
        }
      }

      onClose()
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error)
      toast.error(error?.message || 'Erro ao criar tarefa. Verifique os dados e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getLocalTipoLabel = (t: string) => getTipoLabel(t)

  const getPrioridadeLabel = (p: Prioridade) => {
    const labels = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
    return labels[p]
  }

  return (
    <ModalWizard
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Nova Tarefa"
      onClose={onClose}
      onComplete={handleComplete}
      isSubmitting={isSubmitting}
      className="max-w-3xl"
    >
      {/* ETAPA 1: Tipo e Identificação */}
      {steps[currentStep]?.id === 'tipo-identificacao' && (
        <WizardStep title={steps[currentStep].title} subtitle={steps[currentStep].subtitle}>
          <div className="space-y-5">
            {/* Label + Switch inline */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium text-[#34495e] dark:text-slate-200">Tipo de Tarefa *</Label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-[11px] font-medium transition-colors',
                    modoTipo === 'contencioso' ? 'text-[#34495e] dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                  )}>
                    Contencioso
                  </span>
                  <Switch
                    checked={modoTipo === 'consultivo'}
                    onCheckedChange={(checked) => {
                      const novoModo = checked ? 'consultivo' : 'contencioso'
                      setModoTipo(novoModo)
                      if (checked && tipo in CONTENCIOSO_TIPOS) setTipo('cons_parecer')
                      if (!checked && tipo in CONSULTIVO_TIPOS) setTipo('outro')
                    }}
                  />
                  <span className={cn(
                    'text-[11px] font-medium transition-colors',
                    modoTipo === 'consultivo' ? 'text-[#34495e] dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                  )}>
                    Consultivo
                  </span>
                </div>
              </div>

              {/* Grid de tipos conforme modo */}
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(modoTipo === 'contencioso' ? CONTENCIOSO_TIPOS : CONSULTIVO_TIPOS).map(
                  ([key, config]) => {
                    const Icon = config.icon
                    const selected = tipo === key

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipo(key as TipoTarefa)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                          selected
                            ? cn('border-current shadow-sm', getTipoSelectedClasses(config.color))
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:bg-surface-1 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300'
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

            {/* Dropzone de e-mail — faixa discreta */}
            <div
              {...getRootProps()}
              className={cn(
                'flex items-center gap-2 py-2 px-3 rounded-md border border-dashed cursor-pointer transition-all',
                isDragActive
                  ? 'border-[#89bcbe] bg-[#f0f9f9] dark:bg-teal-500/5 dark:border-teal-500/40'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                emailProcessing && 'pointer-events-none opacity-70'
              )}
            >
              <input {...getInputProps()} />
              {emailProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-[#89bcbe] animate-spin flex-shrink-0" />
                  <span className="text-[11px] text-[#34495e] dark:text-slate-300 truncate">
                    Processando {emailFileName}...
                  </span>
                </>
              ) : emailProcessed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    E-mail processado
                  </span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {isDragActive ? 'Solte o e-mail aqui' : 'Arraste um e-mail do Outlook aqui ou clique para selecionar'}
                  </span>
                </>
              )}
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-sm font-medium text-[#34495e] dark:text-slate-200">
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
              <Label htmlFor="descricao" className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                Descrição
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-2">(Opcional)</span>
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
      {steps[currentStep]?.id === 'quando-responsabilidade' && (
        <WizardStep title={steps[currentStep].title} subtitle={steps[currentStep].subtitle}>
          <div className="space-y-4">
            {/* Info para tarefa fixa */}
            {isFixa && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700 dark:bg-teal-500/10 dark:border-teal-500/30 dark:text-teal-400">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Pin className="w-3.5 h-3.5" />
                  Tarefa Fixa — aparece todo dia
                </div>
                <p className="text-teal-600 dark:text-teal-400">Não é necessário definir data. Esta tarefa aparecerá automaticamente no dia atual.</p>
              </div>
            )}

            {/* Data de Execução (esconde para fixa) */}
            {!isFixa && (
              <div className="space-y-2">
                <Label htmlFor="data-execucao" className="text-sm font-medium text-[#34495e] dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#89bcbe]" />
                  Data que irei realizar *
                </Label>
                <DateInput
                  value={dataExecucao}
                  onChange={setDataExecucao}
                />
              </div>
            )}

            {/* Prazo Fatal (esconde para fixa) */}
            {!isFixa && (
              <div className="space-y-2">
                <Label htmlFor="prazo-fatal" className="text-sm font-medium text-[#34495e] dark:text-slate-200 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#34495e]" />
                  Prazo Fatal
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">(Opcional)</span>
                </Label>
                <DateInput
                  value={prazoFatal}
                  onChange={setPrazoFatal}
                />
              </div>
            )}

            {/* Prioridade */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#34495e] dark:text-slate-200">
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
                              config.color === 'red' && 'bg-red-50 text-red-600 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/50',
                              config.color === 'amber' && 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/50',
                              config.color === 'emerald' && 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/50'
                            )
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:bg-surface-1 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300'
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
              label="Responsáveis *"
              placeholder="Selecionar responsáveis..."
            />
          </div>
        </WizardStep>
      )}

      {/* ETAPA 3: Vínculos */}
      {steps[currentStep]?.id === 'vinculos' && (
        <WizardStep
          title={steps[currentStep].title}
          subtitle={steps[currentStep].subtitle}
          isOptional={!isFixa}
        >
          <div className="space-y-4">
            {/* Aviso para tarefa fixa */}
            {isFixa && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
                Obrigatório vincular a um processo ou consultivo para poder lançar horas.
              </div>
            )}
            {/* Vínculos */}
            <div className="space-y-2">
              <VinculacaoSelector
                vinculacao={vinculacao}
                onChange={setVinculacao}
              />
            </div>
          </div>
        </WizardStep>
      )}

      {/* ETAPA 4: Recorrência */}
      {steps[currentStep]?.id === 'recorrencia' && (
        <WizardStep
          title={steps[currentStep].title}
          subtitle={steps[currentStep].subtitle}
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
      {steps[currentStep]?.id === 'revisao' && (
        <WizardStep title={steps[currentStep].title} subtitle={steps[currentStep].subtitle}>
          <div className="bg-white border border-slate-200 rounded-lg p-4 dark:bg-surface-1 dark:border-slate-700">
            {/* Grid de Informações */}
            <div className="space-y-4">
              {/* Tipo e Título */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Tipo</span>
                <span className="text-[#34495e] dark:text-slate-200 font-medium">
                  {getLocalTipoLabel(tipo)}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-1.5">
                    ({modoTipo === 'contencioso' ? 'Contencioso' : 'Consultivo'})
                  </span>
                </span>

                {isFixa && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">Modo</span>
                    <span className="text-teal-600 dark:text-teal-400 font-medium">Tarefa Fixa (todo dia)</span>
                  </>
                )}

                <span className="text-slate-500 dark:text-slate-400">Título</span>
                <span className="text-[#34495e] dark:text-slate-200 font-medium">{titulo}</span>

                {descricao && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">Descrição</span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{descricao}</span>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* Datas e Prioridade */}
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Execução</span>
                <span className="text-[#34495e] dark:text-slate-200 font-medium">
                  {isFixa ? 'Todo dia (tarefa fixa)' : (dataExecucao ? formatBrazilDateLong(parseDateInBrazil(dataExecucao, 'yyyy-MM-dd')) : 'Não definida')}
                </span>

                {!isFixa && prazoFatal && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">Prazo Fatal</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {prazoFatal ? formatBrazilDateLong(parseDateInBrazil(prazoFatal, 'yyyy-MM-dd')) : 'Não definido'}
                    </span>
                  </>
                )}

                <span className="text-slate-500 dark:text-slate-400">Prioridade</span>
                <span className={cn(
                  "font-medium",
                  prioridade === 'alta' && "text-red-600 dark:text-red-400",
                  prioridade === 'media' && "text-amber-600 dark:text-amber-400",
                  prioridade === 'baixa' && "text-emerald-600 dark:text-emerald-400"
                )}>
                  {getPrioridadeLabel(prioridade)}
                </span>

                {responsaveisIds.length > 0 && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">Responsáveis</span>
                    <span className="text-[#34495e] dark:text-slate-200 font-medium">
                      {responsaveisIds.map(id => membros.find(m => m.user_id === id)?.nome || 'Não encontrado').join(', ')}
                    </span>
                  </>
                )}
              </div>

              {/* Vínculos (se houver) */}
              {vinculacao && (
                <>
                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Vinculado a</span>
                    <div className="text-[#34495e] dark:text-slate-200">
                      <div className="font-medium">
                        {vinculacao.metadados?.partes || vinculacao.metadados?.titulo || `Pasta ${vinculacao.metadados?.numero_pasta}`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {vinculacao.metadados?.numero_pasta && `Pasta ${vinculacao.metadados.numero_pasta}`}
                        {vinculacao.metadados?.numero_cnj && ` • CNJ: ${vinculacao.metadados.numero_cnj}`}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Recorrência (se houver) */}
              {recorrencia?.ativa && (
                <>
                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Recorrência</span>
                    <span className="text-[#34495e] dark:text-slate-200 font-medium flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-[#89bcbe]" />
                      {getRecorrenciaSummary(recorrencia)}
                    </span>
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
