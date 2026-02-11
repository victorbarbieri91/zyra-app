'use client'

import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import { AuthProvider } from '@/contexts/AuthContext'
import { EscritorioProvider } from '@/contexts/EscritorioContext'
import { TimerProvider } from '@/contexts/TimerContext'
import { QueryProvider } from '@/providers/QueryProvider'
import { FloatingTimerWidget } from '@/components/timer'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <EscritorioProvider>
          <TimerProvider>
          <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {children}
              </main>
            </div>
            <BottomNav />
            <FloatingTimerWidget />
          </div>
          </TimerProvider>
        </EscritorioProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
