'use client'

import {
  CheckCircle,
  CreditCard,
} from 'lucide-react'
import type { CartaoCredito } from '@/hooks/useCartoesCredito'

interface ImportarFaturaStep3Props {
  totalImportado: number
  valorTotalImportado: number
  cartaoSelecionado: CartaoCredito | undefined
  formatCurrency: (value: number) => string
}

export default function ImportarFaturaStep3({
  totalImportado,
  valorTotalImportado,
  cartaoSelecionado,
  formatCurrency,
}: ImportarFaturaStep3Props) {
  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>

        <div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Importação concluída
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {totalImportado} lançamentos · {formatCurrency(valorTotalImportado)}
          </p>
        </div>

        {cartaoSelecionado && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-50 dark:bg-surface-0">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: cartaoSelecionado.cor || '#64748B' }}
            >
              <CreditCard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {cartaoSelecionado.nome} •••• {cartaoSelecionado.ultimos_digitos}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
