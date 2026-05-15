'use client'

import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface MetaResumoInput {
  horas_atual?: number
  horas_meta?: number
  honorarios_atual?: number
  honorarios_meta?: number
  dias_uteis_restantes?: number
}

export interface ResumoIADados {
  total_hoje?: number
  total_atrasados?: number
  audiencias_hoje?: number
  prazos_hoje?: number
  cobraveis_pendentes?: number
  meta_status?: 'sem_meta' | 'ok' | 'atrasada' | 'avancada'
}

export interface ResumoIA {
  saudacao: string
  mensagem: string
  gerado_em: string
  gerado_por_ia: boolean
  dados: ResumoIADados
}

const defaultResumo: ResumoIA = {
  saudacao: 'Bom dia!',
  mensagem: 'Carregando seu resumo do dia...',
  gerado_em: new Date().toISOString(),
  gerado_por_ia: false,
  dados: {},
}

async function fetchDashboardResumoIA(
  supabase: ReturnType<typeof createClient>,
  escritorioAtivo: string,
  forceRefresh: boolean,
  meta: MetaResumoInput | undefined,
): Promise<{ resumo: ResumoIA; geradoEm: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_completo')
    .eq('id', user.id)
    .single()

  const { data, error: fnError } = await supabase.functions.invoke('dashboard-resumo-ia', {
    body: {
      user_id: user.id,
      escritorio_id: escritorioAtivo,
      user_name: profile?.nome_completo || 'advogado',
      force_refresh: forceRefresh,
      meta,
    },
  })

  if (fnError) {
    throw fnError
  }

  if (data?.sucesso) {
    return {
      resumo: {
        saudacao: data.saudacao,
        mensagem: data.mensagem,
        gerado_em: data.gerado_em,
        gerado_por_ia: data.gerado_por_ia,
        dados: data.dados ?? {},
      },
      geradoEm: data.gerado_em,
    }
  }
  throw new Error(data?.erro || 'Erro ao gerar resumo')
}

/**
 * Resumo IA do dashboard.
 *
 * `meta` é passado pra Edge no body (não entra na queryKey) — isso evita refetch
 * a cada mudança de horas/honorários, já que a Edge tem cache próprio por
 * (user_id, data_referencia, periodo). Ao clicar refresh, a meta atual viaja junto.
 *
 * `refresh()` força regeneração via `force_refresh=true` lendo um ref que é setado
 * antes do `refetch()` e resetado depois — assim a queryFn capta o sinal sem
 * depender de `setQueryDefaults` (que não substitui o queryFn em execução).
 */
export function useDashboardResumoIA(meta?: MetaResumoInput) {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())

  const metaRef = useRef<MetaResumoInput | undefined>(meta)
  metaRef.current = meta

  const forceRef = useRef(false)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dashboard', 'resumoIA', escritorioAtivo],
    queryFn: () =>
      fetchDashboardResumoIA(
        supabaseRef.current,
        escritorioAtivo!,
        forceRef.current,
        metaRef.current,
      ),
    enabled: !!escritorioAtivo,
    staleTime: 30 * 60 * 1000,
    meta: {
      errorHandler: 'silent',
    },
  })

  const resumo = data?.resumo ?? {
    ...defaultResumo,
    saudacao: error ? getSaudacao() : defaultResumo.saudacao,
    mensagem: error
      ? 'Não foi possível gerar o resumo do dia. Verifique sua conexão.'
      : defaultResumo.mensagem,
  }

  const lastUpdated = data?.geradoEm ? new Date(data.geradoEm) : null

  const refresh = async () => {
    forceRef.current = true
    try {
      await refetch()
    } finally {
      forceRef.current = false
    }
  }

  const tempoDesdeAtualizacao = lastUpdated
    ? formatTempoRelativo(lastUpdated)
    : 'Carregando...'

  return {
    resumo,
    // `loading` reflete qualquer busca ativa (primeira carga OU refresh) — assim o
    // ícone do botão refresh gira durante o force_refresh.
    loading: isFetching,
    isInitialLoading: isLoading,
    error: error as Error | null,
    refresh,
    lastUpdated,
    tempoDesdeAtualizacao,
  }
}

function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'Bom dia!'
  if (hora >= 12 && hora < 18) return 'Boa tarde!'
  return 'Boa noite!'
}

function formatTempoRelativo(data: Date): string {
  const agora = new Date()
  const diffMs = agora.getTime() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Agora mesmo'
  if (diffMin === 1) return 'Há 1 minuto'
  if (diffMin < 60) return `Há ${diffMin} minutos`

  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras === 1) return 'Há 1 hora'
  if (diffHoras < 24) return `Há ${diffHoras} horas`

  return 'Há mais de um dia'
}
