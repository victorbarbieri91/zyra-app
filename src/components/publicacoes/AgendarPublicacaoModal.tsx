'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  CheckSquare,
  Calendar,
  Gavel,
  Save,
  X,
  Loader2,
  Clock,
  User,
  MapPin,
  Video,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTarefas } from '@/hooks/useTarefas'
import { useEventos } from '@/hooks/useEventos'
import { useAudiencias } from '@/hooks/useAudiencias'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDateForDB, formatDateTimeForDB } from '@/lib/timezone'

interface Publicacao {
  id: string
  escritorio_id: string
  data_publicacao: string | null
  tribunal: string | null
  vara: string | null
  tipo_publicacao: string | null
  numero_processo: string | null
  processo_id: string | null
  texto_completo: string | null
}

interface AgendarPublicacaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicacao: Publicacao
  escritorioId: string
  onSuccess?: () => void
}

type TabType = 'tarefa' | 'compromisso' | 'audiencia'

export default function AgendarPublicacaoModal({
  open,
  onOpenChange,
  publicacao,
  escritorioId,
  onSuccess
}: AgendarPublicacaoModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tarefa')
  const [salvando, setSalvando] = useState(false)

  const { createTarefa } = useTarefas(escritorioId)
  const { createEvento } = useEventos(escritorioId)
  const { createAudiencia } = useAudiencias(escritorioId)
  const supabase = createClient()

  // Estado do formulário de Tarefa
  const [tarefaForm, setTarefaForm] = useState({
    tipo: 'prazo_processual' as 'prazo_processual' | 'acompanhamento' | 'follow_up' | 'administrativo' | 'outro',
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    prioridade: 'media' as 'alta' | 'media' | 'baixa',
    prazo_dias: 15,
    prazo_dias_uteis: true
  })

  // Estado do formulário de Compromisso
  const [compromissoForm, setCompromissoForm] = useState({
    titulo: '',
    descricao: '',
    data_inicio: '',
    hora_inicio: '09:00',
    data_fim: '',
    hora_fim: '10:00',
    local: '',
    participantes: ''
  })

  // Estado do formulário de Audiência
  const [audienciaForm, setAudienciaForm] = useState({
    tipo_audiencia: 'instrucao' as 'inicial' | 'instrucao' | 'conciliacao' | 'julgamento' | 'una' | 'outra',
    titulo: '',
    descricao: '',
    data: '',
    hora: '14:00',
    duracao_minutos: 60,
    modalidade: 'presencial' as 'presencial' | 'virtual',
    tribunal: '',
    comarca: '',
    vara: '',
    sala: '',
    link_virtual: '',
    plataforma: ''
  })

  // Pré-preencher dados quando publicação mudar
  useEffect(() => {
    if (publicacao) {
      const dataBase = publicacao.data_publicacao || new Date().toISOString().split('T')[0]

      // Tarefa
      setTarefaForm(prev => ({
        ...prev,
        titulo: `Prazo - ${publicacao.tipo_publicacao || 'Publicação'} - ${publicacao.numero_processo || 'S/N'}`,
        descricao: publicacao.texto_completo?.substring(0, 500) || '',
        data_inicio: dataBase
      }))

      // Compromisso
      setCompromissoForm(prev => ({
        ...prev,
        titulo: `${publicacao.tipo_publicacao || 'Publicação'} - ${publicacao.numero_processo || 'S/N'}`,
        descricao: publicacao.texto_completo?.substring(0, 500) || '',
        data_inicio: dataBase,
        data_fim: dataBase
      }))

      // Audiência
      setAudienciaForm(prev => ({
        ...prev,
        titulo: `Audiência - ${publicacao.numero_processo || 'S/N'}`,
        descricao: publicacao.texto_completo?.substring(0, 500) || '',
        data: dataBase,
        tribunal: publicacao.tribunal || '',
        vara: publicacao.vara || ''
      }))
    }
  }, [publicacao])

  const temProcesso = !!publicacao?.processo_id

  // Atualizar publicação com referência ao agendamento
  const atualizarPublicacaoComAgendamento = async (agendamentoId: string, tipo: TabType) => {
    const { error } = await supabase
      .from('publicacoes_publicacoes')
      .update({
        agendamento_id: agendamentoId,
        agendamento_tipo: tipo,
        status: 'processada'
      })
      .eq('id', publicacao.id)

    if (error) {
      console.error('Erro ao atualizar publicação:', error)
    }
  }

  // Salvar Tarefa
  const handleSalvarTarefa = async () => {
    if (!tarefaForm.titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    setSalvando(true)
    try {
      const tarefa = await createTarefa({
        escritorio_id: escritorioId,
        tipo: tarefaForm.tipo,
        titulo: tarefaForm.titulo,
        descricao: tarefaForm.descricao,
        data_inicio: tarefaForm.data_inicio ? formatDateForDB(tarefaForm.data_inicio) : null,
        data_fim: tarefaForm.data_fim ? formatDateForDB(tarefaForm.data_fim) : null,
        prioridade: tarefaForm.prioridade,
        processo_id: publicacao.processo_id || undefined,
        prazo_data_intimacao: tarefaForm.tipo === 'prazo_processual' ? tarefaForm.data_inicio : undefined,
        prazo_quantidade_dias: tarefaForm.tipo === 'prazo_processual' ? tarefaForm.prazo_dias : undefined,
        prazo_dias_uteis: tarefaForm.tipo === 'prazo_processual' ? tarefaForm.prazo_dias_uteis : undefined,
        status: 'pendente'
      })

      if (tarefa?.id) {
        await atualizarPublicacaoComAgendamento(tarefa.id, 'tarefa')
        toast.success('Tarefa criada com sucesso!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error)
      toast.error(error.message || 'Erro ao criar tarefa')
    } finally {
      setSalvando(false)
    }
  }

  // Salvar Compromisso
  const handleSalvarCompromisso = async () => {
    if (!compromissoForm.titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    setSalvando(true)
    try {
      const dataInicio = compromissoForm.data_inicio && compromissoForm.hora_inicio
        ? new Date(`${compromissoForm.data_inicio}T${compromissoForm.hora_inicio}:00`)
        : null
      const dataFim = compromissoForm.data_fim && compromissoForm.hora_fim
        ? new Date(`${compromissoForm.data_fim}T${compromissoForm.hora_fim}:00`)
        : null

      const evento = await createEvento({
        escritorio_id: escritorioId,
        titulo: compromissoForm.titulo,
        descricao: compromissoForm.descricao,
        data_inicio: dataInicio ? formatDateTimeForDB(dataInicio) : null,
        data_fim: dataFim ? formatDateTimeForDB(dataFim) : null,
        local: compromissoForm.local || null,
        participantes: compromissoForm.participantes || null,
        processo_id: publicacao.processo_id || undefined
      })

      if (evento?.id) {
        await atualizarPublicacaoComAgendamento(evento.id, 'compromisso')
        toast.success('Compromisso criado com sucesso!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error('Erro ao criar compromisso:', error)
      toast.error(error.message || 'Erro ao criar compromisso')
    } finally {
      setSalvando(false)
    }
  }

  // Salvar Audiência
  const handleSalvarAudiencia = async () => {
    if (!audienciaForm.titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    if (!publicacao.processo_id) {
      toast.error('Audiência requer um processo vinculado')
      return
    }

    setSalvando(true)
    try {
      const dataHora = audienciaForm.data && audienciaForm.hora
        ? new Date(`${audienciaForm.data}T${audienciaForm.hora}:00`)
        : null

      const audiencia = await createAudiencia({
        escritorio_id: escritorioId,
        processo_id: publicacao.processo_id,
        titulo: audienciaForm.titulo,
        descricao: audienciaForm.descricao,
        data_hora: dataHora ? formatDateTimeForDB(dataHora) : null,
        duracao_minutos: audienciaForm.duracao_minutos,
        tipo_audiencia: audienciaForm.tipo_audiencia,
        modalidade: audienciaForm.modalidade,
        tribunal: audienciaForm.modalidade === 'presencial' ? audienciaForm.tribunal : undefined,
        comarca: audienciaForm.modalidade === 'presencial' ? audienciaForm.comarca : undefined,
        vara: audienciaForm.modalidade === 'presencial' ? audienciaForm.vara : undefined,
        sala: audienciaForm.modalidade === 'presencial' ? audienciaForm.sala : undefined,
        link_virtual: audienciaForm.modalidade === 'virtual' ? audienciaForm.link_virtual : undefined,
        plataforma: audienciaForm.modalidade === 'virtual' ? audienciaForm.plataforma : undefined
      })

      if (audiencia?.id) {
        await atualizarPublicacaoComAgendamento(audiencia.id, 'audiencia')
        toast.success('Audiência criada com sucesso!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error('Erro ao criar audiência:', error)
      toast.error(error.message || 'Erro ao criar audiência')
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvar = () => {
    switch (activeTab) {
      case 'tarefa':
        handleSalvarTarefa()
        break
      case 'compromisso':
        handleSalvarCompromisso()
        break
      case 'audiencia':
        handleSalvarAudiencia()
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-800">
            Agendar a partir da Publicação
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Crie uma tarefa, compromisso ou audiência com base nesta publicação
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="tarefa" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Tarefa
            </TabsTrigger>
            <TabsTrigger value="compromisso" className="gap-2">
              <Calendar className="w-4 h-4" />
              Compromisso
            </TabsTrigger>
            <TabsTrigger
              value="audiencia"
              className="gap-2"
              disabled={!temProcesso}
            >
              <Gavel className="w-4 h-4" />
              Audiência
              {!temProcesso && (
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Tarefa */}
          <TabsContent value="tarefa" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tarefa-tipo">Tipo de Tarefa</Label>
                <Select
                  value={tarefaForm.tipo}
                  onValueChange={(v) => setTarefaForm(prev => ({ ...prev, tipo: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prazo_processual">Prazo Processual</SelectItem>
                    <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    <SelectItem value="follow_up">Follow-up Cliente</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tarefa-prioridade">Prioridade</Label>
                <Select
                  value={tarefaForm.prioridade}
                  onValueChange={(v) => setTarefaForm(prev => ({ ...prev, prioridade: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tarefa-titulo">Título *</Label>
              <Input
                id="tarefa-titulo"
                value={tarefaForm.titulo}
                onChange={(e) => setTarefaForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Prazo para manifestação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tarefa-descricao">Descrição</Label>
              <Textarea
                id="tarefa-descricao"
                value={tarefaForm.descricao}
                onChange={(e) => setTarefaForm(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                placeholder="Detalhes da tarefa..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tarefa-data-inicio">Data de Início</Label>
                <Input
                  id="tarefa-data-inicio"
                  type="date"
                  value={tarefaForm.data_inicio}
                  onChange={(e) => setTarefaForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarefa-data-fim">Data Limite</Label>
                <Input
                  id="tarefa-data-fim"
                  type="date"
                  value={tarefaForm.data_fim}
                  onChange={(e) => setTarefaForm(prev => ({ ...prev, data_fim: e.target.value }))}
                />
              </div>
            </div>

            {tarefaForm.tipo === 'prazo_processual' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                  <Clock className="w-4 h-4" />
                  Configuração de Prazo
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Dias</Label>
                    <Input
                      type="number"
                      value={tarefaForm.prazo_dias}
                      onChange={(e) => setTarefaForm(prev => ({ ...prev, prazo_dias: parseInt(e.target.value) || 0 }))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Dias</Label>
                    <Select
                      value={tarefaForm.prazo_dias_uteis ? 'uteis' : 'corridos'}
                      onValueChange={(v) => setTarefaForm(prev => ({ ...prev, prazo_dias_uteis: v === 'uteis' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uteis">Dias Úteis</SelectItem>
                        <SelectItem value="corridos">Dias Corridos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab Compromisso */}
          <TabsContent value="compromisso" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compromisso-titulo">Título *</Label>
              <Input
                id="compromisso-titulo"
                value={compromissoForm.titulo}
                onChange={(e) => setCompromissoForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Reunião com cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compromisso-descricao">Descrição</Label>
              <Textarea
                id="compromisso-descricao"
                value={compromissoForm.descricao}
                onChange={(e) => setCompromissoForm(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                placeholder="Detalhes do compromisso..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={compromissoForm.data_inicio}
                    onChange={(e) => setCompromissoForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={compromissoForm.hora_inicio}
                    onChange={(e) => setCompromissoForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de Fim</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={compromissoForm.data_fim}
                    onChange={(e) => setCompromissoForm(prev => ({ ...prev, data_fim: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={compromissoForm.hora_fim}
                    onChange={(e) => setCompromissoForm(prev => ({ ...prev, hora_fim: e.target.value }))}
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compromisso-local">Local</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="compromisso-local"
                    value={compromissoForm.local}
                    onChange={(e) => setCompromissoForm(prev => ({ ...prev, local: e.target.value }))}
                    className="pl-9"
                    placeholder="Local do compromisso"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compromisso-participantes">Participantes</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="compromisso-participantes"
                    value={compromissoForm.participantes}
                    onChange={(e) => setCompromissoForm(prev => ({ ...prev, participantes: e.target.value }))}
                    className="pl-9"
                    placeholder="Nome dos participantes"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab Audiência */}
          <TabsContent value="audiencia" className="space-y-4">
            {!temProcesso && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Processo não vinculado</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Para criar uma audiência, é necessário vincular esta publicação a um processo primeiro.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Audiência</Label>
                <Select
                  value={audienciaForm.tipo_audiencia}
                  onValueChange={(v) => setAudienciaForm(prev => ({ ...prev, tipo_audiencia: v as any }))}
                  disabled={!temProcesso}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicial">Inicial</SelectItem>
                    <SelectItem value="instrucao">Instrução</SelectItem>
                    <SelectItem value="conciliacao">Conciliação</SelectItem>
                    <SelectItem value="julgamento">Julgamento</SelectItem>
                    <SelectItem value="una">Una</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select
                  value={audienciaForm.modalidade}
                  onValueChange={(v) => setAudienciaForm(prev => ({ ...prev, modalidade: v as any }))}
                  disabled={!temProcesso}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={audienciaForm.titulo}
                onChange={(e) => setAudienciaForm(prev => ({ ...prev, titulo: e.target.value }))}
                disabled={!temProcesso}
                placeholder="Ex: Audiência de instrução e julgamento"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={audienciaForm.descricao}
                onChange={(e) => setAudienciaForm(prev => ({ ...prev, descricao: e.target.value }))}
                disabled={!temProcesso}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={audienciaForm.data}
                  onChange={(e) => setAudienciaForm(prev => ({ ...prev, data: e.target.value }))}
                  disabled={!temProcesso}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={audienciaForm.hora}
                  onChange={(e) => setAudienciaForm(prev => ({ ...prev, hora: e.target.value }))}
                  disabled={!temProcesso}
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={audienciaForm.duracao_minutos}
                  onChange={(e) => setAudienciaForm(prev => ({ ...prev, duracao_minutos: parseInt(e.target.value) || 60 }))}
                  disabled={!temProcesso}
                  min={15}
                  step={15}
                />
              </div>
            </div>

            {audienciaForm.modalidade === 'presencial' ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                  <MapPin className="w-4 h-4" />
                  Local da Audiência
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tribunal</Label>
                    <Input
                      value={audienciaForm.tribunal}
                      onChange={(e) => setAudienciaForm(prev => ({ ...prev, tribunal: e.target.value }))}
                      disabled={!temProcesso}
                      placeholder="Ex: TJSP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comarca</Label>
                    <Input
                      value={audienciaForm.comarca}
                      onChange={(e) => setAudienciaForm(prev => ({ ...prev, comarca: e.target.value }))}
                      disabled={!temProcesso}
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vara</Label>
                    <Input
                      value={audienciaForm.vara}
                      onChange={(e) => setAudienciaForm(prev => ({ ...prev, vara: e.target.value }))}
                      disabled={!temProcesso}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sala</Label>
                    <Input
                      value={audienciaForm.sala}
                      onChange={(e) => setAudienciaForm(prev => ({ ...prev, sala: e.target.value }))}
                      disabled={!temProcesso}
                      placeholder="Ex: Sala 302"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                  <Video className="w-4 h-4" />
                  Audiência Virtual
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link da Videoconferência</Label>
                    <Input
                      value={audienciaForm.link_virtual}
                      onChange={(e) => setAudienciaForm(prev => ({ ...prev, link_virtual: e.target.value }))}
                      disabled={!temProcesso}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={audienciaForm.plataforma}
                      onValueChange={(v) => setAudienciaForm(prev => ({ ...prev, plataforma: v }))}
                      disabled={!temProcesso}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJe">PJe</SelectItem>
                        <SelectItem value="Zoom">Zoom</SelectItem>
                        <SelectItem value="Teams">Microsoft Teams</SelectItem>
                        <SelectItem value="Google Meet">Google Meet</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando || (activeTab === 'audiencia' && !temProcesso)}
            className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {salvando ? 'Salvando...' : 'Criar Agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
