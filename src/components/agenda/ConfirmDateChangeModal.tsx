'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Clock,
  Calendar,
  CalendarCheck,
  Briefcase,
  Gavel,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'

interface ConfirmDateChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (newTime?: string) => void
  eventTitle: string
  eventType: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  oldDate: Date
  newDate: Date
}

const tipoConfig = {
  compromisso: {
    label: 'Compromisso',
    icon: Briefcase,
    color: 'text-[#46627f] bg-[#aacfd0]/10 border-[#89bcbe]/30',
    iconColor: 'text-[#89bcbe]',
    bgGradient: 'from-[#aacfd0]/5 to-white'
  },
  audiencia: {
    label: 'Audiência',
    icon: Gavel,
    color: 'text-[#1E3A8A] bg-blue-50/50 border-[#1E3A8A]/20',
    iconColor: 'text-[#1E3A8A]',
    bgGradient: 'from-blue-50/30 to-white'
  },
  prazo: {
    label: 'Prazo',
    icon: CalendarCheck,
    color: 'text-amber-700 bg-amber-50/50 border-amber-200/50',
    iconColor: 'text-amber-600',
    bgGradient: 'from-amber-50/20 to-white'
  },
  tarefa: {
    label: 'Tarefa',
    icon: CheckCircle,
    color: 'text-[#34495e] bg-[#aacfd0]/10 border-[#89bcbe]/20',
    iconColor: 'text-[#46627f]',
    bgGradient: 'from-[#f0f9f9] to-white'
  }
}

export default function ConfirmDateChangeModal({
  open,
  onOpenChange,
  onConfirm,
  eventTitle,
  eventType,
  oldDate,
  newDate,
}: ConfirmDateChangeModalProps) {
  // Estado para o novo horário (apenas para compromissos e audiências)
  const [novoHorario, setNovoHorario] = useState<string>('')

  // Verificar se o tipo de evento usa horário
  const usaHorario = eventType === 'compromisso' || eventType === 'audiencia'

  // Inicializar horário com o horário original quando o modal abrir
  useEffect(() => {
    if (open && usaHorario) {
      setNovoHorario(format(oldDate, 'HH:mm'))
    }
  }, [open, oldDate, usaHorario])

  const handleConfirm = () => {
    if (usaHorario) {
      onConfirm(novoHorario)
    } else {
      onConfirm()
    }
    onOpenChange(false)
  }

  const config = tipoConfig[eventType]
  const Icon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0">
        <DialogTitle className="sr-only">Confirmar Alteração de Data</DialogTitle>
        <div className="bg-white rounded-lg">

          {/* Header minimalista */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-[#34495e]">
              Confirmar Alteração de Data
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Evento - Minimalista */}
            <div>
              <div className="mb-2 -ml-1">
                <span className={cn(
                  "inline-block text-[10px] font-medium px-2 py-0.5 rounded",
                  config.color
                )}>
                  {config.label}
                </span>
              </div>
              <p className="text-sm font-medium text-[#34495e]">
                {eventTitle}
              </p>
            </div>

            {/* Comparação de Datas - Minimalista */}
            <div className="space-y-3">
              <div className="flex items-stretch gap-3">
                {/* Data Antiga */}
                <div className="flex-1">
                  <div className="text-center p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[10px] text-slate-500 mb-2">
                      DATA ATUAL
                    </p>
                    <p className="text-sm font-semibold text-[#34495e]">
                      {format(oldDate, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {usaHorario && (
                      <p className="text-xs text-[#46627f] mt-1">
                        {format(oldDate, 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seta */}
                <div className="flex items-center">
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>

                {/* Data Nova */}
                <div className="flex-1">
                  <div className="text-center p-3 rounded-lg border-2 border-[#89bcbe]/30 bg-[#f0f9f9]/30">
                    <p className="text-[10px] text-[#89bcbe] font-medium mb-2">
                      NOVA DATA
                    </p>
                    <p className="text-sm font-semibold text-[#34495e]">
                      {format(newDate, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {usaHorario && (
                      <p className="text-xs text-[#46627f] mt-1">
                        {novoHorario || format(oldDate, 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Input de Horário - Apenas para compromissos e audiências */}
              {usaHorario && (
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-[11px] text-slate-600 mb-2">
                    Ajustar horário
                  </label>
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg hover:border-slate-300 focus:border-[#89bcbe] focus:ring-2 focus:ring-[#89bcbe]/10 focus:outline-none transition-all bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer minimalista */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-9 text-xs font-medium border-slate-200 hover:bg-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}