'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface EquipeMember {
  id: string
  nome: string
  horas: number
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

      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

      const [
        timesheetResult,
        profilesResult,
        processosResult,
        parcelasResult,
        parcelasPendentesResult,
      ] = await Promise.all([
        // Timesheet do mês agrupado por usuário
        supabase
          .from('financeiro_timesheet')
          .select('user_id, horas')
          .eq('escritorio_id', escritorioAtivo)
          .gte('data_trabalho', inicioMes.toISOString().split('T')[0]),

        // Profiles para nomes
        supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('escritorio_ativo_id', escritorioAtivo),

        // Processos por área com valores
        supabase
          .from('processos_processos')
          .select('id, area, valor_causa')
          .eq('escritorio_id', escritorioAtivo)
          .in('status', ['ativo', 'em_andamento', 'aguardando']),

        // Parcelas pagas no mês para top clientes
        supabase
          .from('financeiro_honorarios_parcelas')
          .select(`
            valor_pago,
            honorario:financeiro_honorarios(
              cliente_id,
              cliente:crm_pessoas(id, nome_completo)
            )
          `)
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'pago')
          .gte('data_pagamento', inicioMes.toISOString().split('T')[0]),

        // Parcelas pendentes para cálculo de inadimplência
        supabase
          .from('financeiro_honorarios_parcelas')
          .select('valor, status, data_vencimento')
          .eq('escritorio_id', escritorioAtivo)
          .in('status', ['pendente', 'vencido', 'pago']),
      ])

      // Processar horas por membro da equipe
      const horasPorUsuario: Record<string, number> = {}
      timesheetResult.data?.forEach(ts => {
        if (ts.user_id) {
          horasPorUsuario[ts.user_id] = (horasPorUsuario[ts.user_id] || 0) + Number(ts.horas || 0)
        }
      })

      // Mapear nomes
      const profilesMap: Record<string, string> = {}
      profilesResult.data?.forEach(p => {
        profilesMap[p.id] = p.nome_completo || 'Usuário'
      })

      // Criar lista de equipe ordenada por horas
      const equipe: EquipeMember[] = Object.entries(horasPorUsuario)
        .map(([userId, horas], index) => ({
          id: userId,
          nome: profilesMap[userId] || 'Membro',
          horas: Math.round(horas * 10) / 10,
          cor: cores[index % cores.length],
        }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 6)

      const totalHorasEquipe = equipe.reduce((acc, m) => acc + m.horas, 0)

      // Processar áreas
      const areaMap: Record<string, { qtd: number; receita: number }> = {}
      processosResult.data?.forEach(p => {
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
      parcelasResult.data?.forEach(parcela => {
        const honorario = parcela.honorario as any
        const cliente = honorario?.cliente
        if (cliente?.id) {
          if (!clienteValores[cliente.id]) {
            clienteValores[cliente.id] = { nome: cliente.nome_completo || 'Cliente', valor: 0 }
          }
          clienteValores[cliente.id].valor += Number(parcela.valor_pago || 0)
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
      const hoje30dias = new Date()
      hoje30dias.setDate(hoje30dias.getDate() - 30)

      parcelasPendentesResult.data?.forEach(p => {
        if (p.status === 'vencido' || (p.status === 'pendente' && new Date(p.data_vencimento) < new Date())) {
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
