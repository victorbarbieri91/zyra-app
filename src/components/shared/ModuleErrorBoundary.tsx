'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ModuleErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  moduleName?: string
}

export function ModuleErrorBoundary({ error, reset, moduleName }: ModuleErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { module: moduleName || 'unknown' },
    })
  }, [error, moduleName])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-[#34495e] dark:text-slate-200 mb-2">
        {moduleName ? `Erro no módulo ${moduleName}` : 'Algo deu errado'}
      </h2>
      <p className="text-sm text-[#46627f] dark:text-slate-400 text-center max-w-sm mb-6">
        Ocorreu um erro inesperado ao carregar esta página. Nossa equipe foi notificada automaticamente.
      </p>
      {error.digest && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 font-mono">
          Código: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </Button>
        <Link href="/dashboard">
          <Button size="sm" className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f] dark:from-[#89bcbe] dark:to-[#6ba9ab] text-white dark:text-surface-0 hover:opacity-90">
            <Home className="w-3.5 h-3.5" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  )
}
