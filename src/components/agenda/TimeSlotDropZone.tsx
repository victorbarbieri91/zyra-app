'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface TimeSlotDropZoneProps {
  hora: number  // 6-22
  minuto: number  // 0, 15, 30, 45
  isHourStart?: boolean  // true para slots :00
  onCreateEvent?: () => void
  className?: string
}

export default function TimeSlotDropZone({
  hora,
  minuto,
  isHourStart = false,
  onCreateEvent,
  className,
}: TimeSlotDropZoneProps) {
  const slotId = `slot-${hora}-${minuto}`

  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      tipo: 'time-slot',
      hora,
      minuto,
    },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onCreateEvent}
      className={cn(
        'h-[22.5px] border-b transition-colors cursor-pointer group relative',
        isHourStart ? 'border-slate-200' : 'border-slate-100',
        isOver && 'bg-[#89bcbe]/10 border-[#89bcbe]',
        'hover:bg-slate-50',
        className
      )}
    >
      {/* Ícone de + que aparece no hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus className="w-3 h-3 text-[#89bcbe]" />
      </div>

      {/* Indicador visual quando está sobre o slot (drag over) */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-[#89bcbe] rounded-full" />
        </div>
      )}
    </div>
  )
}
