'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, Calendar, User, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { cn } from '@/lib/utils'

type TimesheetRow = Database['public']['Views']['v_timesheet_pendente_aprovacao']['Row']

interface TimesheetFilters {
  colaborador: string
  periodo: 'semana' | 'mes' | 'todos'
  status: 'pendente' | 'aprovado' | 'reprovado' | 'todos'
}

export default function TimesheetPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<TimesheetFilters>({
    colaborador: '',
    periodo: 'semana',
    status: 'pendente',
  })
  const [loading, setLoading] = useState(true)
  const [showApprovalModal, setShowApprovalModal] = useState(false)

  useEffect(() => {
    if (escritorioAtivo) {
      loadTimesheets()
    }
  }, [escritorioAtivo, filters])

  const loadTimesheets = async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    try {
      let query = supabase
        .from('v_timesheet_pendente_aprovacao')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)

      // Aplicar filtros
      if (filters.colaborador) {
        query = query.ilike('colaborador_nome', `%${filters.colaborador}%`)
      }

      if (filters.periodo === 'semana') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('data_trabalho', weekAgo.toISOString().split('T')[0])
      } else if (filters.periodo === 'mes') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('data_trabalho', monthAgo.toISOString().split('T')[0])
      }

      const { data, error } = await query.order('data_trabalho', { ascending: false })

      if (error) throw error
      setTimesheets(data || [])
    } catch (error) {
      console.error('Erro ao carregar timesheets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(timesheets.map((t) => t.id!)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleApprove = async () => {
    if (selectedIds.size === 0) return

    try {
      const { error } = await supabase.rpc('aprovar_timesheet', {
        p_timesheet_ids: Array.from(selectedIds),
        p_aprovado_por: (await supabase.auth.getUser()).data.user?.id,
      })

      if (error) throw error

      setSelectedIds(new Set())
      loadTimesheets()
    } catch (error) {
      console.error('Erro ao aprovar:', error)
      alert('Erro ao aprovar timesheets')
    }
  }

  const handleReject = async () => {
    if (selectedIds.size === 0) return

    const justificativa = prompt('Justificativa da reprovação (obrigatória):')
    if (!justificativa || justificativa.length < 10) {
      alert('Justificativa deve ter pelo menos 10 caracteres')
      return
    }

    try {
      const { error } = await supabase.rpc('reprovar_timesheet', {
        p_timesheet_ids: Array.from(selectedIds),
        p_reprovado_por: (await supabase.auth.getUser()).data.user?.id,
        p_justificativa: justificativa,
      })

      if (error) throw error

      setSelectedIds(new Set())
      loadTimesheets()
    } catch (error) {
      console.error('Erro ao reprovar:', error)
      alert('Erro ao reprovar timesheets')
    }
  }

  const getTotalHoras = () => {
    return timesheets
      .filter((t) => selectedIds.has(t.id!))
      .reduce((sum, t) => sum + (Number(t.horas) || 0), 0)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Timesheet</h1>
          <p className="text-sm text-slate-600 mt-1">
            Aprovação e revisão de horas trabalhadas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar colaborador..."
                value={filters.colaborador}
                onChange={(e) => setFilters({ ...filters, colaborador: e.target.value })}
                className="pl-10"
              />
            </div>

            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="todos">Todos</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="pendente">Pendente aprovação</option>
              <option value="aprovado">Aprovados</option>
              <option value="reprovado">Reprovados</option>
              <option value="todos">Todos</option>
            </select>

            <Button
              onClick={loadTimesheets}
              variant="outline"
              className="border-slate-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ações em Lote */}
      {selectedIds.size > 0 && (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {selectedIds.size} {selectedIds.size === 1 ? 'registro selecionado' : 'registros selecionados'}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Total: {getTotalHoras().toFixed(2)}h
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reprovar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Timesheets */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">
              Registros de Horas
            </CardTitle>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === timesheets.length && timesheets.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-slate-300"
              />
              Selecionar todos
            </label>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          {loading ? (
            <div className="py-12 text-center">
              <Clock className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Carregando...</p>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timesheets.map((timesheet) => (
                <div
                  key={timesheet.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    selectedIds.has(timesheet.id!)
                      ? 'border-[#1E3A8A] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(timesheet.id!)}
                    onChange={(e) => handleSelectOne(timesheet.id!, e.target.checked)}
                    className="rounded border-slate-300"
                  />

                  <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                    {/* Colaborador */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#89bcbe]/20 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-[#34495e]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {timesheet.colaborador_nome}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cliente/Processo */}
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-slate-700">
                        {timesheet.cliente_nome || 'Sem cliente'}
                      </p>
                      {timesheet.numero_processo && (
                        <p className="text-[10px] text-slate-500">
                          {timesheet.numero_processo}
                        </p>
                      )}
                    </div>

                    {/* Atividade */}
                    <div className="col-span-3">
                      <p className="text-xs text-slate-700 line-clamp-2">
                        {timesheet.atividade}
                      </p>
                    </div>

                    {/* Data */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {new Date(timesheet.data_trabalho + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Horas */}
                    <div className="col-span-1 text-right">
                      <Badge
                        variant="secondary"
                        className="bg-[#aacfd0]/30 text-[#34495e] font-semibold"
                      >
                        {Number(timesheet.horas).toFixed(1)}h
                      </Badge>
                    </div>

                    {/* Faturável */}
                    <div className="col-span-1 text-center">
                      {timesheet.faturavel ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                          Faturável
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                          Interno
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
