'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import { AuthProvider } from '@/contexts/AuthContext'
import { EscritorioProvider } from '@/contexts/EscritorioContext'
import { TimerProvider } from '@/contexts/TimerContext'
import { QueryProvider } from '@/providers/QueryProvider'
import { FloatingTimerWidget } from '@/components/timer'
import { ConnectionBanner } from '@/components/shared/ConnectionBanner'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileApp from '@/components/mobile/MobileApp'

// Layout do desktop/tablet — markup INALTERADO. No celular ele não é renderizado.
function DesktopChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-surface-0">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConnectionBanner />
        <Header />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
      <FloatingTimerWidget />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Phone-only: em telas de celular (<768px) renderizamos uma experiência
  // dedicada (MobileApp). Desktop/tablet seguem 100% como antes (DesktopChrome).
  // O guard `mounted` evita mismatch de hidratação (useIsMobile é client-only);
  // antes de montar renderiza o desktop (caso dominante, sem regressão de SSR).
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <QueryProvider>
      <AuthProvider>
        <EscritorioProvider>
          <TimerProvider>
            {mounted && isMobile
              ? <MobileApp>{children}</MobileApp>
              : <DesktopChrome>{children}</DesktopChrome>}
          </TimerProvider>
        </EscritorioProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
