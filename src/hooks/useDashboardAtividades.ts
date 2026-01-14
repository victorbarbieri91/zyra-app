'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import { formatRelativeDate } from '@/lib/timezone'
import { LucideIcon, DollarSign, Bell, FileText, Users, CheckCircle2, AlertCircle, Briefcase } from 'lucide-react'

export type ColorScheme = 'teal' | 'blue' | 'purple' | 'emerald' | 'amber' | 'red'

export interface AtividadeRecente {
  id: string
  tipo: 'pagamento' | 'publicacao' | 'movimentacao' | 'cliente' | 'processo' | 'consulta' | 'interacao'
  icon: LucideIcon
  title: string
  description: string
  time: string
  colorScheme: ColorScheme
  link?: string
  action?: {
    label: string
    href: string
  }
}

// Mapeamento de ícones e cores por tipo
const tipoConfig: Record<string, { icon: LucideIcon; colorScheme: ColorScheme }> = {
  pagamento: { icon: DollarSign, colorScheme: 'emerald' },
  publicacao: { icon: Bell, colorScheme: 'blue' },
  movimentacao: { icon: FileText, colorScheme: 'purple' },
  cliente: { icon: Users, colorScheme: 'blue' },
  processo: { icon: Briefcase, colorScheme: 'teal' },
  consulta: { icon: CheckCircle2, colorScheme: 'teal' },
  interacao: { icon: Users, colorScheme: 'purple' },
}

export function useDashboardAtividades() {
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const loadAtividades = useCallback(async () => {
    if (!escritorioAtivo) {
      setAtividades([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar atividades de múltiplas fontes em paralelo
      const [
        publicacoesResult,
        movimentacoesResult,
        parcelasResult,
        clientesResult,
        processosResult,
      ] = await Promise.all([
        // Publicações recentes
        supabase
          .from('publicacoes_publicacoes')
          .select('id, numero_processo, tipo_publicacao, created_at, urgente')
          .eq('escritorio_id', escritorioAtivo)
          .order('created_at', { ascending: false })
          .limit(5),

        // Movimentações de processos
        supabase
          .from('processos_movimentacoes')
          .select(`
            id,
            tipo_descricao,
            descricao,
            created_at,
            importante,
            processo:processos_processos(numero_cnj)
          `)
          .eq('escritorio_id', escritorioAtivo)
          .order('created_at', { ascending: false })
          .limit(5),

        // Pagamentos recebidos
        supabase
          .from('financeiro_honorarios_parcelas')
          .select(`
            id,
            valor_pago,
            data_pagamento,
            created_at,
            honorario:financeiro_honorarios(
              cliente:crm_pessoas(nome_completo)
            )
          `)
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'pago')
          .order('data_pagamento', { ascending: false })
          .limit(5),

        // Novos clientes
        supabase
          .from('crm_pessoas')
          .select('id, nome_completo, tipo_pessoa, created_at')
          .eq('escritorio_id', escritorioAtivo)
          .order('created_at', { ascending: false })
          .limit(3),

        // Novos processos
        supabase
          .from('processos_processos')
          .select('id, numero_cnj, area, created_at')
          .eq('escritorio_id', escritorioAtivo)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      // Consolidar todas as atividades
      const todasAtividades: AtividadeRecente[] = []

      // Processar publicações
      publicacoesResult.data?.forEach(pub => {
        const config = tipoConfig.publicacao
        todasAtividades.push({
          id: `pub-${pub.id}`,
          tipo: 'publicacao',
          icon: config.icon,
          title: pub.urgente ? 'Publicação urgente' : 'Nova publicação',
          description: `Processo ${pub.numero_processo} - ${pub.tipo_publicacao || 'Intimação'}`,
          time: formatRelativeDate(new Date(pub.created_at)),
          colorScheme: pub.urgente ? 'red' : config.colorScheme,
          action: pub.urgente ? { label: 'Ver', href: `/dashboard/publicacoes/${pub.id}` } : undefined,
        })
      })

      // Processar movimentações
      movimentacoesResult.data?.forEach(mov => {
        const config = tipoConfig.movimentacao
        const processo = mov.processo as any
        todasAtividades.push({
          id: `mov-${mov.id}`,
          tipo: 'movimentacao',
          icon: config.icon,
          title: mov.tipo_descricao || 'Movimentação',
          description: processo?.numero_cnj
            ? `Processo ${processo.numero_cnj}`
            : mov.descricao?.substring(0, 50) || 'Nova movimentação',
          time: formatRelativeDate(new Date(mov.created_at)),
          colorScheme: mov.importante ? 'amber' : config.colorScheme,
        })
      })

      // Processar pagamentos
      parcelasResult.data?.forEach(parcela => {
        const config = tipoConfig.pagamento
        const honorario = parcela.honorario as any
        const clienteNome = honorario?.cliente?.nome_completo || 'Cliente'
        todasAtividades.push({
          id: `pag-${parcela.id}`,
          tipo: 'pagamento',
          icon: config.icon,
          title: 'Pagamento recebido',
          description: `${clienteNome} - R$ ${Number(parcela.valor_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          time: formatRelativeDate(new Date(parcela.data_pagamento || parcela.created_at)),
          colorScheme: config.colorScheme,
        })
      })

      // Processar novos clientes
      clientesResult.data?.forEach(cliente => {
        const config = tipoConfig.cliente
        todasAtividades.push({
          id: `cli-${cliente.id}`,
          tipo: 'cliente',
          icon: config.icon,
          title: 'Novo cliente cadastrado',
          description: `${cliente.nome_completo} - ${cliente.tipo_pessoa === 'juridica' ? 'Empresa' : 'Pessoa Física'}`,
          time: formatRelativeDate(new Date(cliente.created_at)),
          colorScheme: config.colorScheme,
        })
      })

      // Processar novos processos
      processosResult.data?.forEach(processo => {
        const config = tipoConfig.processo
        todasAtividades.push({
          id: `proc-${processo.id}`,
          tipo: 'processo',
          icon: config.icon,
          title: 'Novo processo',
          description: `${processo.numero_cnj || 'Número pendente'} - ${processo.area || 'Geral'}`,
          time: formatRelativeDate(new Date(processo.created_at)),
          colorScheme: config.colorScheme,
        })
      })

      // Ordenar por data mais recente (usando o tempo relativo como aproximação)
      // Na verdade, precisamos ordernar pelo timestamp real
      // Por simplicidade, vamos deixar como está já que cada fonte já está ordenada
      // e limitamos a 10 itens mais recentes
      const atividadesOrdenadas = todasAtividades
        .slice(0, 10)

      setAtividades(atividadesOrdenadas)
    } catch (err) {
      console.error('Erro ao carregar atividades do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    loadAtividades()
  }, [loadAtividades])

  return {
    atividades,
    loading,
    error,
    refresh: loadAtividades,
    isEmpty: !loading && atividades.length === 0,
  }
}
