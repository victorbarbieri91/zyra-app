'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, DollarSign, FileText, Folder, Receipt, Users, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface FormaCobranca {
  forma_cobranca: string
  config?: {
    valor_fixo?: number
    valor_hora?: number
    percentual_exito?: number
    valor_por_processo?: number
  }
}

interface ModalidadeSelectorProps {
  formas: FormaCobranca[]
  selectedModalidade: string | null
  onSelect: (modalidade: string) => void
  disabled?: boolean
  error?: string
}

const MODALIDADE_INFO: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  fixo: {
    label: 'Fixo',
    icon: DollarSign,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Valor fixo mensal ou único'
  },
  por_hora: {
    label: 'Por Hora',
    icon: Clock,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Cobrança por horas trabalhadas'
  },
  por_etapa: {
    label: 'Por Etapa',
    icon: Target,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Valores por fase do processo'
  },
  misto: {
    label: 'Misto',
    icon: FileText,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    description: 'Combinação de modalidades'
  },
  por_pasta: {
    label: 'Por Pasta',
    icon: Folder,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Valor fixo por processo'
  },
  por_ato: {
    label: 'Por Ato',
    icon: Receipt,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Cobrança por ato processual'
  },
  por_cargo: {
    label: 'Por Cargo',
    icon: Users,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    description: 'Valor/hora por cargo do profissional'
  },
}

function getValorDisplay(forma: FormaCobranca): string | null {
  const config = forma.config
  if (!config) return null

  switch (forma.forma_cobranca) {
    case 'fixo':
      return config.valor_fixo ? formatCurrency(config.valor_fixo) : null
    case 'por_hora':
    case 'por_cargo':
      return config.valor_hora ? `${formatCurrency(config.valor_hora)}/h` : null
    case 'por_pasta':
      return config.valor_por_processo ? formatCurrency(config.valor_por_processo) : null
    case 'por_etapa':
      return config.percentual_exito ? `${config.percentual_exito}% êxito` : null
    default:
      return null
  }
}

export default function ModalidadeSelector({
  formas,
  selectedModalidade,
  onSelect,
  disabled = false,
  error
}: ModalidadeSelectorProps) {
  if (formas.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhuma forma de cobrança configurada</p>
        <p className="text-xs mt-1">Configure as formas de cobrança no contrato</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-[#34495e] mb-1">
          Selecione a Modalidade de Cobrança
        </p>
        <p className="text-xs text-slate-500">
          Escolha como este processo será cobrado com base nas opções configuradas no contrato
        </p>
      </div>

      <div className={cn(
        "grid gap-3",
        formas.length <= 2 ? "grid-cols-2" : formas.length === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"
      )}>
        {formas.map((forma) => {
          const info = MODALIDADE_INFO[forma.forma_cobranca] || MODALIDADE_INFO.misto
          const Icon = info.icon
          const isSelected = selectedModalidade === forma.forma_cobranca
          const valorDisplay = getValorDisplay(forma)

          return (
            <Card
              key={forma.forma_cobranca}
              className={cn(
                "relative cursor-pointer transition-all duration-200 p-4 hover:shadow-md",
                isSelected
                  ? `ring-2 ring-[#89bcbe] ${info.bgColor} ${info.borderColor}`
                  : "border-slate-200 hover:border-[#89bcbe]/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onSelect(forma.forma_cobranca)}
            >
              {/* Indicador de seleção */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#89bcbe] flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                {/* Ícone */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                  info.bgColor
                )}>
                  <Icon className={cn("w-5 h-5", info.color)} />
                </div>

                {/* Label */}
                <p className={cn(
                  "text-sm font-semibold mb-1",
                  isSelected ? info.color : "text-[#34495e]"
                )}>
                  {info.label}
                </p>

                {/* Descrição */}
                <p className="text-[10px] text-slate-500 leading-tight mb-2">
                  {info.description}
                </p>

                {/* Valor (se disponível) */}
                {valorDisplay && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold",
                      isSelected ? `${info.bgColor} ${info.color} ${info.borderColor}` : "bg-white"
                    )}
                  >
                    {valorDisplay}
                  </Badge>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      {selectedModalidade && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#f0f9f9] border border-[#aacfd0]/30">
          <Check className="w-4 h-4 text-[#89bcbe]" />
          <span className="text-xs text-[#34495e]">
            Modalidade selecionada: <strong>{MODALIDADE_INFO[selectedModalidade]?.label || selectedModalidade}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
