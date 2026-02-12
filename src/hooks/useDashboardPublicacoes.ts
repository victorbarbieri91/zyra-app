'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface PublicacaoDashboard {
  id: string
  processo: string
  tipo: string
  conteudo: string
  prazo?: string
  dataPublicacao: string
}

async function fetchDashboardPublicacoes(
  supabase: ReturnType<typeof createClient>,
  escritorioAtivo: string
): Promise<PublicacaoDashboard[]> {
  // Buscar publicações urgentes primeiro, depois as pendentes
  // Junta com publicacoes_analises para obter data_limite e prazo_dias
  const { data, error: queryError } = await supabase
    .from('publicacoes_publicacoes')
    .select(`
      id,
      numero_processo,
      tipo_publicacao,
      texto_completo,
      data_publicacao,
      status,
      publicacoes_analises (
        data_limite,
        prazo_dias
      )
    `)
    .eq('escritorio_id', escritorioAtivo)
    .in('status', ['pendente', 'em_analise'])
    .order('data_publicacao', { ascending: false })
    .limit(6)

  if (queryError) throw queryError

  // Transformar para formato do dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PublicacaoDashboard[] = (data || []).map((pub: any) => {
    // Extrair dados da análise (pode ter múltiplas, pegamos a primeira)
    const analise = pub.publicacoes_analises?.[0]

    // Calcular prazo
    let prazo = ''
    if (analise?.data_limite) {
      const dataLimite = new Date(analise.data_limite)
      const hoje = new Date()
      const diffDias = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDias < 0) {
        prazo = 'Vencido'
      } else if (diffDias === 0) {
        prazo = 'Hoje'
      } else if (diffDias === 1) {
        prazo = '1 dia'
      } else {
        prazo = `${diffDias} dias`
      }
    } else if (analise?.prazo_dias) {
      prazo = `${analise.prazo_dias} dias`
    }

    // Extrair tipo de publicação
    let tipo = pub.tipo_publicacao || 'Publicação'
    tipo = tipo.charAt(0).toUpperCase() + tipo.slice(1)

    // Extrair conteúdo resumido
    let conteudo = ''
    if (pub.texto_completo) {
      // Pegar primeiras palavras relevantes
      const texto = pub.texto_completo
        .replace(/<[^>]*>/g, '') // Remover HTML
        .replace(/\s+/g, ' ') // Normalizar espaços
        .trim()
      conteudo = texto.length > 60 ? texto.substring(0, 60) + '...' : texto
    }

    return {
      id: pub.id,
      processo: pub.numero_processo || 'Sem número',
      tipo,
      conteudo: conteudo || 'Verificar detalhes da publicação',
      prazo: prazo || undefined,
      dataPublicacao: pub.data_publicacao,
    }
  })

  return items
}

export function useDashboardPublicacoes() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const { data: publicacoes = [], isLoading: loading, error } = useQuery({
    queryKey: ['dashboard', 'publicacoes', escritorioAtivo],
    queryFn: () => fetchDashboardPublicacoes(supabaseRef.current, escritorioAtivo!),
    enabled: !!escritorioAtivo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'publicacoes', escritorioAtivo] })
  }

  return {
    publicacoes,
    loading,
    error: error as Error | null,
    refresh,
    isEmpty: !loading && publicacoes.length === 0,
    total: publicacoes.length,
  }
}
