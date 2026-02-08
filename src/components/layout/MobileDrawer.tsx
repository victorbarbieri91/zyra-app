'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { LogOut, Building2, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { menuItems } from '@/lib/constants/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useEscritorio } from '@/contexts/EscritorioContext'

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const groupLabels: Record<string, string> = {
  main: 'Principal',
  operations: 'Operações',
  management: 'Gestão',
}

export default function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorio()

  const handleNavigate = (href: string) => {
    router.push(href)
    onOpenChange(false)
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

  const groups = ['main', 'operations', 'management'] as const

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="left">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white flex flex-col outline-none"
          aria-label="Menu de navegação"
        >
          <Drawer.Title className="sr-only">Menu de navegação</Drawer.Title>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <img
              src="/zyra.logo.png"
              alt="Zyra Legal"
              className="h-10 w-auto object-contain"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Office indicator */}
          {escritorioAtivo && (
            <button
              onClick={() => handleNavigate('/dashboard/escritorio')}
              className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#f0f9f9] to-[#e8f5f5] rounded-lg border border-[#89bcbe]/20"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-md flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#34495e] truncate">{escritorioAtivo.nome}</p>
              </div>
            </button>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {groups.map((group) => {
              const items = menuItems.filter((item) => item.group === group)
              if (items.length === 0) return null

              return (
                <div key={group} className="mb-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    {groupLabels[group]}
                  </p>
                  {items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    const Icon = item.icon

                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all mb-0.5',
                          isActive
                            ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-semibold">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-200 space-y-1">
            <button
              onClick={() => handleNavigate('/dashboard/perfil')}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-semibold">Meu Perfil</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold">Sair</span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
