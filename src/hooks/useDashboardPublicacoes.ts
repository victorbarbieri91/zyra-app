'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface PublicacaoDashboard {
  id: string
  processo: string
  tipo: string
  conteudo: string
  prazo?: string
  urgente: boolean
  dataPublicacao: string
}

export function useDashboardPublicacoes() {
  const [publicacoes, setPublicacoes] = useState<PublicacaoDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const loadPublicacoes = useCallback(async () => {
    if (!escritorioAtivo) {
      setPublicacoes([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar publicações urgentes primeiro, depois as pendentes
      const { data, error: queryError } = await supabase
        .from('publicacoes_publicacoes')
        .select(`
          id,
          numero_processo,
          tipo_publicacao,
          texto_completo,
          urgente,
          data_publicacao,
          data_limite,
          prazo_dias,
          status
        `)
        .eq('escritorio_id', escritorioAtivo)
        .in('status', ['pendente', 'em_analise'])
        .order('urgente', { ascending: false })
        .order('data_publicacao', { ascending: false })
        .limit(6)

      if (queryError) throw queryError

      // Transformar para formato do dashboard
      const items: PublicacaoDashboard[] = (data || []).map(pub => {
        // Calcular prazo
        let prazo = ''
        if (pub.data_limite) {
          const dataLimite = new Date(pub.data_limite)
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
        } else if (pub.prazo_dias) {
          prazo = `${pub.prazo_dias} dias`
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
          urgente: pub.urgente || false,
          dataPublicacao: pub.data_publicacao,
        }
      })

      setPublicacoes(items)
    } catch (err) {
      console.error('Erro ao carregar publicações do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    loadPublicacoes()
  }, [loadPublicacoes])

  return {
    publicacoes,
    loading,
    error,
    refresh: loadPublicacoes,
    isEmpty: !loading && publicacoes.length === 0,
    urgentes: publicacoes.filter(p => p.urgente).length,
    total: publicacoes.length,
  }
}
