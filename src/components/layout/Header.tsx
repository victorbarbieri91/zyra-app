'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  ChevronDown,
  HelpCircle,
  LogOut,
  Building2,
  Upload,
  Menu,
  Search,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useEscritorio } from '@/contexts/EscritorioContext'
import SearchDropdown from '@/components/search/SearchDropdown'
import MobileDrawer from './MobileDrawer'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorio()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUser({ ...user, profile })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logout realizado com sucesso')
    router.push('/login')
  }

  return (
    <>
    <header className="h-14 md:h-16 bg-white dark:bg-surface-1 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 shadow-sm dark:shadow-none">
      {/* Mobile: Hamburger + Logo + Avatar */}
      <div className="flex md:hidden items-center gap-3 flex-1">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-surface-2"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src="/zyra.logo.png" alt="Zyra Legal" className="h-7 w-auto object-contain" />
      </div>

      {/* Mobile: Search + Avatar */}
      <div className="flex md:hidden items-center gap-2">
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-surface-2"
        >
          <Search className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-8 h-8 bg-gradient-to-br from-[#34495e] to-[#46627f] rounded-full flex items-center justify-center shadow-sm"
        >
          <User className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Desktop: Left Section - Search */}
      <div className="hidden md:flex items-center flex-1 max-w-xl">
        <SearchDropdown />
      </div>

      {/* Desktop: Right Section */}
      <div className="hidden md:flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-surface-2 rounded-lg transition-all"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#34495e] to-[#46627f] rounded-full flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200 leading-tight">
                {user?.profile?.nome_completo || 'Usuário'}
              </p>
              <p className="text-[10px] text-[#89bcbe] font-medium">
                {user?.profile?.role || 'Advogado'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#89bcbe] transition-all" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-2 rounded-lg shadow-2xl dark:shadow-black/30 border border-slate-200/80 dark:border-slate-700 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-[#f0f9f9]/30 to-white dark:from-surface-3/50 dark:to-surface-2">
                  <p className="font-semibold text-[#34495e] dark:text-slate-200 text-sm truncate">
                    {user?.profile?.nome_completo}
                  </p>
                  <p className="text-xs text-[#89bcbe] mt-0.5 truncate">{user?.email}</p>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      router.push('/dashboard/perfil');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-3 rounded-md transition-all group"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Meu Perfil</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      router.push('/dashboard/migracao');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-3 rounded-md transition-all group"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Migração de Dados</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      router.push('/dashboard/escritorio');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-3 rounded-md transition-all group"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Gestão do Escritório</span>
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-slate-50 rounded-md transition-all group">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Ajuda</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">Sair</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Mobile search bar (expandable) */}
    {mobileSearchOpen && (
      <div className="md:hidden bg-white dark:bg-surface-1 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
        <SearchDropdown />
      </div>
    )}

    {/* Mobile drawer */}
    <MobileDrawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen} />
    </>
  )
}
