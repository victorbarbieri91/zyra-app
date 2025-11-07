'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Newspaper,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Settings,
  Eye,
  Play,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileX,
  Calendar
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'

// Tipos
type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'
type TipoPublicacao = 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao'

interface Publicacao {
  id: string
  data_publicacao: string
  tribunal: string
  vara?: string
  tipo_publicacao: TipoPublicacao
  numero_processo?: string
  cliente_nome?: string
  status: StatusPublicacao
  urgente: boolean
  tem_prazo: boolean
  prazo_dias?: number
  processo_numero_cnj?: string
}

export default function PublicacoesPage() {
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'todos',
    tipo: 'todos',
    apenasUrgentes: false
  })

  // Mock data - será substituído por dados reais do Supabase
  const mockPublicacoes: Publicacao[] = []

  const mockStats = {
    pendentes: 0,
    processadasHoje: 0,
    urgentes: 0,
    prazosCriados: 0
  }

  const getStatusBadge = (status: StatusPublicacao) => {
    const variants = {
      pendente: 'bg-red-100 text-red-700 border-red-200',
      em_analise: 'bg-amber-100 text-amber-700 border-amber-200',
      processada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      arquivada: 'bg-slate-100 text-slate-600 border-slate-200'
    }

    const labels = {
      pendente: 'Pendente',
      em_analise: 'Em Análise',
      processada: 'Processada',
      arquivada: 'Arquivada'
    }

    return (
      <Badge variant="outline" className={cn('text-[10px] font-medium border', variants[status])}>
        {labels[status]}
      </Badge>
    )
  }

  const getTipoLabel = (tipo: TipoPublicacao) => {
    const labels = {
      intimacao: 'Intimação',
      sentenca: 'Sentença',
      despacho: 'Despacho',
      decisao: 'Decisão',
      acordao: 'Acórdão'
    }
    return labels[tipo]
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center shadow-lg">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#34495e]">Publicações & Intimações</h1>
              <p className="text-sm text-slate-600">Gestão de publicações AASP e intimações</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar AASP
            </Button>
            <Link href="/dashboard/publicacoes/nova">
              <Button size="sm" className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]">
                <Plus className="w-4 h-4" />
                Adicionar Manual
              </Button>
            </Link>
            <Link href="/dashboard/publicacoes/config">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Pendentes"
          value={mockStats.pendentes}
          subtitle="Aguardando análise"
          icon={Clock}
          gradient="kpi1"
        />

        <MetricCard
          title="Processadas Hoje"
          value={mockStats.processadasHoje}
          subtitle="Nas últimas 24h"
          icon={CheckCircle2}
          gradient="kpi2"
        />

        <MetricCard
          title="Urgentes"
          value={mockStats.urgentes}
          subtitle="Requerem atenção"
          icon={AlertTriangle}
          gradient="kpi3"
        />

        <MetricCard
          title="Prazos Criados"
          value={mockStats.prazosCriados}
          subtitle="A partir de publicações"
          icon={Calendar}
          gradient="kpi4"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por processo, cliente..."
              className="pl-9"
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </div>

          <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="processada">Processada</SelectItem>
              <SelectItem value="arquivada">Arquivada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.tipo} onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="intimacao">Intimação</SelectItem>
              <SelectItem value="sentenca">Sentença</SelectItem>
              <SelectItem value="despacho">Despacho</SelectItem>
              <SelectItem value="decisao">Decisão</SelectItem>
              <SelectItem value="acordao">Acórdão</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={filtros.apenasUrgentes ? 'default' : 'outline'}
            className={cn(
              'gap-2',
              filtros.apenasUrgentes && 'bg-red-600 hover:bg-red-700'
            )}
            onClick={() => setFiltros({ ...filtros, apenasUrgentes: !filtros.apenasUrgentes })}
          >
            <AlertTriangle className="w-4 h-4" />
            {filtros.apenasUrgentes ? 'Mostrando Urgentes' : 'Apenas Urgentes'}
          </Button>
        </div>
      </div>

      {/* Tabela de Publicações */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Publicações Recebidas</h2>
        </div>

        {mockPublicacoes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileX className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Nenhuma publicação encontrada</h3>
            <p className="text-xs text-slate-500 mb-4">
              Não há publicações recebidas ainda. Configure a integração com AASP ou adicione manualmente.
            </p>
            <div className="flex items-center gap-2 justify-center">
              <Link href="/dashboard/publicacoes/config">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Configurar AASP
                </Button>
              </Link>
              <Link href="/dashboard/publicacoes/nova">
                <Button size="sm" className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]">
                  <Plus className="w-4 h-4" />
                  Adicionar Manual
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Data</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Tribunal</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Processo</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Prazo</th>
                  <th className="text-right text-xs font-medium text-slate-600 p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockPublicacoes.map((pub) => (
                  <tr key={pub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(pub.status)}
                        {pub.urgente && (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                            Urgente
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-700">
                        {new Date(pub.data_publicacao).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="text-sm font-medium text-slate-700">{pub.tribunal}</div>
                        {pub.vara && <div className="text-xs text-slate-500">{pub.vara}</div>}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-700">{getTipoLabel(pub.tipo_publicacao)}</span>
                    </td>
                    <td className="p-3">
                      {pub.processo_numero_cnj ? (
                        <Link
                          href={`/dashboard/processos/${pub.id}`}
                          className="text-sm text-[#1E3A8A] hover:underline"
                        >
                          {pub.processo_numero_cnj}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-700">{pub.cliente_nome || '-'}</span>
                    </td>
                    <td className="p-3">
                      {pub.tem_prazo ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          {pub.prazo_dias} dias
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/publicacoes/${pub.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/publicacoes/processar/${pub.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Play className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
