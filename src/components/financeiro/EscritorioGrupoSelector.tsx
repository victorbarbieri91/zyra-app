'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EscritorioComRole } from '@/lib/supabase/escritorio-helpers'

interface EscritorioGrupoSelectorProps {
  escritoriosGrupo: EscritorioComRole[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  escritorioAtivoId?: string | null
  label?: string
  footerLabel?: string
}

/**
 * Seletor de escritórios do grupo com checkboxes.
 * Só renderiza se o grupo tem mais de 1 escritório.
 */
export default function EscritorioGrupoSelector({
  escritoriosGrupo,
  selecionados,
  onChange,
  escritorioAtivoId,
  label = 'Visualizar de:',
  footerLabel = 'escritórios',
}: EscritorioGrupoSelectorProps) {
  const [aberto, setAberto] = useState(false)

  // Não renderizar se grupo tem 1 ou 0 escritórios
  if (escritoriosGrupo.length <= 1) return null

  const toggleEscritorio = (id: string) => {
    if (selecionados.includes(id)) {
      if (selecionados.length === 1) return // Não desmarcar o último
      onChange(selecionados.filter(e => e !== id))
    } else {
      onChange([...selecionados, id])
    }
  }

  const selecionarTodos = () => {
    onChange(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (id: string) => {
    onChange([id])
  }

  const getSeletorLabel = () => {
    if (selecionados.length === 0) return 'Selecione'
    if (selecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (selecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === selecionados[0])
      return escritorio?.nome || 'Escritório'
    }
    return `${selecionados.length} escritórios`
  }

  const todosSelected = selecionados.length === escritoriosGrupo.length

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 px-3 gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-2",
            todosSelected && "border-[#89bcbe] bg-[#f0f9f9]/50 dark:bg-teal-900/20"
          )}
        >
          <Building2 className="h-4 w-4 text-[#89bcbe]" />
          <span className="text-sm text-[#34495e] dark:text-slate-200 font-medium">
            {getSeletorLabel()}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-medium text-[#34495e] dark:text-slate-200">{label}</p>
        </div>

        {/* Opção "Todos" */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-2 border-b border-slate-100 dark:border-slate-800",
            todosSelected && "bg-[#f0f9f9] dark:bg-teal-900/20"
          )}
          onClick={selecionarTodos}
        >
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            todosSelected
              ? "bg-[#89bcbe] border-[#89bcbe]"
              : "border-slate-300 dark:border-slate-600"
          )}>
            {todosSelected && <Check className="h-3 w-3 text-white" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">Todos os escritórios</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Visão consolidada do grupo</p>
          </div>
        </div>

        {/* Lista de escritórios */}
        <div className="max-h-64 overflow-y-auto">
          {escritoriosGrupo.map((escritorio) => {
            const isSelected = selecionados.includes(escritorio.id)
            const isAtivo = escritorio.id === escritorioAtivoId

            return (
              <div
                key={escritorio.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-2 border-b border-slate-50 dark:border-slate-800 last:border-0",
                  isSelected && selecionados.length < escritoriosGrupo.length && "bg-[#f0f9f9]/50 dark:bg-teal-900/20"
                )}
                onClick={() => toggleEscritorio(escritorio.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleEscritorio(escritorio.id)}
                  className="data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#34495e] dark:text-slate-200 truncate">
                      {escritorio.nome}
                    </p>
                    {isAtivo && (
                      <span className="text-[9px] font-medium text-[#89bcbe] bg-[#89bcbe]/10 px-1.5 py-0.5 rounded">
                        Atual
                      </span>
                    )}
                  </div>
                  {escritorio.cnpj && (
                    <p className="text-[10px] text-slate-400 truncate">{escritorio.cnpj}</p>
                  )}
                </div>
                {selecionados.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      selecionarApenas(escritorio.id)
                    }}
                    className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] hover:underline whitespace-nowrap"
                  >
                    Apenas
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Rodapé */}
        <div className="p-2.5 bg-slate-50 dark:bg-surface-0 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
            {selecionados.length === 1
              ? `Exibindo ${footerLabel} de 1 escritório`
              : `Exibindo ${footerLabel} de ${selecionados.length} escritórios`}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
