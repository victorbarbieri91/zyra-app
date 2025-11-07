'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Calendar as CalendarIcon, Save, X, ClipboardList, MapPin, Users } from 'lucide-react'
import LembretesEditor, { Lembrete } from './LembretesEditor'
import { useEventos, Evento } from '@/hooks/useEventos'

interface EventoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento?: Evento | null
  escritorioId: string | null
}

export default function EventoModal({
  open,
  onOpenChange,
  evento,
  escritorioId,
}: EventoModalProps) {
  const { createEvento, updateEvento } = useEventos()

  const [activeTab, setActiveTab] = useState('basico')
  const [saving, setSaving] = useState(false)

  // Campos básicos
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<string>('reuniao')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [local, setLocal] = useState('')
  const [participantes, setParticipantes] = useState('')

  // Lembretes
  const [lembretes, setLembretes] = useState<Lembrete[]>([])

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo)
      setDescricao(evento.descricao || '')
      setTipo(evento.tipo || 'reuniao')
      setDataInicio(evento.data_inicio?.substring(0, 16) || '')
      setDataFim(evento.data_fim?.substring(0, 16) || '')
      setDiaInteiro(evento.dia_inteiro || false)
      setLocal(evento.local || '')
      setParticipantes(evento.participantes || '')
    } else {
      resetForm()
    }
  }, [evento])

  const resetForm = () => {
    setTitulo('')
    setDescricao('')
    setTipo('reuniao')
    setDataInicio('')
    setDataFim('')
    setDiaInteiro(false)
    setLocal('')
    setParticipantes('')
    setLembretes([])
    setActiveTab('basico')
  }

  const handleSave = async () => {
    if (!titulo.trim()) {
      alert('Título é obrigatório')
      return
    }

    if (!dataInicio) {
      alert('Data de início é obrigatória')
      return
    }

    setSaving(true)

    try {
      const eventoData: Partial<Evento> = {
        escritorio_id: escritorioId,
        titulo,
        descricao: descricao || null,
        tipo,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        dia_inteiro: diaInteiro,
        local: local || null,
        participantes: participantes || null,
      }

      if (evento?.id) {
        await updateEvento(evento.id, eventoData)
      } else {
        await createEvento(eventoData)
      }

      // TODO: Salvar lembretes

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
      alert('Erro ao salvar evento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#34495e] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#89bcbe]" />
            {evento ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="basico" className="text-xs">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="lembretes" className="text-xs">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Lembretes
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* ABA BÁSICO */}
            <TabsContent value="basico" className="space-y-4 mt-0">
              {/* Tipo de Evento */}
              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-sm font-medium text-[#46627f]">
                  Tipo de Evento
                </Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="compromisso">Compromisso</SelectItem>
                    <SelectItem value="evento_externo">Evento Externo</SelectItem>
                    <SelectItem value="convencao">Convenção</SelectItem>
                    <SelectItem value="palestra">Palestra/Workshop</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
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
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Reunião com cliente sobre novo caso"
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
                  placeholder="Detalhes sobre o evento..."
                  rows={3}
                  className="border-slate-200"
                />
              </div>

              {/* Dia Inteiro */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dia_inteiro"
                  checked={diaInteiro}
                  onChange={(e) => setDiaInteiro(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#89bcbe] focus:ring-[#89bcbe]"
                />
                <Label htmlFor="dia_inteiro" className="text-sm font-medium text-[#46627f] cursor-pointer">
                  Evento de dia inteiro
                </Label>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio" className="text-sm font-medium text-[#46627f]">
                    {diaInteiro ? 'Data Início *' : 'Data e Hora Início *'}
                  </Label>
                  <Input
                    id="data_inicio"
                    type={diaInteiro ? 'date' : 'datetime-local'}
                    value={diaInteiro ? dataInicio.split('T')[0] : dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim" className="text-sm font-medium text-[#46627f]">
                    {diaInteiro ? 'Data Fim' : 'Data e Hora Fim'}
                  </Label>
                  <Input
                    id="data_fim"
                    type={diaInteiro ? 'date' : 'datetime-local'}
                    value={diaInteiro ? dataFim.split('T')[0] : dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </div>

              {/* Local */}
              <div className="space-y-2">
                <Label htmlFor="local" className="text-sm font-medium text-[#46627f] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Local
                </Label>
                <Input
                  id="local"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Onde será o evento?"
                  className="border-slate-200"
                />
              </div>

              {/* Participantes */}
              <div className="space-y-2">
                <Label htmlFor="participantes" className="text-sm font-medium text-[#46627f] flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Participantes
                </Label>
                <Textarea
                  id="participantes"
                  value={participantes}
                  onChange={(e) => setParticipantes(e.target.value)}
                  placeholder="Lista de participantes (um por linha)"
                  rows={3}
                  className="border-slate-200"
                />
              </div>
            </TabsContent>

            {/* ABA LEMBRETES */}
            <TabsContent value="lembretes" className="mt-0">
              <LembretesEditor lembretes={lembretes} onChange={setLembretes} />
            </TabsContent>
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
            {saving ? 'Salvando...' : evento ? 'Salvar Alterações' : 'Criar Evento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
