'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Eye,
  Download,
  Send,
  TrendingUp,
  TrendingDown,
  Copy,
  CreditCard,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addMonths, differenceInDays, isPast, isFuture, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Contrato {
  id: string
  numero: string
  cliente_id: string
  cliente_nome: string
  processo_id?: string
  processo_numero?: string
  tipo: 'fixo' | 'variavel' | 'exito' | 'hibrido'
  valor_total: number
  valor_entrada?: number
  valor_mensal?: number
  numero_parcelas?: number
  parcelas_pagas: number
  percentual_exito?: number
  data_inicio: Date
  data_fim?: Date
  data_assinatura: Date
  status: 'ativo' | 'pendente' | 'suspenso' | 'encerrado' | 'cancelado'
  forma_pagamento: 'boleto' | 'pix' | 'cartao' | 'transferencia' | 'dinheiro'
  dia_vencimento?: number
  observacoes?: string
  valor_recebido: number
  valor_pendente: number
  proxima_parcela?: {
    numero: number
    valor: number
    vencimento: Date
  }
  inadimplente: boolean
  dias_atraso?: number
}

interface HonorariosContratosProps {
  escritorioId: string
}

// Mock data generator
const generateMockContratos = (): Contrato[] => {
  const tipos: Contrato['tipo'][] = ['fixo', 'variavel', 'exito', 'hibrido']
  const status: Contrato['status'][] = ['ativo', 'pendente', 'suspenso', 'encerrado']
  const formas: Contrato['forma_pagamento'][] = ['boleto', 'pix', 'cartao', 'transferencia']

  return Array.from({ length: 15 }, (_, i) => {
    const tipo = tipos[i % tipos.length]
    const valorTotal = 5000 + Math.random() * 50000
    const numeroParcelas = tipo === 'fixo' ? Math.floor(Math.random() * 24) + 1 : undefined
    const parcelasPagas = numeroParcelas ? Math.floor(Math.random() * numeroParcelas) : 0
    const valorMensal = numeroParcelas ? valorTotal / numeroParcelas : undefined
    const valorRecebido = valorMensal ? valorMensal * parcelasPagas : 0
    const valorPendente = valorTotal - valorRecebido

    return {
      id: `${i + 1}`,
      numero: `CTR-2024-${String(i + 1).padStart(4, '0')}`,
      cliente_id: `cli-${i}`,
      cliente_nome: [
        'João Silva Advogados',
        'Maria Santos Ltda',
        'Tech Solutions S.A.',
        'Construtora ABC',
        'Empresa XYZ',
      ][i % 5],
      processo_id: i % 3 === 0 ? `proc-${i}` : undefined,
      processo_numero: i % 3 === 0 ? `0001234-${String(i).padStart(2, '0')}.2024.8.26.0100` : undefined,
      tipo,
      valor_total: valorTotal,
      valor_entrada: tipo === 'hibrido' ? valorTotal * 0.3 : undefined,
      valor_mensal: valorMensal,
      numero_parcelas: numeroParcelas,
      parcelas_pagas: parcelasPagas,
      percentual_exito: tipo === 'exito' ? 20 + Math.random() * 10 : undefined,
      data_inicio: new Date(2024, 0 + i % 12, 1),
      data_fim: numeroParcelas ? addMonths(new Date(2024, 0 + i % 12, 1), numeroParcelas) : undefined,
      data_assinatura: new Date(2023, 11 + i % 12, 15),
      status: status[i % status.length],
      forma_pagamento: formas[i % formas.length],
      dia_vencimento: tipo === 'fixo' ? 5 + (i % 25) : undefined,
      valor_recebido: valorRecebido,
      valor_pendente: valorPendente,
      proxima_parcela: numeroParcelas && parcelasPagas < numeroParcelas ? {
        numero: parcelasPagas + 1,
        valor: valorMensal!,
        vencimento: addMonths(new Date(), i % 3 - 1),
      } : undefined,
      inadimplente: i % 4 === 0,
      dias_atraso: i % 4 === 0 ? Math.floor(Math.random() * 30) + 1 : undefined,
    }
  })
}

const getTipoBadge = (tipo: Contrato['tipo']) => {
  const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    fixo: {
      label: 'Fixo',
      class: 'bg-blue-100 text-blue-700',
      icon: <Calendar className="w-3 h-3" />
    },
    variavel: {
      label: 'Variável',
      class: 'bg-purple-100 text-purple-700',
      icon: <Activity className="w-3 h-3" />
    },
    exito: {
      label: 'Êxito',
      class: 'bg-emerald-100 text-emerald-700',
      icon: <TrendingUp className="w-3 h-3" />
    },
    hibrido: {
      label: 'Híbrido',
      class: 'bg-amber-100 text-amber-700',
      icon: <PieChart className="w-3 h-3" />
    },
  }
  return badges[tipo] || badges.fixo
}

const getStatusBadge = (status: Contrato['status']) => {
  const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    ativo: {
      label: 'Ativo',
      class: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-3 h-3" />
    },
    pendente: {
      label: 'Pendente',
      class: 'bg-yellow-100 text-yellow-700',
      icon: <Clock className="w-3 h-3" />
    },
    suspenso: {
      label: 'Suspenso',
      class: 'bg-orange-100 text-orange-700',
      icon: <AlertCircle className="w-3 h-3" />
    },
    encerrado: {
      label: 'Encerrado',
      class: 'bg-gray-100 text-gray-700',
      icon: <CheckCircle className="w-3 h-3" />
    },
    cancelado: {
      label: 'Cancelado',
      class: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3 h-3" />
    },
  }
  return badges[status] || badges.pendente
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function HonorariosContratos({ escritorioId }: HonorariosContratosProps) {
  const [contratos] = useState<Contrato[]>(generateMockContratos())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [activeTab, setActiveTab] = useState<'ativos' | 'vencer' | 'inadimplentes'>('ativos')

  // Filtrar contratos
  const filteredContratos = useMemo(() => {
    let filtered = [...contratos]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.processo_numero?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (filterTipo !== 'all') {
      filtered = filtered.filter(c => c.tipo === filterTipo)
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    // Tab filter
    switch (activeTab) {
      case 'ativos':
        filtered = filtered.filter(c => c.status === 'ativo')
        break
      case 'vencer':
        filtered = filtered.filter(c =>
          c.proxima_parcela &&
          differenceInDays(c.proxima_parcela.vencimento, new Date()) <= 7 &&
          differenceInDays(c.proxima_parcela.vencimento, new Date()) >= 0
        )
        break
      case 'inadimplentes':
        filtered = filtered.filter(c => c.inadimplente)
        break
    }

    return filtered
  }, [contratos, searchTerm, filterTipo, filterStatus, activeTab])

  // Métricas
  const metrics = useMemo(() => {
    const ativos = contratos.filter(c => c.status === 'ativo')
    const valorTotalAtivo = ativos.reduce((sum, c) => sum + c.valor_total, 0)
    const valorRecebido = contratos.reduce((sum, c) => sum + c.valor_recebido, 0)
    const valorPendente = contratos.reduce((sum, c) => sum + c.valor_pendente, 0)
    const inadimplentes = contratos.filter(c => c.inadimplente)
    const taxaInadimplencia = (inadimplentes.length / contratos.length) * 100

    return {
      totalContratos: contratos.length,
      contratosAtivos: ativos.length,
      valorTotalAtivo,
      valorRecebido,
      valorPendente,
      inadimplentes: inadimplentes.length,
      taxaInadimplencia,
    }
  }, [contratos])

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">Contratos Ativos</p>
                <p className="text-2xl font-bold text-[#34495e]">{metrics.contratosAtivos}</p>
                <p className="text-xs text-slate-500 mt-1">de {metrics.totalContratos} total</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">Valor Total</p>
                <p className="text-2xl font-bold text-[#34495e]">
                  {formatCurrency(metrics.valorTotalAtivo)}
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Contratos ativos
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">A Receber</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(metrics.valorPendente)}
                </p>
                <div className="mt-2">
                  <Progress
                    value={(metrics.valorRecebido / (metrics.valorRecebido + metrics.valorPendente)) * 100}
                    className="h-1.5"
                  />
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">Inadimplentes</p>
                <p className="text-2xl font-bold text-red-600">{metrics.inadimplentes}</p>
                <p className="text-xs text-red-500 mt-1">
                  {metrics.taxaInadimplencia.toFixed(1)}% do total
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header com Filtros */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg font-semibold text-[#34495e]">
              Contratos de Honorários
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="text-xs"
              >
                {viewMode === 'cards' ? <Table className="w-3.5 h-3.5 mr-1" /> : <BarChart3 className="w-3.5 h-3.5 mr-1" />}
                {viewMode === 'cards' ? 'Tabela' : 'Cards'}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Contrato
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-4">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="ativos" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativos ({contratos.filter(c => c.status === 'ativo').length})
              </TabsTrigger>
              <TabsTrigger value="vencer" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                A Vencer ({contratos.filter(c =>
                  c.proxima_parcela &&
                  differenceInDays(c.proxima_parcela.vencimento, new Date()) <= 7 &&
                  differenceInDays(c.proxima_parcela.vencimento, new Date()) >= 0
                ).length})
              </TabsTrigger>
              <TabsTrigger value="inadimplentes" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Inadimplentes ({contratos.filter(c => c.inadimplente).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar contratos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm border-slate-200 focus:border-[#89bcbe]"
              />
            </div>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[140px] h-9 text-sm border-slate-200">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="variavel">Variável</SelectItem>
                <SelectItem value="exito">Êxito</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm border-slate-200">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Cards View */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredContratos.map((contrato) => {
                const tipoBadge = getTipoBadge(contrato.tipo)
                const statusBadge = getStatusBadge(contrato.status)

                return (
                  <Card
                    key={contrato.id}
                    className={cn(
                      "border-slate-200 hover:shadow-lg transition-all cursor-pointer",
                      contrato.inadimplente && "border-red-200 bg-red-50/30"
                    )}
                    onClick={() => setSelectedContrato(contrato)}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-[#89bcbe]">{contrato.numero}</p>
                          <h4 className="text-sm font-semibold text-[#34495e] mt-1">
                            {contrato.cliente_nome}
                          </h4>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge className={cn("text-[10px]", tipoBadge.class)}>
                            {tipoBadge.icon}
                            <span className="ml-1">{tipoBadge.label}</span>
                          </Badge>
                          <Badge className={cn("text-[10px]", statusBadge.class)}>
                            {statusBadge.icon}
                            <span className="ml-1">{statusBadge.label}</span>
                          </Badge>
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600">Valor Total</span>
                          <span className="text-sm font-semibold text-[#34495e]">
                            {formatCurrency(contrato.valor_total)}
                          </span>
                        </div>

                        {contrato.tipo === 'fixo' && contrato.numero_parcelas && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Parcelas</span>
                            <span className="text-xs font-medium text-[#34495e]">
                              {contrato.parcelas_pagas}/{contrato.numero_parcelas}
                            </span>
                          </div>
                        )}

                        {contrato.tipo === 'exito' && contrato.percentual_exito && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">% Êxito</span>
                            <span className="text-xs font-medium text-[#34495e]">
                              {contrato.percentual_exito.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Recebido</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(contrato.valor_recebido)}
                          </span>
                        </div>
                        <Progress
                          value={(contrato.valor_recebido / contrato.valor_total) * 100}
                          className="h-2"
                        />
                      </div>

                      {/* Próxima Parcela ou Alerta */}
                      {contrato.inadimplente ? (
                        <div className="bg-red-100 border border-red-200 rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-red-700">
                                Inadimplente
                              </p>
                              <p className="text-[10px] text-red-600">
                                {contrato.dias_atraso} dias de atraso
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : contrato.proxima_parcela && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-blue-600 font-medium">Próximo Vencimento</p>
                              <p className="text-xs font-semibold text-blue-700">
                                {format(contrato.proxima_parcela.vencimento, 'dd/MM/yyyy')}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-blue-700">
                              {formatCurrency(contrato.proxima_parcela.valor)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[#89bcbe] hover:text-[#6ba9ab]"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Cobrar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Contrato</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Valor Total</TableHead>
                    <TableHead className="text-xs">Recebido</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Próx. Vencimento</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => {
                    const tipoBadge = getTipoBadge(contrato.tipo)
                    const statusBadge = getStatusBadge(contrato.status)

                    return (
                      <TableRow
                        key={contrato.id}
                        className={cn(
                          "cursor-pointer hover:bg-slate-50",
                          contrato.inadimplente && "bg-red-50/30"
                        )}
                        onClick={() => setSelectedContrato(contrato)}
                      >
                        <TableCell className="text-xs font-medium text-[#89bcbe]">
                          {contrato.numero}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-[#34495e]">
                          {contrato.cliente_nome}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px]", tipoBadge.class)}>
                            {tipoBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[#34495e]">
                          {formatCurrency(contrato.valor_total)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(contrato.valor_recebido / contrato.valor_total) * 100}
                              className="h-1.5 w-16"
                            />
                            <span className="text-green-600 font-medium">
                              {formatCurrency(contrato.valor_recebido)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px]", statusBadge.class)}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {contrato.inadimplente ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="font-medium">{contrato.dias_atraso}d atraso</span>
                            </div>
                          ) : contrato.proxima_parcela ? (
                            <div>
                              <p className="font-medium text-[#34495e]">
                                {format(contrato.proxima_parcela.vencimento, 'dd/MM')}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {formatCurrency(contrato.proxima_parcela.valor)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Send className="w-3.5 h-3.5 text-[#89bcbe]" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty State */}
          {filteredContratos.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 mb-1">Nenhum contrato encontrado</p>
              <p className="text-xs text-slate-400">
                {searchTerm || filterTipo !== 'all' || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Comece criando um novo contrato'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}