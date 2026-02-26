'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

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

async function fetchTimesheetRecentes(
  supabase: ReturnType<typeof createClient>,
  escritorioId: string,
  limit: number
): Promise<TimesheetEntryRecente[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('v_timesheet_aprovacao')
    .select('id, data_trabalho, horas, atividade, faturavel, faturado, status, processo_id, processo_titulo, consulta_id, consulta_titulo, tarefa_id, cliente_nome, editado, hora_inicio, hora_fim')
    .eq('escritorio_id', escritorioId)
    .eq('user_id', user.id)
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

export function useTimesheetRecentes(limit = 7) {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const { data = [], isLoading: loading, error } = useQuery({
    queryKey: ['timesheet-recentes', escritorioAtivo],
    queryFn: () => fetchTimesheetRecentes(supabaseRef.current, escritorioAtivo!, limit),
    enabled: !!escritorioAtivo,
    staleTime: 2 * 60 * 1000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['timesheet-recentes', escritorioAtivo] })
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
