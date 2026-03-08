'use client'

import { Button } from '@/components/ui/button'
import { PendingInput } from '@/types/centro-comando'

interface FormularioPendenteProps {
  pendingInput: PendingInput
  onAbrirFormulario: () => void
}

export function FormularioPendente({ pendingInput, onAbrirFormulario }: FormularioPendenteProps) {
  const campos = pendingInput.schema.fields
  return (
    <div className="border border-[#89bcbe]/30 bg-[#89bcbe]/5 rounded-lg p-4 mt-3">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{pendingInput.contexto}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {campos.slice(0, 3).map((campo) => (
          <span key={campo.campo} className="text-xs px-2 py-1 bg-white dark:bg-surface-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
            {campo.descricao}
            {campo.obrigatorio && <span className="text-red-400 dark:text-red-400 ml-0.5">*</span>}
          </span>
        ))}
        {campos.length > 3 && <span className="text-xs px-2 py-1 bg-slate-50 dark:bg-surface-0 rounded text-slate-400 dark:text-slate-500">+{campos.length - 3}</span>}
      </div>
      <Button onClick={onAbrirFormulario} size="sm" className="bg-[#34495e] hover:bg-[#46627f] dark:bg-[#89bcbe] dark:hover:bg-[#6ba9ab] dark:text-slate-900 text-xs">Preencher</Button>
    </div>
  )
}
