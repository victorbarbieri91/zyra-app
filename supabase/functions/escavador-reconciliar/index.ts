// ============================================================================
// EDGE FUNCTION: RECONCILIAR monitoramentos Escavador <-> banco local
// ============================================================================
// Lista TODOS os monitoramentos ativos no Escavador (paginado), bate com
// processos_processos pelo numero_cnj e preenche escavador_monitoramento_id
// + escavador_monitoramento_ativo=true onde estiver faltando.
//
// Uso único / esporádico. Útil quando:
//   - Houve criações duplicadas/perdidas
//   - Migração de banco
//   - Erro "Você já monitora este processo" no fluxo normal de fila
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ESCAVADOR_API_BASE = 'https://api.escavador.com/api/v2'

interface MonitoramentoEscavador {
  id: number
  numero_cnj?: string
  // a API v2 pode usar "numero" também
  numero?: string
}

async function listarMonitoramentos(
  token: string,
  pagina: number = 1
): Promise<{ items: MonitoramentoEscavador[]; tem_mais: boolean }> {
  const response = await fetch(
    `${ESCAVADOR_API_BASE}/monitoramentos/processos?page=${pagina}&per_page=100`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }
  )
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json()
  // Estrutura pode ser { items: [], paginator: {...} } ou { data: [], meta: {...} }
  const items = data.items || data.data || []
  const total = data.paginator?.total || data.meta?.total || items.length
  const ja_pegos = pagina * 100
  return { items, tem_mais: ja_pegos < total }
}

function normalizeNumero(num: string | undefined): string {
  return (num || '').replace(/[.-]/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const inicio = Date.now()

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

  console.log(`=== ESCAVADOR RECONCILIAR ${new Date().toISOString()} ===`)

  // 1. Lista TODOS os monitoramentos no Escavador (paginado)
  const todosMonitoramentos: MonitoramentoEscavador[] = []
  let pagina = 1
  let temMais = true
  while (temMais && pagina <= 20) {
    try {
      const { items, tem_mais } = await listarMonitoramentos(escavadorToken, pagina)
      todosMonitoramentos.push(...items)
      temMais = tem_mais
      pagina++
    } catch (err) {
      console.error(`Erro ao listar página ${pagina}:`, (err as Error).message)
      break
    }
  }

  console.log(`Total monitoramentos no Escavador: ${todosMonitoramentos.length}`)

  if (todosMonitoramentos.length === 0) {
    return new Response(
      JSON.stringify({ sucesso: true, total_escavador: 0, conciliados: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Mapa numero_limpo -> monitoramento_id
  const mapaNumeroToId = new Map<string, number>()
  for (const m of todosMonitoramentos) {
    const numLimpo = normalizeNumero(m.numero_cnj || m.numero)
    if (numLimpo && m.id) {
      mapaNumeroToId.set(numLimpo, m.id)
    }
  }

  // 3. Lista processos ativos sem monitoramento ativo no banco
  const { data: processos } = await supabase
    .from('processos_processos')
    .select('id, numero_cnj')
    .eq('status', 'ativo')
    .not('numero_cnj', 'is', null)
    .or('escavador_monitoramento_ativo.is.null,escavador_monitoramento_ativo.eq.false')

  if (!processos || processos.length === 0) {
    return new Response(
      JSON.stringify({ sucesso: true, total_escavador: todosMonitoramentos.length, conciliados: 0, processos_sem_match: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`Processos ativos sem monitoramento no banco: ${processos.length}`)

  // 4. Para cada processo sem monitoramento, tenta achar pelo número limpo
  let conciliados = 0
  let semMatch = 0
  for (const p of processos) {
    const numLimpo = normalizeNumero(p.numero_cnj!)
    const monId = mapaNumeroToId.get(numLimpo)
    if (monId) {
      await supabase
        .from('processos_processos')
        .update({
          escavador_monitoramento_id: monId,
          escavador_monitoramento_ativo: true
        })
        .eq('id', p.id)
      conciliados++
    } else {
      semMatch++
    }
  }

  const duracaoMs = Date.now() - inicio
  console.log(`=== FIM ${duracaoMs}ms total_escavador=${todosMonitoramentos.length} conciliados=${conciliados} sem_match=${semMatch} ===`)

  return new Response(
    JSON.stringify({
      sucesso: true,
      duracao_ms: duracaoMs,
      total_escavador: todosMonitoramentos.length,
      conciliados,
      processos_sem_match: semMatch,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
