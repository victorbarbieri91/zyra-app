'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { AtoContrato, ModoCobrancaAto } from '@/hooks/useContratosHonorarios'

interface AtoConfigCardProps {
  ato: AtoContrato
  onUpdate: (updates: Partial<AtoContrato>) => void
  onRemove: () => void
}

export function AtoConfigCard({ ato, onUpdate, onRemove }: AtoConfigCardProps) {
  const modo = ato.modo_cobranca || 'percentual'

  return (
    <div className="p-2 rounded-md bg-slate-50 border border-slate-100">
      {/* Header: Nome + Modo + Remove */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Input
          type="text"
          value={ato.ato_nome || ''}
          onChange={(e) => onUpdate({ ato_nome: e.target.value })}
          placeholder="Nome do ato"
          className="h-6 text-[10px] font-medium text-[#34495e] bg-white border border-slate-200 hover:border-[#89bcbe] focus:border-[#89bcbe] px-1.5 flex-1 min-w-0"
        />
        <Select
          value={modo}
          onValueChange={(value) => onUpdate({ modo_cobranca: value as ModoCobrancaAto })}
        >
          <SelectTrigger className="w-[70px] h-6 text-[9px] px-1.5 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentual" className="text-[10px]">% Causa</SelectItem>
            <SelectItem value="por_hora" className="text-[10px]">Por Hora</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
          onClick={onRemove}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>

      {/* Campos para modo PERCENTUAL */}
      {modo === 'percentual' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5">
            <Input
              type="number"
              step="0.1"
              placeholder="0"
              value={ato.percentual_valor_causa || ''}
              onChange={(e) =>
                onUpdate({ percentual_valor_causa: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              className="h-6 w-12 text-[10px] text-center px-1"
            />
            <span className="text-[9px] text-slate-500">%</span>
          </div>
          <span className="text-[9px] text-slate-400">mín:</span>
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] text-slate-500">R$</span>
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              value={ato.valor_fixo || ''}
              onChange={(e) =>
                onUpdate({ valor_fixo: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              className="h-6 w-16 text-[10px] px-1"
            />
          </div>
        </div>
      )}

      {/* Campos para modo POR HORA */}
      {modo === 'por_hora' && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] text-slate-500">R$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={ato.valor_hora || ''}
                onChange={(e) =>
                  onUpdate({ valor_hora: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="h-6 w-16 text-[10px] px-1"
              />
              <span className="text-[9px] text-slate-400">/h</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] text-slate-400">min:</span>
              <Input
                type="number"
                step="0.5"
                placeholder="0"
                value={ato.horas_minimas || ''}
                onChange={(e) =>
                  onUpdate({ horas_minimas: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="h-6 w-10 text-[10px] text-center px-0.5"
              />
              <span className="text-[9px] text-slate-400">h</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] text-slate-400">máx:</span>
              <Input
                type="number"
                step="0.5"
                placeholder="0"
                value={ato.horas_maximas || ''}
                onChange={(e) =>
                  onUpdate({ horas_maximas: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="h-6 w-10 text-[10px] text-center px-0.5"
              />
              <span className="text-[9px] text-slate-400">h</span>
            </div>
          </div>
          {/* Preview de valores calculados */}
          {ato.valor_hora && (ato.horas_minimas || ato.horas_maximas) && (
            <div className="text-[8px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
              {ato.horas_minimas && (
                <span>
                  Min: R${(ato.valor_hora * ato.horas_minimas).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              )}
              {ato.horas_minimas && ato.horas_maximas && <span className="mx-1">|</span>}
              {ato.horas_maximas && (
                <span>
                  Máx: R${(ato.valor_hora * ato.horas_maximas).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
