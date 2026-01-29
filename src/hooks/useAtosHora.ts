'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AtoContrato } from './useContratosHonorarios'

// Configuração de um ato para modo hora
export interface AtoHoraConfig {
  ato_tipo_id: string
  ato_nome: string
  modo_cobranca: 'por_hora' | 'percentual'
  valor_hora?: number
  horas_minimas?: number
  horas_maximas?: number
  percentual_valor_causa?: number
  valor_fixo?: number
}

// Informações de horas acumuladas para um ato
export interface HorasAcumuladasInfo {
  horas_totais: number
  horas_faturaveis: number
  horas_excedentes: number
  horas_disponiveis: number | null
  valor_atual: number
  valor_minimo: number
  valor_maximo: number | null
  percentual_usado: number
  atingiu_maximo: boolean
  status: 'em_andamento' | 'finalizado' | 'faturado' | 'sem_contrato' | 'nao_configurado'
}

// Resultado do cálculo de faturabilidade
export interface FaturabilidadeResult {
  horas_faturaveis: number
  horas_excedentes: number
  horas_acumuladas_antes: number
  horas_acumuladas_depois: number
  atingiu_maximo: boolean
  valor_hora: number | null
  horas_maximas: number | null
}

// Resultado da finalização do ato
export interface FinalizacaoResult {
  receita_id: string | null
  horas_trabalhadas: number
  horas_cobradas: number
  valor_total: number
  aplicou_minimo: boolean
  mensagem: string
}

export interface UseAtosHoraReturn {
  // Buscar atos configurados como modo hora para um contrato
  getAtosConfiguradosHora: (contratoId: string) => Promise<AtoHoraConfig[]>
  // Buscar horas acumuladas para um ato em um processo
  getHorasAcumuladas: (processoId: string, atoTipoId: string) => Promise<HorasAcumuladasInfo>
  // Buscar todas as horas acumuladas de um processo
  getTodasHorasAcumuladasProcesso: (processoId: string) => Promise<Record<string, HorasAcumuladasInfo>>
  // Calcular faturabilidade antes de lançar horas
  calcularFaturabilidade: (processoId: string, atoTipoId: string, horasNovas: number) => Promise<FaturabilidadeResult>
  // Finalizar um ato (aplica mínimo e cria receita)
  finalizarAto: (processoId: string, atoTipoId: string) => Promise<FinalizacaoResult>
  // Verificar se processo tem contrato com atos modo hora
  verificarProcessoTemAtosHora: (processoId: string) => Promise<{ temAtosHora: boolean; atosHora: AtoHoraConfig[] }>
}

export function useAtosHora(): UseAtosHoraReturn {
  const supabase = createClient()

  // Buscar atos configurados como modo hora para um contrato
  const getAtosConfiguradosHora = useCallback(async (contratoId: string): Promise<AtoHoraConfig[]> => {
    const { data: contrato, error } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('config, forma_cobranca')
      .eq('id', contratoId)
      .eq('ativo', true)
      .single()

    if (error || !contrato) {
      console.error('Erro ao buscar contrato:', error)
      return []
    }

    // Verificar se é contrato por_ato
    if (contrato.forma_cobranca !== 'por_ato') {
      return []
    }

    const config = contrato.config as Record<string, unknown> | null
    if (!config || !config.atos_configurados) {
      return []
    }

    const atosConfigurados = config.atos_configurados as AtoContrato[]

    // Filtrar apenas atos modo hora
    return atosConfigurados
      .filter(ato => ato.ativo !== false && ato.modo_cobranca === 'por_hora')
      .map(ato => ({
        ato_tipo_id: ato.ato_tipo_id,
        ato_nome: ato.ato_nome || 'Ato',
        modo_cobranca: 'por_hora' as const,
        valor_hora: ato.valor_hora,
        horas_minimas: ato.horas_minimas,
        horas_maximas: ato.horas_maximas,
      }))
  }, [supabase])

  // Buscar horas acumuladas para um ato em um processo
  const getHorasAcumuladas = useCallback(async (
    processoId: string,
    atoTipoId: string
  ): Promise<HorasAcumuladasInfo> => {
    const { data, error } = await supabase.rpc('get_horas_acumuladas_ato', {
      p_processo_id: processoId,
      p_ato_tipo_id: atoTipoId,
    })

    if (error) {
      console.error('Erro ao buscar horas acumuladas:', error)
      return {
        horas_totais: 0,
        horas_faturaveis: 0,
        horas_excedentes: 0,
        horas_disponiveis: null,
        valor_atual: 0,
        valor_minimo: 0,
        valor_maximo: null,
        percentual_usado: 0,
        atingiu_maximo: false,
        status: 'nao_configurado',
      }
    }

    const result = data?.[0] || data
    return {
      horas_totais: Number(result?.horas_totais) || 0,
      horas_faturaveis: Number(result?.horas_faturaveis) || 0,
      horas_excedentes: Number(result?.horas_excedentes) || 0,
      horas_disponiveis: result?.horas_disponiveis != null ? Number(result.horas_disponiveis) : null,
      valor_atual: Number(result?.valor_atual) || 0,
      valor_minimo: Number(result?.valor_minimo) || 0,
      valor_maximo: result?.valor_maximo != null ? Number(result.valor_maximo) : null,
      percentual_usado: Number(result?.percentual_usado) || 0,
      atingiu_maximo: result?.atingiu_maximo || false,
      status: (result?.status || 'em_andamento') as HorasAcumuladasInfo['status'],
    }
  }, [supabase])

  // Buscar todas as horas acumuladas de um processo
  const getTodasHorasAcumuladasProcesso = useCallback(async (
    processoId: string
  ): Promise<Record<string, HorasAcumuladasInfo>> => {
    // Primeiro, buscar o contrato do processo
    const { data: processo, error: processoError } = await supabase
      .from('processos_processos')
      .select('contrato_id')
      .eq('id', processoId)
      .single()

    if (processoError || !processo?.contrato_id) {
      return {}
    }

    // Buscar atos configurados como modo hora
    const atosHora = await getAtosConfiguradosHora(processo.contrato_id)

    if (atosHora.length === 0) {
      return {}
    }

    // Buscar horas acumuladas para cada ato
    const result: Record<string, HorasAcumuladasInfo> = {}

    await Promise.all(
      atosHora.map(async (ato) => {
        const horasAcumuladas = await getHorasAcumuladas(processoId, ato.ato_tipo_id)
        result[ato.ato_tipo_id] = horasAcumuladas
      })
    )

    return result
  }, [supabase, getAtosConfiguradosHora, getHorasAcumuladas])

  // Calcular faturabilidade antes de lançar horas
  const calcularFaturabilidade = useCallback(async (
    processoId: string,
    atoTipoId: string,
    horasNovas: number
  ): Promise<FaturabilidadeResult> => {
    const { data, error } = await supabase.rpc('calcular_faturabilidade_ato_hora', {
      p_processo_id: processoId,
      p_ato_tipo_id: atoTipoId,
      p_horas_novas: horasNovas,
    })

    if (error) {
      console.error('Erro ao calcular faturabilidade:', error)
      return {
        horas_faturaveis: horasNovas,
        horas_excedentes: 0,
        horas_acumuladas_antes: 0,
        horas_acumuladas_depois: horasNovas,
        atingiu_maximo: false,
        valor_hora: null,
        horas_maximas: null,
      }
    }

    const result = data?.[0] || data
    return {
      horas_faturaveis: Number(result?.horas_faturaveis) || 0,
      horas_excedentes: Number(result?.horas_excedentes) || 0,
      horas_acumuladas_antes: Number(result?.horas_acumuladas_antes) || 0,
      horas_acumuladas_depois: Number(result?.horas_acumuladas_depois) || 0,
      atingiu_maximo: result?.atingiu_maximo || false,
      valor_hora: result?.valor_hora != null ? Number(result.valor_hora) : null,
      horas_maximas: result?.horas_maximas != null ? Number(result.horas_maximas) : null,
    }
  }, [supabase])

  // Finalizar um ato (aplica mínimo e cria receita)
  const finalizarAto = useCallback(async (
    processoId: string,
    atoTipoId: string
  ): Promise<FinalizacaoResult> => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('finalizar_ato_hora', {
      p_processo_id: processoId,
      p_ato_tipo_id: atoTipoId,
      p_user_id: user?.id || null,
    })

    if (error) {
      console.error('Erro ao finalizar ato:', error)
      return {
        receita_id: null,
        horas_trabalhadas: 0,
        horas_cobradas: 0,
        valor_total: 0,
        aplicou_minimo: false,
        mensagem: error.message || 'Erro ao finalizar ato',
      }
    }

    const result = data?.[0] || data
    return {
      receita_id: result?.receita_id || null,
      horas_trabalhadas: Number(result?.horas_trabalhadas) || 0,
      horas_cobradas: Number(result?.horas_cobradas) || 0,
      valor_total: Number(result?.valor_total) || 0,
      aplicou_minimo: result?.aplicou_minimo || false,
      mensagem: result?.mensagem || 'Ato finalizado',
    }
  }, [supabase])

  // Verificar se processo tem contrato com atos modo hora
  const verificarProcessoTemAtosHora = useCallback(async (
    processoId: string
  ): Promise<{ temAtosHora: boolean; atosHora: AtoHoraConfig[] }> => {
    // Buscar contrato do processo
    const { data: processo, error: processoError } = await supabase
      .from('processos_processos')
      .select('contrato_id')
      .eq('id', processoId)
      .single()

    if (processoError || !processo?.contrato_id) {
      return { temAtosHora: false, atosHora: [] }
    }

    // Buscar atos configurados como modo hora
    const atosHora = await getAtosConfiguradosHora(processo.contrato_id)

    return {
      temAtosHora: atosHora.length > 0,
      atosHora,
    }
  }, [supabase, getAtosConfiguradosHora])

  return {
    getAtosConfiguradosHora,
    getHorasAcumuladas,
    getTodasHorasAcumuladasProcesso,
    calcularFaturabilidade,
    finalizarAto,
    verificarProcessoTemAtosHora,
  }
}
