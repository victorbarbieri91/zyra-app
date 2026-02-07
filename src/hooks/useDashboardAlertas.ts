'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface AudienciaProxima {
  id: string
  titulo: string
  data_hora: string
  tipo_audiencia?: string
  modalidade?: string
  status?: string
  local?: string
  link_virtual?: string
  processo_id?: string
  responsavel_id?: string
  observacoes?: string
  descricao?: string
  tribunal?: string
  comarca?: string
  vara?: string
  juiz?: string
  promotor?: string
  advogado_contrario?: string
}

export interface DashboardAlertas {
  prazosHoje: number
  prazosVencidos: number
  processosSemContrato: number
  audienciasProximas: number
  audienciasProximasData: AudienciaProxima[]
  parcelasVencidas: number
  valorParcelasVencidas: number
  valorHorasProntasFaturar: number
}

const defaultAlertas: DashboardAlertas = {
  prazosHoje: 0,
  prazosVencidos: 0,
  processosSemContrato: 0,
  audienciasProximas: 0,
  audienciasProximasData: [],
  parcelasVencidas: 0,
  valorParcelasVencidas: 0,
  valorHorasProntasFaturar: 0,
}

export function useDashboardAlertas() {
  const [alertas, setAlertas] = useState<DashboardAlertas>(defaultAlertas)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo, isOwner, roleAtual } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  // Verificar se é sócio (owner ou admin)
  const isSocio = isOwner || roleAtual === 'admin' || roleAtual === 'owner'

  const loadAlertas = useCallback(async () => {
    if (!escritorioAtivo) {
      setAlertas(defaultAlertas)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obter usuário atual para filtrar audiências
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

      const hoje = new Date()
      const hojeStr = hoje.toISOString().split('T')[0]
      const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)

      const [
        prazosHojeResult,
        prazosVencidosResult,
        processosSemContratoResult,
        audienciasResult,
        parcelasVencidasResult,
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

        // 3. Processos ativos SEM contrato de honorários
        supabase
          .from('processos_processos')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .in('status', ['ativo', 'em_andamento', 'aguardando'])
          .is('contrato_id', null),

        // 4. Audiências nos próximos 7 dias - APENAS onde o usuário é responsável
        // Busca dados completos para permitir abrir modal de detalhes direto do dashboard
        userId ? supabase
          .from('agenda_audiencias')
          .select('id, titulo, data_hora, tipo_audiencia, modalidade, status, forum, link_virtual, processo_id, responsavel_id, observacoes, descricao, tribunal, comarca, vara, juiz, promotor, advogado_contrario')
          .eq('escritorio_id', escritorioAtivo)
          .gte('data_hora', hojeStr)
          .lte('data_hora', em7dias.toISOString().split('T')[0])
          .not('status', 'in', '("realizada","cancelada")')
          .or(`responsavel_id.eq.${userId},responsaveis_ids.cs.{${userId}}`)
          .order('data_hora', { ascending: true })
        : Promise.resolve({ data: [] }),

        // 5. Parcelas vencidas (inadimplência) - apenas para sócios
        isSocio ? supabase
          .from('financeiro_receitas')
          .select('valor, valor_pago')
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'atrasado')
        : Promise.resolve({ data: [] }),

        // 6. Horas prontas para faturar com valor correto - apenas para sócios
        // Usa RPC para calcular valor com valor_hora do cargo
        isSocio ? supabase.rpc('calcular_valor_horas_faturar', {
          p_escritorio_id: escritorioAtivo
        }) : Promise.resolve({ data: null }),
      ])

      // Processar parcelas vencidas
      const parcelasVencidas = parcelasVencidasResult.data?.length || 0
      const valorParcelasVencidas = parcelasVencidasResult.data?.reduce(
        (acc: number, item: { valor: number | null; valor_pago: number | null }) =>
          acc + (Number(item.valor) || 0) - (Number(item.valor_pago) || 0),
        0
      ) || 0

      // Valor das horas prontas para faturar
      // Se RPC não existe, calcula manualmente
      let valorHorasProntas = 0
      if (horasProntasResult.data && typeof horasProntasResult.data === 'number') {
        valorHorasProntas = horasProntasResult.data
      } else if (isSocio) {
        // Fallback: buscar manualmente
        const { data: horasData } = await supabase
          .from('financeiro_timesheet')
          .select(`
            horas,
            user:user_id(
              escritorios_usuarios!inner(
                valor_hora,
                cargo:cargo_id(valor_hora_padrao)
              )
            )
          `)
          .eq('escritorio_id', escritorioAtivo)
          .eq('faturavel', true)
          .eq('faturado', false)
          .eq('aprovado', true)

        if (horasData) {
          valorHorasProntas = horasData.reduce((acc: number, item: any) => {
            const horas = Number(item.horas) || 0
            const eu = item.user?.escritorios_usuarios?.[0]
            const valorHora = Number(eu?.valor_hora) || Number(eu?.cargo?.valor_hora_padrao) || 150
            return acc + (horas * valorHora)
          }, 0)
        }
      }

      const audienciasData = (audienciasResult.data || []).map((item: any) => ({
        ...item,
        local: item.forum || item.link_virtual || undefined,
      })) as AudienciaProxima[]

      setAlertas({
        prazosHoje: prazosHojeResult.count || 0,
        prazosVencidos: prazosVencidosResult.count || 0,
        processosSemContrato: processosSemContratoResult.count || 0,
        audienciasProximas: audienciasData.length,
        audienciasProximasData: audienciasData,
        parcelasVencidas,
        valorParcelasVencidas,
        valorHorasProntasFaturar: Math.round(valorHorasProntas * 100) / 100,
      })
    } catch (err) {
      console.error('Erro ao carregar alertas do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, isSocio, supabase])

  useEffect(() => {
    loadAlertas()
  }, [loadAlertas])

  // Calcular total de alertas para badge
  const totalAlertas = alertas.prazosHoje + alertas.prazosVencidos +
    (alertas.processosSemContrato > 0 ? 1 : 0) +
    (alertas.audienciasProximas > 0 ? 1 : 0) +
    (alertas.parcelasVencidas > 0 ? 1 : 0)

  return {
    alertas,
    loading,
    error,
    refresh: loadAlertas,
    totalAlertas,
    temAlertasCriticos: alertas.prazosVencidos > 0 || alertas.parcelasVencidas > 0,
    isSocio,
  }
}
