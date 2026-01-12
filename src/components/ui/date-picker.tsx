"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateInputProps {
  value?: string // formato YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateInput({ value, onChange, placeholder = "Selecione a data", disabled, className }: DateInputProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Converter string YYYY-MM-DD para Date
  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Converter Date para string YYYY-MM-DD
      onChange(format(date, 'yyyy-MM-dd'))
      setOpen(false)
      // Manter foco no input após selecionar
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
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
              type="date"
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
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
