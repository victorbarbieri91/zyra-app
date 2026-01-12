"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

interface DateTimeInputProps {
  value?: string // formato YYYY-MM-DDTHH:MM
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateTimeInput({
  value,
  onChange,
  placeholder = "Selecione data e horário",
  disabled,
  className
}: DateTimeInputProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Extrair data e hora do valor
  const dateValue = value ? value.split('T')[0] : ''
  const timeValue = value ? value.split('T')[1] || '09:00' : '09:00'

  // Converter string YYYY-MM-DD para Date
  const selectedDate = dateValue ? parse(dateValue, 'yyyy-MM-dd', new Date()) : undefined

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const newValue = `${dateStr}T${timeValue}`
      onChange(newValue)
      // Não fechar automaticamente para permitir ajustar o horário
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    if (dateValue) {
      onChange(`${dateValue}T${newTime}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    // Se o usuário digitou uma data válida, atualizar o calendário
    const inputDate = e.target.value.split('T')[0]
    if (inputDate && inputDate.length === 10) {
      setOpen(true)
    }
  }

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(true)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              type="datetime-local"
              value={value || ''}
              onChange={handleInputChange}
              onClick={handleInputClick}
              disabled={disabled}
              className={cn("text-sm pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden", className)}
            />
            <CalendarIcon
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Não fechar se clicar no input
            if (inputRef.current?.contains(e.target as Node)) {
              e.preventDefault()
            }
          }}
        >
          <div className="p-3 space-y-3">
            {/* Calendário */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={ptBR}
              className="rounded-md border-0"
            />

            {/* Seletor de Horário */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Horário
              </Label>
              <Input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                className="text-sm"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
