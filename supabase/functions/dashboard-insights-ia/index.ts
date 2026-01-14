// ============================================
// EDGE FUNCTION: INSIGHTS DE GESTÃO COM IA
// ============================================
// Gera insights de gestão para donos/sócios do escritório
// Analisa dados consolidados e identifica oportunidades/alertas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache (1 hora para insights de gestão)
const cache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_TTL = 60 * 60 * 1000 // 1 hora

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { escritorio_id, force_refresh } = await req.json()

    if (!escritorio_id) {
      return errorResponse('escritorio_id é obrigatório', 400)
    }

    // Verificar cache
    const cacheKey = `insights_${escritorio_id}_${new Date().toISOString().split('T')[0]}`
    if (!force_refresh && cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TTL)) {
      console.log('Retornando insights do cache')
      return successResponse(cache[cacheKey].data)
    }

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Buscar dados para análise
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ha30dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ha60dias = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000)

    const [
      horasNaoFaturadasResult,
      contratosVencendoResult,
      processosParadosResult,
      consultasResult,
      clientesInativosResult,
      parcelasResult,
      timesheetMesResult,
    ] = await Promise.all([
      // Horas não faturadas
      supabase
        .from('v_lancamentos_prontos_faturar')
        .select('horas, valor')
        .eq('escritorio_id', escritorio_id),

      // Contratos vencendo em 30 dias
      supabase
        .from('financeiro_contratos_honorarios')
        .select('id, data_fim')
        .eq('escritorio_id', escritorio_id)
        .eq('status', 'ativo')
        .lte('data_fim', em30dias.toISOString().split('T')[0])
        .gte('data_fim', hoje.toISOString().split('T')[0]),

      // Processos sem movimentação > 30 dias
      supabase
        .from('processos_processos')
        .select('id, numero_cnj, updated_at')
        .eq('escritorio_id', escritorio_id)
        .in('status', ['ativo', 'em_andamento'])
        .lt('updated_at', ha30dias.toISOString()),

      // Consultas para cálculo de conversão
      supabase
        .from('consultivo_consultas')
        .select('id, status, created_at')
        .eq('escritorio_id', escritorio_id)
        .gte('created_at', inicioMes.toISOString()),

      // Clientes sem interação > 60 dias
      supabase
        .from('crm_pessoas')
        .select('id, nome_completo, updated_at')
        .eq('escritorio_id', escritorio_id)
        .eq('status', 'ativo')
        .lt('updated_at', ha60dias.toISOString())
        .limit(10),

      // Parcelas para cálculo de inadimplência
      supabase
        .from('financeiro_honorarios_parcelas')
        .select('valor, status, data_vencimento')
        .eq('escritorio_id', escritorio_id)
        .in('status', ['pendente', 'vencido', 'pago']),

      // Timesheet do mês para produtividade
      supabase
        .from('financeiro_timesheet')
        .select('horas, faturavel')
        .eq('escritorio_id', escritorio_id)
        .gte('data_trabalho', inicioMes.toISOString().split('T')[0]),
    ])

    // Processar dados
    const horasNaoFaturadas = horasNaoFaturadasResult.data?.reduce((acc, h) => acc + Number(h.horas || 0), 0) || 0
    const valorNaoFaturado = horasNaoFaturadasResult.data?.reduce((acc, h) => acc + Number(h.valor || 0), 0) || 0

    const contratosVencendo = contratosVencendoResult.data?.length || 0

    const processosParados = processosParadosResult.data?.length || 0

    const totalConsultas = consultasResult.data?.length || 0
    const consultasConcluidas = consultasResult.data?.filter(c => c.status === 'concluido').length || 0
    const taxaConversao = totalConsultas > 0 ? Math.round((consultasConcluidas / totalConsultas) * 100) : 0

    const clientesInativos = clientesInativosResult.data?.length || 0

    // Calcular inadimplência
    let totalVencido = 0
    let totalPendente = 0
    parcelasResult.data?.forEach(p => {
      if (p.status === 'vencido' || (p.status === 'pendente' && new Date(p.data_vencimento) < hoje)) {
        totalVencido += Number(p.valor || 0)
      }
      if (p.status !== 'pago') {
        totalPendente += Number(p.valor || 0)
      }
    })
    const taxaInadimplencia = totalPendente > 0 ? Math.round((totalVencido / totalPendente) * 100) : 0

    // Calcular produtividade (% horas faturáveis)
    const totalHorasMes = timesheetMesResult.data?.reduce((acc, t) => acc + Number(t.horas || 0), 0) || 0
    const horasFaturaveisMes = timesheetMesResult.data?.filter(t => t.faturavel)
      .reduce((acc, t) => acc + Number(t.horas || 0), 0) || 0
    const produtividade = totalHorasMes > 0 ? Math.round((horasFaturaveisMes / totalHorasMes) * 100) : 0

    // Gerar insights
    const insights: Insight[] = []

    // Insight: Horas não faturadas
    if (horasNaoFaturadas >= 10) {
      insights.push({
        tipo: 'oportunidade',
        titulo: `${Math.round(horasNaoFaturadas)}h não faturadas`,
        descricao: `Oportunidade de faturar R$ ${valorNaoFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em horas registradas.`,
        acao: { label: 'Revisar e faturar', href: '/dashboard/financeiro/faturamento' },
        prioridade: horasNaoFaturadas >= 30 ? 'alta' : 'media',
      })
    }

    // Insight: Contratos vencendo
    if (contratosVencendo > 0) {
      insights.push({
        tipo: 'alerta',
        titulo: `${contratosVencendo} contrato${contratosVencendo > 1 ? 's' : ''} vence${contratosVencendo > 1 ? 'm' : ''} em 30 dias`,
        descricao: 'Renove os contratos para garantir a continuidade dos honorários.',
        acao: { label: 'Ver contratos', href: '/dashboard/financeiro/contratos' },
        prioridade: 'alta',
      })
    }

    // Insight: Taxa de conversão
    if (totalConsultas >= 5) {
      if (taxaConversao >= 70) {
        insights.push({
          tipo: 'destaque',
          titulo: `Taxa de conversão em ${taxaConversao}%`,
          descricao: 'Excelente taxa de conversão de consultas. Continue assim!',
          prioridade: 'baixa',
        })
      } else if (taxaConversao < 40) {
        insights.push({
          tipo: 'alerta',
          titulo: `Taxa de conversão em ${taxaConversao}%`,
          descricao: 'A taxa de conversão está abaixo do esperado. Revise o processo de atendimento.',
          acao: { label: 'Ver consultas', href: '/dashboard/consultivo' },
          prioridade: 'media',
        })
      }
    }

    // Insight: Processos parados
    if (processosParados >= 3) {
      insights.push({
        tipo: 'alerta',
        titulo: `${processosParados} processos sem movimentação`,
        descricao: 'Alguns processos estão há mais de 30 dias sem atualização.',
        acao: { label: 'Ver processos', href: '/dashboard/processos?filter=parados' },
        prioridade: processosParados >= 10 ? 'alta' : 'media',
      })
    }

    // Insight: Clientes inativos
    if (clientesInativos >= 5) {
      insights.push({
        tipo: 'oportunidade',
        titulo: `${clientesInativos} clientes sem contato`,
        descricao: 'Clientes sem interação há mais de 60 dias. Oportunidade de reativação.',
        acao: { label: 'Ver clientes', href: '/dashboard/crm?filter=inativos' },
        prioridade: 'media',
      })
    }

    // Insight: Inadimplência alta
    if (taxaInadimplencia >= 10) {
      insights.push({
        tipo: 'alerta',
        titulo: `Inadimplência em ${taxaInadimplencia}%`,
        descricao: `R$ ${totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em parcelas vencidas.`,
        acao: { label: 'Gerenciar cobranças', href: '/dashboard/financeiro/cobrancas' },
        prioridade: taxaInadimplencia >= 20 ? 'alta' : 'media',
      })
    }

    // Insight: Produtividade alta
    if (produtividade >= 75 && totalHorasMes >= 20) {
      insights.push({
        tipo: 'destaque',
        titulo: `Produtividade em ${produtividade}%`,
        descricao: 'A equipe está com boa taxa de horas faturáveis este mês.',
        prioridade: 'baixa',
      })
    }

    // Se não há insights, criar um genérico
    if (insights.length === 0) {
      insights.push({
        tipo: 'destaque',
        titulo: 'Tudo em ordem!',
        descricao: 'Não há alertas ou oportunidades urgentes no momento.',
        prioridade: 'baixa',
      })
    }

    // Ordenar por prioridade e limitar a 3
    const prioridadeOrdem = { alta: 0, media: 1, baixa: 2 }
    const insightsOrdenados = insights
      .sort((a, b) => prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade])
      .slice(0, 3)

    const resultado = {
      insights: insightsOrdenados,
      gerado_em: new Date().toISOString(),
      metricas_base: {
        horas_nao_faturadas: horasNaoFaturadas,
        valor_nao_faturado: valorNaoFaturado,
        contratos_vencendo: contratosVencendo,
        processos_parados: processosParados,
        taxa_conversao: taxaConversao,
        taxa_inadimplencia: taxaInadimplencia,
        produtividade,
      },
    }

    // Salvar no cache
    cache[cacheKey] = { data: resultado, timestamp: Date.now() }

    return successResponse(resultado)

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return errorResponse(error.message, 500)
  }
})

// ============================================
// TIPOS
// ============================================

interface Insight {
  tipo: 'oportunidade' | 'alerta' | 'destaque' | 'sugestao'
  titulo: string
  descricao: string
  acao?: {
    label: string
    href: string
  }
  prioridade: 'alta' | 'media' | 'baixa'
}

// ============================================
// HELPERS
// ============================================

function successResponse(data: any) {
  return new Response(
    JSON.stringify({ sucesso: true, ...data }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ sucesso: false, erro: message }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}
