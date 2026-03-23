'use client'

import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  LayoutDashboard,
  Clock,
  FileText,
  Building2,
  DollarSign,
  TrendingUpDown,
  CreditCard,
  Receipt,
  ChevronLeft,
  ChevronRight,
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
    shortTitle: 'Rec/Desp',
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
]

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const { escritorioAtivo, roleAtual } = useEscritorioAtivo()
  const [custasBadge, setCustasBadge] = useState(0)

  // Badge de custas pendentes (admin/Gerente) ou agendadas (owner/Sócio)
  useEffect(() => {
    if (!escritorioAtivo || !roleAtual) return
    const supabase = createClient()
    const fluxoFiltro = roleAtual === 'owner' ? 'agendado' : 'pendente'

    supabase
      .from('financeiro_despesas')
      .select('id', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioAtivo)
      .eq('fluxo_status', fluxoFiltro)
      .neq('status', 'cancelado')
      .then(({ count }) => setCustasBadge(count || 0))
  }, [escritorioAtivo, roleAtual])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const obs = new ResizeObserver(checkScroll)
    obs.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      obs.disconnect()
    }
  }, [checkScroll])

  // Scroll active item into view on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const active = el.querySelector('[data-active="true"]') as HTMLElement | null
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [pathname])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Submenu */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1">
        <div className="relative">
          {/* Left fade + arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-6 sm:left-8 top-0 bottom-0 z-10 flex items-center pl-1 pr-2 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-surface-1 dark:via-surface-1/90"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* Right fade + arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-2 sm:right-3 top-0 bottom-0 z-10 flex items-center pr-1 pl-3 bg-gradient-to-l from-white via-white/90 to-transparent dark:from-surface-1 dark:via-surface-1/90"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 md:px-5 py-2 sm:py-2.5 overflow-x-auto scrollbar-none ml-6 sm:ml-8"
          >
            {financeiroMenuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive}
                  title={item.title}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 sm:px-3 md:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0',
                    isActive
                      ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-3 hover:text-[#34495e] dark:hover:text-slate-200'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline lg:hidden">{item.shortTitle}</span>
                  <span className="hidden lg:inline">{item.title}</span>
                  {item.href === '/dashboard/financeiro/custas-despesas' && custasBadge > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : roleAtual === 'owner'
                          ? "bg-blue-500 text-white"
                          : "bg-amber-500 text-white"
                    )}>
                      {custasBadge}
                    </span>
                  )}
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
