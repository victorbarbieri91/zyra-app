'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Eye,
  Send,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import { useContratosHonorarios, ContratoHonorario, ContratoFormData } from '@/hooks/useContratosHonorarios'
import { ContratoModal } from './ContratoModal'
import ContratoDetailModal from './ContratoDetailModal'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'

interface HonorariosContratosProps {
  escritorioId: string
}

const getTipoBadge = (forma: ContratoHonorario['forma_cobranca']) => {
  const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    fixo: {
      label: 'Fixo',
      class: 'bg-blue-100 text-blue-700',
      icon: <Calendar className="w-3 h-3" />,
    },
    por_hora: {
      label: 'Por Hora',
      class: 'bg-purple-100 text-purple-700',
      icon: <Clock className="w-3 h-3" />,
    },
    por_cargo: {
      label: 'Por Cargo',
      class: 'bg-indigo-100 text-indigo-700',
      icon: <Clock className="w-3 h-3" />,
    },
    por_pasta: {
      label: 'Por Pasta',
      class: 'bg-cyan-100 text-cyan-700',
      icon: <FileText className="w-3 h-3" />,
    },
    por_ato: {
      label: 'Por Ato',
      class: 'bg-rose-100 text-rose-700',
      icon: <Activity className="w-3 h-3" />,
    },
    por_etapa: {
      label: 'Por Etapa',
      class: 'bg-slate-100 text-slate-700',
      icon: <TrendingUp className="w-3 h-3" />,
    },
    misto: {
      label: 'Misto',
      class: 'bg-amber-100 text-amber-700',
      icon: <PieChart className="w-3 h-3" />,
    },
  }
  return badges[forma] || badges.fixo
}

const getStatusBadge = (ativo: boolean, inadimplente?: boolean) => {
  if (inadimplente) {
    return {
      label: 'Inadimplente',
      class: 'bg-red-100 text-red-700',
      icon: <AlertTriangle className="w-3 h-3" />,
    }
  }
  if (ativo) {
    return {
      label: 'Ativo',
      class: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-3 h-3" />,
    }
  }
  return {
    label: 'Encerrado',
    class: 'bg-gray-100 text-gray-700',
    icon: <XCircle className="w-3 h-3" />,
  }
}

export default function HonorariosContratos({ escritorioId }: HonorariosContratosProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const {
    contratos,
    loading,
    error,
    metrics,
    loadContratos,
    createContrato,
    updateContrato,
    deleteContrato,
    reativarContrato,
  } = useContratosHonorarios()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedContrato, setSelectedContrato] = useState<ContratoHonorario | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [activeTab, setActiveTab] = useState<'ativos' | 'vencer' | 'inadimplentes' | 'todos'>('ativos')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContrato, setEditingContrato] = useState<ContratoHonorario | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contratoToDelete, setContratoToDelete] = useState<ContratoHonorario | null>(null)
  const [preSelectedClienteId, setPreSelectedClienteId] = useState<string | null>(null)

  // Carregar contratos ao montar
  useEffect(() => {
    loadContratos()
  }, [loadContratos])

  // Processar parâmetros da URL (para abrir modal automaticamente)
  useEffect(() => {
    const action = searchParams.get('action')
    const clienteId = searchParams.get('cliente_id')

    if (action === 'novo' && clienteId) {
      setPreSelectedClienteId(clienteId)
      setEditingContrato(null)
      setModalOpen(true)

      // Limpar parâmetros da URL após processar
      router.replace('/dashboard/financeiro?tab=contratos')
    }
  }, [searchParams, router])

  // Filtrar contratos
  const filteredContratos = useMemo(() => {
    let filtered = [...contratos]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (filterTipo !== 'all') {
      filtered = filtered.filter((c) => c.forma_cobranca === filterTipo)
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'ativo') {
        filtered = filtered.filter((c) => c.ativo)
      } else if (filterStatus === 'encerrado') {
        filtered = filtered.filter((c) => !c.ativo)
      }
    }

    // Tab filter
    switch (activeTab) {
      case 'ativos':
        filtered = filtered.filter((c) => c.ativo)
        break
      case 'vencer':
        filtered = filtered.filter((c) => {
          if (!c.proxima_parcela?.vencimento) return false
          const dias = differenceInDays(parseISO(c.proxima_parcela.vencimento), new Date())
          return dias >= 0 && dias <= 7
        })
        break
      case 'inadimplentes':
        filtered = filtered.filter((c) => c.inadimplente)
        break
      case 'todos':
        // Sem filtro adicional
        break
    }

    return filtered
  }, [contratos, searchTerm, filterTipo, filterStatus, activeTab])

  // Handlers
  const handleNovoContrato = () => {
    setEditingContrato(null)
    setPreSelectedClienteId(null)
    setModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setPreSelectedClienteId(null) // Limpar cliente pré-selecionado ao fechar
    }
  }

  const handleEditContrato = (contrato: ContratoHonorario) => {
    setEditingContrato(contrato)
    setModalOpen(true)
  }

  const handleDeleteClick = (contrato: ContratoHonorario) => {
    setContratoToDelete(contrato)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (contratoToDelete) {
      await deleteContrato(contratoToDelete.id)
      setDeleteDialogOpen(false)
      setContratoToDelete(null)
    }
  }

  const handleReativar = async (contrato: ContratoHonorario) => {
    await reativarContrato(contrato.id)
  }

  const handleSaveContrato = async (data: ContratoFormData): Promise<string | null | boolean> => {
    if (editingContrato) {
      return await updateContrato(editingContrato.id, data)
    }
    return await createContrato(data)
  }

  // Contadores para tabs
  const contratosAtivos = contratos.filter((c) => c.ativo).length
  const contratosVencer = contratos.filter((c) => {
    if (!c.proxima_parcela?.vencimento) return false
    const dias = differenceInDays(parseISO(c.proxima_parcela.vencimento), new Date())
    return dias >= 0 && dias <= 7
  }).length
  const contratosInadimplentes = contratos.filter((c) => c.inadimplente).length

  if (loading && contratos.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe] mx-auto mb-2" />
          <p className="text-sm text-slate-600">Carregando contratos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header da Página */}
      <div>
        <h1 className="text-2xl font-semibold text-[#34495e]">Contratos de Honorários</h1>
        <p className="text-sm text-[#6c757d] mt-0.5">
          Gerencie todos os contratos de honorários do escritório
        </p>
      </div>

      {/* Card Principal */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          {/* Tabs e Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="ativos" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativos ({contratosAtivos})
                </TabsTrigger>
                <TabsTrigger value="vencer" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  A Vencer ({contratosVencer})
                </TabsTrigger>
                <TabsTrigger value="inadimplentes" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Inadimplentes ({contratosInadimplentes})
                </TabsTrigger>
                <TabsTrigger value="todos" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Todos ({contratos.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="text-xs"
              >
                {viewMode === 'cards' ? (
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                )}
                {viewMode === 'cards' ? 'Tabela' : 'Cards'}
              </Button>
              <Button
                size="sm"
                onClick={handleNovoContrato}
                className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Novo Contrato
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mt-4">
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
              <SelectTrigger className="w-[160px] h-9 text-sm border-slate-200">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="fixo">Valor Fixo</SelectItem>
                <SelectItem value="por_hora">Por Hora</SelectItem>
                <SelectItem value="por_cargo">Por Cargo</SelectItem>
                <SelectItem value="por_pasta">Por Pasta</SelectItem>
                <SelectItem value="por_ato">Por Ato</SelectItem>
                <SelectItem value="por_etapa">Por Etapa</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
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
                <SelectItem value="encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Cards View */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredContratos.map((contrato) => {
                const statusBadge = getStatusBadge(contrato.ativo, contrato.inadimplente)

                return (
                  <Card
                    key={contrato.id}
                    className={cn(
                      'border-slate-200 hover:shadow-lg transition-all cursor-pointer',
                      contrato.inadimplente && 'border-red-200 bg-red-50/30',
                      !contrato.ativo && 'opacity-60'
                    )}
                    onClick={() => setSelectedContrato(contrato)}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-[#89bcbe]">{contrato.numero_contrato}</p>
                          {contrato.titulo && (
                            <h4 className="text-sm font-semibold text-[#34495e] mt-1 truncate" title={contrato.titulo}>
                              {contrato.titulo}
                            </h4>
                          )}
                          <p className={cn(
                            "text-slate-600 truncate",
                            contrato.titulo ? "text-xs mt-0.5" : "text-sm font-semibold text-[#34495e] mt-1"
                          )} title={contrato.cliente_nome}>
                            {contrato.cliente_nome}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {/* Múltiplas formas de cobrança */}
                          <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                            {(contrato.formas_disponiveis || [contrato.forma_cobranca]).slice(0, 3).map((forma) => {
                              const badge = getTipoBadge(forma)
                              return (
                                <Badge key={forma} className={cn('text-[10px] px-1.5 py-0', badge.class)}>
                                  {badge.label}
                                </Badge>
                              )
                            })}
                            {(contrato.formas_disponiveis || []).length > 3 && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600">
                                +{(contrato.formas_disponiveis || []).length - 3}
                              </Badge>
                            )}
                          </div>
                          <Badge className={cn('text-[10px]', statusBadge.class)}>
                            {statusBadge.icon}
                            <span className="ml-1">{statusBadge.label}</span>
                          </Badge>
                        </div>
                      </div>

                      {/* Info da Vigência */}
                      {contrato.data_inicio && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Vigência: {formatBrazilDate(parseDateInBrazil(contrato.data_inicio))}
                            {contrato.data_fim && ` até ${formatBrazilDate(parseDateInBrazil(contrato.data_fim))}`}
                          </span>
                        </div>
                      )}

                      {/* Alerta de Inadimplência (sem valores) */}
                      {contrato.inadimplente && (
                        <div className="bg-red-100 border border-red-200 rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-red-700">Inadimplente</p>
                              <p className="text-[10px] text-red-600">
                                {contrato.dias_atraso} dias de atraso
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[#89bcbe] hover:text-[#6ba9ab]"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedContrato(contrato)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditContrato(contrato)
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          {contrato.ativo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(contrato)
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-green-600 hover:text-green-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReativar(contrato)
                              }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        {contrato.inadimplente && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[#89bcbe] hover:text-[#6ba9ab]"
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Cobrar
                          </Button>
                        )}
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
                    <TableHead className="text-xs">Título</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Tipo de Cobrança</TableHead>
                    <TableHead className="text-xs">Vigência</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => {
                    const statusBadge = getStatusBadge(contrato.ativo, contrato.inadimplente)

                    return (
                      <TableRow
                        key={contrato.id}
                        className={cn(
                          'cursor-pointer hover:bg-slate-50',
                          contrato.inadimplente && 'bg-red-50/30',
                          !contrato.ativo && 'opacity-60'
                        )}
                        onClick={() => setSelectedContrato(contrato)}
                      >
                        <TableCell className="text-xs font-medium text-[#89bcbe]">
                          {contrato.numero_contrato}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-[#34495e] max-w-[200px] truncate" title={contrato.titulo || ''}>
                          {contrato.titulo || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {contrato.cliente_nome}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(contrato.formas_disponiveis || [contrato.forma_cobranca]).slice(0, 3).map((forma) => {
                              const badge = getTipoBadge(forma)
                              return (
                                <Badge key={forma} className={cn('text-[10px] px-1.5 py-0', badge.class)}>
                                  {badge.label}
                                </Badge>
                              )
                            })}
                            {(contrato.formas_disponiveis || []).length > 3 && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600">
                                +{(contrato.formas_disponiveis || []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {contrato.data_inicio ? (
                            <div>
                              <p>{formatBrazilDate(parseDateInBrazil(contrato.data_inicio))}</p>
                              {contrato.data_fim && (
                                <p className="text-[10px] text-slate-400">
                                  até {formatBrazilDate(parseDateInBrazil(contrato.data_fim))}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Indeterminado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px]', statusBadge.class)}>
                            {statusBadge.icon}
                            <span className="ml-1">{statusBadge.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#89bcbe] hover:text-[#6ba9ab]"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedContrato(contrato)
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditContrato(contrato)
                              }}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            {contrato.ativo ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(contrato)
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReativar(contrato)
                                }}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            )}
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
              {!searchTerm && filterTipo === 'all' && filterStatus === 'all' && (
                <Button
                  size="sm"
                  onClick={handleNovoContrato}
                  className="mt-4 bg-[#89bcbe] hover:bg-[#6ba9ab]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Criar Primeiro Contrato
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <ContratoModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        contrato={editingContrato}
        onSave={handleSaveContrato}
        defaultClienteId={preSelectedClienteId}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar o contrato{' '}
              <strong>{contratoToDelete?.numero_contrato}</strong>?
              <br />
              O contrato será marcado como inativo, mas poderá ser reativado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Visualização de Detalhes */}
      <ContratoDetailModal
        open={selectedContrato !== null}
        onOpenChange={(open) => !open && setSelectedContrato(null)}
        contrato={selectedContrato}
        onEdit={(contrato) => {
          setSelectedContrato(null)
          handleEditContrato(contrato)
        }}
      />
    </div>
  )
}
