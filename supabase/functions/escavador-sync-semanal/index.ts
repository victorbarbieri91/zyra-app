// ============================================================================
// EDGE FUNCTION: SYNC SEMANAL ESCAVADOR (plano fixo monitoramento)
// ============================================================================
// Todos os processos ativos com escavador_monitoramento_ativo=true são
// consultados uma vez por semana (domingo 04h BRT). O plano fixo garante
// que o Escavador mantém o cache fresco, então aqui é pull passivo:
// apenas GET /movimentacoes, sem solicitar-atualizacao.
//
// - Limite 15 processos por execução (timeout Edge Function ~150s)
// - Dedup por hash_movimento (processo_id, dia, descrição)
// - Detecta códigos CNJ terminais (22, 848, 246) e cria alertas
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ESCAVADOR_API_BASE = 'https://api.escavador.com/api/v2'
const DEFAULT_LIMIT = 15
const CODIGOS_ENCERRAMENTO = [22, 848, 246]

async function sha1(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function gerarHashLegado(processoId: string, dataIso: string, descricao: string): Promise<string> {
  const dia = dataIso.slice(0, 10)
  return await sha1(`${processoId}|${dia}|${descricao}`)
}

interface EscavadorMovimentacao {
  data: string
  nome: string
  conteudo: string
  codigo?: number
}

async function buscarMovsEscavador(
  numeroCnj: string,
  token: string,
  perPage = 100
): Promise<EscavadorMovimentacao[] | null> {
  const numeroLimpo = numeroCnj.replace(/[.-]/g, '')
  try {
    const response = await fetch(
      `${ESCAVADOR_API_BASE}/processos/numero_cnj/${numeroLimpo}/movimentacoes?page=1&per_page=${perPage}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      }
    )
    if (!response.ok) {
      console.warn(`[Escavador] ${numeroCnj} HTTP ${response.status}`)
      return null
    }
    const data = await response.json()
    return (data.items || []).map((m: Record<string, unknown>) => {
      const classif = m.classificacao_predita as { nome?: string; codigo?: number } | null
      return {
        data: m.data as string,
        nome: classif?.nome || (m.tipo as string) || 'Movimentação',
        conteudo: (m.conteudo || '') as string,
        codigo: classif?.codigo,
      }
    })
  } catch (error) {
    console.warn(`[Escavador] ${numeroCnj} erro: ${(error as Error).message}`)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const inicio = Date.now()
  let body: any = {}
  try { body = await req.json() } catch {}
  const limitProcessos = Math.min(body?.limit || DEFAULT_LIMIT, 100)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN')

  console.log(`=== ESCAVADOR SYNC SEMANAL ${new Date().toISOString()} limit=${limitProcessos} ===`)

  if (!escavadorToken) {
    console.error('ESCAVADOR_API_TOKEN não configurado')
    return new Response(
      JSON.stringify({ sucesso: false, erro: 'token não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: logInsert } = await supabase
    .from('datajud_sync_log')
    .insert({ fonte: 'escavador' })
    .select('id')
    .single()
  const logId = logInsert?.id

  // Seleciona processos ATIVOS com monitoramento Escavador ativo,
  // priorizando os que têm datajud_ultimo_check mais antigo (ou NULL = nunca).
  const { data: processos, error: queryError } = await supabase
    .from('processos_processos')
    .select('id, numero_cnj, escritorio_id, datajud_ultimo_check')
    .eq('status', 'ativo')
    .eq('escavador_monitoramento_ativo', true)
    .not('numero_cnj', 'is', null)
    .order('datajud_ultimo_check', { ascending: true, nullsFirst: true })
    .limit(limitProcessos)

  if (queryError || !processos || processos.length === 0) {
    console.log(`Nenhum processo (erro: ${queryError?.message || 'vazio'})`)
    if (logId) {
      await supabase.from('datajud_sync_log').update({
        duracao_ms: Date.now() - inicio,
        processos_consultados: 0,
      }).eq('id', logId)
    }
    return new Response(
      JSON.stringify({ sucesso: true, processos_consultados: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`Processos a consultar: ${processos.length}`)

  let totalMovsNovas = 0
  let totalBackfill = 0
  let totalEncontrados = 0
  let totalAlertas = 0
  const erros: any[] = []

  for (const p of processos) {
    // Consulta direta — o plano fixo do Escavador mantém o cache fresco
    const movs = await buscarMovsEscavador(p.numero_cnj!, escavadorToken)
    if (!movs) {
      erros.push({ processo: p.id, erro: 'falha na busca' })
      continue
    }
    totalEncontrados++

    // Dedup: carrega hash + id + conteudo_completo existentes do processo
    const { data: existentes } = await supabase
      .from('processos_movimentacoes')
      .select('id, hash_movimento, conteudo_completo')
      .eq('processo_id', p.id)
    const mapaExistentes = new Map<string, { id: string; conteudo_completo: string | null }>()
    for (const m of existentes || []) {
      if ((m as any).hash_movimento) {
        mapaExistentes.set((m as any).hash_movimento, {
          id: (m as any).id,
          conteudo_completo: (m as any).conteudo_completo,
        })
      }
    }

    const movsParaInserir: any[] = []
    const movsParaBackfill: { id: string; conteudo_completo: string }[] = []
    const alertasNovos: any[] = []

    for (const mov of movs) {
      if (!mov.data) continue
      const dataIso = mov.data.includes('T') ? mov.data : `${mov.data}T12:00:00Z`
      const descricao = (mov.nome || mov.conteudo || 'Movimentação').slice(0, 500)
      const conteudoCompleto = mov.conteudo && mov.conteudo.trim().length > 0 ? mov.conteudo : null
      const hash = await gerarHashLegado(p.id, dataIso, descricao)

      const existente = mapaExistentes.get(hash)
      if (existente) {
        // Backfill de conteudo_completo para movs antigas que entraram sem o texto bruto
        if (!existente.conteudo_completo && conteudoCompleto) {
          movsParaBackfill.push({ id: existente.id, conteudo_completo: conteudoCompleto })
        }
        continue
      }
      mapaExistentes.set(hash, { id: '', conteudo_completo: conteudoCompleto })

      movsParaInserir.push({
        processo_id: p.id,
        escritorio_id: p.escritorio_id,
        data_movimento: dataIso,
        tipo_descricao: mov.nome,
        descricao,
        conteudo_completo: conteudoCompleto,
        fonte_codigo: 'escavador',
        codigo_cnj_movimento: mov.codigo || null,
        hash_movimento: hash,
        origem: 'escavador',
        importante: mov.codigo ? CODIGOS_ENCERRAMENTO.includes(mov.codigo) : false,
        lida: false,
      })

      if (mov.codigo && CODIGOS_ENCERRAMENTO.includes(mov.codigo)) {
        alertasNovos.push({
          escritorio_id: p.escritorio_id,
          processo_id: p.id,
          codigo_cnj_detectado: mov.codigo,
          nome_evento: mov.nome,
          data_evento: dataIso,
        })
      }
    }

    // Backfill: preenche conteudo_completo em movs antigas que entraram vazias
    for (const upd of movsParaBackfill) {
      const { error: bfErr } = await supabase
        .from('processos_movimentacoes')
        .update({ conteudo_completo: upd.conteudo_completo })
        .eq('id', upd.id)
      if (!bfErr) totalBackfill++
    }

    if (movsParaInserir.length > 0) {
      const { error: insErr } = await supabase
        .from('processos_movimentacoes')
        .insert(movsParaInserir)
      if (!insErr) {
        totalMovsNovas += movsParaInserir.length
      } else if (insErr.code === '23505') {
        // Fallback um-a-um
        for (const m of movsParaInserir) {
          const { error: e2 } = await supabase.from('processos_movimentacoes').insert(m)
          if (!e2) totalMovsNovas++
        }
      } else {
        console.warn(`Erro batch insert ${p.numero_cnj}: ${insErr.message}`)
      }
    }

    // Alertas de encerramento (idempotente via unique constraint)
    for (const alerta of alertasNovos) {
      const { error: ae } = await supabase
        .from('processos_alertas_encerramento')
        .insert(alerta)
      if (!ae) totalAlertas++
    }

    // Atualiza timestamp pra priorização na próxima rodada
    await supabase
      .from('processos_processos')
      .update({ datajud_ultimo_check: new Date().toISOString() })
      .eq('id', p.id)
  }

  const duracaoMs = Date.now() - inicio
  if (logId) {
    await supabase.from('datajud_sync_log').update({
      duracao_ms: duracaoMs,
      processos_consultados: processos.length,
      processos_encontrados: totalEncontrados,
      movimentacoes_novas: totalMovsNovas,
      alertas_encerramento_criados: totalAlertas,
      erros: erros.length > 0 ? erros : null
    }).eq('id', logId)
  }

  console.log(`=== FIM ${duracaoMs}ms procs=${processos.length} novas=${totalMovsNovas} backfill=${totalBackfill} alertas=${totalAlertas} ===`)

  return new Response(
    JSON.stringify({
      sucesso: true,
      duracao_ms: duracaoMs,
      processos_consultados: processos.length,
      processos_encontrados: totalEncontrados,
      movimentacoes_novas: totalMovsNovas,
      conteudo_backfill: totalBackfill,
      alertas_encerramento_criados: totalAlertas,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
