'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Clock,
  FileText,
  Building2,
  DollarSign,
  TrendingUpDown,
  CreditCard,
  Receipt,
} from 'lucide-react'

const financeiroMenuItems = [
  {
    title: 'Dashboard',
    shortTitle: 'Dash',
    icon: LayoutDashboard,
    href: '/dashboard/financeiro',
  },
  {
    title: 'Receitas/Despesas',
    shortTitle: 'Receitas',
    icon: TrendingUpDown,
    href: '/dashboard/financeiro/receitas-despesas',
  },
  {
    title: 'Custas e Despesas',
    shortTitle: 'Custas',
    icon: Receipt,
    href: '/dashboard/financeiro/custas-despesas',
  },
  {
    title: 'Timesheet',
    shortTitle: 'Horas',
    icon: Clock,
    href: '/dashboard/financeiro/timesheet',
  },
  {
    title: 'Contratos de Honorários',
    shortTitle: 'Contratos',
    icon: DollarSign,
    href: '/dashboard/financeiro/contratos-honorarios',
  },
  {
    title: 'Contas Bancárias',
    shortTitle: 'Contas',
    icon: Building2,
    href: '/dashboard/financeiro/contas-bancarias',
  },
  {
    title: 'Cartões de Crédito',
    shortTitle: 'Cartões',
    icon: CreditCard,
    href: '/dashboard/financeiro/cartoes',
  },
  {
    title: 'Faturamento',
    shortTitle: 'Faturas',
    icon: FileText,
    href: '/dashboard/financeiro/faturamento',
  },
  // TODO: Reativar quando implementar relatórios
  // {
  //   title: 'Relatórios',
  //   icon: BarChart3,
  //   href: '/dashboard/financeiro/relatorios',
  // },
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
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1">
        <div className="px-2 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3">
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto scrollbar-thin">
            {financeiroMenuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
                    isActive
                      ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-3 hover:text-[#34495e] dark:hover:text-slate-200'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{item.title}</span>
                  <span className="lg:hidden">{item.shortTitle}</span>
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
