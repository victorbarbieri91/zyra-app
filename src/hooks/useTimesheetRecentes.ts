'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritoriosDoGrupoUsuario } from './useEscritoriosDoGrupoUsuario'

export type TimesheetPeriodo = 'semana' | 'mes'

export interface TimesheetEntryRecente {
  id: string
  data_trabalho: string
  horas: number
  atividade: string
  faturavel: boolean
  faturado: boolean
  status: 'pendente' | 'aprovado' | 'reprovado'
  processo_id: string | null
  processo_titulo: string | null
  consulta_id: string | null
  consulta_titulo: string | null
  tarefa_id: string | null
  cliente_nome: string | null
  editado: boolean
  hora_inicio: string | null
  hora_fim: string | null
}

// 'semana': últimos 7 dias rolling.
// 'mes': do dia 1 do mês corrente até hoje (não rolling — fecha no mês de calendário).
function inicioPeriodoISO(periodo: TimesheetPeriodo): string {
  const data = new Date()
  if (periodo === 'mes') {
    data.setDate(1)
  } else {
    data.setDate(data.getDate() - 6)
  }
  data.setHours(0, 0, 0, 0)
  return data.toISOString().slice(0, 10)
}

async function fetchTimesheetRecentes(
  supabase: ReturnType<typeof createClient>,
  escritoriosIds: string[],
  periodo: TimesheetPeriodo,
  limit: number,
): Promise<TimesheetEntryRecente[]> {
  if (escritoriosIds.length === 0) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('v_timesheet_aprovacao')
    .select('id, data_trabalho, horas, atividade, faturavel, faturado, status, processo_id, processo_titulo, consulta_id, consulta_titulo, tarefa_id, cliente_nome, editado, hora_inicio, hora_fim')
    .in('escritorio_id', escritoriosIds)
    .eq('user_id', user.id)
    .gte('data_trabalho', inicioPeriodoISO(periodo))
    .order('data_trabalho', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as TimesheetEntryRecente[]
}

async function fetchTimesheetPorTarefa(
  supabase: ReturnType<typeof createClient>,
  tarefaId: string
): Promise<TimesheetEntryRecente[]> {
  const { data, error } = await supabase
    .from('v_timesheet_aprovacao')
    .select('id, data_trabalho, horas, atividade, faturavel, faturado, status, processo_id, processo_titulo, consulta_id, consulta_titulo, tarefa_id, cliente_nome, editado, hora_inicio, hora_fim')
    .eq('tarefa_id', tarefaId)
    .order('data_trabalho', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as TimesheetEntryRecente[]
}

export function useTimesheetRecentes(
  periodoOuLimit: TimesheetPeriodo | number = 'semana',
  limit = 50,
) {
  // Retrocompat: `useTimesheetRecentes(7)` continua válido — vira janela 'semana' com limit 7.
  const periodo: TimesheetPeriodo = typeof periodoOuLimit === 'number' ? 'semana' : periodoOuLimit
  const limitFinal = typeof periodoOuLimit === 'number' ? periodoOuLimit : limit

  const { escritoriosIds } = useEscritoriosDoGrupoUsuario()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const escritoriosKey = [...escritoriosIds].sort().join(',')

  const { data = [], isLoading: loading, error } = useQuery({
    queryKey: ['timesheet-recentes', escritoriosKey, periodo, limitFinal],
    queryFn: () => fetchTimesheetRecentes(supabaseRef.current, escritoriosIds, periodo, limitFinal),
    enabled: escritoriosIds.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['timesheet-recentes'] })
  }

  return { data, loading, error: error as Error | null, refresh }
}

export function useTimesheetPorTarefa(tarefaId: string | null) {
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const { data = [], isLoading: loading, error } = useQuery({
    queryKey: ['timesheet-tarefa', tarefaId],
    queryFn: () => fetchTimesheetPorTarefa(supabaseRef.current, tarefaId!),
    enabled: !!tarefaId,
    staleTime: 2 * 60 * 1000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['timesheet-tarefa', tarefaId] })
  }

  return { data, loading, error: error as Error | null, refresh }
}
