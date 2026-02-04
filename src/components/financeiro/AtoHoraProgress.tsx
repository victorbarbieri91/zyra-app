'use client'

import { cn, formatHoras } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface AtoHoraProgressProps {
  horasUsadas: number
  horasMinimas?: number | null
  horasMaximas?: number | null
  valorHora?: number | null
  horasNovas?: number // Horas que serão adicionadas (para preview)
  className?: string
  showDetails?: boolean
}

export function AtoHoraProgress({
  horasUsadas,
  horasMinimas,
  horasMaximas,
  valorHora,
  horasNovas = 0,
  className,
  showDetails = true,
}: AtoHoraProgressProps) {
  // Calcular progresso atual
  const percentualUsado = horasMaximas && horasMaximas > 0
    ? Math.min((horasUsadas / horasMaximas) * 100, 100)
    : 0

  // Calcular progresso com novas horas
  const horasTotaisPreview = horasUsadas + horasNovas
  const percentualPreview = horasMaximas && horasMaximas > 0
    ? Math.min((horasTotaisPreview / horasMaximas) * 100, 100)
    : 0

  const horasDisponiveis = horasMaximas
    ? Math.max(horasMaximas - horasUsadas, 0)
    : null

  // Cálculo de horas excedentes (preview)
  const horasExcedentesPreview = horasMaximas && horasTotaisPreview > horasMaximas
    ? horasTotaisPreview - horasMaximas
    : 0

  const atingiuMaximo = horasMaximas && horasUsadas >= horasMaximas
  const vaiAtingirMaximo = horasMaximas && horasTotaisPreview >= horasMaximas && !atingiuMaximo
  const proximoDoMaximo = horasMaximas && percentualUsado >= 80 && !atingiuMaximo
  const abaixoDoMinimo = horasMinimas && horasUsadas < horasMinimas

  // Calcular valores
  const valorAtual = valorHora ? horasUsadas * valorHora : 0
  const valorMinimo = valorHora && horasMinimas ? horasMinimas * valorHora : 0
  const valorMaximo = valorHora && horasMaximas ? horasMaximas * valorHora : null

  // Cor da barra baseada no status
  const barColor = atingiuMaximo
    ? 'bg-red-500'
    : proximoDoMaximo || vaiAtingirMaximo
    ? 'bg-amber-500'
    : 'bg-emerald-500'

  return (
    <div className={cn('space-y-1', className)}>
      {/* Barra de progresso */}
      {horasMaximas && (
        <div className="relative">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
            {/* Horas já usadas */}
            <div
              className={cn('h-full transition-all', barColor)}
              style={{ width: `${percentualUsado}%` }}
            />
            {/* Preview das novas horas (se houver espaço) */}
            {horasNovas > 0 && percentualPreview > percentualUsado && (
              <div
                className={cn(
                  'h-full transition-all',
                  horasExcedentesPreview > 0 ? 'bg-red-300' : 'bg-blue-400'
                )}
                style={{ width: `${Math.min(percentualPreview - percentualUsado, 100 - percentualUsado)}%` }}
              />
            )}
          </div>
          {/* Marcador do mínimo */}
          {horasMinimas && horasMaximas && (
            <div
              className="absolute top-0 h-2 w-0.5 bg-slate-400"
              style={{ left: `${(horasMinimas / horasMaximas) * 100}%` }}
              title={`Mínimo: ${formatHoras(horasMinimas, 'curto')}`}
            />
          )}
        </div>
      )}

      {/* Informações de progresso */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1">
          {atingiuMaximo ? (
            <>
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-600 font-medium">Máximo atingido</span>
            </>
          ) : vaiAtingirMaximo ? (
            <>
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600 font-medium">
                Este lançamento excederá o máximo em {formatHoras(horasExcedentesPreview, 'curto')}
              </span>
            </>
          ) : proximoDoMaximo ? (
            <>
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600 font-medium">
                {formatHoras(horasDisponiveis || 0, 'curto')} restantes
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span className="text-slate-500">
                {formatHoras(horasUsadas, 'curto')}{horasNovas > 0 ? ` + ${formatHoras(horasNovas, 'curto')}` : ''}{horasMaximas ? ` de ${formatHoras(horasMaximas, 'curto')}` : ''}
              </span>
            </>
          )}
        </div>

        {/* Valor */}
        {showDetails && valorHora && (
          <span className="text-slate-400">
            R${valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {horasNovas > 0 && !atingiuMaximo && (
              <span className="text-blue-500">
                {' → R$'}
                {((horasUsadas + Math.min(horasNovas, horasDisponiveis || horasNovas)) * valorHora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            {valorMaximo && (
              <span> / máx R${valorMaximo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
          </span>
        )}
      </div>

      {/* Alerta de mínimo */}
      {abaixoDoMinimo && showDetails && (
        <div className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>
            Abaixo do mínimo ({formatHoras(horasMinimas || 0, 'curto')}). Ao finalizar, será cobrado R$
            {valorMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}

// Versão compacta para uso em listas
export function AtoHoraProgressCompact({
  horasUsadas,
  horasMaximas,
  className,
}: {
  horasUsadas: number
  horasMaximas?: number | null
  className?: string
}) {
  const percentualUsado = horasMaximas && horasMaximas > 0
    ? Math.min((horasUsadas / horasMaximas) * 100, 100)
    : 0

  const atingiuMaximo = horasMaximas && horasUsadas >= horasMaximas

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            atingiuMaximo ? 'bg-red-500' : percentualUsado >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${percentualUsado}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 whitespace-nowrap">
        {formatHoras(horasUsadas, 'curto')}{horasMaximas ? `/${formatHoras(horasMaximas, 'curto')}` : ''}
      </span>
    </div>
  )
}
