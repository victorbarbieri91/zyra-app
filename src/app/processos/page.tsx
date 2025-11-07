'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  MoreVertical
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  cliente_nome: string
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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProcessos()
  }, [currentView, searchQuery])

  const loadProcessos = async () => {
    try {
      setLoading(true)

      // SIMULAÇÃO - Depois virá do Supabase com filtros
      const mockProcessos: Processo[] = [
        {
          id: '1',
          numero_pasta: '1000',
          numero_cnj: '1234567-12.2024.8.26.0100',
          cliente_nome: 'João Silva',
          area: 'Trabalhista',
          fase: 'Conhecimento',
          instancia: '1ª',
          responsavel_nome: 'Dr. Carlos',
          status: 'ativo',
          ultima_movimentacao: '2025-01-06T10:30:00',
          movimentacoes_nao_lidas: 2,
          tem_prazo_critico: true,
          tem_documento_pendente: false
        },
        {
          id: '2',
          numero_pasta: '1001',
          numero_cnj: '7890123-45.2024.8.26.0200',
          cliente_nome: 'Maria Santos',
          area: 'Cível',
          fase: 'Recurso',
          instancia: '2ª',
          responsavel_nome: 'Dra. Ana',
          status: 'ativo',
          ultima_movimentacao: '2025-01-05T14:20:00',
          movimentacoes_nao_lidas: 0,
          tem_prazo_critico: false,
          tem_documento_pendente: true
        },
        {
          id: '3',
          numero_pasta: '1002',
          numero_cnj: '4561237-89.2024.8.26.0300',
          cliente_nome: 'Empresa XYZ Ltda',
          area: 'Tributária',
          fase: 'Execução',
          instancia: '1ª',
          responsavel_nome: 'Dr. Carlos',
          status: 'suspenso',
          ultima_movimentacao: '2024-12-20T09:15:00',
          movimentacoes_nao_lidas: 0,
          tem_prazo_critico: false,
          tem_documento_pendente: false
        },
      ]

      setProcessos(mockProcessos)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar processos:', error)
      setLoading(false)
    }
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
            onClick={() => router.push('/processos/novo')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Processo
          </Button>
        </div>

        {/* Views e Filtros */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            {/* Views Tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto">
              {[
                { key: 'todos', label: 'Todos', count: viewCounts.todos },
                { key: 'ativos', label: 'Ativos', count: viewCounts.ativos },
                { key: 'criticos', label: 'Críticos', count: viewCounts.criticos },
                { key: 'meus', label: 'Meus Processos', count: viewCounts.meus },
                { key: 'arquivados', label: 'Arquivados', count: viewCounts.arquivados }
              ].map(view => (
                <button
                  key={view.key}
                  onClick={() => setCurrentView(view.key as typeof currentView)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    currentView === view.key
                      ? 'bg-[#34495e] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {view.label}
                  <Badge className="ml-2 text-[10px] h-4" variant="secondary">
                    {view.count}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Busca e Filtros */}
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
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
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
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Nº Pasta</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Nº CNJ</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Cliente</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Área</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Fase / Instância</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Responsável</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#46627f]">Última Movimentação</th>
                  <th className="text-center p-4 text-xs font-semibold text-[#46627f]">Indicadores</th>
                  <th className="text-center p-4 text-xs font-semibold text-[#46627f]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {processos.map((processo) => (
                  <tr
                    key={processo.id}
                    onClick={() => router.push(`/processos/${processo.id}`)}
                    className={`border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer ${
                      processo.tem_prazo_critico ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <td className="p-4">
                      <span className="text-sm font-semibold text-[#34495e]">#{processo.numero_pasta}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-600">{processo.numero_cnj}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#89bcbe]/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-[#34495e]">
                            {processo.cliente_nome.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm text-[#34495e]">{processo.cliente_nome}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`text-[10px] border ${getAreaBadge(processo.area)}`}>
                        {processo.area}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-600">
                        {processo.fase} / {processo.instancia}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#34495e]/10 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-[#34495e]">
                            {processo.responsavel_nome.split(' ')[1]?.charAt(0) || processo.responsavel_nome.charAt(0)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600">{processo.responsavel_nome}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`text-[10px] border ${getStatusBadge(processo.status)}`}>
                        {processo.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-600">
                        {formatTimestamp(processo.ultima_movimentacao)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {processo.tem_prazo_critico && (
                          <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center" title="Prazo crítico">
                            <Clock className="w-3 h-3 text-red-600" />
                          </div>
                        )}
                        {processo.movimentacoes_nao_lidas > 0 && (
                          <div className="relative">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 text-white text-[8px] rounded-full flex items-center justify-center">
                              {processo.movimentacoes_nao_lidas}
                            </span>
                          </div>
                        )}
                        {processo.tem_documento_pendente && (
                          <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Menu de ações
                        }}
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
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
    </div>
  )
}
