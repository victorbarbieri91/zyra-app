'use client'

import { X, Plus, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import EventCard, { EventCardProps } from './EventCard'

interface SidebarDinamicaProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  eventos: EventCardProps[]
  onEventClick: (evento: EventCardProps) => void
  onCreateEvent: (date: Date) => void
  className?: string
}

export default function SidebarDinamica({
  isOpen,
  onClose,
  selectedDate,
  eventos,
  onEventClick,
  onCreateEvent,
  className,
}: SidebarDinamicaProps) {
  if (!isOpen || !selectedDate) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50',
          'transform transition-transform duration-300 ease-in-out',
          'border-l border-slate-200',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div>
              <h3 className="text-base font-semibold text-[#34495e]">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h3>
              <p className="text-xs text-[#6c757d] mt-0.5">
                {format(selectedDate, 'EEEE', { locale: ptBR })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-[#6c757d]" />
            </Button>
          </div>

          {/* Botão de Criar Evento */}
          <div className="p-4 border-b border-slate-200">
            <Button
              onClick={() => onCreateEvent(selectedDate)}
              className="w-full bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </div>

          {/* Lista de Eventos */}
          <ScrollArea className="flex-1 p-4">
            {eventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-[#6c757d] mb-1">Nenhum evento neste dia</p>
                <p className="text-xs text-slate-400">
                  Clique em "Novo Evento" para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[#46627f] mb-3">
                  {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
                </p>
                {eventos.map((evento) => (
                  <EventCard
                    key={evento.id}
                    {...evento}
                    onClick={() => onEventClick(evento)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer (opcional - estatísticas rápidas) */}
          {eventos.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs font-semibold text-[#34495e]">
                    {eventos.filter(e => e.tipo === 'audiencia').length}
                  </p>
                  <p className="text-[10px] text-[#6c757d]">Audiências</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#34495e]">
                    {eventos.filter(e => e.tipo === 'prazo').length}
                  </p>
                  <p className="text-[10px] text-[#6c757d]">Prazos</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#34495e]">
                    {eventos.filter(e => e.tipo === 'compromisso' || e.tipo === 'tarefa').length}
                  </p>
                  <p className="text-[10px] text-[#6c757d]">Outros</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
