'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Clock,
  FileText,
  Receipt,
  Building2,
  DollarSign,
  BarChart3,
  TrendingUpDown,
} from 'lucide-react'

const financeiroMenuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard/financeiro',
  },
  {
    title: 'Receitas/Despesas',
    icon: TrendingUpDown,
    href: '/dashboard/financeiro/receitas-despesas',
  },
  {
    title: 'Timesheet',
    icon: Clock,
    href: '/dashboard/financeiro/timesheet',
  },
  {
    title: 'Contratos de Honorários',
    icon: DollarSign,
    href: '/dashboard/financeiro/contratos-honorarios',
  },
  {
    title: 'Contas Bancárias',
    icon: Building2,
    href: '/dashboard/financeiro/contas-bancarias',
  },
  {
    title: 'Faturamento',
    icon: FileText,
    href: '/dashboard/financeiro/faturamento',
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    href: '/dashboard/financeiro/relatorios',
  },
]

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col">
      {/* Submenu */}
      <div className="border-b border-slate-200 bg-white">
        <div className="px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {financeiroMenuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#34495e]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
