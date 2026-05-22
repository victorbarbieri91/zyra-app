'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  LogOut,
  Scale,
  FileSearch,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { usePublicacoesPendentesCount } from '@/hooks/usePublicacoesPendentesCount'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MenuItem {
  title: string
  icon: LucideIcon
  href: string
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Agenda', icon: Calendar, href: '/dashboard/agenda' },
  { title: 'Processos', icon: Scale, href: '/dashboard/processos' },
  { title: 'Consultivo', icon: FileSearch, href: '/dashboard/consultivo' },
  { title: 'Publicações', icon: Newspaper, href: '/dashboard/publicacoes' },
  { title: 'CRM', icon: Users, href: '/dashboard/crm/pessoas' },
  { title: 'Financeiro', icon: DollarSign, href: '/dashboard/financeiro' },
  // Centro de Comando temporariamente oculto — módulo não está em uso ativo.
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { preferences, loading: preferencesLoading, updatePreferences } = useUserPreferences()
  const publicacoesPendentes = usePublicacoesPendentesCount()

  useEffect(() => {
    if (!preferencesLoading && !initialized) {
      setCollapsed(!preferences.sidebar_aberta)
      setInitialized(true)
    }
  }, [preferencesLoading, preferences.sidebar_aberta, initialized])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    void updatePreferences({ sidebar_aberta: !next })
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logout realizado com sucesso')
      router.push('/login')
    } catch {
      toast.error('Erro ao fazer logout')
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'hidden md:flex flex-col relative flex-shrink-0',
          'bg-gradient-to-b from-white to-slate-50/60 dark:from-[#1a1f2a] dark:to-[#0f1419]',
          'border-r border-slate-200 dark:border-slate-800',
        )}
      >
        {/* Botão de collapse */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'absolute -right-3 top-14 z-50 w-7 h-7 rounded-full',
            'bg-gradient-to-br from-[#34495e] to-[#46627f] dark:from-[#89bcbe] dark:to-[#6ba9ab]',
            'border-2 border-white dark:border-[#0f1419] shadow-md hover:shadow-lg',
            'flex items-center justify-center hover:scale-105 transition-all',
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-white dark:text-slate-900" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-white dark:text-slate-900" />
          )}
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center px-3 py-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/dashboard" className="block">
            <Image
              src="/zyra.logo.png"
              alt="Zyra Legal"
              width={collapsed ? 48 : 160}
              height={collapsed ? 48 : 56}
              priority
              className={cn(
                'object-contain transition-all dark:brightness-0 dark:invert',
                collapsed ? 'h-12 w-12' : 'h-14 w-auto',
              )}
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3.5 py-4 flex flex-col gap-1 overflow-y-auto">
          {menuItems.map((item) => {
            // Dashboard é match exato; demais módulos casam com subpáginas (ex: /processos/123).
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const badge =
              item.href === '/dashboard/publicacoes' && publicacoesPendentes > 0
                ? publicacoesPendentes
                : undefined
            const badgeWarn = (badge ?? 0) > 0

            const linkInner = (
              <Link
                href={item.href}
                className={cn(
                  'relative rounded-[10px] flex items-center transition-colors',
                  collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-10 px-3 gap-3',
                  isActive
                    ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-[0_4px_10px_-2px_rgba(52,73,94,0.25)]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#34495e] dark:hover:text-slate-200',
                )}
              >
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <Icon className="w-[17px] h-[17px]" />
                  {collapsed && badge !== undefined && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-1.5',
                        // Círculo perfeito para 1-2 dígitos; vira pill só para 100+.
                        badge > 99
                          ? 'min-w-[22px] h-[18px] px-1 rounded-full'
                          : 'w-[18px] h-[18px] rounded-full',
                        'flex items-center justify-center text-[10px] font-bold leading-none',
                        badgeWarn
                          ? 'bg-state-warning text-white'
                          : isActive
                            ? 'bg-white text-[#34495e]'
                            : 'bg-teal-300 text-white',
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 flex items-center gap-2 overflow-hidden whitespace-nowrap"
                    >
                      <span className="text-sm font-medium">{item.title}</span>
                      {badge !== undefined && (
                        <Badge
                          className={cn(
                            'ml-auto text-[10px] font-bold border-0 p-0',
                            // Círculo perfeito para 1-2 dígitos.
                            badge > 99
                              ? 'min-w-[22px] h-[20px] px-1.5 rounded-full inline-flex items-center justify-center'
                              : 'w-5 h-5 rounded-full inline-flex items-center justify-center',
                            isActive
                              ? 'bg-white/25 text-white'
                              : badgeWarn
                                ? 'bg-state-warning text-white'
                                : 'bg-teal-300 text-white',
                          )}
                        >
                          {badge > 99 ? '99+' : badge}
                        </Badge>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkInner}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              )
            }
            return <div key={item.href}>{linkInner}</div>
          })}
        </nav>

        {/* Logout */}
        <div className="px-3.5 py-3 border-t border-slate-200 dark:border-slate-800">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-10 w-10 mx-auto rounded-[10px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-state-danger-bg hover:text-state-danger-fg transition-colors"
                  aria-label="Sair"
                >
                  <LogOut className="w-[17px] h-[17px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Sair
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="h-10 w-full px-3 rounded-[10px] flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:bg-state-danger-bg hover:text-state-danger-fg transition-colors"
            >
              <LogOut className="w-[17px] h-[17px]" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
