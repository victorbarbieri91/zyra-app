'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface DashboardAlertas {
  prazosHoje: number
  prazosVencidos: number
  atosCobraveisCount: number
  atosCobraveisValor: number
  horasPendentesAprovacao: number
  horasProntasFaturar: number
  valorHorasProntasFaturar: number
}

const defaultAlertas: DashboardAlertas = {
  prazosHoje: 0,
  prazosVencidos: 0,
  atosCobraveisCount: 0,
  atosCobraveisValor: 0,
  horasPendentesAprovacao: 0,
  horasProntasFaturar: 0,
  valorHorasProntasFaturar: 0,
}

export function useDashboardAlertas() {
  const [alertas, setAlertas] = useState<DashboardAlertas>(defaultAlertas)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const loadAlertas = useCallback(async () => {
    if (!escritorioAtivo) {
      setAlertas(defaultAlertas)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const hoje = new Date()
      const hojeStr = hoje.toISOString().split('T')[0]

      const [
        prazosHojeResult,
        prazosVencidosResult,
        atosCobraveisResult,
        horasPendentesResult,
        horasProntasResult,
      ] = await Promise.all([
        // 1. Prazos vencendo HOJE
        supabase
          .from('agenda_tarefas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .eq('tipo', 'prazo')
          .eq('prazo_data_limite', hojeStr)
          .neq('status', 'concluida'),

        // 2. Prazos VENCIDOS (anteriores a hoje)
        supabase
          .from('agenda_tarefas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .eq('tipo', 'prazo')
          .lt('prazo_data_limite', hojeStr)
          .neq('status', 'concluida'),

        // 3. Atos cobráveis pendentes
        supabase
          .from('financeiro_alertas_cobranca')
          .select('id, valor_sugerido')
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'pendente'),

        // 4. Horas pendentes de aprovação
        supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .is('aprovado', null)
          .is('reprovado', null),

        // 5. Horas prontas para faturar (aprovadas mas não faturadas)
        // Busca também o valor_hora do usuário via escritorios_usuarios
        supabase
          .from('financeiro_timesheet')
          .select(`
            horas,
            user_id,
            usuario:escritorios_usuarios!inner(valor_hora)
          `)
          .eq('escritorio_id', escritorioAtivo)
          .eq('faturavel', true)
          .eq('faturado', false)
          .eq('aprovado', true)
          .eq('usuario.escritorio_id', escritorioAtivo),
      ])

      // Processar atos cobráveis
      const atosCount = atosCobraveisResult.data?.length || 0
      const atosValor = atosCobraveisResult.data?.reduce(
        (acc: number, item: { valor_sugerido: number | null }) => acc + (Number(item.valor_sugerido) || 0),
        0
      ) || 0

      // Processar horas pendentes de aprovação
      const horasPendentes = horasPendentesResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      // Processar horas prontas para faturar
      let horasProntas = 0
      let valorProntas = 0

      horasProntasResult.data?.forEach((ts: any) => {
        const horas = Number(ts.horas) || 0
        horasProntas += horas

        // Pegar valor_hora do usuário em escritorios_usuarios
        const valorHora = ts.usuario?.valor_hora || 150 // fallback R$150/h
        valorProntas += horas * Number(valorHora)
      })

      setAlertas({
        prazosHoje: prazosHojeResult.count || 0,
        prazosVencidos: prazosVencidosResult.count || 0,
        atosCobraveisCount: atosCount,
        atosCobraveisValor: atosValor,
        horasPendentesAprovacao: Math.round(horasPendentes * 10) / 10,
        horasProntasFaturar: Math.round(horasProntas * 10) / 10,
        valorHorasProntasFaturar: valorProntas,
      })
    } catch (err) {
      console.error('Erro ao carregar alertas do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    loadAlertas()
  }, [loadAlertas])

  // Calcular total de alertas para badge
  const totalAlertas = alertas.prazosHoje + alertas.prazosVencidos +
    alertas.atosCobraveisCount + (alertas.horasPendentesAprovacao > 0 ? 1 : 0)

  return {
    alertas,
    loading,
    error,
    refresh: loadAlertas,
    totalAlertas,
    temAlertasCriticos: alertas.prazosVencidos > 0 || alertas.prazosHoje > 0,
  }
}
