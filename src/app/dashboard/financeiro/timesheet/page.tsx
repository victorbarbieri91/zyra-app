'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, CheckCircle, XCircle, User, Building2, ChevronDown, Check, Pencil, X, Save, Users, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import TimesheetModal from '@/components/financeiro/TimesheetModal'

interface TimesheetRow {
  id: string
  escritorio_id: string
  nome_escritorio?: string
  user_id: string
  colaborador_nome: string
  processo_id?: string
  numero_processo?: string
  processo_pasta?: string
  consulta_id?: string
  consulta_titulo?: string
  data_trabalho: string
  hora_inicio?: string
  hora_fim?: string
  horas: number
  atividade: string
  faturavel: boolean
  faturado: boolean
  status: 'pendente' | 'aprovado' | 'reprovado'
  cliente_nome?: string
  editado?: boolean
  created_at: string
}

interface Colaborador {
  user_id: string
  nome: string
  escritorio_id: string
}

interface EditForm {
  horas: number
  atividade: string
  faturavel: boolean
}

export default function TimesheetPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Filtros - inicializar com mês atual
  const [periodoSelecionado, setPeriodoSelecionado] = useState<DateRange | undefined>(() => {
    const hoje = new Date()
    return { from: startOfMonth(hoje), to: endOfMonth(hoje) }
  })
  const [statusFiltro, setStatusFiltro] = useState<'pendente' | 'aprovado'>('pendente')
  const [filtroFaturavel, setFiltroFaturavel] = useState<'todos' | 'cobravel' | 'nao_cobravel'>('todos')
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<string[]>([])
  const [seletorColaboradorAberto, setSeletorColaboradorAberto] = useState(false)

  // Estados para edição inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ horas: 0, atividade: '', faturavel: true })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Estado para aprovação/desaprovação individual
  const [aprovandoId, setAprovandoId] = useState<string | null>(null)
  const [desaprovandoId, setDesaprovandoId] = useState<string | null>(null)

  // Multi-escritório states
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Modal de adicionar horas
  const [modalTimesheetOpen, setModalTimesheetOpen] = useState(false)

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        if (escritorios.length > 0) {
          setEscritoriosSelecionados(escritorios.map(e => e.id))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadEscritoriosGrupo()
  }, [])

  // Carregar colaboradores quando escritórios selecionados mudarem
  useEffect(() => {
    const loadColaboradores = async () => {
      if (escritoriosSelecionados.length === 0) {
        setColaboradores([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('escritorios_usuarios')
          .select(`
            user_id,
            escritorio_id,
            profile:profiles!usuarios_escritorios_user_id_fkey(nome_completo)
          `)
          .in('escritorio_id', escritoriosSelecionados)
          .eq('ativo', true)

        if (error) throw error

        const colabs: Colaborador[] = (data || []).map((item: any) => ({
          user_id: item.user_id,
          nome: item.profile?.nome_completo || 'Usuário',
          escritorio_id: item.escritorio_id,
        }))

        // Remover duplicatas (mesmo user_id pode estar em múltiplos escritórios)
        const uniqueColabs = colabs.reduce((acc: Colaborador[], curr) => {
          if (!acc.find(c => c.user_id === curr.user_id)) {
            acc.push(curr)
          }
          return acc
        }, [])

        setColaboradores(uniqueColabs.sort((a, b) => a.nome.localeCompare(b.nome)))
        // Iniciar com todos selecionados
        setColaboradoresSelecionados(uniqueColabs.map(c => c.user_id))
      } catch (error) {
        console.error('Erro ao carregar colaboradores:', error)
      }
    }

    loadColaboradores()
  }, [escritoriosSelecionados, supabase])

  useEffect(() => {
    if (escritoriosSelecionados.length > 0 && periodoSelecionado?.from) {
      loadTimesheets()
    }
  }, [escritoriosSelecionados, periodoSelecionado, statusFiltro, filtroFaturavel, colaboradoresSelecionados])

  // Funções do seletor de escritórios
  const toggleEscritorio = (escritorioId: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(escritorioId)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== escritorioId)
      } else {
        return [...prev, escritorioId]
      }
    })
  }

  const selecionarTodosEscritorios = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenasEscritorio = (escritorioId: string) => {
    setEscritoriosSelecionados([escritorioId])
  }

  const getSeletorEscritorioLabel = () => {
    if (escritoriosSelecionados.length === escritoriosGrupo.length) {
      return 'Todos os escritórios'
    } else if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    } else {
      return `${escritoriosSelecionados.length} escritórios`
    }
  }

  // Funções do seletor de colaboradores
  const toggleColaborador = (userId: string) => {
    setColaboradoresSelecionados(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  const selecionarTodosColaboradores = () => {
    setColaboradoresSelecionados(colaboradores.map(c => c.user_id))
  }

  const getSeletorColaboradorLabel = () => {
    if (colaboradoresSelecionados.length === colaboradores.length) {
      return 'Todos os colaboradores'
    } else if (colaboradoresSelecionados.length === 1) {
      const colab = colaboradores.find(c => c.user_id === colaboradoresSelecionados[0])
      return colab?.nome || 'Colaborador'
    } else {
      return `${colaboradoresSelecionados.length} colaboradores`
    }
  }

  const loadTimesheets = useCallback(async () => {
    if (escritoriosSelecionados.length === 0 || colaboradoresSelecionados.length === 0 || !periodoSelecionado?.from) {
      setTimesheets([])
      return
    }

    setLoading(true)
    try {
      const dataInicio = format(periodoSelecionado.from, 'yyyy-MM-dd')
      const dataFim = format(periodoSelecionado.to || periodoSelecionado.from, 'yyyy-MM-dd')

      let query = supabase
        .from('v_timesheet_aprovacao')
        .select('*')
        .in('escritorio_id', escritoriosSelecionados)
        .in('user_id', colaboradoresSelecionados)
        .eq('status', statusFiltro)
        .gte('data_trabalho', dataInicio)
        .lte('data_trabalho', dataFim)

      // Aplicar filtro de faturável/não cobrável
      if (filtroFaturavel === 'cobravel') {
        query = query.eq('faturavel', true)
      } else if (filtroFaturavel === 'nao_cobravel') {
        query = query.eq('faturavel', false)
      }

      const { data, error } = await query.order('data_trabalho', { ascending: false })

      if (error) throw error
      setTimesheets(data || [])
    } catch (error) {
      console.error('Erro ao carregar timesheets:', error)
      toast.error('Erro ao carregar registros')
    } finally {
      setLoading(false)
    }
  }, [escritoriosSelecionados, colaboradoresSelecionados, periodoSelecionado, statusFiltro, filtroFaturavel, supabase])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendentes = timesheets.filter(t => t.status === 'pendente')
      setSelectedIds(new Set(pendentes.map((t) => t.id)))
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

      toast.success(`${selectedIds.size} registro(s) aprovado(s) com sucesso!`)
      setSelectedIds(new Set())
      loadTimesheets()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao aprovar timesheets')
      console.error('Erro ao aprovar:', error)
    }
  }

  // Aprovar um único timesheet
  const handleAproveSingle = async (timesheetId: string) => {
    setAprovandoId(timesheetId)
    try {
      const { error } = await supabase.rpc('aprovar_timesheet', {
        p_timesheet_ids: [timesheetId],
        p_aprovado_por: (await supabase.auth.getUser()).data.user?.id,
      })

      if (error) throw error

      toast.success('Registro aprovado com sucesso!')
      // Remove da seleção se estava selecionado
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(timesheetId)
        return newSet
      })
      loadTimesheets()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao aprovar timesheet')
      console.error('Erro ao aprovar:', error)
    } finally {
      setAprovandoId(null)
    }
  }

  // Desaprovar um único timesheet (reverter aprovação)
  const handleDesaprovarSingle = async (timesheetId: string) => {
    setDesaprovandoId(timesheetId)
    try {
      const { error } = await supabase.rpc('desaprovar_timesheet', {
        p_timesheet_ids: [timesheetId],
        p_desaprovado_por: (await supabase.auth.getUser()).data.user?.id,
      })

      if (error) throw error

      toast.success('Aprovação revertida com sucesso!')
      loadTimesheets()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao desaprovar timesheet')
      console.error('Erro ao desaprovar:', error)
    } finally {
      setDesaprovandoId(null)
    }
  }

  const handleReject = async () => {
    if (selectedIds.size === 0) return

    const justificativa = prompt('Justificativa da reprovação (obrigatória):')
    if (!justificativa || justificativa.length < 10) {
      toast.error('Justificativa deve ter pelo menos 10 caracteres')
      return
    }

    try {
      const { error } = await supabase.rpc('reprovar_timesheet', {
        p_timesheet_ids: Array.from(selectedIds),
        p_reprovado_por: (await supabase.auth.getUser()).data.user?.id,
        p_justificativa: justificativa,
      })

      if (error) throw error

      toast.success(`${selectedIds.size} registro(s) reprovado(s)`)
      setSelectedIds(new Set())
      loadTimesheets()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao reprovar timesheets')
      console.error('Erro ao reprovar:', error)
    }
  }

  // Funções de edição
  const iniciarEdicao = (ts: TimesheetRow) => {
    setEditandoId(ts.id)
    setEditForm({
      horas: ts.horas,
      atividade: ts.atividade,
      faturavel: ts.faturavel,
    })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setEditForm({ horas: 0, atividade: '', faturavel: true })
  }

  const salvarEdicao = async () => {
    if (!editandoId) return

    if (editForm.horas <= 0) {
      toast.error('Horas deve ser maior que zero')
      return
    }

    if (editForm.atividade.trim().length < 3) {
      toast.error('Atividade deve ter pelo menos 3 caracteres')
      return
    }

    setSalvandoEdicao(true)
    try {
      const { error } = await supabase.rpc('editar_timesheet', {
        p_timesheet_id: editandoId,
        p_horas: editForm.horas,
        p_atividade: editForm.atividade.trim(),
        p_faturavel: editForm.faturavel,
        p_editado_por: (await supabase.auth.getUser()).data.user?.id,
      })

      if (error) throw error

      toast.success('Registro atualizado com sucesso!')
      setEditandoId(null)
      loadTimesheets()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar edição')
      console.error('Erro ao editar:', error)
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const getTotalHoras = () => {
    return timesheets
      .filter((t) => selectedIds.has(t.id))
      .reduce((sum, t) => sum + (Number(t.horas) || 0), 0)
  }

  const getTotalHorasLista = () => {
    return timesheets.reduce((sum, t) => sum + (Number(t.horas) || 0), 0)
  }

  const pendentesCount = timesheets.filter(t => t.status === 'pendente').length

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Timesheet</h1>
          <p className="text-sm text-slate-600 mt-1">
            Aprovação e revisão de horas trabalhadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Adicionar */}
          <Button
            onClick={() => setModalTimesheetOpen(true)}
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Lançar Horas
          </Button>

          {/* Seletor de Escritórios */}
          {escritoriosGrupo.length > 1 && (
          <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-200 bg-white hover:bg-slate-50"
              >
                <Building2 className="h-4 w-4 mr-2 text-[#34495e]" />
                <span className="text-sm">{getSeletorEscritorioLabel()}</span>
                <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <div className="space-y-1">
                <button
                  onClick={selecionarTodosEscritorios}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    escritoriosSelecionados.length === escritoriosGrupo.length
                      ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                      : 'hover:bg-slate-100 text-slate-700'
                  )}
                >
                  <span className="font-medium">Todos os escritórios</span>
                  {escritoriosSelecionados.length === escritoriosGrupo.length && (
                    <Check className="h-4 w-4" />
                  )}
                </button>

                <div className="h-px bg-slate-200 my-2" />

                {escritoriosGrupo.map((escritorio) => (
                  <div
                    key={escritorio.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    <Checkbox
                      id={`esc-${escritorio.id}`}
                      checked={escritoriosSelecionados.includes(escritorio.id)}
                      onCheckedChange={() => toggleEscritorio(escritorio.id)}
                    />
                    <label
                      htmlFor={`esc-${escritorio.id}`}
                      className="flex-1 text-sm text-slate-700 cursor-pointer"
                    >
                      {escritorio.nome}
                    </label>
                    <button
                      onClick={() => selecionarApenasEscritorio(escritorio.id)}
                      className="text-[10px] text-[#1E3A8A] hover:underline"
                    >
                      apenas
                    </button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Seletor de Colaboradores */}
        <Popover open={seletorColaboradorAberto} onOpenChange={setSeletorColaboradorAberto}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-slate-200 bg-white hover:bg-slate-50 min-w-[180px] justify-between"
            >
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-slate-500" />
                <span className="text-sm truncate">{getSeletorColaboradorLabel()}</span>
              </div>
              <ChevronDown className="h-4 w-4 ml-2 text-slate-400 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="space-y-1">
              <button
                onClick={selecionarTodosColaboradores}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  colaboradoresSelecionados.length === colaboradores.length
                    ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                    : 'hover:bg-slate-100 text-slate-700'
                )}
              >
                <span className="font-medium">Todos os colaboradores</span>
                {colaboradoresSelecionados.length === colaboradores.length && (
                  <Check className="h-4 w-4" />
                )}
              </button>

              <div className="h-px bg-slate-200 my-2" />

              <div className="max-h-64 overflow-y-auto">
                {colaboradores.map((colab) => (
                  <div
                    key={colab.user_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    <Checkbox
                      id={`colab-${colab.user_id}`}
                      checked={colaboradoresSelecionados.includes(colab.user_id)}
                      onCheckedChange={() => toggleColaborador(colab.user_id)}
                    />
                    <label
                      htmlFor={`colab-${colab.user_id}`}
                      className="flex-1 text-sm text-slate-700 cursor-pointer truncate"
                    >
                      {colab.nome}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Seletor de Período */}
        <DateRangePicker
          value={periodoSelecionado}
          onChange={setPeriodoSelecionado}
          placeholder="Selecione o período"
          className="border-slate-200 bg-white hover:bg-slate-50"
        />

        {/* Toggle Status */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setStatusFiltro('pendente')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              statusFiltro === 'pendente'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFiltro('aprovado')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200',
              statusFiltro === 'aprovado'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Aprovados
          </button>
        </div>

        {/* Toggle Faturável/Interno */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setFiltroFaturavel('todos')}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors',
              filtroFaturavel === 'todos'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroFaturavel('cobravel')}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-l border-slate-200',
              filtroFaturavel === 'cobravel'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Cobráveis
          </button>
          <button
            onClick={() => setFiltroFaturavel('nao_cobravel')}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-l border-slate-200',
              filtroFaturavel === 'nao_cobravel'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Não Cobráveis
          </button>
        </div>
      </div>

      {/* Ações em Lote */}
      {selectedIds.size > 0 && statusFiltro === 'pendente' && (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="py-3">
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
                    Total: {getTotalHoras().toFixed(1)}h
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleApprove}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Aprovar
                </Button>
                <Button
                  onClick={handleReject}
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Reprovar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Timesheets */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Registros de Horas
              </CardTitle>
              {statusFiltro === 'pendente' && timesheets.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pendentesCount && pendentesCount > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Selecionar todos
                </label>
              )}
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {timesheets.length} {timesheets.length === 1 ? 'registro' : 'registros'} - {getTotalHorasLista().toFixed(1)}h
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-2 px-0">
          {loading ? (
            <div className="py-12 text-center">
              <Clock className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Carregando...</p>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">
                {statusFiltro === 'pendente'
                  ? 'Nenhum registro pendente de aprovação'
                  : 'Nenhum registro aprovado encontrado'}
              </p>
              {periodoSelecionado?.from && (
                <p className="text-xs text-slate-400 mt-1">
                  {periodoSelecionado.to && format(periodoSelecionado.from, 'dd/MM/yyyy') !== format(periodoSelecionado.to, 'dd/MM/yyyy')
                    ? `${format(periodoSelecionado.from, 'dd/MM/yyyy')} - ${format(periodoSelecionado.to, 'dd/MM/yyyy')}`
                    : format(periodoSelecionado.from, 'dd/MM/yyyy')}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Header da tabela */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {statusFiltro === 'pendente' && <div className="col-span-1"></div>}
                <div className="col-span-1">Data</div>
                <div className="col-span-2">Colaborador</div>
                <div className="col-span-2">Cliente</div>
                <div className="col-span-3">Atividade</div>
                <div className="col-span-1 text-right">Horas</div>
                <div className="col-span-1 text-center">Tipo</div>
                <div className="col-span-1"></div>
              </div>

              {/* Linhas */}
              {timesheets.map((ts) => (
                <div
                  key={ts.id}
                  className={cn(
                    'grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-slate-50 transition-colors',
                    selectedIds.has(ts.id) && 'bg-blue-50',
                    editandoId === ts.id && 'bg-amber-50'
                  )}
                >
                  {/* Checkbox */}
                  {statusFiltro === 'pendente' && (
                    <div className="col-span-1">
                      {editandoId !== ts.id && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ts.id)}
                          onChange={(e) => handleSelectOne(ts.id, e.target.checked)}
                          className="rounded border-slate-300"
                        />
                      )}
                    </div>
                  )}

                  {/* Data */}
                  <div className={statusFiltro === 'pendente' ? 'col-span-1' : 'col-span-1'}>
                    <span className="text-xs text-slate-600">
                      {formatBrazilDate(ts.data_trabalho)}
                    </span>
                  </div>

                  {/* Colaborador */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#89bcbe]/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-[#34495e]" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {ts.colaborador_nome}
                      </span>
                    </div>
                  </div>

                  {/* Cliente/Processo */}
                  <div className="col-span-2">
                    <p className="text-xs text-slate-700 truncate">
                      {ts.cliente_nome || '-'}
                    </p>
                    {ts.numero_processo && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {ts.numero_processo}
                      </p>
                    )}
                  </div>

                  {/* Atividade */}
                  <div className="col-span-3">
                    {editandoId === ts.id ? (
                      <Input
                        value={editForm.atividade}
                        onChange={(e) => setEditForm({ ...editForm, atividade: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Descreva a atividade..."
                      />
                    ) : (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {ts.atividade}
                        {ts.editado && (
                          <span className="text-[10px] text-amber-600 ml-1">(editado)</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Horas */}
                  <div className="col-span-1 text-right">
                    {editandoId === ts.id ? (
                      <Input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={editForm.horas}
                        onChange={(e) => setEditForm({ ...editForm, horas: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs w-16 ml-auto"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-[#34495e]">
                        {Number(ts.horas).toFixed(1)}h
                      </span>
                    )}
                  </div>

                  {/* Tipo */}
                  <div className="col-span-1 text-center">
                    {editandoId === ts.id ? (
                      <button
                        onClick={() => setEditForm({ ...editForm, faturavel: !editForm.faturavel })}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium',
                          editForm.faturavel
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {editForm.faturavel ? 'Cobrável' : 'N/Cob.'}
                      </button>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          ts.faturavel
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {ts.faturavel ? 'Cobrável' : 'N/Cob.'}
                      </Badge>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="col-span-1 flex justify-end gap-0.5">
                    {statusFiltro === 'pendente' ? (
                      <>
                        {editandoId === ts.id ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={salvarEdicao}
                              disabled={salvandoEdicao}
                            >
                              <Save className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={cancelarEdicao}
                              disabled={salvandoEdicao}
                            >
                              <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* Botão de aprovação rápida */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-emerald-50"
                              onClick={() => handleAproveSingle(ts.id)}
                              disabled={aprovandoId === ts.id}
                              title="Aprovar"
                            >
                              <CheckCircle className={cn(
                                "h-3.5 w-3.5",
                                aprovandoId === ts.id
                                  ? "text-emerald-400 animate-pulse"
                                  : "text-emerald-500 hover:text-emerald-600"
                              )} />
                            </Button>
                            {/* Botão de edição */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => iniciarEdicao(ts)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      /* Aba Aprovados - botão de desaprovar */
                      !ts.faturado && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:bg-red-50"
                          onClick={() => handleDesaprovarSingle(ts.id)}
                          disabled={desaprovandoId === ts.id}
                          title="Reverter aprovação"
                        >
                          <XCircle className={cn(
                            "h-3.5 w-3.5",
                            desaprovandoId === ts.id
                              ? "text-red-400 animate-pulse"
                              : "text-red-500 hover:text-red-600"
                          )} />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Lançar Horas */}
      <TimesheetModal
        open={modalTimesheetOpen}
        onOpenChange={setModalTimesheetOpen}
        onSuccess={() => {
          setModalTimesheetOpen(false)
          loadTimesheets()
        }}
      />
    </div>
  )
}
