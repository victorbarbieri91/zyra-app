'use client'

import { Button } from '@/components/ui/button'
import { CampoNecessario } from '@/types/centro-comando'

interface FormularioPendenteProps {
  contexto?: string
  campos: CampoNecessario[]
  onAbrirFormulario: () => void
}

export function FormularioPendente({
  contexto,
  campos,
  onAbrirFormulario,
}: FormularioPendenteProps) {
  return (
    <div className="border border-[#89bcbe]/30 bg-[#89bcbe]/5 rounded-lg p-4 mt-3">
      <p className="text-sm text-slate-600 mb-3">
        {contexto || 'Preciso de algumas informações para continuar.'}
      </p>

      {/* Lista de campos como tags sutis */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {campos.slice(0, 3).map((campo) => (
          <span
            key={campo.campo}
            className="text-xs px-2 py-1 bg-white rounded border border-slate-200 text-slate-600"
          >
            {campo.descricao}
            {campo.obrigatorio && <span className="text-red-400 ml-0.5">*</span>}
          </span>
        ))}
        {campos.length > 3 && (
          <span className="text-xs px-2 py-1 bg-slate-50 rounded text-slate-400">
            +{campos.length - 3}
          </span>
        )}
      </div>

      <Button
        onClick={onAbrirFormulario}
        size="sm"
        className="bg-[#34495e] hover:bg-[#46627f] text-xs"
      >
        Preencher
      </Button>
    </div>
  )
}
