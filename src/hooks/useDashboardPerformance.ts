'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritoriosDoGrupoUsuario } from './useEscritoriosDoGrupoUsuario'

export interface EquipeMember {
  id: string
  nome: string
  horas: number
  horasCobraveis: number
  horasNaoCobraveis: number
  cor: string
}

export interface AreaPerformance {
  area: string
  qtd: number
  receita: number
  cor: string
}

export interface TopCliente {
  id: string
  nome: string
  valor: number
}

export interface PerformanceData {
  // Equipe
  equipe: EquipeMember[]
  totalHorasEquipe: number
  currentUserId: string | null
  currentUserPosition: number

  // Por Área
  areas: AreaPerformance[]
  maxReceita: number

  // Financeiro
  totalAReceber: number
  taxaInadimplencia: number
  topClientes: TopCliente[]
}

const cores = [
  'bg-[#34495e]',
  'bg-[#46627f]',
  'bg-[#89bcbe]',
  'bg-[#aacfd0]',
  'bg-[#1E3A8A]',
  'bg-teal-500',
]

const defaultPerformance: PerformanceData = {
  equipe: [],
  totalHorasEquipe: 0,
  currentUserId: null,
  currentUserPosition: -1,
  areas: [],
  maxReceita: 0,
  totalAReceber: 0,
  taxaInadimplencia: 0,
  topClientes: [],
}

async function fetchDashboardPerformance(
  supabase: ReturnType<typeof createClient>,
  escritoriosIds: string[],
): Promise<PerformanceData> {
  if (escritoriosIds.length === 0) return defaultPerformance

  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id || null

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    timesheetResult,
    profilesResult,
    processosResult,
    parcelasResult,
    parcelasPendentesResult,
  ] = await Promise.all([
    // Timesheet do mês — consolidado de todos escritórios do grupo.
    supabase
      .from('v_timesheet_profissional' as any)
      .select('user_id, horas, faturavel')
      .in('escritorio_id', escritoriosIds)
      .gte('data_trabalho', inicioMes.toISOString().split('T')[0]),

    // Membros do grupo, deduplicados depois por user_id no agregador.
    supabase
      .from('escritorios_usuarios')
      .select('user_id, profiles:user_id(id, nome_completo)')
      .in('escritorio_id', escritoriosIds)
      .eq('ativo', true)
      .eq('incluir_em_ranking', true),

    // Processos por área com valores
    supabase
      .from('processos_processos')
      .select('id, area, valor_causa')
      .in('escritorio_id', escritoriosIds)
      .in('status', ['ativo', 'em_andamento', 'aguardando']),

    // Receitas pagas no mês para top clientes
    supabase
      .from('financeiro_receitas')
      .select(`
        valor_pago,
        cliente_id,
        cliente:crm_pessoas(id, nome_completo)
      `)
      .in('escritorio_id', escritoriosIds)
      .eq('status', 'pago')
      .gte('data_pagamento', inicioMes.toISOString().split('T')[0]),

    // Receitas pendentes para cálculo de inadimplência
    supabase
      .from('financeiro_receitas')
      .select('valor, status, data_vencimento')
      .in('escritorio_id', escritoriosIds)
      .in('status', ['pendente', 'atrasado', 'pago', 'parcial']),
  ])

  // Processar horas por membro da equipe (separando cobráveis e não cobráveis)
  const horasPorUsuario: Record<string, { total: number; cobraveis: number; naoCobraveis: number }> = {}
  timesheetResult.data?.forEach((ts: { user_id: string | null; horas: number | null; faturavel: boolean | null }) => {
    if (ts.user_id) {
      if (!horasPorUsuario[ts.user_id]) {
        horasPorUsuario[ts.user_id] = { total: 0, cobraveis: 0, naoCobraveis: 0 }
      }
      const horas = Number(ts.horas || 0)
      horasPorUsuario[ts.user_id].total += horas
      if (ts.faturavel !== false) {
        horasPorUsuario[ts.user_id].cobraveis += horas
      } else {
        horasPorUsuario[ts.user_id].naoCobraveis += horas
      }
    }
  })

  // Mapear nomes — usuário pode aparecer em N escritórios do grupo. Dedupe por user_id.
  const profilesMap: Record<string, string> = {}
  profilesResult.data?.forEach((eu: any) => {
    const profile = eu.profiles as { id: string; nome_completo: string } | null
    if (profile?.id && !profilesMap[profile.id]) {
      profilesMap[profile.id] = profile.nome_completo || 'Usuário'
    }
  })
  const todosUsuariosIds: string[] = Object.keys(profilesMap)

  // Criar lista de equipe com TODOS os membros (incluindo os sem horas)
  const equipe: EquipeMember[] = todosUsuariosIds
    .map((odUserId, index) => {
      const userHoras = horasPorUsuario[odUserId] || { total: 0, cobraveis: 0, naoCobraveis: 0 }
      return {
        id: odUserId,
        nome: profilesMap[odUserId] || 'Membro',
        horas: userHoras.total,
        horasCobraveis: userHoras.cobraveis,
        horasNaoCobraveis: userHoras.naoCobraveis,
        cor: cores[index % cores.length],
      }
    })
    .sort((a, b) => b.horas - a.horas)

  const totalHorasEquipe = equipe.reduce((acc, m) => acc + m.horas, 0)

  // Encontrar posição do usuário atual no ranking
  const currentUserPosition = currentUserId
    ? equipe.findIndex(m => m.id === currentUserId) + 1
    : -1

  // Processar áreas
  const areaMap: Record<string, { qtd: number; receita: number }> = {}
  processosResult.data?.forEach((p: { area: string | null; valor_causa: number | null }) => {
    const area = p.area || 'Geral'
    if (!areaMap[area]) {
      areaMap[area] = { qtd: 0, receita: 0 }
    }
    areaMap[area].qtd++
    areaMap[area].receita += Number(p.valor_causa || 0)
  })

  const areas: AreaPerformance[] = Object.entries(areaMap)
    .map(([area, dados], index) => ({
      area,
      qtd: dados.qtd,
      receita: dados.receita,
      cor: cores[index % cores.length],
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5)

  const maxReceita = Math.max(...areas.map(a => a.receita), 1)

  // Processar top clientes
  const clienteValores: Record<string, { nome: string; valor: number }> = {}
  parcelasResult.data?.forEach((receita: { valor_pago: number | null; cliente: unknown }) => {
    const cliente = receita.cliente as { id: string; nome_completo: string } | null
    if (cliente?.id) {
      if (!clienteValores[cliente.id]) {
        clienteValores[cliente.id] = { nome: cliente.nome_completo || 'Cliente', valor: 0 }
      }
      clienteValores[cliente.id].valor += Number(receita.valor_pago || 0)
    }
  })

  const topClientes: TopCliente[] = Object.entries(clienteValores)
    .map(([id, dados]) => ({
      id,
      nome: dados.nome,
      valor: dados.valor,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)

  // Calcular inadimplência
  let totalVencido = 0
  let totalPendente = 0

  parcelasPendentesResult.data?.forEach((p: { status: string; data_vencimento: string; valor: number | null }) => {
    if (p.status === 'atrasado' || (p.status === 'pendente' && new Date(p.data_vencimento) < new Date())) {
      totalVencido += Number(p.valor || 0)
    }
    if (p.status !== 'pago') {
      totalPendente += Number(p.valor || 0)
    }
  })

  const taxaInadimplencia = totalPendente > 0
    ? Math.round((totalVencido / totalPendente) * 1000) / 10
    : 0

  return {
    equipe,
    totalHorasEquipe: Math.round(totalHorasEquipe * 10) / 10,
    currentUserId,
    currentUserPosition,
    areas,
    maxReceita,
    totalAReceber: totalPendente,
    taxaInadimplencia,
    topClientes,
  }
}

export function useDashboardPerformance() {
  const { escritoriosIds } = useEscritoriosDoGrupoUsuario()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const escritoriosKey = [...escritoriosIds].sort().join(',')

  const { data = defaultPerformance, isLoading: loading, error } = useQuery({
    queryKey: ['dashboard', 'performance', escritoriosKey],
    queryFn: () => fetchDashboardPerformance(supabaseRef.current, escritoriosIds),
    enabled: escritoriosIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'performance'] })
  }

  return {
    ...data,
    loading,
    error: error as Error | null,
    refresh,
    isEmpty: !loading && data.equipe.length === 0 && data.areas.length === 0,
  }
}
