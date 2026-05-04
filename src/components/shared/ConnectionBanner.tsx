'use client'

import { useAuth } from '@/contexts/AuthContext'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function ConnectionBanner() {
  const { connectionError } = useAuth()
  const [retrying, setRetrying] = useState(false)

  if (!connectionError) return null

  const handleRetry = () => {
    setRetrying(true)
    window.location.reload()
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 px-4 py-2.5">
      <div className="flex items-center justify-center gap-2.5 text-sm text-amber-700 dark:text-amber-400">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>
          Estamos com instabilidade temporária no servidor. Alguns dados podem não carregar.
        </span>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1 font-medium underline hover:no-underline disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Recarregando...' : 'Tentar novamente'}
        </button>
      </div>
    </div>
  )
}
