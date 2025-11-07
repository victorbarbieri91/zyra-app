'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, MapPin, User, FileText, Bell, Repeat, X, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export interface EventFormData {
  id?: string
  titulo: string
  tipo: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  data_inicio: Date
  data_fim?: Date
  hora_inicio?: string
  hora_fim?: string
  dia_inteiro: boolean
  local?: string
  descricao?: string
  cor?: string
  cliente_id?: string
  processo_id?: string
  responsavel_id?: string
  status: 'agendado' | 'realizado' | 'cancelado' | 'remarcado'
  // Audiência específicos
  tipo_audiencia?: string
  modalidade?: 'presencial' | 'virtual'
  link_virtual?: string
  forum_vara?: string
  juiz?: string
  // Prazo específicos
  tipo_prazo?: string
  data_intimacao?: Date
  data_limite?: Date
  dias_uteis?: boolean
  quantidade_dias?: number
  // Lembretes
  lembretes?: Array<{
    tempo_antes_minutos: number
    metodos: string[]
  }>
  // Recorrência
  recorrente?: boolean
  recorrencia?: {
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
    intervalo: number
    dias_semana?: number[]
    data_fim?: Date
  }
}

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento?: EventFormData
  defaultDate?: Date
  onSave: (data: EventFormData) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  clientes?: Array<{ id: string; nome: string }>
  processos?: Array<{ id: string; numero: string }>
  responsaveis?: Array<{ id: string; nome: string }>
}

export default function EventModal({
  open,
  onOpenChange,
  evento,
  defaultDate,
  onSave,
  onDelete,
  clientes = [],
  processos = [],
  responsaveis = [],
}: EventModalProps) {
  const isEdit = !!evento?.id

  const [formData, setFormData] = useState<EventFormData>({
    titulo: '',
    tipo: 'compromisso',
    data_inicio: defaultDate || new Date(),
    dia_inteiro: false,
    status: 'agendado',
    lembretes: [
      { tempo_antes_minutos: 15, metodos: ['push'] }
    ],
  })

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basico')

  useEffect(() => {
    if (evento) {
      setFormData(evento)
    } else if (defaultDate) {
      setFormData(prev => ({ ...prev, data_inicio: defaultDate }))
    }
  }, [evento, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onOpenChange(false)
      // Reset form
      setFormData({
        titulo: '',
        tipo: 'compromisso',
        data_inicio: new Date(),
        dia_inteiro: false,
        status: 'agendado',
        lembretes: [{ tempo_antes_minutos: 15, metodos: ['push'] }],
      })
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!evento?.id || !onDelete) return
    if (!confirm('Tem certeza que deseja deletar este evento?')) return

    setLoading(true)
    try {
      await onDelete(evento.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao deletar evento:', error)
    } finally {
      setLoading(false)
    }
  }

  const addLembrete = () => {
    setFormData(prev => ({
      ...prev,
      lembretes: [
        ...(prev.lembretes || []),
        { tempo_antes_minutos: 60, metodos: ['push'] }
      ]
    }))
  }

  const removeLembrete = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lembretes: prev.lembretes?.filter((_, i) => i !== index)
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#34495e]">
            {isEdit ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-slate-100">
              <TabsTrigger value="basico" className="text-xs">Básico</TabsTrigger>
              <TabsTrigger value="detalhes" className="text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="lembretes" className="text-xs">Lembretes</TabsTrigger>
              <TabsTrigger value="recorrencia" className="text-xs" disabled={formData.tipo === 'prazo'}>
                Recorrência
              </TabsTrigger>
            </TabsList>

            {/* TAB: Básico */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              {/* Tipo de Evento */}
              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-sm font-medium text-[#46627f]">
                  Tipo de Evento *
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compromisso">Compromisso</SelectItem>
                    <SelectItem value="audiencia">Audiência</SelectItem>
                    <SelectItem value="prazo">Prazo Processual</SelectItem>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-sm font-medium text-[#46627f]">
                  Título *
                </Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Reunião com cliente, Audiência trabalhista..."
                  required
                  className="border-slate-200"
                />
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio" className="text-sm font-medium text-[#46627f]">
                    Data de Início *
                  </Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={format(formData.data_inicio, 'yyyy-MM-dd')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      data_inicio: new Date(e.target.value)
                    }))}
                    required
                    className="border-slate-200"
                  />
                </div>

                {!formData.dia_inteiro && (
                  <div className="space-y-2">
                    <Label htmlFor="hora_inicio" className="text-sm font-medium text-[#46627f]">
                      Hora de Início
                    </Label>
                    <Input
                      id="hora_inicio"
                      type="time"
                      value={formData.hora_inicio || '09:00'}
                      onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                      className="border-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Dia Inteiro */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dia_inteiro"
                  checked={formData.dia_inteiro}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    dia_inteiro: checked as boolean
                  }))}
                />
                <Label htmlFor="dia_inteiro" className="text-sm text-[#34495e] cursor-pointer">
                  Evento de dia inteiro
                </Label>
              </div>

              {!formData.dia_inteiro && formData.tipo !== 'prazo' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_fim" className="text-sm font-medium text-[#46627f]">
                      Data de Término
                    </Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formData.data_fim ? format(formData.data_fim, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        data_fim: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                      className="border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora_fim" className="text-sm font-medium text-[#46627f]">
                      Hora de Término
                    </Label>
                    <Input
                      id="hora_fim"
                      type="time"
                      value={formData.hora_fim || '10:00'}
                      onChange={(e) => setFormData(prev => ({ ...prev, hora_fim: e.target.value }))}
                      className="border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Local */}
              {formData.tipo !== 'prazo' && (
                <div className="space-y-2">
                  <Label htmlFor="local" className="text-sm font-medium text-[#46627f]">
                    Local
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d]" />
                    <Input
                      id="local"
                      value={formData.local || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, local: e.target.value }))}
                      placeholder="Ex: Fórum Central, Escritório, Online..."
                      className="border-slate-200 pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Cliente e Processo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_id" className="text-sm font-medium text-[#46627f]">
                    Cliente
                  </Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processo_id" className="text-sm font-medium text-[#46627f]">
                    Processo
                  </Label>
                  <Select
                    value={formData.processo_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, processo_id: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {processos.map((processo) => (
                        <SelectItem key={processo.id} value={processo.id}>
                          {processo.numero}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Responsável */}
              <div className="space-y-2">
                <Label htmlFor="responsavel_id" className="text-sm font-medium text-[#46627f]">
                  Responsável *
                </Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, responsavel_id: value }))}
                  required
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((responsavel) => (
                      <SelectItem key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* TAB: Detalhes */}
            <TabsContent value="detalhes" className="space-y-4 mt-4">
              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-medium text-[#46627f]">
                  Descrição / Observações
                </Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Adicione detalhes, notas ou informações importantes..."
                  rows={4}
                  className="border-slate-200 resize-none"
                />
              </div>

              {/* Campos específicos de Audiência */}
              {formData.tipo === 'audiencia' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo_audiencia" className="text-sm font-medium text-[#46627f]">
                        Tipo de Audiência
                      </Label>
                      <Select
                        value={formData.tipo_audiencia}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_audiencia: value }))}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inicial">Inicial</SelectItem>
                          <SelectItem value="instrucao">Instrução</SelectItem>
                          <SelectItem value="conciliacao">Conciliação</SelectItem>
                          <SelectItem value="julgamento">Julgamento</SelectItem>
                          <SelectItem value="una">Una</SelectItem>
                          <SelectItem value="outras">Outras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="modalidade" className="text-sm font-medium text-[#46627f]">
                        Modalidade
                      </Label>
                      <Select
                        value={formData.modalidade}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, modalidade: value }))}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="virtual">Virtual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.modalidade === 'virtual' && (
                    <div className="space-y-2">
                      <Label htmlFor="link_virtual" className="text-sm font-medium text-[#46627f]">
                        Link da Sala Virtual
                      </Label>
                      <Input
                        id="link_virtual"
                        type="url"
                        value={formData.link_virtual || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, link_virtual: e.target.value }))}
                        placeholder="https://..."
                        className="border-slate-200"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="forum_vara" className="text-sm font-medium text-[#46627f]">
                        Fórum / Vara
                      </Label>
                      <Input
                        id="forum_vara"
                        value={formData.forum_vara || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, forum_vara: e.target.value }))}
                        placeholder="Ex: 3ª Vara do Trabalho"
                        className="border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="juiz" className="text-sm font-medium text-[#46627f]">
                        Juiz(a)
                      </Label>
                      <Input
                        id="juiz"
                        value={formData.juiz || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, juiz: e.target.value }))}
                        placeholder="Nome do juiz"
                        className="border-slate-200"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Campos específicos de Prazo */}
              {formData.tipo === 'prazo' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tipo_prazo" className="text-sm font-medium text-[#46627f]">
                      Tipo de Prazo *
                    </Label>
                    <Select
                      value={formData.tipo_prazo}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_prazo: value }))}
                      required
                    >
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recurso">Recurso</SelectItem>
                        <SelectItem value="manifestacao">Manifestação</SelectItem>
                        <SelectItem value="cumprimento">Cumprimento</SelectItem>
                        <SelectItem value="juntada">Juntada</SelectItem>
                        <SelectItem value="pagamento">Pagamento</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data_intimacao" className="text-sm font-medium text-[#46627f]">
                        Data Intimação *
                      </Label>
                      <Input
                        id="data_intimacao"
                        type="date"
                        value={formData.data_intimacao ? format(formData.data_intimacao, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          data_intimacao: new Date(e.target.value)
                        }))}
                        required
                        className="border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantidade_dias" className="text-sm font-medium text-[#46627f]">
                        Quantidade Dias *
                      </Label>
                      <Input
                        id="quantidade_dias"
                        type="number"
                        min="1"
                        value={formData.quantidade_dias || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          quantidade_dias: parseInt(e.target.value)
                        }))}
                        placeholder="15"
                        required
                        className="border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#46627f]">
                        Tipo de Dias
                      </Label>
                      <Select
                        value={formData.dias_uteis ? 'uteis' : 'corridos'}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          dias_uteis: value === 'uteis'
                        }))}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uteis">Dias Úteis</SelectItem>
                          <SelectItem value="corridos">Dias Corridos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.data_intimacao && formData.quantidade_dias && (
                    <div className="p-3 bg-[#f0f9f9] border border-[#89bcbe] rounded-lg">
                      <p className="text-xs text-[#46627f] mb-1 font-medium">Data Limite Calculada:</p>
                      <p className="text-lg font-bold text-[#34495e]">
                        {/* Aqui virá o cálculo real via API */}
                        [Será calculado automaticamente]
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Cor personalizada */}
              <div className="space-y-2">
                <Label htmlFor="cor" className="text-sm font-medium text-[#46627f]">
                  Cor Personalizada
                </Label>
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor || '#89bcbe'}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="h-10 w-20 border-slate-200"
                />
              </div>
            </TabsContent>

            {/* TAB: Lembretes */}
            <TabsContent value="lembretes" className="space-y-4 mt-4">
              <div className="space-y-3">
                {formData.lembretes?.map((lembrete, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Bell className="w-4 h-4 text-[#6c757d] flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Select
                        value={lembrete.tempo_antes_minutos.toString()}
                        onValueChange={(value) => {
                          const newLembretes = [...(formData.lembretes || [])]
                          newLembretes[index].tempo_antes_minutos = parseInt(value)
                          setFormData(prev => ({ ...prev, lembretes: newLembretes }))
                        }}
                      >
                        <SelectTrigger className="border-slate-200 bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutos antes</SelectItem>
                          <SelectItem value="15">15 minutos antes</SelectItem>
                          <SelectItem value="30">30 minutos antes</SelectItem>
                          <SelectItem value="60">1 hora antes</SelectItem>
                          <SelectItem value="1440">1 dia antes</SelectItem>
                          <SelectItem value="10080">1 semana antes</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={lembrete.metodos.includes('email')}
                          onCheckedChange={(checked) => {
                            const newLembretes = [...(formData.lembretes || [])]
                            if (checked) {
                              newLembretes[index].metodos.push('email')
                            } else {
                              newLembretes[index].metodos = newLembretes[index].metodos.filter(m => m !== 'email')
                            }
                            setFormData(prev => ({ ...prev, lembretes: newLembretes }))
                          }}
                        />
                        <span className="text-[#6c757d]">Email</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLembrete(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLembrete}
                  className="w-full border-slate-200 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Adicionar Lembrete
                </Button>
              </div>
            </TabsContent>

            {/* TAB: Recorrência */}
            <TabsContent value="recorrencia" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="recorrente"
                  checked={formData.recorrente}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    recorrente: checked as boolean
                  }))}
                />
                <Label htmlFor="recorrente" className="text-sm text-[#34495e] cursor-pointer">
                  Este evento se repete
                </Label>
              </div>

              {formData.recorrente && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#46627f]">
                        Frequência
                      </Label>
                      <Select
                        value={formData.recorrencia?.frequencia}
                        onValueChange={(value: any) => setFormData(prev => ({
                          ...prev,
                          recorrencia: { ...(prev.recorrencia || { intervalo: 1 }), frequencia: value }
                        }))}
                      >
                        <SelectTrigger className="border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diariamente</SelectItem>
                          <SelectItem value="semanal">Semanalmente</SelectItem>
                          <SelectItem value="mensal">Mensalmente</SelectItem>
                          <SelectItem value="anual">Anualmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#46627f]">
                        A cada
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.recorrencia?.intervalo || 1}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recorrencia: {
                            ...(prev.recorrencia || { frequencia: 'semanal' }),
                            intervalo: parseInt(e.target.value)
                          }
                        }))}
                        className="border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#46627f]">
                      Termina em
                    </Label>
                    <Input
                      type="date"
                      value={formData.recorrencia?.data_fim ? format(formData.recorrencia.data_fim, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recorrencia: {
                          ...(prev.recorrencia || { frequencia: 'semanal', intervalo: 1 }),
                          data_fim: e.target.value ? new Date(e.target.value) : undefined
                        }
                      }))}
                      className="border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {isEdit && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-xs"
                >
                  Deletar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs border-slate-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-xs"
              >
                {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Evento'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
