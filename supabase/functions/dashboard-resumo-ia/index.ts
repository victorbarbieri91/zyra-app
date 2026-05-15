// ============================================
// EDGE FUNCTION: RESUMO DO DIA COM IA
// ============================================
// Gera uma mensagem personalizada para o advogado com base em:
// - Agenda do USUÁRIO (tarefas, eventos, audiências) — hoje + atrasados
// - Meta pessoal (horas cobráveis e honorários do mês)
// - Cruzamento: tarefas/eventos com vínculo a processo/consultivo = cobráveis
//
// POLÍTICA DE CACHE:
// - 3 períodos: manhã (até 12h), tarde (12h-18h), noite (18h+)
// - Geração com IA apenas em 3 janelas: 8h-10h, 13h-15h, 18h-19h
// - Cache persistido em dashboard_resumo_cache (chave user_id, data_referencia, periodo_geracao)
// - Atualização manual via force_refresh=true

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Janelas em que a IA é chamada (horário de Brasília).
const JANELAS_IA = [
  { inicio: 8, fim: 10 },
  { inicio: 13, fim: 15 },
  { inicio: 18, fim: 19 },
]

// Modelo escolhido (OpenAI).
const MODELO_IA = 'gpt-5-mini'

// ============================================
// HTTP HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      user_id,
      escritorio_id,
      user_name,
      force_refresh,
      meta,
    }: {
      user_id?: string
      escritorio_id?: string
      user_name?: string
      force_refresh?: boolean
      meta?: MetaInput
    } = body

    if (!user_id || !escritorio_id) {
      return errorResponse('user_id e escritorio_id são obrigatórios', 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Calcular hora em Brasília (UTC-3).
    const agora = new Date()
    const horaBrasilia = (agora.getUTCHours() - 3 + 24) % 24

    // Data de referência em Brasília.
    const dataHojeBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
    const dataReferencia = dataHojeBrasilia.toISOString().split('T')[0]

    const periodoAtual = getPeriodoAtual(horaBrasilia)

    console.log(
      `[Resumo IA] hora=${horaBrasilia}h periodo=${periodoAtual} data=${dataReferencia} force=${force_refresh}`,
    )

    // ========================================
    // 1. CACHE
    // ========================================
    if (!force_refresh) {
      const { data: cache } = await supabase
        .from('dashboard_resumo_cache')
        .select('*')
        .eq('user_id', user_id)
        .eq('data_referencia', dataReferencia)
        .eq('periodo_geracao', periodoAtual)
        .maybeSingle()

      if (cache) {
        console.log('[Resumo IA] cache hit')
        return successResponse({
          saudacao: cache.saudacao,
          mensagem: cache.mensagem,
          gerado_em: cache.gerado_em,
          gerado_por_ia: cache.gerado_por_ia,
          dados: cache.dados,
          fonte: 'cache',
        })
      }
    }

    // ========================================
    // 2. DADOS — AGENDA DO USUÁRIO
    // ========================================
    const contexto = await buscarContextoDia(supabase, escritorio_id, user_id, meta)

    // ========================================
    // 3. DECIDIR SE GERA COM IA
    // ========================================
    const dentroJanela = JANELAS_IA.some(
      (j) => horaBrasilia >= j.inicio && horaBrasilia < j.fim,
    )
    const deveGerarComIA = force_refresh || dentroJanela

    console.log(`[Resumo IA] janela=${dentroJanela} gerar_ia=${deveGerarComIA}`)

    // ========================================
    // 4. MENSAGEM
    // ========================================
    const saudacao = getSaudacao(horaBrasilia)
    const nomeUsuario = user_name || 'advogado'

    let mensagem = ''
    let geradoPorIA = false

    if (deveGerarComIA) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (openaiKey) {
        try {
          mensagem = await gerarMensagemComIA(openaiKey, contexto, nomeUsuario)
          geradoPorIA = true
          console.log('[Resumo IA] mensagem gerada com IA')
        } catch (err) {
          console.error('[Resumo IA] erro IA, usando fallback:', err)
          mensagem = gerarMensagemFallback(contexto)
        }
      } else {
        console.log('[Resumo IA] sem OPENAI_API_KEY, usando fallback')
        mensagem = gerarMensagemFallback(contexto)
      }
    } else {
      mensagem = gerarMensagemFallback(contexto)
    }

    const resultado = {
      saudacao: `${saudacao}, ${nomeUsuario}!`,
      mensagem,
      gerado_em: new Date().toISOString(),
      gerado_por_ia: geradoPorIA,
      dados: {
        total_hoje: contexto.itensHoje.length,
        total_atrasados: contexto.itensAtrasados.length,
        audiencias_hoje: contexto.itensHoje.filter((i) => i.tipo === 'audiencia').length,
        prazos_hoje: contexto.itensHoje.filter((i) => i.prazoFatal).length,
        cobraveis_pendentes: contexto.cobraveisPendentes,
        meta_status: contexto.metaStatus,
      },
    }

    // ========================================
    // 5. SALVAR CACHE
    // ========================================
    const { error: upsertError } = await supabase
      .from('dashboard_resumo_cache')
      .upsert(
        {
          user_id,
          escritorio_id,
          saudacao: resultado.saudacao,
          mensagem: resultado.mensagem,
          gerado_por_ia: geradoPorIA,
          dados: resultado.dados,
          data_referencia: dataReferencia,
          periodo_geracao: periodoAtual,
          gerado_em: resultado.gerado_em,
        },
        { onConflict: 'user_id,data_referencia,periodo_geracao' },
      )

    if (upsertError) {
      console.error('[Resumo IA] erro salvar cache:', upsertError.message)
    }

    return successResponse({ ...resultado, fonte: 'novo' })
  } catch (error) {
    console.error('[Resumo IA] erro:', error)
    return errorResponse((error as Error).message, 500)
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

function getPeriodoAtual(hora: number): 'manha' | 'tarde' | 'noite' {
  if (hora < 12) return 'manha'
  if (hora < 18) return 'tarde'
  return 'noite'
}

// ============================================
// CONTEXTO DO DIA
// ============================================

interface MetaInput {
  horas_atual?: number
  horas_meta?: number
  honorarios_atual?: number
  honorarios_meta?: number
  dias_uteis_restantes?: number
}

interface ItemAgenda {
  id: string
  tipo: 'tarefa' | 'evento' | 'audiencia'
  titulo: string
  caso?: string // caso_titulo "Autor x Réu" ou consultivo_titulo
  horario?: string // "14:00"
  prazoData?: string // "2026-05-15"
  prazoTipo?: string // recurso, manifestacao, etc
  prazoFatal: boolean // vence hoje
  atrasado: boolean // venceu no passado e não foi cumprido
  cobravel: boolean // contrato ativo do processo/consultivo tem horas_faturaveis=true
  prioridade: 'alta' | 'media' | 'baixa'
  local?: string
}

interface ContextoDia {
  itensHoje: ItemAgenda[]
  itensAtrasados: ItemAgenda[]
  cobraveisPendentes: number // tarefas/eventos cobráveis pendentes (audiência fica separada)
  meta?: MetaInput
  metaStatus: 'sem_meta' | 'ok' | 'atrasada' | 'avancada'
}

async function buscarContextoDia(
  supabase: any,
  escritorio_id: string,
  user_id: string,
  meta?: MetaInput,
): Promise<ContextoDia> {
  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)
  const hojeISO = inicioHoje.toISOString().slice(0, 10)

  // Itens do USUÁRIO logado (responsável principal ou co-responsável),
  // que não sejam pessoais, em status ativo, e que sejam:
  //   - de hoje (data_inicio dentro do dia), OU
  //   - prazos atrasados (prazo_data_limite no passado e não cumprido)
  const { data: agenda } = await supabase
    .from('v_agenda_consolidada')
    .select(
      'id, tipo_entidade, titulo, data_inicio, prioridade, status, ' +
        'prazo_data_limite, prazo_tipo, prazo_cumprido, ' +
        'caso_titulo, consultivo_titulo, processo_id, consultivo_id, ' +
        'local, responsavel_id, responsaveis_ids, pessoal',
    )
    .eq('escritorio_id', escritorio_id)
    .eq('pessoal', false)
    .not('status', 'in', '(cancelada,concluida)')
    .or(`responsavel_id.eq.${user_id},responsaveis_ids.cs.{${user_id}}`)
    .or(
      `and(data_inicio.gte.${inicioHoje.toISOString()},data_inicio.lte.${fimHoje.toISOString()}),` +
        `and(prazo_data_limite.lt.${hojeISO},prazo_cumprido.is.false)`,
    )
    .order('prazo_data_limite', { ascending: true, nullsFirst: false })
    .limit(30)

  const rows = agenda || []

  // ─── Cruzamento processo/consultivo → contrato → horas_faturaveis ───────
  // Determina "cobrável" de verdade: item é cobrável se o contrato vinculado
  // ao processo (ou ao consultivo) está ATIVO e tem horas_faturaveis=true.
  const processoIds = Array.from(
    new Set(rows.map((r: any) => r.processo_id).filter(Boolean)),
  ) as string[]
  const consultivoIds = Array.from(
    new Set(rows.map((r: any) => r.consultivo_id).filter(Boolean)),
  ) as string[]

  const processoToContrato = new Map<string, string | null>()
  const consultivoToContrato = new Map<string, string | null>()

  if (processoIds.length > 0) {
    const { data } = await supabase
      .from('processos_processos')
      .select('id, contrato_id')
      .in('id', processoIds)
    for (const p of data || []) processoToContrato.set(p.id, p.contrato_id ?? null)
  }

  if (consultivoIds.length > 0) {
    const { data } = await supabase
      .from('consultivo_consultas')
      .select('id, contrato_id')
      .in('id', consultivoIds)
    for (const c of data || []) consultivoToContrato.set(c.id, c.contrato_id ?? null)
  }

  const contratoIds = Array.from(
    new Set(
      [...processoToContrato.values(), ...consultivoToContrato.values()].filter(
        Boolean,
      ),
    ),
  ) as string[]

  const contratoCobravel = new Map<string, boolean>()
  if (contratoIds.length > 0) {
    const { data } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('id, horas_faturaveis, ativo')
      .in('id', contratoIds)
    for (const ct of data || []) {
      contratoCobravel.set(ct.id, !!ct.ativo && !!ct.horas_faturaveis)
    }
  }

  function isCobravel(processoId: string | null, consultivoId: string | null): boolean {
    const contratoId =
      (processoId && processoToContrato.get(processoId)) ||
      (consultivoId && consultivoToContrato.get(consultivoId)) ||
      null
    if (!contratoId) return false
    return contratoCobravel.get(contratoId) === true
  }

  const itensHoje: ItemAgenda[] = []
  const itensAtrasados: ItemAgenda[] = []

  for (const row of rows) {
    const cobravel = isCobravel(row.processo_id, row.consultivo_id)
    const item = mapRowToItem(row, hojeISO, cobravel)
    if (item.atrasado) itensAtrasados.push(item)
    else itensHoje.push(item)
  }

  // Tarefas/eventos cobráveis pendentes (audiência fica de fora — já tem destaque próprio).
  const cobraveisPendentes = [...itensHoje, ...itensAtrasados].filter(
    (i) => i.cobravel && i.tipo !== 'audiencia',
  ).length

  const metaStatus = avaliarMeta(meta)

  return {
    itensHoje,
    itensAtrasados,
    cobraveisPendentes,
    meta,
    metaStatus,
  }
}

function mapRowToItem(row: any, hojeISO: string, cobravel: boolean): ItemAgenda {
  const tipo: 'tarefa' | 'evento' | 'audiencia' = row.tipo_entidade
  const dataInicio = row.data_inicio ? new Date(row.data_inicio) : null
  const horario = dataInicio
    ? `${String(dataInicio.getUTCHours() - 3 < 0 ? dataInicio.getUTCHours() + 21 : dataInicio.getUTCHours() - 3).padStart(2, '0')}:${String(dataInicio.getUTCMinutes()).padStart(2, '0')}`
    : undefined

  const prazoData: string | undefined = row.prazo_data_limite ?? undefined
  const prazoFatal = prazoData === hojeISO
  const atrasado = !!prazoData && prazoData < hojeISO && row.prazo_cumprido !== true

  return {
    id: row.id,
    tipo,
    titulo: row.titulo,
    caso: row.caso_titulo || row.consultivo_titulo || undefined,
    horario: tipo === 'audiencia' || tipo === 'evento' ? horario : undefined,
    prazoData,
    prazoTipo: row.prazo_tipo ?? undefined,
    prazoFatal,
    atrasado,
    cobravel,
    prioridade: row.prioridade || 'media',
    local: row.local ?? undefined,
  }
}

function avaliarMeta(meta?: MetaInput): 'sem_meta' | 'ok' | 'atrasada' | 'avancada' {
  if (
    !meta ||
    meta.horas_meta === undefined ||
    meta.horas_meta <= 0 ||
    meta.horas_atual === undefined
  ) {
    return 'sem_meta'
  }
  const pct = meta.horas_atual / meta.horas_meta
  // Threshold simples: <70% = atrasada; >100% = avançada; resto = ok.
  // O cálculo "esperado pra altura do mês" fica a cargo da IA olhar dias_uteis_restantes.
  if (pct < 0.7) return 'atrasada'
  if (pct >= 1) return 'avancada'
  return 'ok'
}

// ============================================
// IA — OPENAI gpt-5-mini
// ============================================

async function gerarMensagemComIA(
  apiKey: string,
  contexto: ContextoDia,
  nomeUsuario: string,
): Promise<string> {
  const prompt = montarPrompt(contexto, nomeUsuario)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO_IA,
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente jurídico que conversa com o advogado de forma natural, como um colega de equipe inteligente fazendo um overview do dia. Português brasileiro correto, sem emojis, sem saudação inicial (já existe), tom profissional mas humano e direto.',
        },
        { role: 'user', content: prompt },
      ],
      // gpt-5-mini é reasoning model: consome max_completion_tokens no raciocínio interno
      // ANTES de gerar a resposta. Precisa de orçamento generoso (~2000) pra sobrar texto.
      // Também não aceita temperature custom — só o default (1), então omitimos.
      max_completion_tokens: 2000,
      reasoning_effort: 'low',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[Resumo IA] OpenAI ${response.status} (modelo=${MODELO_IA}):`, errText)
    throw new Error(`OpenAI ${response.status}: ${errText}`)
  }

  const result = await response.json()
  const mensagem = result.choices[0]?.message?.content?.trim()
  if (!mensagem) {
    console.error('[Resumo IA] resposta vazia. Payload:', JSON.stringify(result))
    throw new Error('Resposta vazia da IA')
  }

  return polirMensagem(mensagem)
}

/**
 * Polimento server-side:
 * 1. Trunca em ~360 chars no último fim de frase (se possível) — espaço pra 3 linhas.
 * 2. Garante que pares de `**` estão balanceados — remove o último `**` órfão.
 */
function polirMensagem(texto: string): string {
  let saida = texto

  if (saida.length > 360) {
    const cortado = saida.slice(0, 360)
    const ultimoFim = Math.max(
      cortado.lastIndexOf('. '),
      cortado.lastIndexOf('? '),
      cortado.lastIndexOf('! '),
    )
    saida = ultimoFim > 200 ? cortado.slice(0, ultimoFim + 1) : cortado.trimEnd() + '…'
  }

  // Balancear `**`: se contar ímpar, remove o último órfão.
  const matches = saida.match(/\*\*/g) || []
  if (matches.length % 2 !== 0) {
    const idx = saida.lastIndexOf('**')
    if (idx >= 0) saida = saida.slice(0, idx) + saida.slice(idx + 2)
  }

  return saida
}

function montarPrompt(ctx: ContextoDia, nome: string): string {
  const linhas: string[] = []

  linhas.push(`USUÁRIO: ${nome}`)
  linhas.push('')

  // ATRASADOS — prioridade máxima
  if (ctx.itensAtrasados.length > 0) {
    linhas.push('ATRASADOS (urgente):')
    for (const it of ctx.itensAtrasados.slice(0, 6)) {
      linhas.push(`- ${descreveItem(it)}`)
    }
    linhas.push('')
  }

  // HOJE
  if (ctx.itensHoje.length > 0) {
    linhas.push('HOJE:')
    // Ordena: prazos fatais primeiro, depois audiências, depois resto
    const ordenado = [...ctx.itensHoje].sort((a, b) => {
      if (a.prazoFatal !== b.prazoFatal) return a.prazoFatal ? -1 : 1
      if (a.tipo !== b.tipo) {
        const ordem = { audiencia: 0, evento: 1, tarefa: 2 } as const
        return ordem[a.tipo] - ordem[b.tipo]
      }
      return (a.horario || '').localeCompare(b.horario || '')
    })
    for (const it of ordenado.slice(0, 10)) {
      linhas.push(`- ${descreveItem(it)}`)
    }
    linhas.push('')
  }

  if (ctx.itensHoje.length === 0 && ctx.itensAtrasados.length === 0) {
    linhas.push('AGENDA: vazia hoje.')
    linhas.push('')
  }

  // META
  if (ctx.meta && ctx.metaStatus !== 'sem_meta') {
    const m = ctx.meta
    const pctHoras =
      m.horas_meta && m.horas_atual
        ? Math.round((m.horas_atual / m.horas_meta) * 100)
        : 0
    linhas.push('META PESSOAL:')
    linhas.push(
      `- Horas cobráveis: ${m.horas_atual?.toFixed(1) ?? 0}h / ${m.horas_meta?.toFixed(0) ?? 0}h (${pctHoras}%)`,
    )
    if (m.dias_uteis_restantes !== undefined) {
      linhas.push(`- Dias úteis restantes: ${m.dias_uteis_restantes}`)
    }
    linhas.push(`- Status: ${ctx.metaStatus.toUpperCase()}`)
    if (ctx.metaStatus === 'atrasada' && ctx.cobraveisPendentes > 0) {
      linhas.push(
        `- Oportunidade: ${ctx.cobraveisPendentes} tarefas/eventos cobráveis pendentes (contrato com horas_faturaveis=true) — concluí-las e registrar horas avança a meta`,
      )
    }
    linhas.push('')
  }

  linhas.push('INSTRUÇÕES:')
  linhas.push(
    '- Escreva um overview do dia em 2 a 3 frases naturais (entre 180 e 320 caracteres no total). Conversacional, como um colega comentando o dia — não enumere.',
  )
  linhas.push(
    '- Cite o NOME DO CASO/CLIENTE de forma abreviada (use só a parte reconhecível, ex: "Costa Ltda." em vez do nome completo). Destaque 1-2 itens mais relevantes.',
  )
  linhas.push(
    '- USE NEGRITO (**texto**) em TRECHOS (não só palavras isoladas) que carregam a informação mais importante. Pode ser uma expressão curta ou uma frase inteira curta. 2 a 4 trechos no total.',
  )
  linhas.push(
    '- REGRA TÉCNICA DE NEGRITO: cada `**` de abertura DEVE ter um `**` de fechamento na MESMA frase. Nunca deixe `**` aberto. Se não cabe certinho, escreva sem negrito.',
  )
  linhas.push('- Exemplos do tom, tamanho e uso de negrito (em trechos):')
  linhas.push(
    '  "**Audiência às 14h** no caso Banco X — chegue cedo. O aditivo do **Costa Ltda. é cobrável** e ajuda a fechar a meta da semana."',
  )
  linhas.push(
    '  "Hoje sem audiências, mas **o prazo de manifestação do Construtora Y vence hoje**. Vale priorizar esse antes de pegar as outras tarefas."',
  )
  linhas.push(
    '  "**Recomendo encerrar o caso Platlog**: pedir confirmação à Adriana e aguardar. Em paralelo, **responder a Luiza ainda hoje** sobre as oportunidades tributárias."',
  )
  linhas.push('- Ordem de prioridade: atrasados > prazos fatais > audiências > tarefas cobráveis.')
  linhas.push('- Audiências sempre com horário.')
  linhas.push('- SÓ marque algo como "cobrável" se vier com [cobrável] na lista. Não invente.')
  linhas.push(
    '- Se a meta está ATRASADA E há tarefas cobráveis pendentes, sugira naturalmente uma ação que avance a meta.',
  )
  linhas.push('- Se a agenda está vazia e meta ok, 1-2 frases leves sobre aproveitar o dia.')
  linhas.push('- SEM saudação (não comece com "Olá", "Bom dia"). SEM emojis. Português correto.')

  return linhas.join('\n')
}

function descreveItem(it: ItemAgenda): string {
  const partes: string[] = []
  if (it.tipo === 'audiencia') {
    partes.push(`Audiência${it.horario ? ` ${it.horario}` : ''}`)
  } else if (it.prazoFatal) {
    partes.push(`Prazo HOJE${it.prazoTipo ? ` (${it.prazoTipo})` : ''}`)
  } else if (it.atrasado && it.prazoData) {
    partes.push(`Prazo VENCIDO em ${it.prazoData}${it.prazoTipo ? ` (${it.prazoTipo})` : ''}`)
  } else if (it.tipo === 'evento') {
    partes.push(`Compromisso${it.horario ? ` ${it.horario}` : ''}`)
  } else {
    partes.push('Tarefa')
  }
  partes.push(it.titulo)
  if (it.caso) partes.push(`(${it.caso})`)
  if (it.local && it.tipo === 'audiencia') partes.push(`— ${it.local}`)
  if (it.prioridade === 'alta' && !it.prazoFatal) partes.push('[alta prioridade]')
  if (it.cobravel && it.tipo !== 'audiencia') partes.push('[cobrável]')
  return partes.join(' ')
}

// ============================================
// FALLBACK DETERMINÍSTICO (sem IA)
// ============================================

function gerarMensagemFallback(ctx: ContextoDia): string {
  const partes: string[] = []

  if (ctx.itensAtrasados.length > 0) {
    const n = ctx.itensAtrasados.length
    partes.push(
      n === 1 ? '1 prazo atrasado precisa de atenção' : `${n} prazos atrasados precisam de atenção`,
    )
  }

  const audiencias = ctx.itensHoje.filter((i) => i.tipo === 'audiencia').length
  if (audiencias > 0) {
    partes.push(audiencias === 1 ? '1 audiência hoje' : `${audiencias} audiências hoje`)
  }

  const fatais = ctx.itensHoje.filter((i) => i.prazoFatal).length
  if (fatais > 0) {
    partes.push(fatais === 1 ? '1 prazo fatal hoje' : `${fatais} prazos fatais hoje`)
  }

  const tarefas = ctx.itensHoje.filter((i) => i.tipo === 'tarefa' && !i.prazoFatal).length
  if (tarefas > 0 && partes.length < 2) {
    partes.push(tarefas === 1 ? '1 tarefa para hoje' : `${tarefas} tarefas para hoje`)
  }

  if (partes.length === 0) {
    return 'Sua agenda está tranquila hoje. Aproveite para organizar pendências e atualizar lançamentos de horas.'
  }

  let frase = partes.join(' · ') + '.'

  if (ctx.metaStatus === 'atrasada' && ctx.cobraveisPendentes > 0) {
    frase +=
      ctx.cobraveisPendentes === 1
        ? ' Há 1 tarefa cobrável pendente — fechá-la avança a meta.'
        : ` Há ${ctx.cobraveisPendentes} tarefas cobráveis pendentes — fechá-las avança a meta.`
  }

  return frase
}

// ============================================
// RESPONSES
// ============================================

function successResponse(data: any) {
  return new Response(JSON.stringify({ sucesso: true, ...data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ sucesso: false, erro: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
