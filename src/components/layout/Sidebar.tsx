'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  DollarSign,
  BookOpen,
  FolderOpen,
  MessageSquareCode,
  LogOut,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  Scale,
  UserCircle,
  Briefcase,
  FileSearch,
  Newspaper,
  Files
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface MenuItem {
  title: string
  icon: any
  href: string
  group: string
  disabled?: boolean
  badge?: string
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    group: 'main',
  },
  {
    title: 'Centro de Comando',
    icon: MessageSquareCode,
    href: '/dashboard/centro-comando',
    group: 'main',
  },
  {
    title: 'Agenda',
    icon: Calendar,
    href: '/dashboard/agenda',
    group: 'operations',
  },
  {
    title: 'Processos',
    icon: Scale,
    href: '/dashboard/processos',
    group: 'operations',
  },
  {
    title: 'Consultivo',
    icon: FileSearch,
    href: '/dashboard/consultivo',
    group: 'operations',
  },
  {
    title: 'Publicações',
    icon: Newspaper,
    href: '/dashboard/publicacoes',
    group: 'operations',
  },
  {
    title: 'CRM',
    icon: Users,
    href: '/dashboard/crm/pessoas',
    group: 'management',
  },
  {
    title: 'Portfólio',
    icon: Briefcase,
    href: '/dashboard/portfolio',
    group: 'management',
  },
  {
    title: 'Financeiro',
    icon: DollarSign,
    href: '/dashboard/financeiro',
    group: 'management',
  },
  // Peças e Teses removido temporariamente - módulo ainda não implementado
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { preferences, loading: preferencesLoading } = useUserPreferences()

  // Aplica a preferência do usuário quando carrega
  useEffect(() => {
    if (!preferencesLoading && !initialized) {
      setCollapsed(!preferences.sidebar_aberta)
      setInitialized(true)
    }
  }, [preferencesLoading, preferences.sidebar_aberta, initialized])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logout realizado com sucesso')
      router.push('/login')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="hidden md:flex bg-gradient-to-b from-white to-slate-50/50 border-r border-slate-200 flex-col relative shadow-sm"
    >
      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-[3.75rem] z-50 w-10 h-10 bg-gradient-to-br from-[#34495e] to-[#1E3A8A] border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all group"
      >
        {collapsed ? (
          <ChevronRight className="w-5.5 h-5.5 text-white" />
        ) : (
          <ChevronLeft className="w-5.5 h-5.5 text-white" />
        )}
      </button>

      {/* Logo */}
      <div className="px-3 py-3 border-b border-slate-200">
        <div className="flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.img
                key="logo-expanded"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                src="/zyra.logo.png"
                alt="Zyra Legal"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <motion.img
                key="logo-collapsed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                src="/zyra.logo.png"
                alt="Zyra Legal"
                className="h-12 w-auto object-contain"
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const isDisabled = item.disabled || false

          const linkContent = (
            <Link
              key={item.href}
              href={isDisabled ? '#' : item.href}
              onClick={(e) => {
                if (isDisabled) e.preventDefault()
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative mb-1',
                collapsed ? 'justify-center' : '',
                isDisabled
                  ? 'text-slate-400 opacity-60 cursor-not-allowed'
                  : isActive
                  ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-lg shadow-[#34495e]/20'
                  : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100/80 hover:text-[#34495e] hover:shadow-md'
              )}
            >
              <div className={cn(
                'flex items-center justify-center transition-all duration-300',
                'w-8 h-8',
                !isActive && !isDisabled && 'group-hover:scale-110'
              )}>
                <Icon className={cn(
                  'w-[18px] h-[18px] transition-all duration-300 flex-shrink-0',
                  isActive && 'drop-shadow-sm'
                )} />
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 flex-1 overflow-hidden"
                  >
                    <span className="font-semibold text-sm whitespace-nowrap">{item.title}</span>
                    {item.badge && (
                      <Badge className={cn(
                        "text-[10px] px-2 py-0.5 h-5 border-0 gap-1 font-medium",
                        isActive
                          ? "bg-white/30 text-white backdrop-blur-sm"
                          : "bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white"
                      )}>
                        <Sparkles className="w-3 h-3" />
                        {item.badge}
                      </Badge>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          )

          if (collapsed) {
            return (
              <div
                key={item.href}
                className="relative"
                title={item.title}
              >
                {linkContent}
              </div>
            )
          }

          return linkContent
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-1.5 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-1.5 text-slate-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100/80 hover:text-red-600 rounded-xl transition-all duration-300 group hover:shadow-md',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sair' : ''}
        >
          <div className="flex items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-red-100/50 group-hover:scale-110 w-8 h-8">
            <LogOut className="w-[18px] h-[18px]" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-semibold text-sm whitespace-nowrap overflow-hidden"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}