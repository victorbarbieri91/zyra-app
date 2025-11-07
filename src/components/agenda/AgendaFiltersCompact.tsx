'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Calendar, Gavel, AlertCircle, CheckCircle2, X } from 'lucide-react'
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
  responsaveis: string[]
}

interface AgendaFiltersCompactProps {
  filters: EventFiltersState
  onFiltersChange: (filters: EventFiltersState) => void
  responsaveisDisponiveis?: Array<{ id: string; nome: string }>
  className?: string
}

const tipoConfig = {
  compromisso: { label: 'Compromissos', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
  audiencia: { label: 'Audiências', icon: Gavel, color: 'bg-[#1E3A8A]/10 text-[#1E3A8A]' },
  prazo: { label: 'Prazos', icon: AlertCircle, color: 'bg-amber-100 text-amber-700' },
  tarefa: { label: 'Tarefas', icon: CheckCircle2, color: 'bg-slate-100 text-slate-700' },
}

export default function AgendaFiltersCompact({
  filters,
  onFiltersChange,
  responsaveisDisponiveis = [],
  className,
}: AgendaFiltersCompactProps) {
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

  const clearAllFilters = () => {
    onFiltersChange({
      tipos: {
        compromisso: true,
        audiencia: true,
        prazo: true,
        tarefa: true,
      },
      status: {
        agendado: true,
        realizado: false,
        cancelado: false,
      },
      responsaveis: [],
    })
  }

  const hasActiveFilters = () => {
    const tiposFiltrados = Object.values(filters.tipos).some(v => !v)
    const statusFiltrados = !filters.status.agendado || filters.status.realizado || filters.status.cancelado
    const responsaveisFiltrados = filters.responsaveis.length > 0
    return tiposFiltrados || statusFiltrados || responsaveisFiltrados
  }

  const tiposAtivos = Object.entries(filters.tipos)
    .filter(([_, ativo]) => !ativo)
    .map(([tipo]) => tipo as keyof typeof filters.tipos)

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Filtros de Tipo */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-slate-200 hover:border-[#89bcbe]"
            >
              Tipos
              {tiposAtivos.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                  {4 - tiposAtivos.length}/4
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">Tipo de Evento</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(tipoConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={filters.tipos[key as keyof typeof filters.tipos]}
                  onCheckedChange={(checked) =>
                    handleTipoChange(key as keyof typeof filters.tipos, checked)
                  }
                  className="text-xs"
                >
                  <Icon className="w-3.5 h-3.5 mr-2" />
                  {config.label}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtros de Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-slate-200 hover:border-[#89bcbe]"
            >
              Status
              {(!filters.status.agendado || filters.status.realizado || filters.status.cancelado) && (
                <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                  {Object.values(filters.status).filter(v => v).length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Status do Evento</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filters.status.agendado}
              onCheckedChange={(checked) => handleStatusChange('agendado', checked)}
              className="text-xs"
            >
              Agendados
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.status.realizado}
              onCheckedChange={(checked) => handleStatusChange('realizado', checked)}
              className="text-xs"
            >
              Realizados
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.status.cancelado}
              onCheckedChange={(checked) => handleStatusChange('cancelado', checked)}
              className="text-xs"
            >
              Cancelados
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtro de Responsáveis (se houver) */}
        {responsaveisDisponiveis.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-200 hover:border-[#89bcbe]"
              >
                Responsáveis
                {filters.responsaveis.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                    {filters.responsaveis.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs">Responsável</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {responsaveisDisponiveis.map((responsavel) => (
                <DropdownMenuCheckboxItem
                  key={responsavel.id}
                  checked={filters.responsaveis.includes(responsavel.id)}
                  onCheckedChange={(checked) => handleResponsavelChange(responsavel.id, checked)}
                  className="text-xs"
                >
                  {responsavel.nome}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

      {/* Botão Limpar Filtros */}
      {hasActiveFilters() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-8 text-xs text-[#89bcbe] hover:text-[#6ba9ab] hover:bg-[#f0f9f9]"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
