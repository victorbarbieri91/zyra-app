'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Save,
  Phone,
  CreditCard,
  Scale,
  Settings,
  LayoutDashboard,
  Calendar,
  List,
  CalendarDays,
  Columns,
  PanelLeftClose,
  PanelLeft,
  Check,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  nome_completo: string
  email: string
  cpf: string | null
  telefone: string | null
  oab_numero: string | null
  oab_uf: string | null
  avatar_url: string | null
  preferencias: {
    sidebar_aberta: boolean
    agenda_view_padrao: 'month' | 'week' | 'day' | 'list'
  }
}

const agendaViews = [
  { value: 'month', label: 'Mês', icon: Calendar },
  { value: 'week', label: 'Kanban', icon: Columns },
  { value: 'day', label: 'Dia', icon: CalendarDays },
  { value: 'list', label: 'Lista', icon: List },
]

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Form states
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [oabNumero, setOabNumero] = useState('')
  const [oabUf, setOabUf] = useState('')
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [agendaView, setAgendaView] = useState<string>('month')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile(data)
        setNomeCompleto(data.nome_completo || '')
        setCpf(data.cpf || '')
        setTelefone(data.telefone || '')
        setOabNumero(data.oab_numero || '')
        setOabUf(data.oab_uf || '')
        setSidebarAberta(data.preferencias?.sidebar_aberta ?? false)
        setAgendaView(data.preferencias?.agenda_view_padrao ?? 'month')
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!nomeCompleto.trim()) {
      toast.error('Nome completo é obrigatório')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo: nomeCompleto.trim(),
          cpf: cpf.trim() || null,
          telefone: telefone.trim() || null,
          oab_numero: oabNumero.trim() || null,
          oab_uf: oabUf || null,
          preferencias: {
            sidebar_aberta: sidebarAberta,
            agenda_view_padrao: agendaView
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  // Máscaras
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe]" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[#34495e]">Meu Perfil</h1>
        <p className="text-xs md:text-sm text-[#46627f] mt-1">
          Gerencie seus dados pessoais e preferências do sistema
        </p>
      </div>

      <div className="grid gap-6">
        {/* Dados Pessoais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#f0f9f9] to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#34495e] to-[#46627f] rounded-lg flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#34495e]">Dados Pessoais</h2>
                <p className="text-xs text-[#89bcbe]">Informações básicas do seu perfil</p>
              </div>
            </div>
          </div>

          <div className="p-5 grid gap-5">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-[#46627f] mb-1.5">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#34495e] placeholder:text-slate-400 focus:outline-none focus:border-[#89bcbe] focus:ring-1 focus:ring-[#89bcbe]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* CPF */}
              <div>
                <label className="block text-xs font-semibold text-[#46627f] mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#34495e] placeholder:text-slate-400 focus:outline-none focus:border-[#89bcbe] focus:ring-1 focus:ring-[#89bcbe]/20 transition-all"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-semibold text-[#46627f] mb-1.5">
                  <Phone className="w-3.5 h-3.5 inline mr-1.5" />
                  Telefone
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#34495e] placeholder:text-slate-400 focus:outline-none focus:border-[#89bcbe] focus:ring-1 focus:ring-[#89bcbe]/20 transition-all"
                />
              </div>
            </div>

            {/* OAB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#46627f] mb-1.5">
                  <Scale className="w-3.5 h-3.5 inline mr-1.5" />
                  Número OAB
                </label>
                <input
                  type="text"
                  value={oabNumero}
                  onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#34495e] placeholder:text-slate-400 focus:outline-none focus:border-[#89bcbe] focus:ring-1 focus:ring-[#89bcbe]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#46627f] mb-1.5">
                  UF da OAB
                </label>
                <select
                  value={oabUf}
                  onChange={(e) => setOabUf(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#34495e] focus:outline-none focus:border-[#89bcbe] focus:ring-1 focus:ring-[#89bcbe]/20 transition-all"
                >
                  <option value="">Selecione</option>
                  {estadosBrasil.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferências */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#f0f9f9] to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-lg flex items-center justify-center">
                <Settings className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#34495e]">Preferências</h2>
                <p className="text-xs text-[#89bcbe]">Personalize sua experiência no sistema</p>
              </div>
            </div>
          </div>

          <div className="p-5 grid gap-6">
            {/* Sidebar */}
            <div>
              <label className="block text-xs font-semibold text-[#46627f] mb-3">
                Estado inicial da Sidebar
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSidebarAberta(false)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg border-2 transition-all',
                    !sidebarAberta
                      ? 'border-[#89bcbe] bg-[#f0f9f9] text-[#34495e]'
                      : 'border-slate-200 bg-white text-[#46627f] hover:border-slate-300'
                  )}
                >
                  <PanelLeftClose className="w-5 h-5" />
                  <span className="text-sm font-medium">Fechada</span>
                  {!sidebarAberta && <Check className="w-4 h-4 text-[#89bcbe]" />}
                </button>
                <button
                  onClick={() => setSidebarAberta(true)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg border-2 transition-all',
                    sidebarAberta
                      ? 'border-[#89bcbe] bg-[#f0f9f9] text-[#34495e]'
                      : 'border-slate-200 bg-white text-[#46627f] hover:border-slate-300'
                  )}
                >
                  <PanelLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Aberta</span>
                  {sidebarAberta && <Check className="w-4 h-4 text-[#89bcbe]" />}
                </button>
              </div>
            </div>

            {/* View da Agenda */}
            <div>
              <label className="block text-xs font-semibold text-[#46627f] mb-3">
                Visualização padrão da Agenda
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {agendaViews.map((view) => {
                  const Icon = view.icon
                  const isSelected = agendaView === view.value
                  return (
                    <button
                      key={view.value}
                      onClick={() => setAgendaView(view.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-[#89bcbe] bg-[#f0f9f9] text-[#34495e]'
                          : 'border-slate-200 bg-white text-[#46627f] hover:border-slate-300'
                      )}
                    >
                      <Icon className={cn('w-5 h-5', isSelected && 'text-[#89bcbe]')} />
                      <span className="text-xs font-medium">{view.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#3d5a80] text-white rounded-lg font-semibold text-sm shadow-lg shadow-[#34495e]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
