// ============================================================================
// EDGE FUNCTION: SYNC DataJud (v2 - otimizada)
// ============================================================================
// Roda a cada 1h.
// Processa LIMIT processos por execução para caber no timeout do Edge (~150s).
// Otimizações vs v1:
//   - Carrega TODAS as movs do processo de uma vez (1 SELECT por processo)
//   - Fuzzy match em memória (sem queries por movimentação)
//   - Batch INSERT no final (1 chamada para todas as movs novas)
//   - Limite default: 30 processos por execução
//
// Aceita chamada manual via POST { "processo_id": "<uuid>" } para
// classificar um processo recém-cadastrado em tempo real.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DATAJUD_API_URL = 'https://api-publica.datajud.cnj.jus.br'
const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const ESCAVADOR_API_BASE = 'https://api.escavador.com/api/v2'
const CHUNK_SIZE = 15
const MAX_RETRIES = 3
const REQUEST_TIMEOUT_MS = 30000
const DEFAULT_LIMIT = 20

const CODIGOS_ENCERRAMENTO = [22, 848, 246]

const TRIBUNAL_ALIAS: Record<string, string> = {}
const ESTADUAIS: Record<string, string> = {
  '01':'tjac','02':'tjal','03':'tjap','04':'tjam','05':'tjba','06':'tjce',
  '07':'tjdft','08':'tjes','09':'tjgo','10':'tjma','11':'tjmt','12':'tjms',
  '13':'tjmg','14':'tjpa','15':'tjpb','16':'tjpr','17':'tjpe','18':'tjpi',
  '19':'tjrj','20':'tjrn','21':'tjrs','22':'tjro','23':'tjrr','24':'tjsc',
  '25':'tjse','26':'tjsp','27':'tjto'
}
for (const [tr, alias] of Object.entries(ESTADUAIS)) TRIBUNAL_ALIAS[`8.${tr}`] = alias
for (let i = 1; i <= 6; i++) TRIBUNAL_ALIAS[`4.0${i}`] = `trf${i}`
for (let i = 1; i <= 24; i++) {
  const tr = i.toString().padStart(2, '0')
  TRIBUNAL_ALIAS[`5.${tr}`] = `trt${i}`
}
TRIBUNAL_ALIAS['5.00'] = 'tst'
TRIBUNAL_ALIAS['1.00'] = 'stf'
TRIBUNAL_ALIAS['3.00'] = 'stj'

function aliasFromCNJ(cnj: string): string | null {
  const limpo = cnj.replace(/\D/g, '')
  if (limpo.length !== 20) return null
  const j = limpo[13]
  const tr = limpo.substring(14, 16)
  return TRIBUNAL_ALIAS[`${j}.${tr}`] || null
}

function limparCNJ(cnj: string): string {
  return cnj.replace(/\D/g, '')
}

async function sha1(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function gerarHashDataJud(processoId: string, dataHoraIso: string, codigoCnj: number): Promise<string> {
  const minuto = dataHoraIso.slice(0, 16)
  return await sha1(`${processoId}|${minuto}|${codigoCnj}`)
}

interface MovimentacaoDataJud {
  codigo: number
  nome: string
  dataHora: string
  orgaoJulgador?: { codigo: string; nome: string }
}

interface ProcessoDataJud {
  movimentos: MovimentacaoDataJud[]
  dataHoraUltimaAtualizacao: string | null
}

async function consultarChunk(
  alias: string,
  numerosLimpos: string[],
  attempt = 1
): Promise<Map<string, ProcessoDataJud> | null> {
  const body = {
    query: { terms: { 'numeroProcesso.keyword': numerosLimpos } },
    _source: ['numeroProcesso', 'dataHoraUltimaAtualizacao', 'movimentos'],
    size: numerosLimpos.length + 50
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(
      `${DATAJUD_API_URL}/api_publica_${alias}/_search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `APIKey ${DATAJUD_API_KEY}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    )
    clearTimeout(timeoutId)
    if (!response.ok) {
      console.warn(`[DataJud] ${alias} chunk ${response.status}`)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        return consultarChunk(alias, numerosLimpos, attempt + 1)
      }
      return null
    }
    const data = await response.json()
    const result = new Map<string, ProcessoDataJud>()
    for (const hit of data.hits?.hits || []) {
      const s = hit._source
      result.set(s.numeroProcesso, {
        movimentos: s.movimentos || [],
        dataHoraUltimaAtualizacao: s.dataHoraUltimaAtualizacao || null
      })
    }
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    console.warn(`[DataJud] ${alias} erro tentativa ${attempt}: ${(error as Error).message}`)
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * attempt))
      return consultarChunk(alias, numerosLimpos, attempt + 1)
    }
    return null
  }
}

async function buscarBatch(alias: string, numeros: string[]): Promise<Map<string, ProcessoDataJud>> {
  const final = new Map<string, ProcessoDataJud>()
  for (let i = 0; i < numeros.length; i += CHUNK_SIZE) {
    const chunk = numeros.slice(i, i + CHUNK_SIZE)
    const result = await consultarChunk(alias, chunk)
    if (result) {
      for (const [k, v] of result) final.set(k, v)
    }
  }
  return final
}

async function escavadorDelete(monitoramentoId: number): Promise<{ ok: boolean; erro?: string }> {
  const token = Deno.env.get('ESCAVADOR_API_TOKEN')
  if (!token) return { ok: false, erro: 'ESCAVADOR_API_TOKEN não configurado' }
  try {
    const response = await fetch(
      `${ESCAVADOR_API_BASE}/monitoramentos/processos/${monitoramentoId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
    )
    if (!response.ok && response.status !== 404) {
      return { ok: false, erro: `HTTP ${response.status}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, erro: (error as Error).message }
  }
}

async function escavadorCreate(numeroCnj: string): Promise<{ ok: boolean; monitoramento_id?: number; erro?: string }> {
  const token = Deno.env.get('ESCAVADOR_API_TOKEN')
  if (!token) return { ok: false, erro: 'ESCAVADOR_API_TOKEN não configurado' }
  try {
    const response = await fetch(
      `${ESCAVADOR_API_BASE}/monitoramentos/processos`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cnj: numeroCnj, frequencia: 'SEMANAL' })
      }
    )
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, erro: `HTTP ${response.status}: ${text.slice(0, 100)}` }
    }
    const data = await response.json()
    return { ok: true, monitoramento_id: data.id }
  } catch (error) {
    return { ok: false, erro: (error as Error).message }
  }
}

async function processarFilaEscavador(supabase: any, ativarEscavador: boolean): Promise<number> {
  if (!ativarEscavador) return 0
  const { data: acoes, error } = await supabase
    .from('escavador_acoes_pendentes')
    .select('id, processo_id, acao, monitoramento_id, processos_processos!inner(numero_cnj)')
    .is('executado_em', null)
    .limit(50)
  if (error || !acoes || acoes.length === 0) return 0
  let executadas = 0
  for (const acao of acoes) {
    let resultado: { ok: boolean; monitoramento_id?: number; erro?: string }
    if (acao.acao === 'DELETE' && acao.monitoramento_id) {
      resultado = await escavadorDelete(acao.monitoramento_id)
    } else if (acao.acao === 'CREATE') {
      const cnj = (acao as any).processos_processos?.numero_cnj
      if (!cnj) {
        resultado = { ok: false, erro: 'sem numero_cnj' }
      } else {
        resultado = await escavadorCreate(cnj)
        if (resultado.ok && resultado.monitoramento_id) {
          await supabase
            .from('processos_processos')
            .update({ escavador_monitoramento_id: resultado.monitoramento_id, escavador_monitoramento_ativo: true })
            .eq('id', acao.processo_id)
        }
      }
    } else {
      resultado = { ok: false, erro: 'ação inválida' }
    }
    await supabase
      .from('escavador_acoes_pendentes')
      .update({ executado_em: new Date().toISOString(), erro: resultado.ok ? null : resultado.erro })
      .eq('id', acao.id)
    if (resultado.ok) executadas++
  }
  return executadas
}

// Normaliza texto para fuzzy match (lowercase, sem acentos, espaços únicos)
function normalizeForMatch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface MovExistente {
  id: string
  data_movimento: string
  descricao: string | null
  tipo_descricao: string | null
  hash_movimento: string | null
  data_dia: string  // YYYY-MM-DD para fuzzy match
  desc_norm: string  // descrição normalizada para fuzzy match
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const inicio = Date.now()
  let body: any = {}
  try { body = await req.json() } catch {}

  const processoIdEspecifico = body?.processo_id as string | undefined
  const ativarEscavador = body?.ativar_escavador !== false
  const limitProcessos = Math.min(body?.limit || DEFAULT_LIMIT, 100)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  console.log(`=== DATAJUD SYNC v2 ${new Date().toISOString()} ===`)
  console.log(`processo_id especifico: ${processoIdEspecifico || '(todos)'}`)
  console.log(`limit: ${limitProcessos}, ativar_escavador: ${ativarEscavador}`)

  const { data: logInsert } = await supabase
    .from('datajud_sync_log')
    .insert({ fonte: 'datajud' })
    .select('id')
    .single()
  const logId = logInsert?.id

  let acoesEscavadorExecutadas = 0
  // Fila Escavador é processada NO FINAL para garantir progresso DataJud primeiro

  // ========== SELEÇÃO DOS PROCESSOS ==========
  // Prioriza:
  //   1. Processos com chamadas_com_sucesso=1 (próximos a graduar)
  //   2. Processos desconhecido sem ultimo_check (nunca testados)
  //   3. Processos indexado mais antigos (renovar movs)
  //   4. Processos em_carencia que devem ser consultados hoje

  let processosParaConsultar: any[] = []

  if (processoIdEspecifico) {
    const { data } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, datajud_status, datajud_chamadas_com_sucesso, datajud_tentativas_sem_sucesso, datajud_ultimo_check, escavador_monitoramento_id, escavador_monitoramento_ativo, escritorio_id')
      .eq('id', processoIdEspecifico)
      .single()
    if (data) processosParaConsultar = [data]
  } else {
    // Pega N+buffer e filtra retry exponencial em memória (sem RPC)
    const { data } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, datajud_status, datajud_chamadas_com_sucesso, datajud_tentativas_sem_sucesso, datajud_ultimo_check, escavador_monitoramento_id, escavador_monitoramento_ativo, escritorio_id')
      .eq('status', 'ativo')
      .not('numero_cnj', 'is', null)
      .in('datajud_status', ['desconhecido', 'indexado', 'em_carencia'])
      .order('datajud_ultimo_check', { ascending: true, nullsFirst: true })
      .limit(limitProcessos * 3)

    const agoraDate = new Date()
    for (const p of data || []) {
      const tentativas = p.datajud_tentativas_sem_sucesso || 0
      const ultimoCheck = p.datajud_ultimo_check ? new Date(p.datajud_ultimo_check) : null
      let deveConsultar = false

      if (p.datajud_status === 'indexado' || p.datajud_status === 'desconhecido') {
        deveConsultar = true
      } else if (p.datajud_status === 'em_carencia') {
        if (tentativas <= 30) {
          deveConsultar = true
        } else if (tentativas <= 90) {
          const tresDiasMs = 3 * 24 * 60 * 60 * 1000
          deveConsultar = !ultimoCheck || (agoraDate.getTime() - ultimoCheck.getTime()) >= tresDiasMs
        } else if (tentativas <= 180) {
          const seteDiasMs = 7 * 24 * 60 * 60 * 1000
          deveConsultar = !ultimoCheck || (agoraDate.getTime() - ultimoCheck.getTime()) >= seteDiasMs
        }
      }

      if (deveConsultar) {
        processosParaConsultar.push(p)
        if (processosParaConsultar.length >= limitProcessos) break
      }
    }
  }

  console.log(`Processos a consultar: ${processosParaConsultar.length}`)

  // Agrupa por tribunal
  const grupos = new Map<string, any[]>()
  for (const p of processosParaConsultar) {
    const alias = aliasFromCNJ(p.numero_cnj!)
    if (!alias) continue
    if (!grupos.has(alias)) grupos.set(alias, [])
    grupos.get(alias)!.push(p)
  }

  let totalConsultados = 0
  let totalEncontrados = 0
  let totalMovsNovas = 0
  let totalGraduacoes = 0
  let totalRebaixamentos = 0
  let totalAlertas = 0
  const erros: any[] = []

  // ========== PROCESSAMENTO POR TRIBUNAL ==========
  for (const [alias, processos] of grupos) {
    console.log(`[${alias}] consultando ${processos.length} processos`)
    const numeros = processos.map((p: any) => limparCNJ(p.numero_cnj!))
    const resultadoDataJud = await buscarBatch(alias, numeros)
    totalConsultados += processos.length

    // Coleta IDs dos processos encontrados para batch select de movs existentes
    const processosEncontrados = processos.filter(p => resultadoDataJud.has(limparCNJ(p.numero_cnj!)))

    // Carrega TODAS as movs existentes desses processos em UMA query
    const idsEncontrados = processosEncontrados.map(p => p.id)
    const movsExistentesPorProcesso = new Map<string, MovExistente[]>()

    if (idsEncontrados.length > 0) {
      const { data: movsExistentes } = await supabase
        .from('processos_movimentacoes')
        .select('id, processo_id, data_movimento, descricao, tipo_descricao, hash_movimento')
        .in('processo_id', idsEncontrados)

      for (const m of movsExistentes || []) {
        const lista = movsExistentesPorProcesso.get(m.processo_id) || []
        lista.push({
          ...m,
          data_dia: (m.data_movimento as string).slice(0, 10),
          desc_norm: normalizeForMatch(m.descricao || m.tipo_descricao || '')
        })
        movsExistentesPorProcesso.set(m.processo_id, lista)
      }
    }

    // ========== PROCESSA CADA PROCESSO ==========
    for (const p of processos) {
      const limpo = limparCNJ(p.numero_cnj!)
      const dadosDataJud = resultadoDataJud.get(limpo)
      const agora = new Date().toISOString()

      if (!dadosDataJud) {
        // NÃO ENCONTROU
        const novoTentativas = (p.datajud_tentativas_sem_sucesso || 0) + 1
        let novoStatus = p.datajud_status
        if (p.datajud_status === 'desconhecido') {
          novoStatus = 'em_carencia'
          await supabase
            .from('escavador_acoes_pendentes')
            .insert({ processo_id: p.id, acao: 'CREATE' })
        } else if (p.datajud_status === 'em_carencia' && novoTentativas >= 180) {
          novoStatus = 'nao_indexavel'
          totalRebaixamentos++
        }
        await supabase
          .from('processos_processos')
          .update({
            datajud_status: novoStatus,
            datajud_tentativas_sem_sucesso: novoTentativas,
            datajud_ultimo_check: agora
          })
          .eq('id', p.id)
        continue
      }

      // ENCONTROU
      totalEncontrados++
      const novoChamadasSucesso = (p.datajud_chamadas_com_sucesso || 0) + 1
      const isPrimeiraVez = (p.datajud_chamadas_com_sucesso || 0) === 0
      let novoStatus = p.datajud_status

      if (novoChamadasSucesso >= 2 && p.datajud_status !== 'indexado') {
        novoStatus = 'indexado'
        totalGraduacoes++
        if (p.escavador_monitoramento_ativo && p.escavador_monitoramento_id) {
          await supabase
            .from('escavador_acoes_pendentes')
            .insert({ processo_id: p.id, acao: 'DELETE', monitoramento_id: p.escavador_monitoramento_id })
        }
      }

      const updateData: any = {
        datajud_status: novoStatus,
        datajud_chamadas_com_sucesso: novoChamadasSucesso,
        datajud_ultimo_check: agora
      }
      if (novoStatus === 'indexado' && p.datajud_status !== 'indexado') {
        updateData.datajud_indexado_em = agora
      }
      if (novoStatus === 'indexado' && p.escavador_monitoramento_ativo) {
        updateData.escavador_monitoramento_ativo = false
      }
      await supabase.from('processos_processos').update(updateData).eq('id', p.id)

      // ===== PROCESSAMENTO DE MOVIMENTAÇÕES (em memória) =====
      const movsExistentes = movsExistentesPorProcesso.get(p.id) || []
      const hashesExistentes = new Set(movsExistentes.map(m => m.hash_movimento).filter(Boolean))
      const movsParaInserir: any[] = []
      const promocoes: Array<{ id: string; hash: string; codigo: number; dataHora: string }> = []
      const alertasNovos: any[] = []

      for (const mov of dadosDataJud.movimentos) {
        if (!mov.dataHora || !mov.codigo) continue

        const hash = await gerarHashDataJud(p.id, mov.dataHora, mov.codigo)

        // Já tem esse hash exato? pula (insere/update silencioso)
        if (hashesExistentes.has(hash)) continue

        // Se primeira passagem, tenta fuzzy match em memória
        if (isPrimeiraVez) {
          const dia = mov.dataHora.slice(0, 10)
          const nomeNorm = normalizeForMatch(mov.nome).slice(0, 30)
          const candidato = movsExistentes.find(m =>
            m.data_dia === dia &&
            m.hash_movimento && // ainda não promovido nessa rodada
            !hashesExistentes.has(hash) &&
            m.desc_norm.includes(nomeNorm)
          )
          if (candidato) {
            promocoes.push({
              id: candidato.id,
              hash,
              codigo: mov.codigo,
              dataHora: mov.dataHora
            })
            // Remove do set para não casar de novo
            hashesExistentes.delete(candidato.hash_movimento!)
            hashesExistentes.add(hash)
            // Marca como já consumido localmente
            candidato.hash_movimento = hash
            continue
          }
        }

        // Movimentação genuinamente nova
        movsParaInserir.push({
          processo_id: p.id,
          escritorio_id: p.escritorio_id,
          data_movimento: mov.dataHora,
          tipo_descricao: mov.nome,
          descricao: mov.nome,
          fonte_codigo: 'datajud',
          codigo_cnj_movimento: mov.codigo,
          hash_movimento: hash,
          origem: 'datajud',
          importante: CODIGOS_ENCERRAMENTO.includes(mov.codigo),
          lida: false
        })

        if (CODIGOS_ENCERRAMENTO.includes(mov.codigo)) {
          alertasNovos.push({
            escritorio_id: p.escritorio_id,
            processo_id: p.id,
            codigo_cnj_detectado: mov.codigo,
            nome_evento: mov.nome,
            data_evento: mov.dataHora
          })
        }

        hashesExistentes.add(hash)
      }

      // Aplica promoções (UPDATE em batch via Promise.all)
      if (promocoes.length > 0) {
        await Promise.all(promocoes.map(prom =>
          supabase
            .from('processos_movimentacoes')
            .update({
              hash_movimento: prom.hash,
              codigo_cnj_movimento: prom.codigo,
              data_movimento: prom.dataHora
            })
            .eq('id', prom.id)
        ))
      }

      // Insere movs novas em batch único
      if (movsParaInserir.length > 0) {
        const { error: insErr } = await supabase
          .from('processos_movimentacoes')
          .insert(movsParaInserir)
        if (insErr && insErr.code !== '23505') {
          console.warn(`[${alias}] erro batch insert: ${insErr.message}`)
        } else if (!insErr) {
          totalMovsNovas += movsParaInserir.length
        } else {
          // Algumas duplicaram, fazer fallback um por um
          for (const m of movsParaInserir) {
            const { error: e2 } = await supabase
              .from('processos_movimentacoes')
              .insert(m)
            if (!e2) totalMovsNovas++
          }
        }
      }

      // Insere alertas de encerramento (com ON CONFLICT silencioso)
      if (alertasNovos.length > 0) {
        for (const alerta of alertasNovos) {
          const { error: ae } = await supabase
            .from('processos_alertas_encerramento')
            .insert(alerta)
          if (!ae) totalAlertas++
        }
      }
    }
  }

  // Processa fila Escavador APÓS DataJud (com tempo restante)
  try {
    acoesEscavadorExecutadas = await processarFilaEscavador(supabase, ativarEscavador)
    console.log(`[Fila Escavador] ${acoesEscavadorExecutadas} ações executadas`)
  } catch (e) {
    console.error(`[Fila Escavador] erro: ${(e as Error).message}`)
  }

  const duracaoMs = Date.now() - inicio
  if (logId) {
    await supabase
      .from('datajud_sync_log')
      .update({
        duracao_ms: duracaoMs,
        processos_consultados: totalConsultados,
        processos_encontrados: totalEncontrados,
        movimentacoes_novas: totalMovsNovas,
        graduacoes: totalGraduacoes,
        rebaixamentos: totalRebaixamentos,
        alertas_encerramento_criados: totalAlertas,
        acoes_escavador_executadas: acoesEscavadorExecutadas,
        erros: erros.length > 0 ? erros : null
      })
      .eq('id', logId)
  }

  console.log(`=== FIM ===`)
  console.log(`consultados=${totalConsultados} encontrados=${totalEncontrados} movs_novas=${totalMovsNovas} graduacoes=${totalGraduacoes} duracao=${duracaoMs}ms`)

  return new Response(
    JSON.stringify({
      sucesso: true,
      duracao_ms: duracaoMs,
      processos_consultados: totalConsultados,
      processos_encontrados: totalEncontrados,
      movimentacoes_novas: totalMovsNovas,
      graduacoes: totalGraduacoes,
      rebaixamentos: totalRebaixamentos,
      alertas_encerramento_criados: totalAlertas,
      acoes_escavador_executadas: acoesEscavadorExecutadas
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
