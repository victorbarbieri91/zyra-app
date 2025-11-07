'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Calendar, Gavel, AlertCircle, CheckCircle2, User, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EventFiltersState {
  tipos: {
    compromisso: boolean
    audiencia: boolean
    prazo: boolean
    tarefa: boolean
  }
  status: {
    agendado: boolean
    realizado: boolean
    cancelado: boolean
  }
  responsaveis: string[] // IDs dos responsáveis selecionados
}

interface EventFiltersProps {
  filters: EventFiltersState
  onFiltersChange: (filters: EventFiltersState) => void
  responsaveisDisponiveis?: Array<{ id: string; nome: string }>
  className?: string
}

export default function EventFilters({
  filters,
  onFiltersChange,
  responsaveisDisponiveis = [],
  className,
}: EventFiltersProps) {
  const tipoConfig = [
    { key: 'compromisso', label: 'Compromissos', icon: Calendar, color: 'text-blue-600' },
    { key: 'audiencia', label: 'Audiências', icon: Gavel, color: 'text-[#1E3A8A]' },
    { key: 'prazo', label: 'Prazos', icon: AlertCircle, color: 'text-amber-600' },
    { key: 'tarefa', label: 'Tarefas', icon: CheckCircle2, color: 'text-slate-600' },
  ]

  const handleTipoChange = (tipo: keyof typeof filters.tipos, checked: boolean) => {
    onFiltersChange({
      ...filters,
      tipos: {
        ...filters.tipos,
        [tipo]: checked,
      },
    })
  }

  const handleStatusChange = (status: keyof typeof filters.status, checked: boolean) => {
    onFiltersChange({
      ...filters,
      status: {
        ...filters.status,
        [status]: checked,
      },
    })
  }

  const handleResponsavelChange = (responsavelId: string, checked: boolean) => {
    const newResponsaveis = checked
      ? [...filters.responsaveis, responsavelId]
      : filters.responsaveis.filter((id) => id !== responsavelId)

    onFiltersChange({
      ...filters,
      responsaveis: newResponsaveis,
    })
  }

  const toggleAll = (value: boolean) => {
    onFiltersChange({
      tipos: {
        compromisso: value,
        audiencia: value,
        prazo: value,
        tarefa: value,
      },
      status: {
        agendado: value,
        realizado: value,
        cancelado: value,
      },
      responsaveis: value ? responsaveisDisponiveis.map((r) => r.id) : [],
    })
  }

  const hasActiveFilters = () => {
    return (
      !Object.values(filters.tipos).every((v) => v === true) ||
      !Object.values(filters.status).every((v) => v === true) ||
      filters.responsaveis.length !== responsaveisDisponiveis.length
    )
  }

  return (
    <Card className={cn('border-slate-200 shadow-sm', className)}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#89bcbe]" />
            Filtros
          </CardTitle>
          {hasActiveFilters() && (
            <button
              onClick={() => toggleAll(true)}
              className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] font-medium"
            >
              Limpar
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4 space-y-4">
        {/* Filtro por Tipo */}
        <div>
          <Label className="text-xs font-semibold text-[#46627f] mb-2.5 block">
            Tipo de Evento
          </Label>
          <div className="space-y-2.5">
            {tipoConfig.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`tipo-${key}`}
                  checked={filters.tipos[key as keyof typeof filters.tipos]}
                  onCheckedChange={(checked) =>
                    handleTipoChange(key as keyof typeof filters.tipos, checked as boolean)
                  }
                  className="border-slate-300"
                />
                <Label
                  htmlFor={`tipo-${key}`}
                  className="text-xs font-normal text-[#34495e] cursor-pointer flex items-center gap-1.5"
                >
                  <Icon className={cn('w-3.5 h-3.5', color)} />
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Filtro por Status */}
        <div>
          <Label className="text-xs font-semibold text-[#46627f] mb-2.5 block">
            Status
          </Label>
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-agendado"
                checked={filters.status.agendado}
                onCheckedChange={(checked) =>
                  handleStatusChange('agendado', checked as boolean)
                }
                className="border-slate-300"
              />
              <Label
                htmlFor="status-agendado"
                className="text-xs font-normal text-[#34495e] cursor-pointer"
              >
                Agendados
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-realizado"
                checked={filters.status.realizado}
                onCheckedChange={(checked) =>
                  handleStatusChange('realizado', checked as boolean)
                }
                className="border-slate-300"
              />
              <Label
                htmlFor="status-realizado"
                className="text-xs font-normal text-[#34495e] cursor-pointer"
              >
                Realizados
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-cancelado"
                checked={filters.status.cancelado}
                onCheckedChange={(checked) =>
                  handleStatusChange('cancelado', checked as boolean)
                }
                className="border-slate-300"
              />
              <Label
                htmlFor="status-cancelado"
                className="text-xs font-normal text-[#34495e] cursor-pointer"
              >
                Cancelados
              </Label>
            </div>
          </div>
        </div>

        {/* Filtro por Responsável (se houver) */}
        {responsaveisDisponiveis.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="text-xs font-semibold text-[#46627f] mb-2.5 block">
                Responsável
              </Label>
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                {responsaveisDisponiveis.map((responsavel) => (
                  <div key={responsavel.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`responsavel-${responsavel.id}`}
                      checked={filters.responsaveis.includes(responsavel.id)}
                      onCheckedChange={(checked) =>
                        handleResponsavelChange(responsavel.id, checked as boolean)
                      }
                      className="border-slate-300"
                    />
                    <Label
                      htmlFor={`responsavel-${responsavel.id}`}
                      className="text-xs font-normal text-[#34495e] cursor-pointer flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-[#6c757d]" />
                      {responsavel.nome}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Ações Rápidas */}
        <Separator />
        <div className="flex gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="flex-1 text-xs py-2 px-3 rounded-md border border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] text-[#34495e] font-medium transition-all"
          >
            Selecionar Todos
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="flex-1 text-xs py-2 px-3 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#6c757d] font-medium transition-all"
          >
            Limpar Todos
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
