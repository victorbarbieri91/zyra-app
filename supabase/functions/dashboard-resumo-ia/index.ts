// ============================================
// EDGE FUNCTION: RESUMO DO DIA COM IA
// ============================================
// Gera uma mensagem personalizada para o advogado
// com base nos dados do dia (agenda, publicações, horas)
//
// POLÍTICA DE CACHE:
// - Geração com IA apenas às 9h e 14h (horário de Brasília)
// - Cache persistido no banco de dados
// - Atualização manual via force_refresh=true

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Horários de geração com IA (em hora de Brasília)
// Manhã: 8h às 10h | Tarde: 13h às 15h
const JANELA_MANHA = { inicio: 8, fim: 10 }
const JANELA_TARDE = { inicio: 13, fim: 15 }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, escritorio_id, user_name, force_refresh } = await req.json()

    if (!user_id || !escritorio_id) {
      return errorResponse('user_id e escritorio_id são obrigatórios', 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Calcular hora em Brasília (UTC-3)
    const agora = new Date()
    const horaBrasilia = (agora.getUTCHours() - 3 + 24) % 24

    // Data de referência em Brasília
    const dataHojeBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
    const dataReferencia = dataHojeBrasilia.toISOString().split('T')[0]

    // Período: manhã (antes das 14h) ou tarde (14h em diante)
    const periodoAtual = horaBrasilia >= 14 ? 'tarde' : 'manha'

    console.log(`[Resumo IA] Hora: ${horaBrasilia}h | Período: ${periodoAtual} | Data: ${dataReferencia} | Force: ${force_refresh}`)

    // ========================================
    // 1. VERIFICAR CACHE (se não for force_refresh)
    // ========================================
    if (!force_refresh) {
      const { data: cache, error: cacheError } = await supabase
        .from('dashboard_resumo_cache')
        .select('*')
        .eq('user_id', user_id)
        .eq('data_referencia', dataReferencia)
        .eq('periodo_geracao', periodoAtual)
        .maybeSingle()

      if (cache && !cacheError) {
        console.log('[Resumo IA] ✓ Retornando cache existente')
        return successResponse({
          saudacao: cache.saudacao,
          mensagem: cache.mensagem,
          gerado_em: cache.gerado_em,
          gerado_por_ia: cache.gerado_por_ia,
          dados: cache.dados,
          fonte: 'cache',
        })
      }

      if (cacheError) {
        console.log('[Resumo IA] Erro ao buscar cache:', cacheError.message)
      } else {
        console.log('[Resumo IA] Cache não encontrado para este período')
      }
    }

    // ========================================
    // 2. BUSCAR DADOS DO DIA
    // ========================================
    const dadosDia = await buscarDadosDoDia(supabase, escritorio_id, user_id)

    // ========================================
    // 3. DETERMINAR SE GERA COM IA
    // ========================================
    const dentroJanelaManha = horaBrasilia >= JANELA_MANHA.inicio && horaBrasilia < JANELA_MANHA.fim
    const dentroJanelaTarde = horaBrasilia >= JANELA_TARDE.inicio && horaBrasilia < JANELA_TARDE.fim
    const dentroJanelaGeracao = dentroJanelaManha || dentroJanelaTarde

    const deveGerarComIA = force_refresh || dentroJanelaGeracao

    console.log(`[Resumo IA] Janela manhã: ${dentroJanelaManha} | Janela tarde: ${dentroJanelaTarde} | Gerar IA: ${deveGerarComIA}`)

    // ========================================
    // 4. GERAR MENSAGEM
    // ========================================
    const saudacao = getSaudacao(horaBrasilia)
    const nomeUsuario = user_name || 'Advogado'

    let mensagem = ''
    let geradoPorIA = false

    if (deveGerarComIA) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY')

      if (openaiKey) {
        try {
          mensagem = await gerarMensagemComIA(openaiKey, { saudacao, nomeUsuario, ...dadosDia })
          geradoPorIA = true
          console.log('[Resumo IA] ✓ Mensagem gerada com IA')
        } catch (err) {
          console.error('[Resumo IA] Erro IA, usando fallback:', err)
          mensagem = gerarMensagemFallback(dadosDia)
        }
      } else {
        console.log('[Resumo IA] Chave OpenAI não configurada, usando fallback')
        mensagem = gerarMensagemFallback(dadosDia)
      }
    } else {
      console.log('[Resumo IA] Fora da janela de geração, usando fallback')
      mensagem = gerarMensagemFallback(dadosDia)
    }

    const resultado = {
      saudacao: `${saudacao}, ${nomeUsuario}!`,
      mensagem,
      gerado_em: new Date().toISOString(),
      gerado_por_ia: geradoPorIA,
      dados: {
        audiencias: dadosDia.audiencias,
        tarefas: dadosDia.tarefas,
        eventos: dadosDia.eventos,
        prazos_urgentes: dadosDia.prazosUrgentes,
        publicacoes_pendentes: dadosDia.publicacoesPendentes,
        publicacoes_urgentes: dadosDia.publicacoesUrgentes,
        horas_nao_faturadas: dadosDia.horasNaoFaturadas,
        valor_nao_faturado: dadosDia.valorNaoFaturado,
        ocupacao_agenda: dadosDia.ocupacao,
      },
    }

    // ========================================
    // 5. SALVAR NO CACHE
    // ========================================
    const { error: upsertError } = await supabase
      .from('dashboard_resumo_cache')
      .upsert({
        user_id,
        escritorio_id,
        saudacao: resultado.saudacao,
        mensagem: resultado.mensagem,
        gerado_por_ia: geradoPorIA,
        dados: resultado.dados,
        data_referencia: dataReferencia,
        periodo_geracao: periodoAtual,
        gerado_em: resultado.gerado_em,
      }, {
        onConflict: 'user_id,data_referencia,periodo_geracao',
      })

    if (upsertError) {
      console.error('[Resumo IA] Erro ao salvar cache:', upsertError.message)
    } else {
      console.log('[Resumo IA] ✓ Cache salvo com sucesso')
    }

    return successResponse({ ...resultado, fonte: 'novo' })

  } catch (error) {
    console.error('[Resumo IA] Erro:', error)
    return errorResponse(error.message, 500)
  }
})

// ============================================
// HELPERS
// ============================================

function getSaudacao(hora: number): string {
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

async function buscarDadosDoDia(supabase: any, escritorio_id: string, user_id: string) {
  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

  const [agendaResult, publicacoesResult, horasResult] = await Promise.all([
    supabase
      .from('v_agenda_consolidada')
      .select('id, tipo_entidade, titulo, prioridade, prazo_data_limite')
      .eq('escritorio_id', escritorio_id)
      .or(`responsavel_id.eq.${user_id},responsavel_id.is.null`)
      .gte('data_inicio', inicioHoje.toISOString())
      .lte('data_inicio', fimHoje.toISOString()),

    supabase
      .from('v_publicacoes_dashboard')
      .select('*')
      .eq('escritorio_id', escritorio_id)
      .maybeSingle(),

    supabase
      .from('v_lancamentos_prontos_faturar')
      .select('horas, valor')
      .eq('escritorio_id', escritorio_id),
  ])

  const agenda = agendaResult.data || []
  const audiencias = agenda.filter((a: any) => a.tipo_entidade === 'audiencia').length
  const tarefas = agenda.filter((a: any) => a.tipo_entidade === 'tarefa').length
  const eventos = agenda.filter((a: any) => a.tipo_entidade === 'evento').length
  const prazosUrgentes = agenda.filter((a: any) =>
    a.prioridade === 'alta' ||
    (a.prazo_data_limite && new Date(a.prazo_data_limite).toDateString() === hoje.toDateString())
  ).length

  const publicacoes = publicacoesResult.data || { pendentes: 0, urgentes_nao_processadas: 0 }
  const horasNaoFaturadas = horasResult.data?.reduce((acc: number, h: any) => acc + Number(h.horas || 0), 0) || 0
  const valorNaoFaturado = horasResult.data?.reduce((acc: number, h: any) => acc + Number(h.valor || 0), 0) || 0
  const totalItensAgenda = audiencias + tarefas + eventos
  const ocupacao = Math.min(Math.round((totalItensAgenda / 8) * 100), 100)

  return {
    audiencias,
    tarefas,
    eventos,
    prazosUrgentes,
    publicacoesPendentes: publicacoes.pendentes || 0,
    publicacoesUrgentes: publicacoes.urgentes_nao_processadas || 0,
    horasNaoFaturadas,
    valorNaoFaturado,
    ocupacao,
  }
}

// ============================================
// GERAÇÃO COM IA
// ============================================

interface DadosResumo {
  saudacao: string
  nomeUsuario: string
  audiencias: number
  tarefas: number
  eventos: number
  prazosUrgentes: number
  publicacoesPendentes: number
  publicacoesUrgentes: number
  horasNaoFaturadas: number
  valorNaoFaturado: number
  ocupacao: number
}

async function gerarMensagemComIA(apiKey: string, dados: DadosResumo): Promise<string> {
  const prompt = `Você é um assistente jurídico amigável. Gere uma mensagem CURTA (2-3 frases, máximo 180 caracteres) para o advogado sobre o dia dele.

DADOS DO DIA:
- Audiências: ${dados.audiencias}
- Tarefas: ${dados.tarefas}
- Eventos: ${dados.eventos}
- Prazos urgentes: ${dados.prazosUrgentes}
- Publicações pendentes: ${dados.publicacoesPendentes} (${dados.publicacoesUrgentes} urgentes)
- Horas não faturadas: ${dados.horasNaoFaturadas}h (R$ ${dados.valorNaoFaturado.toLocaleString('pt-BR')})
- Ocupação agenda: ${dados.ocupacao}%

REGRAS:
- Seja amigável e motivador
- Destaque o mais importante (audiências > prazos > publicações)
- Se houver publicações urgentes, mencione brevemente
- Se houver muitas horas não faturadas (>10h), sugira faturar
- NÃO use emojis
- Responda APENAS com a mensagem (sem saudação, ela já existe)
- Máximo 180 caracteres`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente jurídico conciso e amigável. Responda apenas com a mensagem.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`)
  }

  const result = await response.json()
  const mensagem = result.choices[0]?.message?.content?.trim()

  if (!mensagem) {
    throw new Error('Resposta vazia da IA')
  }

  return mensagem
}

// ============================================
// MENSAGEM FALLBACK (sem IA)
// ============================================

interface DadosFallback {
  audiencias: number
  tarefas: number
  eventos: number
  prazosUrgentes: number
  publicacoesPendentes: number
  publicacoesUrgentes: number
  horasNaoFaturadas: number
  valorNaoFaturado: number
  ocupacao: number
}

function gerarMensagemFallback(dados: DadosFallback): string {
  const partes: string[] = []

  // Audiências (prioridade máxima)
  if (dados.audiencias > 0) {
    if (dados.audiencias === 1) {
      partes.push('Você tem 1 audiência hoje')
    } else {
      partes.push(`Você tem ${dados.audiencias} audiências hoje`)
    }
  }

  // Prazos urgentes
  if (dados.prazosUrgentes > 0) {
    if (dados.prazosUrgentes === 1) {
      partes.push('1 prazo urgente')
    } else {
      partes.push(`${dados.prazosUrgentes} prazos urgentes`)
    }
  }

  // Publicações urgentes
  if (dados.publicacoesUrgentes > 0) {
    if (dados.publicacoesUrgentes === 1) {
      partes.push('1 publicação urgente aguarda análise')
    } else {
      partes.push(`${dados.publicacoesUrgentes} publicações urgentes aguardam análise`)
    }
  }

  // Horas não faturadas (apenas se significativo)
  if (dados.horasNaoFaturadas >= 10) {
    partes.push(`${Math.round(dados.horasNaoFaturadas)}h prontas para faturar`)
  }

  // Se não tem nada relevante
  if (partes.length === 0) {
    if (dados.tarefas > 0) {
      if (dados.tarefas === 1) {
        return 'Você tem 1 tarefa pendente hoje. Bom trabalho!'
      }
      return `Você tem ${dados.tarefas} tarefas pendentes hoje. Bom trabalho!`
    }
    if (dados.eventos > 0) {
      return `Sua agenda tem ${dados.eventos} compromissos hoje.`
    }
    return 'Sua agenda está livre hoje. Aproveite para organizar pendências!'
  }

  // Juntar partes com formatação amigável
  if (partes.length === 1) {
    return partes[0] + '.'
  }

  if (partes.length === 2) {
    return partes[0] + ' e ' + partes[1].toLowerCase() + '.'
  }

  // 3+ partes: vírgulas e "e" no final
  const ultimaParte = partes.pop()
  return partes.join(', ') + ' e ' + ultimaParte!.toLowerCase() + '.'
}

// ============================================
// RESPONSES
// ============================================

function successResponse(data: any) {
  return new Response(
    JSON.stringify({ sucesso: true, ...data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ sucesso: false, erro: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
