"use client"

import * as React from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: "start" | "center" | "end"
}

const presets = [
  {
    label: "Hoje",
    getValue: () => {
      const today = new Date()
      return { from: today, to: today }
    },
  },
  {
    label: "Últimos 7 dias",
    getValue: () => {
      const today = new Date()
      return { from: subDays(today, 6), to: today }
    },
  },
  {
    label: "Últimos 14 dias",
    getValue: () => {
      const today = new Date()
      return { from: subDays(today, 13), to: today }
    },
  },
  {
    label: "Últimos 30 dias",
    getValue: () => {
      const today = new Date()
      return { from: subDays(today, 29), to: today }
    },
  },
  {
    label: "Esta semana",
    getValue: () => {
      const today = new Date()
      return { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) }
    },
  },
  {
    label: "Este mês",
    getValue: () => {
      const today = new Date()
      return { from: startOfMonth(today), to: endOfMonth(today) }
    },
  },
  {
    label: "Mês passado",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
]

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Selecione o período",
  disabled,
  className,
  align = "start",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder

    if (range.to) {
      // Verificar se é o mesmo dia
      if (format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")) {
        return format(range.from, "dd/MM/yyyy", { locale: ptBR })
      }
      return `${format(range.from, "dd/MM", { locale: ptBR })} - ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`
    }

    return format(range.from, "dd/MM/yyyy", { locale: ptBR })
  }

  const handlePresetClick = (preset: typeof presets[number]) => {
    const range = preset.getValue()
    onChange(range)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex">
          {/* Presets laterais - compacto */}
          <div className="border-r border-slate-200 py-2 px-1">
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider px-2 mb-1">
              Atalhos
            </p>
            <div className="flex flex-col">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="text-left px-2 py-1 text-[11px] rounded hover:bg-slate-100 text-slate-600 transition-colors whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendário - compacto */}
          <div className="p-1.5">
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              locale={ptBR}
              defaultMonth={value?.from || new Date()}
              className="[--cell-size:1.75rem]"
            />
            <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-100 mt-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onChange(undefined)
                }}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOpen(false)}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
