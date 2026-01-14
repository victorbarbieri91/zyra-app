'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  FolderKanban,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortfolioLayoutProps {
  children: ReactNode
}

const navigationItems = [
  {
    name: 'Catálogo',
    href: '/dashboard/portfolio',
    icon: Briefcase,
  },
  {
    name: 'Projetos',
    href: '/dashboard/portfolio/projetos',
    icon: FolderKanban,
  },
  {
    name: 'Analytics',
    href: '/dashboard/portfolio/analytics',
    icon: BarChart3,
  },
]

export default function PortfolioLayout({ children }: PortfolioLayoutProps) {
  const pathname = usePathname()

  // Determinar se estamos em uma página de detalhe ou criação
  const isDetailPage = pathname.includes('/produtos/') ||
    (pathname.includes('/projetos/') && pathname !== '/dashboard/portfolio/projetos')
  const isPDFPage = pathname.includes('/pdf/') || pathname.includes('/print')

  // Se for página de PDF, renderizar sem layout
  if (isPDFPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
      {/* Navigation Tabs - apenas nas páginas principais */}
      {!isDetailPage && (
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-[1800px] mx-auto px-6">
            <div className="flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive =
                  item.href === '/dashboard/portfolio'
                    ? pathname === '/dashboard/portfolio'
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all',
                      isActive
                        ? 'border-[#34495e] text-[#34495e]'
                        : 'border-transparent text-slate-500 hover:text-[#34495e] hover:border-slate-300'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-[1800px] mx-auto p-6">
        {children}
      </div>
    </div>
  )
}
