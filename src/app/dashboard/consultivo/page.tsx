'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  Scale,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  Users,
  ListTodo,
  Calendar
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ConsultaWizardModal } from '@/components/consultivo/ConsultaWizardModal'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import { useTarefas } from '@/hooks/useTarefas'
import { useEventos } from '@/hooks/useEventos'

interface Consulta {
  id: string
  numero_interno: string
  assunto: string
  cliente_nome: string
  tipo: string
  area: string
  urgencia: string
  status: string
  responsavel_nome: string
  data_recebimento: string
  data_conclusao_estimada: string | null
  status_sla: string
  horas_reais: number
  horas_nao_faturadas: number
}

export default function ConsultivoPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentView, setCurrentView] = useState<'todas' | 'pendentes' | 'atrasadas' | 'minhas'>('pendentes')
  const [wizardModalOpen, setWizardModalOpen] = useState(false)

  // Estados para wizards de agenda
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [selectedConsultivoId, setSelectedConsultivoId] = useState<string | null>(null)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Hooks de agenda
  const { createTarefa } = useTarefas(escritorioId || '')
  const { createEvento } = useEventos(escritorioId || '')

  // Carregar escritórioId do usuário logado
  useEffect(() => {
    const loadEscritorioId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadEscritorioId()
  }, [])

  useEffect(() => {
    loadConsultas()
  }, [currentView, searchQuery])

  const loadConsultas = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('v_consultivo_consultas_completas')
        .select('*')
        .order('data_recebimento', { ascending: false })

      // Filtrar por view
      if (currentView === 'pendentes') {
        query = query.in('status', ['nova', 'em_analise', 'em_revisao'])
      } else if (currentView === 'atrasadas') {
        query = query.eq('status_sla', 'vencido')
      } else if (currentView === 'minhas') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          query = query.eq('responsavel_id', user.id)
        }
      }

      // Busca
      if (searchQuery) {
        query = query.or(`assunto.ilike.%${searchQuery}%,numero_interno.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao carregar consultas:', error)
        setLoading(false)
        return
      }

      setConsultas(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: string; className: string }> = {
      nova: { label: 'Nova', variant: 'default', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      em_analise: { label: 'Em Análise', variant: 'default', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      em_revisao: { label: 'Em Revisão', variant: 'default', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      aguardando_cliente: { label: 'Aguardando Cliente', variant: 'default', className: 'bg-slate-100 text-slate-700 border-slate-200' },
      concluida: { label: 'Concluída', variant: 'default', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      enviada: { label: 'Enviada', variant: 'default', className: 'bg-teal-100 text-teal-700 border-teal-200' },
      cancelada: { label: 'Cancelada', variant: 'default', className: 'bg-red-100 text-red-700 border-red-200' },
    }

    const config = statusConfig[status] || statusConfig.nova
    return (
      <Badge className={cn('text-[10px] font-medium border', config.className)}>
        {config.label}
      </Badge>
    )
  }

  const getSLABadge = (statusSla: string) => {
    if (statusSla === 'vencido') {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-medium border">
          <AlertCircle className="w-3 h-3 mr-1" />
          Atrasado
        </Badge>
      )
    }
    if (statusSla === 'critico') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-medium border">
          <Clock className="w-3 h-3 mr-1" />
          Urgente
        </Badge>
      )
    }
    return null
  }

  const getTipoBadge = (tipo: string) => {
    const tipos: Record<string, { label: string; icon: any }> = {
      simples: { label: 'Consulta', icon: FileText },
      parecer: { label: 'Parecer', icon: Scale },
      contrato: { label: 'Contrato', icon: FileText },
      due_diligence: { label: 'Due Diligence', icon: Users },
      opiniao: { label: 'Opinião', icon: Scale },
    }

    const config = tipos[tipo] || tipos.simples
    const Icon = config.icon

    return (
      <div className="flex items-center gap-1 text-xs text-slate-600">
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#34495e]">Consultivo</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão de consultas jurídicas, pareceres e análises contratuais
          </p>
        </div>
        <Button
          onClick={() => setWizardModalOpen(true)}
          className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Consulta
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por assunto ou número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>

            {/* Views */}
            <div className="flex gap-2">
              <Button
                variant={currentView === 'pendentes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('pendentes')}
                className={cn(
                  currentView === 'pendentes' && 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white'
                )}
              >
                Pendentes
              </Button>
              <Button
                variant={currentView === 'atrasadas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('atrasadas')}
                className={cn(
                  currentView === 'atrasadas' && 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                )}
              >
                Atrasadas
              </Button>
              <Button
                variant={currentView === 'minhas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('minhas')}
              >
                Minhas
              </Button>
              <Button
                variant={currentView === 'todas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('todas')}
              >
                Todas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Consultas */}
      <div className="space-y-3">
        {loading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 pb-6 text-center text-slate-600">
              Carregando consultas...
            </CardContent>
          </Card>
        ) : consultas.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 pb-6 text-center text-slate-600">
              Nenhuma consulta encontrada
            </CardContent>
          </Card>
        ) : (
          consultas.map((consulta) => (
            <Card
              key={consulta.id}
              className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/consultivo/${consulta.id}`)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-slate-500">
                        {consulta.numero_interno}
                      </span>
                      {getTipoBadge(consulta.tipo)}
                      {getStatusBadge(consulta.status)}
                      {getSLABadge(consulta.status_sla)}
                    </div>

                    <h3 className="text-sm font-semibold text-[#34495e] mb-2 truncate">
                      {consulta.assunto}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{consulta.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        <span>{consulta.area}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{consulta.responsavel_nome}</span>
                      </div>
                      {consulta.horas_reais > 0 && (
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          <span>{consulta.horas_reais.toFixed(1)}h trabalhadas</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-slate-500">
                      <div>
                        {formatDistanceToNow(new Date(consulta.data_recebimento), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                      {consulta.data_conclusao_estimada && (
                        <div className="mt-1">
                          Prazo: {format(new Date(consulta.data_conclusao_estimada), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>

                    {/* Botão + Agenda */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs hover:bg-[#89bcbe] hover:text-white transition-colors flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                          title="Criar agendamento para esta consulta"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Agenda
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedConsultivoId(consulta.id)
                            setShowTarefaWizard(true)
                          }}
                        >
                          <ListTodo className="w-4 h-4 mr-2 text-[#34495e]" />
                          <span className="text-sm">Nova Tarefa</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedConsultivoId(consulta.id)
                            setShowEventoWizard(true)
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2 text-[#89bcbe]" />
                          <span className="text-sm">Novo Compromisso</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Wizard */}
      <ConsultaWizardModal
        open={wizardModalOpen}
        onOpenChange={setWizardModalOpen}
        onSave={async (data) => {
          console.log('Salvando consulta:', data)
          // TODO: Integrar com Supabase
          await loadConsultas()
          alert('Consulta criada com sucesso!')
        }}
      />

      {/* Wizards de Agenda vinculados à consulta */}
      {showTarefaWizard && escritorioId && selectedConsultivoId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowTarefaWizard(false)
            setSelectedConsultivoId(null)
          }}
          onSubmit={async (data) => {
            await createTarefa(data)
            loadConsultas()
          }}
          initialData={{
            consultivo_id: selectedConsultivoId
          }}
        />
      )}

      {showEventoWizard && escritorioId && selectedConsultivoId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowEventoWizard(false)
            setSelectedConsultivoId(null)
          }}
          onSubmit={async (data) => {
            await createEvento(data)
            loadConsultas()
          }}
          initialData={{
            consultivo_id: selectedConsultivoId
          }}
        />
      )}
    </div>
  )
}
