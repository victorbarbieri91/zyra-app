import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { EscritorioProvider } from '@/contexts/EscritorioContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EscritorioProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </EscritorioProvider>
  )
}
