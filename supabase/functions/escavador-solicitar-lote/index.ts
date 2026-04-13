// ============================================================================
// EDGE FUNCTION: SOLICITAR ATUALIZAÇÃO EM LOTE (uso esporádico)
// ============================================================================
// POST /processos/numero_cnj/{cnj}/solicitar-atualizacao para todos os
// processos ativos monitorados. Cada chamada custa ~R$ 0,05 no Escavador.
// O endpoint é assíncrono — o Escavador vai ao tribunal em ~30-60s.
// Depois de ~10min, rodar escavador-sync-semanal para puxar as movs novas.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ESCAVADOR_API_BASE = 'https://api.escavador.com/api/v2'

async function solicitarUm(numeroCnj: string, token: string): Promise<{ ok: boolean; status?: number; erro?: string }> {
  try {
    const numeroLimpo = numeroCnj.replace(/[.-]/g, '')
    const response = await fetch(
      `${ESCAVADOR_API_BASE}/processos/numero_cnj/${numeroLimpo}/solicitar-atualizacao`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    )
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, status: response.status, erro: text.slice(0, 120) }
    }
    return { ok: true, status: response.status }
  } catch (error) {
    return { ok: false, erro: (error as Error).message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const inicio = Date.now()
  let body: any = {}
  try { body = await req.json() } catch {}
  const offset = body?.offset || 0
  const limit = Math.min(body?.limit || 100, 200)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN')

  if (!escavadorToken) {
    return new Response(
      JSON.stringify({ sucesso: false, erro: 'token não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`=== SOLICITAR LOTE ${new Date().toISOString()} offset=${offset} limit=${limit} ===`)

  const { data: processos, error: queryError } = await supabase
    .from('processos_processos')
    .select('id, numero_cnj')
    .eq('status', 'ativo')
    .eq('escavador_monitoramento_ativo', true)
    .not('numero_cnj', 'is', null)
    .order('numero_cnj', { ascending: true })
    .range(offset, offset + limit - 1)

  if (queryError || !processos || processos.length === 0) {
    return new Response(
      JSON.stringify({ sucesso: true, solicitados: 0, erros: 0, erro: queryError?.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`Processos neste lote: ${processos.length}`)

  let ok = 0
  let erros = 0
  const detalhesErros: any[] = []

  for (const p of processos) {
    const r = await solicitarUm(p.numero_cnj!, escavadorToken)
    if (r.ok) {
      ok++
    } else {
      erros++
      if (detalhesErros.length < 10) detalhesErros.push({ cnj: p.numero_cnj, status: r.status, erro: r.erro })
    }
  }

  const duracaoMs = Date.now() - inicio
  console.log(`=== FIM ${duracaoMs}ms ok=${ok} erros=${erros} ===`)

  return new Response(
    JSON.stringify({
      sucesso: true,
      duracao_ms: duracaoMs,
      lote_tamanho: processos.length,
      solicitados: ok,
      erros,
      detalhes_erros: detalhesErros,
      proximo_offset: offset + processos.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
