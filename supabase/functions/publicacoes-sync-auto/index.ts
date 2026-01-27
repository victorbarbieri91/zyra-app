// ============================================
// EDGE FUNCTION: SINCRONIZAÇÃO AUTOMÁTICA DE PUBLICAÇÕES
// ============================================
// Executa automaticamente às 07h e 15h (horário de Brasília)
// Sincroniza AASP e Diário Oficial (Escavador) para todos os escritórios

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URLs das APIs
const AASP_API_BASE = 'https://intimacaoapi.aasp.org.br'
const ESCAVADOR_API_BASE = 'https://api.escavador.com/api/v1'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Aceitar chamada manual ou automática (cron)
    let body = {}
    try {
      body = await req.json()
    } catch {
      // Chamada automática do cron não tem body
    }

    const { escritorio_id } = body as { escritorio_id?: string }

    // Criar cliente Supabase com service role (bypass RLS)
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

    console.log('=== SINCRONIZAÇÃO AUTOMÁTICA DE PUBLICAÇÕES ===')
    console.log('Timestamp:', new Date().toISOString())

    // Se não passou escritório, buscar todos
    let escritorios: { id: string }[] = []

    if (escritorio_id) {
      escritorios = [{ id: escritorio_id }]
    } else {
      const { data, error } = await supabase
        .from('escritorios')
        .select('id')
        .eq('ativo', true)

      if (error) {
        console.error('Erro ao buscar escritórios:', error)
        return errorResponse('Erro ao buscar escritórios', 500)
      }
      escritorios = data || []
    }

    console.log(`Processando ${escritorios.length} escritório(s)`)

    const resultados: any[] = []

    for (const escritorio of escritorios) {
      console.log(`\n--- Escritório: ${escritorio.id} ---`)

      const resultadoEscritorio = {
        escritorio_id: escritorio.id,
        aasp: { novas: 0, erros: [] as string[] },
        escavador: { novas: 0, vinculadas: 0, erros: [] as string[] }
      }

      // ========== SINCRONIZAR AASP ==========
      try {
        const aaspResult = await sincronizarAASP(supabase, escritorio.id)
        resultadoEscritorio.aasp = aaspResult
      } catch (error: any) {
        console.error('Erro AASP:', error)
        resultadoEscritorio.aasp.erros.push(error.message)
      }

      // ========== SINCRONIZAR ESCAVADOR ==========
      try {
        const escavadorResult = await sincronizarEscavador(supabase, escritorio.id)
        resultadoEscritorio.escavador = escavadorResult
      } catch (error: any) {
        console.error('Erro Escavador:', error)
        resultadoEscritorio.escavador.erros.push(error.message)
      }

      resultados.push(resultadoEscritorio)
    }

    // Calcular totais
    const totalNovas = resultados.reduce((acc, r) =>
      acc + r.aasp.novas + r.escavador.novas, 0
    )

    console.log('\n=== SINCRONIZAÇÃO CONCLUÍDA ===')
    console.log(`Total de novas publicações: ${totalNovas}`)

    return successResponse({
      sucesso: true,
      mensagem: `Sincronização automática concluída`,
      escritorios_processados: escritorios.length,
      total_novas: totalNovas,
      detalhes: resultados
    })

  } catch (error: any) {
    console.error('Erro geral na Edge Function:', error)
    return errorResponse(error.message, 500)
  }
})

// ============================================
// SINCRONIZAÇÃO AASP
// ============================================

async function sincronizarAASP(supabase: any, escritorioId: string) {
  const resultado = { novas: 0, erros: [] as string[] }

  // Buscar associados ativos
  const { data: associados, error } = await supabase
    .from('publicacoes_associados')
    .select('*')
    .eq('escritorio_id', escritorioId)
    .eq('ativo', true)

  if (error || !associados || associados.length === 0) {
    console.log('Nenhum associado AASP ativo para este escritório')
    return resultado
  }

  // Registrar sync
  const syncId = crypto.randomUUID()
  await supabase.from('publicacoes_sincronizacoes').insert({
    id: syncId,
    escritorio_id: escritorioId,
    tipo: 'automatica',
    data_inicio: new Date().toISOString(),
    sucesso: false,
    publicacoes_novas: 0,
    publicacoes_atualizadas: 0,
  })

  const requestHeaders = {
    'Accept': 'application/json',
    'User-Agent': 'ZyraLegal/1.0',
  }

  const hoje = new Date()
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`

  for (const associado of associados) {
    try {
      const url = `${AASP_API_BASE}/api/Associado/intimacao/json?chave=${associado.aasp_chave}&data=${encodeURIComponent(dataFormatada)}&diferencial=false`

      const response = await fetch(url, { method: 'GET', headers: requestHeaders })

      if (!response.ok) {
        console.error(`AASP erro para ${associado.nome}: ${response.status}`)
        continue
      }

      const responseData = await response.json()

      if (responseData.erro === true) continue

      let publicacoes: any[] = []
      if (Array.isArray(responseData)) {
        publicacoes = responseData
      } else if (responseData.intimacoes) {
        publicacoes = responseData.intimacoes
      }

      for (const pub of publicacoes) {
        const saved = await salvarPublicacaoAASP(supabase, escritorioId, associado.id, pub)
        if (saved === 'nova') resultado.novas++
      }

      // Atualizar última sync do associado
      await supabase
        .from('publicacoes_associados')
        .update({ ultima_sync: new Date().toISOString() })
        .eq('id', associado.id)

    } catch (err: any) {
      resultado.erros.push(`${associado.nome}: ${err.message}`)
    }
  }

  // Atualizar log de sync
  await supabase
    .from('publicacoes_sincronizacoes')
    .update({
      data_fim: new Date().toISOString(),
      sucesso: resultado.erros.length === 0,
      publicacoes_novas: resultado.novas,
      erro_mensagem: resultado.erros.join('; ') || null
    })
    .eq('id', syncId)

  console.log(`AASP: ${resultado.novas} novas publicações`)
  return resultado
}

// ============================================
// SINCRONIZAÇÃO ESCAVADOR
// ============================================

async function sincronizarEscavador(supabase: any, escritorioId: string) {
  const resultado = { novas: 0, vinculadas: 0, erros: [] as string[] }

  // Buscar termos ativos
  const { data: termos, error } = await supabase
    .from('publicacoes_termos_escavador')
    .select('*')
    .eq('escritorio_id', escritorioId)
    .eq('ativo', true)
    .not('escavador_monitoramento_id', 'is', null)

  if (error || !termos || termos.length === 0) {
    console.log('Nenhum termo Escavador ativo para este escritório')
    return resultado
  }

  const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN')
  if (!escavadorToken) {
    resultado.erros.push('Token Escavador não configurado')
    return resultado
  }

  // Registrar sync
  const syncId = crypto.randomUUID()
  await supabase.from('publicacoes_sync_escavador').insert({
    id: syncId,
    escritorio_id: escritorioId,
    tipo: 'automatica',
    data_inicio: new Date().toISOString(),
    sucesso: false,
    publicacoes_novas: 0,
    publicacoes_duplicadas: 0,
    publicacoes_vinculadas: 0,
  })

  const headers = {
    'Authorization': `Bearer ${escavadorToken}`,
    'Content-Type': 'application/json',
  }

  for (const termo of termos) {
    try {
      // Buscar aparições do monitoramento
      const url = `${ESCAVADOR_API_BASE}/monitoramentos/${termo.escavador_monitoramento_id}/aparicoes?limit=50`

      const response = await fetch(url, { method: 'GET', headers })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Escavador erro para termo ${termo.termo}: ${response.status}`)
        resultado.erros.push(`${termo.termo}: ${response.status}`)
        continue
      }

      const data = await response.json()
      const aparicoes = data.items || data.aparicoes || []

      for (const aparicao of aparicoes) {
        const saved = await salvarPublicacaoEscavador(supabase, escritorioId, termo.id, aparicao)
        if (saved === 'nova') resultado.novas++
        if (saved === 'vinculada') resultado.vinculadas++
      }

      // Atualizar última sync do termo
      await supabase
        .from('publicacoes_termos_escavador')
        .update({
          ultima_sync: new Date().toISOString(),
          total_aparicoes: (termo.total_aparicoes || 0) + resultado.novas
        })
        .eq('id', termo.id)

    } catch (err: any) {
      resultado.erros.push(`${termo.termo}: ${err.message}`)
    }
  }

  // Atualizar log de sync
  await supabase
    .from('publicacoes_sync_escavador')
    .update({
      data_fim: new Date().toISOString(),
      sucesso: resultado.erros.length === 0,
      publicacoes_novas: resultado.novas,
      publicacoes_vinculadas: resultado.vinculadas,
      erro_mensagem: resultado.erros.join('; ') || null
    })
    .eq('id', syncId)

  console.log(`Escavador: ${resultado.novas} novas, ${resultado.vinculadas} vinculadas`)
  return resultado
}

// ============================================
// SALVAR PUBLICAÇÃO AASP
// ============================================

async function salvarPublicacaoAASP(
  supabase: any,
  escritorioId: string,
  associadoId: string,
  pub: any
): Promise<'nova' | 'existente'> {
  const aaspId = pub.codigoRelacionamento || pub.numeroPublicacao || pub.id || `${Date.now()}`

  // Verificar se já existe
  const { data: existente } = await supabase
    .from('publicacoes_publicacoes')
    .select('id')
    .eq('escritorio_id', escritorioId)
    .eq('aasp_id', String(aaspId))
    .single()

  if (existente) return 'existente'

  const textoCompleto = pub.textoPublicacao || pub.texto || ''
  const hashConteudo = await gerarHash(textoCompleto)

  let dataPublicacao = new Date().toISOString().split('T')[0]
  if (pub.jornal?.dataDisponibilizacao_Publicacao) {
    dataPublicacao = pub.jornal.dataDisponibilizacao_Publicacao.split('T')[0]
  }

  await supabase.from('publicacoes_publicacoes').insert({
    escritorio_id: escritorioId,
    associado_id: associadoId,
    aasp_id: String(aaspId),
    data_publicacao: dataPublicacao,
    data_captura: new Date().toISOString(),
    tribunal: pub.titulo || pub.jornal?.nomeJornal || 'Não informado',
    tipo_publicacao: mapearTipo(pub.cabecalho || pub.tipo || ''),
    numero_processo: pub.numeroUnicoProcesso || null,
    texto_completo: textoCompleto,
    hash_conteudo: hashConteudo,
    status: 'pendente',
    urgente: detectarUrgencia(textoCompleto),
    source: 'aasp_api',
    source_type: 'aasp',
  })

  return 'nova'
}

// ============================================
// SALVAR PUBLICAÇÃO ESCAVADOR
// ============================================

async function salvarPublicacaoEscavador(
  supabase: any,
  escritorioId: string,
  termoId: string,
  aparicao: any
): Promise<'nova' | 'existente' | 'vinculada'> {
  const escavadorId = String(aparicao.id || aparicao.aparicao_id)

  // Verificar se já existe
  const { data: existente } = await supabase
    .from('publicacoes_publicacoes')
    .select('id')
    .eq('escritorio_id', escritorioId)
    .eq('escavador_aparicao_id', escavadorId)
    .single()

  if (existente) return 'existente'

  const textoCompleto = aparicao.texto || aparicao.conteudo || ''
  const hashConteudo = await gerarHash(textoCompleto)

  // Extrair CNJ do texto
  const cnjRegex = /\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g
  const matches = textoCompleto.match(cnjRegex)
  const numeroCNJ = matches && matches.length > 0 ? matches[0] : null

  // Verificar se existe processo com este CNJ
  let processoId = null
  let vinculado = false

  if (numeroCNJ) {
    const { data: processo } = await supabase
      .from('processos')
      .select('id')
      .eq('escritorio_id', escritorioId)
      .eq('numero_cnj', numeroCNJ)
      .single()

    if (processo) {
      processoId = processo.id
      vinculado = true
    }
  }

  await supabase.from('publicacoes_publicacoes').insert({
    escritorio_id: escritorioId,
    escavador_aparicao_id: escavadorId,
    escavador_monitoramento_id: termoId,
    data_publicacao: aparicao.data_publicacao || new Date().toISOString().split('T')[0],
    data_captura: new Date().toISOString(),
    tribunal: aparicao.diario?.nome || aparicao.fonte || 'Diário Oficial',
    tipo_publicacao: mapearTipo(aparicao.tipo || ''),
    numero_processo: numeroCNJ,
    processo_id: processoId,
    texto_completo: textoCompleto,
    hash_conteudo: hashConteudo,
    status: 'pendente',
    urgente: detectarUrgencia(textoCompleto),
    source: 'escavador',
    source_type: 'escavador_termo',
    confianca_vinculacao: vinculado ? 100 : null,
  })

  return vinculado ? 'vinculada' : 'nova'
}

// ============================================
// HELPERS
// ============================================

function mapearTipo(tipo: string): string {
  const t = tipo.toLowerCase()
  if (t.includes('intima')) return 'intimacao'
  if (t.includes('senten')) return 'sentenca'
  if (t.includes('despa')) return 'despacho'
  if (t.includes('decis')) return 'decisao'
  if (t.includes('acord')) return 'acordao'
  if (t.includes('cita')) return 'citacao'
  return 'outro'
}

function detectarUrgencia(texto: string): boolean {
  const t = texto.toLowerCase()
  const palavras = ['urgente', 'liminar', 'tutela', 'prazo fatal', 'habeas corpus']
  return palavras.some(p => t.includes(p))
}

async function gerarHash(texto: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(texto)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function successResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message, sucesso: false }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
