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
  FileText,
  Clock,
  AlertCircle,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ListTodo,
  Calendar,
  Gavel
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import { useTarefas } from '@/hooks/useTarefas'
import { useEventos } from '@/hooks/useEventos'
import { useAudiencias } from '@/hooks/useAudiencias'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  cliente_nome: string
  parte_contraria: string
  area: string
  fase: string
  instancia: string
  responsavel_nome: string
  status: string
  ultima_movimentacao?: string
  movimentacoes_nao_lidas: number
  tem_prazo_critico: boolean
  tem_documento_pendente: boolean
}

export default function ProcessosPage() {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentView, setCurrentView] = useState<'todos' | 'ativos' | 'criticos' | 'meus' | 'arquivados'>('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  // Estados para wizards de agenda
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [showAudienciaWizard, setShowAudienciaWizard] = useState(false)
  const [selectedProcessoId, setSelectedProcessoId] = useState<string | null>(null)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Abrir wizard automaticamente se ?novo=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('novo') === 'true') {
      setShowWizard(true)
      // Limpar o query param da URL
      window.history.replaceState({}, '', '/dashboard/processos')
    }
  }, [])

  // Hooks de agenda
  const { createTarefa } = useTarefas(escritorioId || '')
  const { createEvento } = useEventos(escritorioId || '')
  const { createAudiencia } = useAudiencias(escritorioId || '')

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
    loadProcessos()
  }, [currentView, searchQuery])

  const loadProcessos = async () => {
    try {
      setLoading(true)

      // Buscar processos do Supabase com join de clientes e responsável
      const { data, error } = await supabase
        .from('processos_processos')
        .select(`
          id,
          numero_pasta,
          numero_cnj,
          parte_contraria,
          area,
          fase,
          instancia,
          status,
          updated_at,
          cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo),
          responsavel:profiles!processos_processos_responsavel_id_fkey(nome_completo)
        `)
        .order('numero_pasta', { ascending: false })

      if (error) {
        console.error('Erro ao carregar processos:', error)
        setLoading(false)
        return
      }

      // Buscar prazos críticos (próximos 7 dias) via view
      const { data: prazosCriticos } = await supabase
        .from('v_prazos_criticos')
        .select('id')
        .gte('dias_restantes', 0)
        .lte('dias_restantes', 7)
        .eq('prazo_cumprido', false)

      const processoComPrazoCritico = new Set(
        (prazosCriticos || []).map(p => p.id)
      )

      // Transformar dados do banco para o formato da interface
      const processosFormatados: Processo[] = (data || []).map((p: any) => ({
        id: p.id,
        numero_pasta: p.numero_pasta,
        numero_cnj: p.numero_cnj,
        cliente_nome: p.cliente?.nome_completo || 'N/A',
        parte_contraria: p.parte_contraria || 'Não informado',
        area: formatArea(p.area),
        fase: formatFase(p.fase),
        instancia: formatInstancia(p.instancia),
        responsavel_nome: p.responsavel?.nome_completo || 'N/A',
        status: p.status,
        ultima_movimentacao: p.updated_at,
        movimentacoes_nao_lidas: 0, // TODO: buscar da tabela de movimentações
        tem_prazo_critico: processoComPrazoCritico.has(p.id),
        tem_documento_pendente: false // TODO: buscar da tabela de documentos
      }))

      setProcessos(processosFormatados)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar processos:', error)
      setLoading(false)
    }
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível',
      'trabalhista': 'Trabalhista',
      'tributaria': 'Tributária',
      'familia': 'Família',
      'criminal': 'Criminal',
      'previdenciaria': 'Previdenciária',
      'consumidor': 'Consumidor',
      'empresarial': 'Empresarial',
      'ambiental': 'Ambiental',
      'outra': 'Outra'
    }
    return map[area] || area
  }

  const formatFase = (fase: string) => {
    const map: Record<string, string> = {
      'conhecimento': 'Conhecimento',
      'recurso': 'Recurso',
      'execucao': 'Execução',
      'cumprimento_sentenca': 'Cumprimento de Sentença'
    }
    return map[fase] || fase
  }

  const formatInstancia = (instancia: string) => {
    const map: Record<string, string> = {
      '1a': '1ª',
      '2a': '2ª',
      '3a': '3ª',
      'stj': 'STJ',
      'stf': 'STF',
      'tst': 'TST',
      'administrativa': 'Administrativa'
    }
    return map[instancia] || instancia
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      suspenso: 'bg-amber-100 text-amber-700 border-amber-200',
      arquivado: 'bg-slate-100 text-slate-700 border-slate-200',
      baixado: 'bg-blue-100 text-blue-700 border-blue-200',
      transito_julgado: 'bg-purple-100 text-purple-700 border-purple-200',
      acordo: 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return styles[status as keyof typeof styles] || styles.ativo
  }

  const getAreaBadge = (area: string) => {
    const styles = {
      'Trabalhista': 'bg-amber-100 text-amber-700 border-amber-200',
      'Cível': 'bg-blue-100 text-blue-700 border-blue-200',
      'Tributária': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Família': 'bg-pink-100 text-pink-700 border-pink-200',
      'Criminal': 'bg-red-100 text-red-700 border-red-200',
      'Consumidor': 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return styles[area as keyof typeof styles] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Sem movimentações'
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `há ${diffInHours}h`
    } else if (diffInHours < 48) {
      return 'ontem'
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR })
    }
  }

  const viewCounts = {
    todos: processos.length,
    ativos: processos.filter(p => p.status === 'ativo').length,
    criticos: processos.filter(p => p.tem_prazo_critico || p.movimentacoes_nao_lidas > 0).length,
    meus: processos.filter(p => p.responsavel_nome === 'Dr. Carlos').length,
    arquivados: processos.filter(p => p.status === 'arquivado').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">Processos</h1>
            <p className="text-sm text-slate-600 mt-0.5 font-normal">
              {processos.length} {processos.length === 1 ? 'processo' : 'processos'} encontrados
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
            onClick={() => setShowWizard(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Processo
          </Button>
        </div>

        {/* Busca e Filtros */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número CNJ, pasta, cliente ou comarca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Dropdown Visualização */}
              <select
                value={currentView}
                onChange={(e) => setCurrentView(e.target.value as typeof currentView)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#89bcbe] min-w-[180px]"
              >
                <option value="todos">Todos ({viewCounts.todos})</option>
                <option value="ativos">Ativos ({viewCounts.ativos})</option>
                <option value="criticos">Críticos ({viewCounts.criticos})</option>
                <option value="meus">Meus Processos ({viewCounts.meus})</option>
                <option value="arquivados">Arquivados ({viewCounts.arquivados})</option>
              </select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Mais Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Processos */}
        <Card className="border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Nº Pasta</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Nº CNJ</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Cliente</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Parte Contrária</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Área</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Responsável</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Status</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Últ. Mov.</th>
                  <th className="text-center p-3 text-[10px] font-semibold text-[#46627f] uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {processos.map((processo) => (
                  <tr
                    key={processo.id}
                    onClick={() => router.push(`/dashboard/processos/${processo.id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <span className="text-[14px] font-bold text-[#34495e]">{processo.numero_pasta}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-600">{processo.numero_cnj}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-700">{processo.cliente_nome}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-600">{processo.parte_contraria}</span>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-[10px] border ${getAreaBadge(processo.area)}`}>
                        {processo.area}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-600">{processo.responsavel_nome}</span>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-[10px] border ${getStatusBadge(processo.status)}`}>
                        {processo.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(processo.ultima_movimentacao)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Menu de criar agendamento */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs hover:bg-[#89bcbe] hover:text-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                              title="Criar agendamento para este processo"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Agenda
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProcessoId(processo.id)
                                setShowTarefaWizard(true)
                              }}
                            >
                              <ListTodo className="w-4 h-4 mr-2 text-[#34495e]" />
                              <span className="text-sm">Nova Tarefa</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProcessoId(processo.id)
                                setShowEventoWizard(true)
                              }}
                            >
                              <Calendar className="w-4 h-4 mr-2 text-[#89bcbe]" />
                              <span className="text-sm">Novo Compromisso</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProcessoId(processo.id)
                                setShowAudienciaWizard(true)
                              }}
                            >
                              <Gavel className="w-4 h-4 mr-2 text-emerald-600" />
                              <span className="text-sm">Nova Audiência</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Menu de ações */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Menu de ações
                          }}
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              Mostrando <span className="font-semibold">{processos.length}</span> de <span className="font-semibold">{processos.length}</span> processos
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="bg-[#34495e] text-white">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

      </div>

      {/* Wizard de Cadastro */}
      <ProcessoWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={(processoId) => {
          loadProcessos()
          router.push(`/dashboard/processos/${processoId}`)
        }}
      />

      {/* Wizards de Agenda vinculados ao processo */}
      {showTarefaWizard && escritorioId && selectedProcessoId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowTarefaWizard(false)
            setSelectedProcessoId(null)
          }}
          onSubmit={async (data) => {
            await createTarefa(data)
            loadProcessos()
          }}
          initialData={{
            processo_id: selectedProcessoId
          }}
        />
      )}

      {showEventoWizard && escritorioId && selectedProcessoId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowEventoWizard(false)
            setSelectedProcessoId(null)
          }}
          onSubmit={async (data) => {
            await createEvento(data)
            loadProcessos()
          }}
          initialData={{
            processo_id: selectedProcessoId
          }}
        />
      )}

      {showAudienciaWizard && escritorioId && selectedProcessoId && (
        <AudienciaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowAudienciaWizard(false)
            setSelectedProcessoId(null)
          }}
          onSubmit={async (data) => {
            await createAudiencia(data)
            loadProcessos()
          }}
          initialData={{
            processo_id: selectedProcessoId
          }}
        />
      )}
    </div>
  )
}
