// ============================================================================
// EDGE FUNCTION: PROCESSA FILA escavador_acoes_pendentes
// ============================================================================
// Roda a cada 15min via pg_cron.
// Drena a tabela escavador_acoes_pendentes em batches de 50:
//   - acao='CREATE': POST /monitoramentos/processos com frequencia=SEMANAL
//     → salva escavador_monitoramento_id + escavador_monitoramento_ativo=true
//   - acao='DELETE': DELETE /monitoramentos/processos/{id}
//     → zera escavador_monitoramento_id + escavador_monitoramento_ativo=false
// Marca executado_em ou erro em cada ação processada.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ESCAVADOR_API_BASE = 'https://api.escavador.com/api/v2'
const DEFAULT_BATCH = 50

interface Acao {
  id: string
  processo_id: string
  acao: 'CREATE' | 'DELETE'
  monitoramento_id: number | null
}

async function escavadorCreate(numeroCnj: string, token: string): Promise<{ ok: boolean; monitoramento_id?: number; erro?: string }> {
  try {
    // API v2 exige campo 'numero' (sem pontuação), não 'numero_cnj'
    const numeroLimpo = numeroCnj.replace(/[.-]/g, '')
    const response = await fetch(
      `${ESCAVADOR_API_BASE}/monitoramentos/processos`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: numeroLimpo, frequencia: 'SEMANAL' })
      }
    )
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, erro: `HTTP ${response.status}: ${text.slice(0, 150)}` }
    }
    const data = await response.json()
    return { ok: true, monitoramento_id: data.id }
  } catch (error) {
    return { ok: false, erro: (error as Error).message }
  }
}

async function escavadorDelete(monitoramentoId: number, token: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const response = await fetch(
      `${ESCAVADOR_API_BASE}/monitoramentos/processos/${monitoramentoId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    // 404 = já foi removido, trata como sucesso
    if (!response.ok && response.status !== 404) {
      return { ok: false, erro: `HTTP ${response.status}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, erro: (error as Error).message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const inicio = Date.now()
  let body: any = {}
  try { body = await req.json() } catch {}
  const batchSize = Math.min(body?.batch || DEFAULT_BATCH, 100)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN')

  console.log(`=== ESCAVADOR FILA PENDENTES ${new Date().toISOString()} batch=${batchSize} ===`)

  if (!escavadorToken) {
    console.error('ESCAVADOR_API_TOKEN não configurado')
    return new Response(
      JSON.stringify({ sucesso: false, erro: 'token não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Lê ações pendentes com join em processos_processos para pegar numero_cnj
  const { data: acoes, error: queryError } = await supabase
    .from('escavador_acoes_pendentes')
    .select(`
      id,
      processo_id,
      acao,
      monitoramento_id,
      processos_processos!inner(numero_cnj)
    `)
    .is('executado_em', null)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (queryError || !acoes || acoes.length === 0) {
    console.log(`Nenhuma ação pendente (erro: ${queryError?.message || 'vazio'})`)
    return new Response(
      JSON.stringify({ sucesso: true, acoes_processadas: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`Ações a processar: ${acoes.length}`)

  let criadas = 0
  let removidas = 0
  let erros = 0

  for (const acao of acoes) {
    const numeroCnj = (acao as any).processos_processos?.numero_cnj

    let resultado: { ok: boolean; monitoramento_id?: number; erro?: string }

    if (acao.acao === 'CREATE') {
      if (!numeroCnj) {
        resultado = { ok: false, erro: 'sem numero_cnj' }
      } else {
        console.log(`[CREATE] ${numeroCnj}`)
        resultado = await escavadorCreate(numeroCnj, escavadorToken)
        console.log(`[CREATE] ${numeroCnj} resultado:`, JSON.stringify(resultado))
        if (resultado.ok && resultado.monitoramento_id) {
          // Grava o ID do monitoramento e ativa no processo
          await supabase
            .from('processos_processos')
            .update({
              escavador_monitoramento_id: resultado.monitoramento_id,
              escavador_monitoramento_ativo: true
            })
            .eq('id', acao.processo_id)
          criadas++
        }
      }
    } else if (acao.acao === 'DELETE') {
      if (!acao.monitoramento_id) {
        // Sem ID para deletar, marca como sucesso (nada a fazer)
        resultado = { ok: true }
      } else {
        resultado = await escavadorDelete(acao.monitoramento_id, escavadorToken)
        if (resultado.ok) {
          await supabase
            .from('processos_processos')
            .update({
              escavador_monitoramento_id: null,
              escavador_monitoramento_ativo: false
            })
            .eq('id', acao.processo_id)
          removidas++
        }
      }
    } else {
      resultado = { ok: false, erro: 'ação inválida' }
    }

    // Marca ação como processada (ou com erro)
    await supabase
      .from('escavador_acoes_pendentes')
      .update({
        executado_em: new Date().toISOString(),
        erro: resultado.ok ? null : (resultado.erro || 'erro desconhecido')
      })
      .eq('id', acao.id)

    if (!resultado.ok) erros++
  }

  const duracaoMs = Date.now() - inicio
  console.log(`=== FIM ${duracaoMs}ms criadas=${criadas} removidas=${removidas} erros=${erros} ===`)

  return new Response(
    JSON.stringify({
      sucesso: true,
      duracao_ms: duracaoMs,
      acoes_processadas: acoes.length,
      monitoramentos_criados: criadas,
      monitoramentos_removidos: removidas,
      erros,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
