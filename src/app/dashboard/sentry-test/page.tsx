'use client'

import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function SentryTestPage() {
  const [sent, setSent] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <h1 className="text-xl font-semibold text-[#34495e]">Teste do Sentry</h1>
      <p className="text-sm text-[#46627f] max-w-md text-center">
        Clique nos botões abaixo para testar o rastreamento de erros.
        Os erros aparecerão no dashboard do Sentry.
      </p>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            Sentry.captureException(new Error('Teste manual do Sentry - captureException'))
            setSent(true)
          }}
        >
          Enviar erro capturado
        </Button>

        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={() => {
            throw new Error('Teste manual do Sentry - throw no React')
          }}
        >
          Disparar erro (crash)
        </Button>
      </div>

      {sent && (
        <p className="text-sm text-emerald-600 font-medium">
          Erro enviado! Verifique no dashboard do Sentry.
        </p>
      )}

      <p className="text-xs text-slate-400 mt-8">
        Remova esta página após confirmar que o Sentry funciona.
        <br />
        Caminho: src/app/dashboard/sentry-test/page.tsx
      </p>
    </div>
  )
}
