'use client'

import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import HonorariosContratos from '@/components/financeiro/HonorariosContratos'

export default function HonorariosPage() {
  const { escritorioAtivo } = useEscritorioAtivo()

  if (!escritorioAtivo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Carregando escritório...</p>
      </div>
    )
  }

  return <HonorariosContratos escritorioId={escritorioAtivo} />
}
