'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface ResumoIA {
  saudacao: string
  mensagem: string
  gerado_em: string
  gerado_por_ia: boolean
  dados: {
    audiencias: number
    tarefas: number
    eventos: number
    prazos_urgentes: number
    publicacoes_pendentes: number
    publicacoes_urgentes: number
    horas_nao_faturadas: number
    valor_nao_faturado: number
    ocupacao_agenda: number
  }
}

const defaultResumo: ResumoIA = {
  saudacao: 'Bom dia!',
  mensagem: 'Carregando seu resumo do dia...',
  gerado_em: new Date().toISOString(),
  gerado_por_ia: false,
  dados: {
    audiencias: 0,
    tarefas: 0,
    eventos: 0,
    prazos_urgentes: 0,
    publicacoes_pendentes: 0,
    publicacoes_urgentes: 0,
    horas_nao_faturadas: 0,
    valor_nao_faturado: 0,
    ocupacao_agenda: 0,
  },
}

async function fetchDashboardResumoIA(
  supabase: ReturnType<typeof createClient>,
  escritorioAtivo: string,
  forceRefresh: boolean
): Promise<{ resumo: ResumoIA; geradoEm: string }> {
  // Buscar usuário atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  // Buscar nome do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_completo')
    .eq('id', user.id)
    .single()

  // Chamar Edge Function
  const { data, error: fnError } = await supabase.functions.invoke('dashboard-resumo-ia', {
    body: {
      user_id: user.id,
      escritorio_id: escritorioAtivo,
      user_name: profile?.nome_completo || 'Advogado',
      force_refresh: forceRefresh,
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
        dados: data.dados,
      },
      geradoEm: data.gerado_em,
    }
  } else {
    throw new Error(data?.erro || 'Erro ao gerar resumo')
  }
}

export function useDashboardResumoIA() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['dashboard', 'resumoIA', escritorioAtivo],
    queryFn: () => fetchDashboardResumoIA(supabaseRef.current, escritorioAtivo!, false),
    enabled: !!escritorioAtivo,
    staleTime: 30 * 60 * 1000, // 30 minutes - AI generated, expensive
    meta: {
      // On error, return fallback resumo
      errorHandler: 'silent',
    },
  })

  const resumo = data?.resumo ?? {
    ...defaultResumo,
    saudacao: error ? getSaudacao() : defaultResumo.saudacao,
    mensagem: error ? 'Não foi possível gerar o resumo do dia. Verifique sua conexão.' : defaultResumo.mensagem,
  }

  const lastUpdated = data?.geradoEm ? new Date(data.geradoEm) : null

  const refresh = () => {
    // Force refresh by invalidating and refetching with forceRefresh=true
    queryClient.setQueryDefaults(['dashboard', 'resumoIA', escritorioAtivo], {
      queryFn: () => fetchDashboardResumoIA(supabaseRef.current, escritorioAtivo!, true),
    })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'resumoIA', escritorioAtivo] })
  }

  // Calcular tempo desde última atualização
  const tempoDesdeAtualizacao = lastUpdated
    ? formatTempoRelativo(lastUpdated)
    : 'Carregando...'

  return {
    resumo,
    loading,
    error: error as Error | null,
    refresh,
    lastUpdated,
    tempoDesdeAtualizacao,
  }
}

// Helpers
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
