'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

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

export function useDashboardPerformance() {
  const [data, setData] = useState<PerformanceData>(defaultPerformance)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const loadPerformance = useCallback(async () => {
    if (!escritorioAtivo) {
      setData(defaultPerformance)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obter usuário logado para destacar no ranking
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
        // Timesheet do mês agrupado por usuário (com campo faturavel)
        supabase
          .from('financeiro_timesheet')
          .select('user_id, horas, faturavel')
          .eq('escritorio_id', escritorioAtivo)
          .gte('data_trabalho', inicioMes.toISOString().split('T')[0]),

        // Profiles para nomes (usuários do escritório)
        supabase
          .from('escritorios_usuarios')
          .select('user_id, profiles:user_id(id, nome_completo)')
          .eq('escritorio_id', escritorioAtivo)
          .eq('ativo', true),

        // Processos por área com valores
        supabase
          .from('processos_processos')
          .select('id, area, valor_causa')
          .eq('escritorio_id', escritorioAtivo)
          .in('status', ['ativo', 'em_andamento', 'aguardando']),

        // Receitas pagas no mês para top clientes
        supabase
          .from('financeiro_receitas')
          .select(`
            valor_pago,
            cliente_id,
            cliente:crm_pessoas(id, nome_completo)
          `)
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'pago')
          .gte('data_pagamento', inicioMes.toISOString().split('T')[0]),

        // Receitas pendentes para cálculo de inadimplência
        supabase
          .from('financeiro_receitas')
          .select('valor, status, data_vencimento')
          .eq('escritorio_id', escritorioAtivo)
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

      // Mapear nomes (agora vem de escritorios_usuarios com join em profiles)
      // E incluir TODOS os usuários do escritório, mesmo sem horas
      const profilesMap: Record<string, string> = {}
      const todosUsuariosIds: string[] = []
      profilesResult.data?.forEach((eu: any) => {
        const profile = eu.profiles as { id: string; nome_completo: string } | null
        if (profile?.id) {
          profilesMap[profile.id] = profile.nome_completo || 'Usuário'
          todosUsuariosIds.push(profile.id)
        }
      })

      // Criar lista de equipe com TODOS os membros (incluindo os sem horas)
      const equipe: EquipeMember[] = todosUsuariosIds
        .map((odUserId, index) => {
          const userHoras = horasPorUsuario[odUserId] || { total: 0, cobraveis: 0, naoCobraveis: 0 }
          return {
            id: odUserId,
            nome: profilesMap[odUserId] || 'Membro',
            horas: Math.round(userHoras.total * 10) / 10,
            horasCobraveis: Math.round(userHoras.cobraveis * 10) / 10,
            horasNaoCobraveis: Math.round(userHoras.naoCobraveis * 10) / 10,
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

      setData({
        equipe,
        totalHorasEquipe: Math.round(totalHorasEquipe * 10) / 10,
        currentUserId,
        currentUserPosition,
        areas,
        maxReceita,
        totalAReceber: totalPendente,
        taxaInadimplencia,
        topClientes,
      })
    } catch (err) {
      console.error('Erro ao carregar performance do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    loadPerformance()
  }, [loadPerformance])

  return {
    ...data,
    loading,
    error,
    refresh: loadPerformance,
    isEmpty: !loading && data.equipe.length === 0 && data.areas.length === 0,
  }
}
