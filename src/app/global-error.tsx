'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 flex items-center justify-center min-h-screen font-sans antialiased">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#34495e' }}>
            Algo deu errado
          </h2>
          <p className="text-sm mb-6" style={{ color: '#46627f' }}>
            Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
          </p>
          {error.digest && (
            <p className="text-[10px] mb-4 font-mono" style={{ color: '#94a3b8' }}>
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(to right, #34495e, #46627f)' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
