'use client'

import { useState, useEffect } from 'react'
import { FileText, DollarSign, CheckCircle, Clock, AlertCircle, Calendar, User, Filter, Plus, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { cn } from '@/lib/utils'

type Honorario = Database['public']['Tables']['financeiro_honorarios']['Row']
type Parcela = Database['public']['Tables']['financeiro_honorarios_parcelas']['Row']

interface HonorarioComDetalhes extends Honorario {
  cliente_nome?: string
  processo_numero?: string
  total_parcelas?: number
  parcelas_pagas?: number
  valor_pago?: number
  valor_pendente?: number
}

interface Filters {
  status: 'rascunho' | 'aprovado' | 'cancelado' | 'todos'
  tipo: 'fixo' | 'hora' | 'exito' | 'misto' | 'todos'
  periodo: 'semana' | 'mes' | 'todos'
  busca: string
}

export default function HonorariosPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [honorarios, setHonorarios] = useState<HonorarioComDetalhes[]>([])
  const [selectedHonorario, setSelectedHonorario] = useState<string | null>(null)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [filters, setFilters] = useState<Filters>({
    status: 'todos',
    tipo: 'todos',
    periodo: 'mes',
    busca: '',
  })
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (escritorioAtivo) {
      loadHonorarios()
    }
  }, [escritorioAtivo, filters])

  useEffect(() => {
    if (selectedHonorario) {
      loadParcelas(selectedHonorario)
    }
  }, [selectedHonorario])

  const loadHonorarios = async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    try {
      let query = supabase
        .from('financeiro_honorarios')
        .select(`
          *,
          clientes:cliente_id (nome_completo),
          processos:processo_id (numero_processo)
        `)
        .eq('escritorio_id', escritorioAtivo)

      if (filters.status !== 'todos') {
        query = query.eq('status', filters.status)
      }

      if (filters.tipo !== 'todos') {
        query = query.eq('tipo_honorario', filters.tipo)
      }

      if (filters.busca) {
        query = query.ilike('numero_interno', `%${filters.busca}%`)
      }

      const { data: honorariosData, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Buscar informações de parcelas para cada honorário
      const honorariosComDetalhes = await Promise.all(
        (honorariosData || []).map(async (hon) => {
          const { data: parcelasData } = await supabase
            .from('financeiro_honorarios_parcelas')
            .select('*')
            .eq('honorario_id', hon.id)

          const totalParcelas = parcelasData?.length || 0
          const parcelasPagas = parcelasData?.filter((p) => p.paga).length || 0
          const valorPago = parcelasData?.filter((p) => p.paga).reduce((sum, p) => sum + Number(p.valor), 0) || 0
          const valorPendente = parcelasData?.filter((p) => !p.paga).reduce((sum, p) => sum + Number(p.valor), 0) || 0

          return {
            ...hon,
            cliente_nome: (hon as any).clientes?.nome_completo,
            processo_numero: (hon as any).processos?.numero_processo,
            total_parcelas: totalParcelas,
            parcelas_pagas: parcelasPagas,
            valor_pago: valorPago,
            valor_pendente: valorPendente,
          }
        })
      )

      setHonorarios(honorariosComDetalhes)
    } catch (error) {
      console.error('Erro ao carregar honorários:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadParcelas = async (honorarioId: string) => {
    try {
      const { data, error } = await supabase
        .from('financeiro_honorarios_parcelas')
        .select('*')
        .eq('honorario_id', honorarioId)
        .order('data_vencimento', { ascending: true })

      if (error) throw error
      setParcelas(data || [])
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error)
    }
  }

  const getTotais = () => {
    const total = honorarios.reduce((sum, h) => sum + Number(h.valor_total), 0)
    const pago = honorarios.reduce((sum, h) => sum + (h.valor_pago || 0), 0)
    const pendente = honorarios.reduce((sum, h) => sum + (h.valor_pendente || 0), 0)
    const aprovados = honorarios.filter((h) => h.status === 'aprovado').length

    return { total, pago, pendente, aprovados }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-emerald-100 text-emerald-700'
      case 'rascunho':
        return 'bg-amber-100 text-amber-700'
      case 'cancelado':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado'
      case 'rascunho':
        return 'Rascunho'
      case 'cancelado':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'fixo':
        return 'Fixo'
      case 'hora':
        return 'Por Hora'
      case 'exito':
        return 'Êxito'
      case 'misto':
        return 'Misto'
      default:
        return tipo
    }
  }

  const totais = getTotais()
  const honorarioAtivo = honorarios.find((h) => h.id === selectedHonorario)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Contratos e Honorários</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão de honorários contratuais e parcelas
          </p>
        </div>
        <Button className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white border-0 shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Honorário
        </Button>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#34495e] to-[#46627f]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/80">Total Contratado</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(totais.total)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Valor Pago</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {formatCurrency(totais.pago)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700">Valor Pendente</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {formatCurrency(totais.pendente)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#34495e]">Aprovados</p>
                <p className="text-2xl font-bold text-[#34495e] mt-1">
                  {totais.aprovados}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/40 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#34495e]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar número interno..."
              value={filters.busca}
              onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
            />

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todos">Todos os status</option>
              <option value="rascunho">Rascunho</option>
              <option value="aprovado">Aprovado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="todos">Todos os tipos</option>
              <option value="fixo">Fixo</option>
              <option value="hora">Por Hora</option>
              <option value="exito">Êxito</option>
              <option value="misto">Misto</option>
            </select>

            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="todos">Todos</option>
            </select>

            <Button
              onClick={loadHonorarios}
              variant="outline"
              className="border-slate-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Honorários */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Lista */}
        <div className={cn('xl:col-span-12', showDetails && selectedHonorario && 'xl:col-span-7')}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Honorários ({honorarios.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 mt-2">Carregando...</p>
                </div>
              ) : honorarios.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500 mt-2">Nenhum honorário encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {honorarios.map((hon) => (
                    <div
                      key={hon.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                        'border-slate-200 bg-slate-50/50 hover:bg-slate-50',
                        selectedHonorario === hon.id && 'ring-2 ring-[#1E3A8A] border-[#1E3A8A]'
                      )}
                      onClick={() => {
                        setSelectedHonorario(hon.id)
                        setShowDetails(true)
                      }}
                    >
                      {/* Ícone */}
                      <div className="w-10 h-10 rounded-lg bg-[#89bcbe] flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>

                      <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                        {/* Cliente/Número */}
                        <div className="col-span-3">
                          <p className="text-sm font-semibold text-slate-700">
                            {hon.cliente_nome || 'Cliente não identificado'}
                          </p>
                          <p className="text-xs text-slate-600">
                            {hon.numero_interno}
                          </p>
                        </div>

                        {/* Processo */}
                        <div className="col-span-2">
                          <p className="text-xs text-slate-700">
                            {hon.processo_numero || 'Sem processo'}
                          </p>
                        </div>

                        {/* Tipo */}
                        <div className="col-span-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {getTipoLabel(hon.tipo_honorario)}
                          </Badge>
                        </div>

                        {/* Parcelas */}
                        <div className="col-span-2">
                          <p className="text-xs text-slate-600">
                            {hon.parcelas_pagas}/{hon.total_parcelas} pagas
                          </p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{
                                width: `${((hon.parcelas_pagas || 0) / (hon.total_parcelas || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Valor Total */}
                        <div className="col-span-2 text-right">
                          <p className="text-base font-bold text-[#34495e]">
                            {formatCurrency(Number(hon.valor_total))}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="col-span-1 text-right">
                          <Badge variant="secondary" className={cn('text-[10px]', getStatusColor(hon.status))}>
                            {getStatusLabel(hon.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalhes + Parcelas */}
        {showDetails && selectedHonorario && honorarioAtivo && (
          <div className="xl:col-span-5">
            <Card className="border-[#1E3A8A] shadow-lg">
              <CardHeader className="pb-2 pt-3 bg-gradient-to-br from-[#34495e] to-[#46627f] text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Detalhes do Honorário</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(false)}
                    className="text-white hover:bg-white/20"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Informações Gerais */}
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-slate-500">Cliente</p>
                    <p className="text-sm font-semibold text-slate-700">{honorarioAtivo.cliente_nome}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Número Interno</p>
                    <p className="text-sm font-semibold text-slate-700">{honorarioAtivo.numero_interno}</p>
                  </div>
                  {honorarioAtivo.processo_numero && (
                    <div>
                      <p className="text-[10px] text-slate-500">Processo</p>
                      <p className="text-sm font-semibold text-slate-700">{honorarioAtivo.processo_numero}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-slate-500">Descrição</p>
                    <p className="text-xs text-slate-600">{honorarioAtivo.descricao || 'Sem descrição'}</p>
                  </div>
                </div>

                {/* Valores */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Valor Total</span>
                    <span className="text-sm font-bold text-[#34495e]">
                      {formatCurrency(Number(honorarioAtivo.valor_total))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Valor Pago</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(honorarioAtivo.valor_pago || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Valor Pendente</span>
                    <span className="text-sm font-semibold text-amber-700">
                      {formatCurrency(honorarioAtivo.valor_pendente || 0)}
                    </span>
                  </div>
                </div>

                {/* Parcelas */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-700 mb-2">
                    Parcelas ({honorarioAtivo.parcelas_pagas}/{honorarioAtivo.total_parcelas})
                  </p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {parcelas.map((parc, idx) => (
                      <div
                        key={parc.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded border',
                          parc.paga
                            ? 'border-emerald-100 bg-emerald-50/50'
                            : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {parc.paga ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-slate-700">
                              Parcela {idx + 1}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Venc: {new Date(parc.data_vencimento).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <p className={cn(
                          'text-xs font-semibold',
                          parc.paga ? 'text-emerald-700' : 'text-slate-700'
                        )}>
                          {formatCurrency(Number(parc.valor))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
