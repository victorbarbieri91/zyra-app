'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  User,
  ChevronDown,
  HelpCircle,
  LogOut,
  Building2,
  Check,
  Plus,
  Upload
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useEscritorio } from '@/contexts/EscritorioContext'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showOfficeMenu, setShowOfficeMenu] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { escritorioAtivo, escritorios, trocarEscritorio, carregando } = useEscritorio()

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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      {/* Left Section - Search */}
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-[#89bcbe]/10 to-[#aacfd0]/10 rounded-md flex items-center justify-center group-focus-within:from-[#89bcbe]/20 group-focus-within:to-[#aacfd0]/20 transition-all">
            <Search className="w-4 h-4 text-[#89bcbe] group-focus-within:scale-110 transition-transform" />
          </div>
          <input
            type="text"
            placeholder="Buscar processos, clientes, documentos..."
            className="w-full pl-12 pr-4 py-2.5 bg-white border-2 border-[#89bcbe]/30 rounded-lg text-sm text-[#34495e] placeholder:text-slate-400 focus:outline-none focus:border-[#89bcbe] focus:shadow-sm focus:shadow-[#89bcbe]/10 transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        {/* Office Switcher */}
        {escritorios && escritorios.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowOfficeMenu(!showOfficeMenu)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#f0f9f9] to-[#e8f5f5] hover:from-[#e8f5f5] hover:to-[#daeeed] rounded-lg transition-all border border-[#89bcbe]/20"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-md flex items-center justify-center shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#34495e] leading-tight">
                  {escritorioAtivo?.nome || 'Selecionar'}
                </p>
                {escritorioAtivo && (
                  <p className="text-[10px] text-[#89bcbe] font-medium">
                    {escritorios.length} {escritorios.length === 1 ? 'escritório' : 'escritórios'}
                  </p>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#89bcbe] transition-all" />
            </button>

            {/* Office Dropdown */}
            {showOfficeMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOfficeMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border border-slate-200/80 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-[#f0f9f9]/30 to-white">
                    <p className="font-semibold text-[#34495e] text-sm">
                      Escritórios
                    </p>
                    <p className="text-xs text-[#89bcbe] mt-0.5">
                      Selecione o escritório ativo
                    </p>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-2">
                    {escritorios.map((escritorio) => (
                      <button
                        key={escritorio.id}
                        onClick={() => {
                          trocarEscritorio(escritorio.id);
                          setShowOfficeMenu(false);
                          toast.success(`Escritório alterado para ${escritorio.nome}`);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md transition-all ${
                          escritorioAtivo?.id === escritorio.id
                            ? 'bg-[#f0f9f9] text-[#34495e]'
                            : 'text-[#46627f] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                            escritorioAtivo?.id === escritorio.id
                              ? 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]'
                              : 'bg-slate-100'
                          }`}>
                            {escritorio.logo_url ? (
                              <img
                                src={escritorio.logo_url}
                                alt={escritorio.nome}
                                className="w-full h-full rounded-md object-cover"
                              />
                            ) : (
                              <Building2 className={`w-4 h-4 ${
                                escritorioAtivo?.id === escritorio.id ? 'text-white' : 'text-slate-400'
                              }`} />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-semibold truncate max-w-[180px]">
                              {escritorio.nome}
                            </p>
                            {escritorio.cnpj && (
                              <p className="text-[10px] text-slate-500">
                                CNPJ: {escritorio.cnpj}
                              </p>
                            )}
                          </div>
                        </div>
                        {escritorioAtivo?.id === escritorio.id && (
                          <Check className="w-4 h-4 text-[#89bcbe] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      onClick={() => {
                        setShowOfficeMenu(false);
                        router.push('/dashboard/escritorio');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-slate-50 rounded-md transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">Criar Novo Escritório</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        )}

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-all"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#34495e] to-[#46627f] rounded-full flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-[#34495e] leading-tight">
                {user?.profile?.nome_completo || 'Usuário'}
              </p>
              <p className="text-[10px] text-[#89bcbe] font-medium">
                {user?.profile?.role || 'Advogado'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#89bcbe] transition-all" />
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
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-slate-200/80 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-[#f0f9f9]/30 to-white">
                  <p className="font-semibold text-[#34495e] text-sm truncate">
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-slate-50 rounded-md transition-all group"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Meu Perfil</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      router.push('/dashboard/migracao');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-slate-50 rounded-md transition-all group"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Migração de Dados</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      router.push('/dashboard/escritorio');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-slate-50 rounded-md transition-all group"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Gestão do Escritório</span>
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-slate-50 rounded-md transition-all group">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Ajuda</span>
                  </button>

                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-all"
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
  )
}