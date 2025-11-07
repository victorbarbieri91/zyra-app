'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  Clock,
  User,
  FileText,
  MapPin,
  Calendar,
  AlertCircle,
  Edit,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'

interface TarefaViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tarefa: Tarefa | null
  onEdit?: () => void
  onDelete?: () => void
}

const tipoLabels: Record<string, string> = {
  prazo_processual: 'Prazo Processual',
  acompanhamento: 'Acompanhamento',
  reuniao: 'Reunião',
  pesquisa: 'Pesquisa',
  outro: 'Outro',
}

const prioridadeConfig = {
  alta: { label: 'Alta', color: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  concluida: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 border-red-200' },
}

export default function TarefaViewModal({
  open,
  onOpenChange,
  tarefa,
  onEdit,
  onDelete,
}: TarefaViewModalProps) {
  if (!tarefa) return null

  const prioridade = prioridadeConfig[tarefa.prioridade || 'media']
  const status = statusConfig[tarefa.status || 'pendente']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl text-[#34495e] mb-2">{tarefa.titulo}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', prioridade.color)}>
                  {prioridade.label}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', status.color)}>
                  {status.label}
                </Badge>
                {tarefa.tipo && (
                  <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
                    {tipoLabels[tarefa.tipo] || tarefa.tipo}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                  className="h-8 text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[#46627f]">
                <Calendar className="w-3.5 h-3.5" />
                Data de Início
              </div>
              <p className="text-sm text-[#34495e]">
                {format(new Date(tarefa.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            {tarefa.data_fim && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-[#46627f]">
                  <Clock className="w-3.5 h-3.5" />
                  Data de Término
                </div>
                <p className="text-sm text-[#34495e]">
                  {format(new Date(tarefa.data_fim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Prazo Processual */}
          {tarefa.tipo === 'prazo_processual' && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#34495e]">Informações do Prazo</h4>
                <div className="grid grid-cols-2 gap-4">
                  {tarefa.prazo_data_intimacao && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#46627f]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Data de Intimação
                      </div>
                      <p className="text-sm text-[#34495e]">
                        {format(new Date(tarefa.prazo_data_intimacao), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {tarefa.prazo_data_limite && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#46627f]">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        Data Limite
                      </div>
                      <p className="text-sm font-semibold text-red-600">
                        {format(new Date(tarefa.prazo_data_limite), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>

                {tarefa.prazo_quantidade_dias && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#6c757d]">
                      Prazo: {tarefa.prazo_quantidade_dias} {tarefa.prazo_dias_uteis ? 'dias úteis' : 'dias corridos'}
                      {tarefa.prazo_tipo && ` • ${tarefa.prazo_tipo}`}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Descrição */}
          {tarefa.descricao && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[#34495e]">Descrição</h4>
                <p className="text-sm text-[#6c757d] whitespace-pre-wrap">{tarefa.descricao}</p>
              </div>
            </>
          )}

          {/* Detalhes Adicionais */}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            {tarefa.responsavel_nome && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-[#46627f]">
                  <User className="w-3.5 h-3.5" />
                  Responsável
                </div>
                <p className="text-sm text-[#34495e]">{tarefa.responsavel_nome}</p>
              </div>
            )}

            {tarefa.local && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-[#46627f]">
                  <MapPin className="w-3.5 h-3.5" />
                  Local
                </div>
                <p className="text-sm text-[#34495e]">{tarefa.local}</p>
              </div>
            )}
          </div>

          {/* Progresso */}
          {tarefa.progresso_percentual !== null && tarefa.progresso_percentual !== undefined && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#34495e]">Progresso</h4>
                  <span className="text-sm font-medium text-[#34495e]">{tarefa.progresso_percentual}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] h-2 rounded-full transition-all"
                    style={{ width: `${tarefa.progresso_percentual}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          {tarefa.observacoes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[#34495e]">Observações</h4>
                <p className="text-sm text-[#6c757d] whitespace-pre-wrap">{tarefa.observacoes}</p>
              </div>
            </>
          )}

          {/* Metadados */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-[#6c757d]">
            <div>
              <span className="font-medium">Criado em:</span>{' '}
              {format(new Date(tarefa.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            <div>
              <span className="font-medium">Atualizado em:</span>{' '}
              {format(new Date(tarefa.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
