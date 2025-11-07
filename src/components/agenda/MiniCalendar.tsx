'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MiniCalendarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  eventDates?: Date[] // Datas que têm eventos
  className?: string
}

export default function MiniCalendar({
  selectedDate = new Date(),
  onDateSelect,
  eventDates = [],
  className,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = startOfWeek(monthStart, { locale: ptBR })
  const endDate = endOfWeek(monthEnd, { locale: ptBR })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const hasEvent = (day: Date) => {
    return eventDates.some((eventDate) => isSameDay(eventDate, day))
  }

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    if (onDateSelect) {
      onDateSelect(today)
    }
  }

  return (
    <Card className={cn('border-slate-200 shadow-sm', className)}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-[#34495e] capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={previousMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-[#6c757d]" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5 text-[#6c757d]" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-medium text-[#6c757d]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isTodayDate = isToday(day)
            const hasEventOnDay = hasEvent(day)

            return (
              <button
                key={i}
                onClick={() => onDateSelect && onDateSelect(day)}
                className={cn(
                  'relative h-8 w-full rounded-md text-xs font-normal transition-all',
                  'hover:bg-slate-100',
                  !isCurrentMonth && 'text-slate-300',
                  isCurrentMonth && 'text-[#34495e]',
                  isSelected &&
                    'bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] text-white hover:from-[#6ba9ab] hover:to-[#5a979a] font-medium',
                  isTodayDate &&
                    !isSelected &&
                    'border border-[#89bcbe] font-medium',
                  !isSelected && !isTodayDate && 'border border-transparent'
                )}
              >
                {format(day, 'd')}
                {hasEventOnDay && (
                  <div
                    className={cn(
                      'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                      isSelected ? 'bg-white' : 'bg-[#89bcbe]'
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Botão Hoje */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="w-full mt-3 text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
        >
          Hoje
        </Button>
      </CardContent>
    </Card>
  )
}
