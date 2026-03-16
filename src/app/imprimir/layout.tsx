'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Layout para páginas de impressão.
 * Força tema light para garantir que os documentos
 * imprimíveis mantenham cores corretas mesmo se o
 * usuário estiver usando dark mode.
 */
export default function ImprimirLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { setTheme, theme } = useTheme()

  useEffect(() => {
    // Forçar tema light nas páginas de impressão
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
