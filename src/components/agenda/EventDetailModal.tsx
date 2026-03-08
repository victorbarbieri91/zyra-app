'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Edit,
  Trash2,
  Bell,
  Users,
  Flag,
  Paperclip,
  MessageSquare,
  History,
  ChevronRight,
  Phone,
  Mail,
  Building,
  Scale,
  Briefcase,
  Hash,
} from 'lucide-react'
import { EventCardProps } from './EventCard'
import { cn } from '@/lib/utils'

interface EventDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento: EventCardProps & {
    descricao?: string
    processo_numero?: string
    processo_titulo?: string
    cliente_nome?: string
    cliente_telefone?: string
    cliente_email?: string
    participantes?: Array<{
      id: string
      nome: string
      tipo: 'advogado' | 'cliente' | 'testemunha' | 'perito'
    }>
    anexos?: Array<{
      id: string
      nome: string
      tamanho: number
      tipo: string
    }>
    historico?: Array<{
      id: string
      acao: string
      usuario: string
      data: Date
    }>
    lembretes?: Array<{
      id: string
      tempo: number
      unidade: 'minutos' | 'horas' | 'dias'
    }>
    tags?: string[]
  }
  onEdit?: () => void
  onDelete?: () => void
}

const getTipoBadge = (tipo: string) => {
  const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    compromisso: {
      label: 'Compromisso',
      class: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      icon: <Calendar className="w-3 h-3" />
    },
    audiencia: {
      label: 'Audiência',
      class: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      icon: <Scale className="w-3 h-3" />
    },
    tarefa: {
      label: 'Tarefa',
      class: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      icon: <FileText className="w-3 h-3" />
    },
    prazo: {
      label: 'Prazo',
      class: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
      icon: <AlertCircle className="w-3 h-3" />
    },
  }
  return badges[tipo] || badges.compromisso
}

const getStatusBadge = (status?: string) => {
  const badges: Record<string, { label: string; class: string }> = {
    agendado: { label: 'Agendado', class: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' },
    confirmado: { label: 'Confirmado', class: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' },
    realizado: { label: 'Realizado', class: 'bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300' },
    cancelado: { label: 'Cancelado', class: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' },
    adiado: { label: 'Adiado', class: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  }
  return badges[status || 'agendado'] || badges.agendado
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default function EventDetailModal({
  open,
  onOpenChange,
  evento,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState('detalhes')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!evento) return null

  const tipoBadge = getTipoBadge(evento.tipo)
  const statusBadge = getStatusBadge(evento.status)

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.()
      onOpenChange(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] p-6 text-white">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    {tipoBadge.icon}
                  </div>
                  <Badge className={cn("text-xs", tipoBadge.class)}>
                    {tipoBadge.label}
                  </Badge>
                  <Badge className={cn("text-xs", statusBadge.class)}>
                    {statusBadge.label}
                  </Badge>
                  {evento.prazo_criticidade === 'critico' && (
                    <Badge className="bg-red-500 text-white text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Crítico
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl font-semibold text-white mb-2">
                  {evento.titulo}
                </DialogTitle>
                {evento.descricao && (
                  <p className="text-white/90 text-sm line-clamp-2">{evento.descricao}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onEdit?.()
                    onOpenChange(false)
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className={cn(
                    "text-white hover:bg-white/20",
                    showDeleteConfirm && "bg-red-500 hover:bg-red-600"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Informações principais */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-surface-0 border-b dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#89bcbe]" />
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</p>
                <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                  {format(evento.data_inicio, "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#89bcbe]" />
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horário</p>
                <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                  {evento.dia_inteiro ? 'Dia inteiro' : format(evento.data_inicio, 'HH:mm')}
                  {evento.data_fim && !evento.dia_inteiro && ` - ${format(evento.data_fim, 'HH:mm')}`}
                </p>
              </div>
            </div>

            {evento.local && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#89bcbe]" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Local</p>
                  <p className="text-sm font-medium text-[#34495e] dark:text-slate-200 truncate">{evento.local}</p>
                </div>
              </div>
            )}

            {evento.responsavel_nome && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#89bcbe]" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responsável</p>
                  <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{evento.responsavel_nome}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs de conteúdo */}
        <div className="flex-1 overflow-hidden p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="bg-slate-100 dark:bg-surface-2 mb-4">
              <TabsTrigger value="detalhes" className="text-xs">
                <FileText className="w-3 h-3 mr-1.5" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="participantes" className="text-xs">
                <Users className="w-3 h-3 mr-1.5" />
                Participantes
              </TabsTrigger>
              <TabsTrigger value="anexos" className="text-xs">
                <Paperclip className="w-3 h-3 mr-1.5" />
                Anexos
              </TabsTrigger>
              <TabsTrigger value="lembretes" className="text-xs">
                <Bell className="w-3 h-3 mr-1.5" />
                Lembretes
              </TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">
                <History className="w-3 h-3 mr-1.5" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Tab Detalhes */}
            <TabsContent value="detalhes" className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                {/* Processo relacionado */}
                {evento.processo_numero && (
                  <div className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="text-sm font-semibold text-[#34495e] dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#89bcbe]" />
                      Processo Relacionado
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-medium text-[#34495e] dark:text-slate-200">{evento.processo_numero}</span>
                      </div>
                      {evento.processo_titulo && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">{evento.processo_titulo}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Cliente */}
                {evento.cliente_nome && (
                  <div className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="text-sm font-semibold text-[#34495e] dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#89bcbe]" />
                      Cliente
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{evento.cliente_nome}</p>
                      {evento.cliente_telefone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Phone className="w-3 h-3" />
                          {evento.cliente_telefone}
                        </div>
                      )}
                      {evento.cliente_email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="w-3 h-3" />
                          {evento.cliente_email}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {evento.tags && evento.tags.length > 0 && (
                  <div className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="text-sm font-semibold text-[#34495e] dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Flag className="w-4 h-4 text-[#89bcbe]" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {evento.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {evento.descricao && (
                  <div className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="text-sm font-semibold text-[#34495e] dark:text-slate-200 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#89bcbe]" />
                      Observações
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{evento.descricao}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab Participantes */}
            <TabsContent value="participantes" className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {evento.participantes && evento.participantes.length > 0 ? (
                  evento.participantes.map((participante) => (
                    <div key={participante.id} className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {participante.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{participante.nome}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{participante.tipo}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {participante.tipo}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">Nenhum participante adicionado</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab Anexos */}
            <TabsContent value="anexos" className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {evento.anexos && evento.anexos.length > 0 ? (
                  evento.anexos.map((anexo) => (
                    <div key={anexo.id} className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-2 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-surface-2 rounded-lg flex items-center justify-center">
                          <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{anexo.nome}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(anexo.tamanho)}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Paperclip className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">Nenhum anexo adicionado</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab Lembretes */}
            <TabsContent value="lembretes" className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {evento.lembretes && evento.lembretes.length > 0 ? (
                  evento.lembretes.map((lembrete) => (
                    <div key={lembrete.id} className="bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                          Lembrete {lembrete.tempo} {lembrete.unidade} antes
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Notificação automática</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">Nenhum lembrete configurado</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab Histórico */}
            <TabsContent value="historico" className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {evento.historico && evento.historico.length > 0 ? (
                  evento.historico.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#89bcbe] mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-[#34495e]">
                          <span className="font-medium">{item.usuario}</span> {item.acao}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {format(item.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">Nenhuma alteração registrada</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer com ações */}
        <div className="border-t dark:border-slate-700 bg-slate-50 dark:bg-surface-0 px-6 py-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Criado em {format(evento.data_inicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}