'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckSquare,
  Link2,
  Bell,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Briefcase,
  UserCheck,
  FileText,
  ClipboardList,
  Calculator,
  Save,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ChecklistEditor, { ChecklistItem } from './ChecklistEditor'
import VinculacaoSelector, { Vinculacao } from './VinculacaoSelector'
import LembretesEditor, { Lembrete } from './LembretesEditor'
import PrazoCalculator from './PrazoCalculator'
import { useTarefas, Tarefa } from '@/hooks/useTarefas'

interface TarefaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tarefa?: Tarefa | null
  escritorioId: string | null
}

const TIPO_CONFIG = {
  prazo_processual: {
    label: 'Prazo Processual',
    icon: Briefcase,
    color: 'red',
    description: 'Prazos judiciais com cálculo automático',
  },
  acompanhamento: {
    label: 'Acompanhamento',
    icon: UserCheck,
    color: 'blue',
    description: 'Acompanhamento de processos e casos',
  },
  follow_up: {
    label: 'Follow-up Cliente',
    icon: Clock,
    color: 'emerald',
    description: 'Retorno e contato com clientes',
  },
  administrativo: {
    label: 'Administrativo',
    icon: FileText,
    color: 'purple',
    description: 'Tarefas administrativas internas',
  },
  outro: {
    label: 'Outro',
    icon: ClipboardList,
    color: 'slate',
    description: 'Outras tarefas não categorizadas',
  },
}

export default function TarefaModal({
  open,
  onOpenChange,
  tarefa,
  escritorioId,
}: TarefaModalProps) {
  const { createTarefa, updateTarefa } = useTarefas()

  const [activeTab, setActiveTab] = useState('basico')
  const [saving, setSaving] = useState(false)

  // Campos básicos
  const [tipo, setTipo] = useState<Tarefa['tipo']>('prazo_processual')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [prioridade, setPrioridade] = useState<Tarefa['prioridade']>('media')
  const [responsavelId, setResponsavelId] = useState<string>('')

  // Prazo processual
  const [prazoDataIntimacao, setPrazoDataIntimacao] = useState('')
  const [prazoQuantidadeDias, setPrazoQuantidadeDias] = useState<number>(15)
  const [prazoDiasUteis, setPrazoDiasUteis] = useState(true)
  const [prazoDataLimite, setPrazoDataLimite] = useState('')

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  // Vinculações
  const [vinculacoes, setVinculacoes] = useState<Vinculacao[]>([])

  // Lembretes
  const [lembretes, setLembretes] = useState<Lembrete[]>([])

  // Carregar dados da tarefa se estiver editando
  useEffect(() => {
    if (tarefa) {
      setTipo(tarefa.tipo)
      setTitulo(tarefa.titulo)
      setDescricao(tarefa.descricao || '')
      setDataInicio(tarefa.data_inicio?.split('T')[0] || '')
      setDataFim(tarefa.data_fim?.split('T')[0] || '')
      setPrioridade(tarefa.prioridade)
      setResponsavelId(tarefa.responsavel_id || '')
      setPrazoDataIntimacao(tarefa.prazo_data_intimacao || '')
      setPrazoQuantidadeDias(tarefa.prazo_quantidade_dias || 15)
      setPrazoDiasUteis(tarefa.prazo_dias_uteis ?? true)
      setPrazoDataLimite(tarefa.prazo_data_limite || '')
      // TODO: Carregar checklist, vinculações e lembretes
    } else {
      resetForm()
    }
  }, [tarefa])

  const resetForm = () => {
    setTipo('prazo_processual')
    setTitulo('')
    setDescricao('')
    setDataInicio('')
    setDataFim('')
    setPrioridade('media')
    setResponsavelId('')
    setPrazoDataIntimacao('')
    setPrazoQuantidadeDias(15)
    setPrazoDiasUteis(true)
    setPrazoDataLimite('')
    setChecklist([])
    setVinculacoes([])
    setLembretes([])
    setActiveTab('basico')
  }

  const handleSave = async () => {
    if (!escritorioId) {
      alert('Erro: Escritório não identificado. Atualize a página.')
      return
    }

    if (!titulo.trim()) {
      alert('Título é obrigatório')
      return
    }

    if (!dataInicio) {
      alert('Data de início é obrigatória')
      return
    }

    if (tipo === 'prazo_processual' && !prazoDataLimite) {
      alert('Para prazos processuais, calcule a data limite primeiro')
      setActiveTab('prazo')
      return
    }

    setSaving(true)

    try {
      const tarefaData: Partial<Tarefa> = {
        escritorio_id: escritorioId,
        tipo,
        titulo,
        descricao: descricao || undefined,
        data_inicio: dataInicio,
        data_fim: dataFim || undefined,
        prioridade,
        responsavel_id: responsavelId || undefined,
        prazo_data_intimacao: tipo === 'prazo_processual' ? prazoDataIntimacao || undefined : undefined,
        prazo_quantidade_dias: tipo === 'prazo_processual' ? prazoQuantidadeDias : undefined,
        prazo_dias_uteis: tipo === 'prazo_processual' ? prazoDiasUteis : undefined,
        prazo_data_limite: tipo === 'prazo_processual' ? prazoDataLimite || undefined : undefined,
      }

      console.log('Dados da tarefa sendo salvos:', tarefaData)

      if (tarefa?.id) {
        await updateTarefa(tarefa.id, tarefaData)
      } else {
        await createTarefa(tarefaData)
      }

      // TODO: Salvar checklist, vinculações e lembretes separadamente

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error)
      alert('Erro ao salvar tarefa')
    } finally {
      setSaving(false)
    }
  }

  const handlePrazoCalculado = (dataLimite: string) => {
    setPrazoDataLimite(dataLimite.split('T')[0])
    if (!dataFim) {
      setDataFim(dataLimite.split('T')[0])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#34495e]">
            {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="basico" className="text-xs">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="vinculacoes" className="text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Vínculos
            </TabsTrigger>
            <TabsTrigger value="lembretes" className="text-xs">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Lembretes
            </TabsTrigger>
            {tipo === 'prazo_processual' && (
              <TabsTrigger value="prazo" className="text-xs">
                <Calculator className="w-3.5 h-3.5 mr-1.5" />
                Prazo
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* ABA BÁSICO */}
            <TabsContent value="basico" className="space-y-4 mt-0">
              {/* Seletor de Tipo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#46627f]">Tipo de Tarefa *</Label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.entries(TIPO_CONFIG) as [Tarefa['tipo'], typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(
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
                <Label htmlFor="titulo" className="text-sm font-medium text-[#46627f]">
                  Título *
                </Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Apresentar contestação no Processo 123456"
                  className="border-slate-200"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-medium text-[#46627f]">
                  Descrição
                </Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes adicionais sobre a tarefa..."
                  rows={3}
                  className="border-slate-200"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio" className="text-sm font-medium text-[#46627f]">
                    Data Início
                  </Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim" className="text-sm font-medium text-[#46627f]">
                    Data Limite {tipo === 'prazo_processual' && '*'}
                  </Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="border-slate-200"
                    disabled={tipo === 'prazo_processual'}
                  />
                  {tipo === 'prazo_processual' && (
                    <p className="text-xs text-slate-500">
                      Calculada automaticamente na aba "Prazo"
                    </p>
                  )}
                </div>
              </div>

              {/* Prioridade e Responsável */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#46627f]">Prioridade</Label>
                  <Select value={prioridade} onValueChange={(value: any) => setPrioridade(value)}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">
                        <div className="flex items-center gap-2">
                          <Flag className="w-3.5 h-3.5 text-red-600" />
                          Alta
                        </div>
                      </SelectItem>
                      <SelectItem value="media">
                        <div className="flex items-center gap-2">
                          <Flag className="w-3.5 h-3.5 text-amber-600" />
                          Média
                        </div>
                      </SelectItem>
                      <SelectItem value="baixa">
                        <div className="flex items-center gap-2">
                          <Flag className="w-3.5 h-3.5 text-slate-400" />
                          Baixa
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel" className="text-sm font-medium text-[#46627f]">
                    Responsável
                  </Label>
                  <Input
                    id="responsavel"
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                    placeholder="Selecionar usuário..."
                    className="border-slate-200"
                  />
                  {/* TODO: Implementar autocomplete de usuários */}
                </div>
              </div>
            </TabsContent>

            {/* ABA CHECKLIST */}
            <TabsContent value="checklist" className="mt-0">
              <ChecklistEditor
                items={checklist}
                onChange={setChecklist}
              />
            </TabsContent>

            {/* ABA VINCULAÇÕES */}
            <TabsContent value="vinculacoes" className="mt-0">
              <VinculacaoSelector
                vinculacoes={vinculacoes}
                onChange={setVinculacoes}
                escritorioId={escritorioId}
              />
            </TabsContent>

            {/* ABA LEMBRETES */}
            <TabsContent value="lembretes" className="mt-0">
              <LembretesEditor
                lembretes={lembretes}
                onChange={setLembretes}
              />
            </TabsContent>

            {/* ABA PRAZO (só para prazo_processual) */}
            {tipo === 'prazo_processual' && (
              <TabsContent value="prazo" className="mt-0">
                <PrazoCalculator
                  onCalculate={handlePrazoCalculado}
                  escritorioId={escritorioId}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-slate-200"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#5a9a9c] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : tarefa ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
