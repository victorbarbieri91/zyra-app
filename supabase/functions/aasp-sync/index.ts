// ============================================
// EDGE FUNCTION: SINCRONIZAÇÃO AASP
// ============================================
// Busca publicações da API de Intimações da AASP
// e salva no banco de dados do sistema

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL base da API AASP
const AASP_API_BASE = 'https://intimacaoapi.aasp.org.br'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, escritorio_id, associado_id, chave } = await req.json()

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

    console.log('Cliente Supabase criado com service role')

    switch (action) {
      case 'test':
        // Testar conexão com uma chave específica
        return await testarConexao(chave)

      case 'sync_all':
        // Sincronizar todos os associados ativos do escritório
        if (!escritorio_id) {
          return errorResponse('escritorio_id é obrigatório', 400)
        }
        return await sincronizarTodos(supabase, escritorio_id)

      case 'sync_one':
        // Sincronizar um associado específico
        if (!escritorio_id || !associado_id) {
          return errorResponse('escritorio_id e associado_id são obrigatórios', 400)
        }
        return await sincronizarAssociado(supabase, escritorio_id, associado_id)

      default:
        return errorResponse('Ação inválida', 400)
    }

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return errorResponse(error.message, 500)
  }
})

// ============================================
// TESTE DE CONEXÃO
// ============================================

async function testarConexao(chave: string) {
  if (!chave) {
    return errorResponse('Chave é obrigatória para teste', 400)
  }

  // Headers que simulam um navegador real
  const requestHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }

  try {
    // Formatar data de hoje no padrão DD/MM/YYYY (formato brasileiro)
    const hoje = new Date()
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`

    // A API AASP REQUER o parâmetro data
    const url = `${AASP_API_BASE}/api/Associado/intimacao/json?chave=${chave}&data=${encodeURIComponent(dataFormatada)}`

    console.log('=== TESTE DE CONEXÃO AASP ===')
    console.log('URL:', url.replace(chave, '***'))
    console.log('Data:', dataFormatada)
    console.log('Chave (primeiros 4 chars):', chave.substring(0, 4) + '...')
    console.log('Chave length:', chave.length)
    console.log('Headers:', JSON.stringify(requestHeaders))

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro AASP (endpoint principal):', response.status, errorText.substring(0, 500))

      // Se erro, verificar detalhes
      if (response.status === 400) {
        // Parse do erro para mostrar mensagem mais clara
        try {
          const errorJson = JSON.parse(errorText)
          return successResponse({
            sucesso: false,
            mensagem: errorJson.status || 'Erro na requisição',
            detalhes: errorJson
          })
        } catch {
          // Se não for JSON, mostrar texto
        }
      }

      // Se 404 no endpoint principal, tentar endpoint alternativo
      if (response.status === 404) {
        console.log('Tentando endpoint alternativo GetJornaisComIntimacoes...')

        const urlAlt = `${AASP_API_BASE}/api/Associado/intimacao/GetJornaisComIntimacoes/json?chave=${chave}&qtdeDias=30`

        const responseAlt = await fetch(urlAlt, {
          method: 'GET',
          headers: requestHeaders,
        })

        console.log('Response alternativo status:', responseAlt.status)

        if (responseAlt.ok) {
          const dataAlt = await responseAlt.json()
          return successResponse({
            sucesso: true,
            mensagem: 'Conexão estabelecida via endpoint alternativo!',
            endpoint_usado: 'GetJornaisComIntimacoes',
            dados_exemplo: dataAlt
          })
        }

        const errorTextAlt = await responseAlt.text()
        console.error('Erro AASP (endpoint alternativo):', responseAlt.status, errorTextAlt.substring(0, 500))

        return successResponse({
          sucesso: false,
          mensagem: `API AASP retornou erro 404. Verifique se a chave está correta.`,
          detalhes: {
            endpoint_principal_status: response.status,
            endpoint_alternativo_status: responseAlt.status,
            erro_preview: errorText.substring(0, 200)
          }
        })
      }

      if (response.status === 401 || response.status === 403) {
        return successResponse({
          sucesso: false,
          mensagem: 'Chave inválida ou sem permissão'
        })
      }

      return successResponse({
        sucesso: false,
        mensagem: `Erro na API AASP: ${response.status}`
      })
    }

    // Tentar fazer parse do JSON para verificar se é válido
    let responseData
    try {
      responseData = await response.json()
      console.log('Resposta JSON recebida:', JSON.stringify(responseData).substring(0, 500))
    } catch (parseError) {
      const textResponse = await response.text()
      console.log('Resposta não é JSON:', textResponse.substring(0, 500))

      return successResponse({
        sucesso: true,
        mensagem: 'Conexão estabelecida, mas resposta não é JSON válido',
        resposta_preview: textResponse.substring(0, 200)
      })
    }

    // Verificar se há dados ou mensagem de erro na resposta
    const hasData = Array.isArray(responseData)
      ? responseData.length > 0
      : (responseData.intimacoes?.length > 0 || responseData.publicacoes?.length > 0 || Object.keys(responseData).length > 0)

    return successResponse({
      sucesso: true,
      mensagem: hasData
        ? 'Conexão estabelecida com sucesso! Publicações encontradas.'
        : 'Conexão estabelecida com sucesso! Nenhuma publicação pendente.',
      total_registros: Array.isArray(responseData) ? responseData.length : undefined
    })

  } catch (error) {
    console.error('Erro ao testar conexão:', error)
    return successResponse({
      sucesso: false,
      mensagem: `Erro de conexão: ${error.message}`
    })
  }
}

// ============================================
// SINCRONIZAÇÃO DE TODOS OS ASSOCIADOS
// ============================================

async function sincronizarTodos(supabase: any, escritorioId: string) {
  // Buscar todos os associados ativos
  const { data: associados, error: assocError } = await supabase
    .from('publicacoes_associados')
    .select('*')
    .eq('escritorio_id', escritorioId)
    .eq('ativo', true)

  if (assocError) {
    console.error('Erro ao buscar associados:', assocError)
    return errorResponse('Erro ao buscar associados', 500)
  }

  if (!associados || associados.length === 0) {
    return successResponse({
      sucesso: false,
      mensagem: 'Nenhum associado ativo encontrado'
    })
  }

  // Registrar início da sincronização
  const syncLogId = crypto.randomUUID()
  const dataInicio = new Date().toISOString()

  console.log('=== INICIANDO SINCRONIZAÇÃO ===')
  console.log('Escritório ID:', escritorioId)
  console.log('Sync Log ID:', syncLogId)
  console.log('Associados ativos encontrados:', associados.length)

  const { error: insertError } = await supabase.from('publicacoes_sincronizacoes').insert({
    id: syncLogId,
    escritorio_id: escritorioId,
    tipo: 'manual',
    data_inicio: dataInicio,
    sucesso: false, // Será atualizado ao final
    publicacoes_novas: 0,
    publicacoes_atualizadas: 0,
  })

  if (insertError) {
    console.error('Erro ao criar log de sincronização:', insertError)
    return errorResponse(`Erro ao criar log: ${insertError.message}`, 500)
  }

  console.log('Log de sincronização criado com sucesso')

  let totalNovas = 0
  let totalAtualizadas = 0
  const erros: string[] = []

  // Sincronizar cada associado
  for (const associado of associados) {
    try {
      const resultado = await buscarPublicacoesAssociado(supabase, escritorioId, associado)
      totalNovas += resultado.novas
      totalAtualizadas += resultado.atualizadas
    } catch (error) {
      console.error(`Erro ao sincronizar ${associado.nome}:`, error)
      erros.push(`${associado.nome}: ${error.message}`)
    }
  }

  // Atualizar log de sincronização
  console.log('=== FINALIZANDO SINCRONIZAÇÃO ===')
  console.log('Total novas:', totalNovas)
  console.log('Total atualizadas:', totalAtualizadas)
  console.log('Erros:', erros.length)

  const { error: updateError } = await supabase
    .from('publicacoes_sincronizacoes')
    .update({
      data_fim: new Date().toISOString(),
      sucesso: erros.length === 0,
      publicacoes_novas: totalNovas,
      publicacoes_atualizadas: totalAtualizadas,
      erro_mensagem: erros.length > 0 ? erros.join('; ') : null,
    })
    .eq('id', syncLogId)

  if (updateError) {
    console.error('Erro ao atualizar log de sincronização:', updateError)
  } else {
    console.log('Log de sincronização atualizado com sucesso')
  }

  return successResponse({
    sucesso: erros.length === 0,
    mensagem: erros.length > 0
      ? `Sincronização concluída com ${erros.length} erro(s)`
      : 'Sincronização concluída com sucesso',
    publicacoes_novas: totalNovas,
    publicacoes_atualizadas: totalAtualizadas,
    erros: erros.length > 0 ? erros : undefined
  })
}

// ============================================
// SINCRONIZAÇÃO DE UM ASSOCIADO
// ============================================

async function sincronizarAssociado(supabase: any, escritorioId: string, associadoId: string) {
  // Buscar associado
  const { data: associado, error: assocError } = await supabase
    .from('publicacoes_associados')
    .select('*')
    .eq('id', associadoId)
    .eq('escritorio_id', escritorioId)
    .single()

  if (assocError || !associado) {
    return errorResponse('Associado não encontrado', 404)
  }

  // Registrar sincronização
  const syncLogId = crypto.randomUUID()

  await supabase.from('publicacoes_sincronizacoes').insert({
    id: syncLogId,
    escritorio_id: escritorioId,
    associado_id: associadoId,
    tipo: 'manual',
    data_inicio: new Date().toISOString(),
    sucesso: false,
    publicacoes_novas: 0,
    publicacoes_atualizadas: 0,
  })

  try {
    const resultado = await buscarPublicacoesAssociado(supabase, escritorioId, associado)

    // Atualizar log
    await supabase
      .from('publicacoes_sincronizacoes')
      .update({
        data_fim: new Date().toISOString(),
        sucesso: true,
        publicacoes_novas: resultado.novas,
        publicacoes_atualizadas: resultado.atualizadas,
      })
      .eq('id', syncLogId)

    return successResponse({
      sucesso: true,
      mensagem: 'Sincronização concluída',
      publicacoes_novas: resultado.novas,
      publicacoes_atualizadas: resultado.atualizadas
    })

  } catch (error) {
    // Registrar erro
    await supabase
      .from('publicacoes_sincronizacoes')
      .update({
        data_fim: new Date().toISOString(),
        sucesso: false,
        erro_mensagem: error.message,
      })
      .eq('id', syncLogId)

    return errorResponse(error.message, 500)
  }
}

// ============================================
// BUSCAR PUBLICAÇÕES NA API AASP
// ============================================

async function buscarPublicacoesAssociado(
  supabase: any,
  escritorioId: string,
  associado: any
): Promise<{ novas: number; atualizadas: number }> {

  // Headers que simulam navegador
  const requestHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  let totalNovas = 0
  let totalAtualizadas = 0

  // A API AASP requer uma data específica, então vamos buscar os últimos 7 dias
  // (para não sobrecarregar a API na primeira sync)
  const hoje = new Date()
  const diasParaBuscar = 7

  console.log(`Buscando publicações para ${associado.nome} (últimos ${diasParaBuscar} dias)...`)

  for (let i = 0; i < diasParaBuscar; i++) {
    const data = new Date(hoje)
    data.setDate(data.getDate() - i)
    const dataFormatada = `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`

    const url = `${AASP_API_BASE}/api/Associado/intimacao/json?chave=${associado.aasp_chave}&data=${encodeURIComponent(dataFormatada)}&diferencial=false`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      })

      if (!response.ok) {
        console.error(`Erro AASP para ${dataFormatada}:`, response.status)
        continue // Tentar próxima data
      }

      const responseData = await response.json()

      console.log('=== RESPOSTA AASP para ' + dataFormatada + ' ===')
      console.log('Tipo:', typeof responseData)
      console.log('É array?:', Array.isArray(responseData))
      console.log('Chaves:', responseData ? Object.keys(responseData) : 'null')
      console.log('Conteúdo COMPLETO:', JSON.stringify(responseData))

      // Verificar se há erro EXPLÍCITO na resposta (erro: true, não apenas a existência da propriedade)
      if (responseData.erro === true) {
        console.log(`Erro explícito para ${dataFormatada}: ${responseData.status || responseData.mensagem}`)
        continue
      }

      // A resposta pode vir em vários formatos:
      // 1. Array direto de intimações
      // 2. Objeto com propriedade 'intimacoes'
      // 3. Objeto com propriedade 'Intimacoes' (maiúsculo)
      // 4. Objeto com propriedade 'data' ou 'dados'
      // 5. A resposta em si é a lista
      let publicacoes: any[] = []

      if (Array.isArray(responseData)) {
        publicacoes = responseData
      } else if (responseData.intimacoes && Array.isArray(responseData.intimacoes)) {
        publicacoes = responseData.intimacoes
      } else if (responseData.Intimacoes && Array.isArray(responseData.Intimacoes)) {
        publicacoes = responseData.Intimacoes
      } else if (responseData.data && Array.isArray(responseData.data)) {
        publicacoes = responseData.data
      } else if (responseData.dados && Array.isArray(responseData.dados)) {
        publicacoes = responseData.dados
      } else if (responseData.publicacoes && Array.isArray(responseData.publicacoes)) {
        publicacoes = responseData.publicacoes
      } else {
        // Se não encontrou array, verificar se o objeto em si tem dados úteis
        // (pode ser um único registro ou objeto com dados aninhados)
        console.log('Formato não reconhecido, verificando estrutura...')
        console.log('Todas as propriedades:', Object.keys(responseData))

        // Verificar se alguma propriedade é um array com conteúdo
        for (const key of Object.keys(responseData)) {
          const value = responseData[key]
          if (Array.isArray(value) && value.length > 0) {
            console.log('Array encontrado em propriedade: ' + key + ' com ' + value.length + ' itens')
            publicacoes = value
            break
          }
        }

        // Se ainda não encontrou, verificar se o objeto é uma única publicação
        if (publicacoes.length === 0 && (responseData.processo || responseData.Processo || responseData.texto || responseData.Texto || responseData.dataPublicacao || responseData.DataPublicacao)) {
          publicacoes = [responseData]
          console.log('Tratando objeto como publicação única')
        }
      }

      console.log(`${dataFormatada}: ${publicacoes.length} publicações encontradas`)

      for (const pub of publicacoes) {
        const resultado = await salvarPublicacao(supabase, escritorioId, associado.id, pub)
        if (resultado === 'nova') totalNovas++
        else if (resultado === 'atualizada') totalAtualizadas++
      }
    } catch (err) {
      console.error(`Erro ao buscar ${dataFormatada}:`, err)
      continue
    }
  }

  console.log(`Total para ${associado.nome}: ${totalNovas} novas, ${totalAtualizadas} atualizadas`)

  // Atualizar última sync do associado
  await supabase
    .from('publicacoes_associados')
    .update({
      ultima_sync: new Date().toISOString(),
    })
    .eq('id', associado.id)

  // Incrementar contador de publicações
  if (totalNovas > 0) {
    try {
      const { error: rpcError } = await supabase.rpc('incrementar_publicacoes_associado', {
        p_associado_id: associado.id,
        p_quantidade: totalNovas
      })
      if (rpcError) {
        console.log('Function incrementar_publicacoes_associado não existe ou erro:', rpcError.message)
      }
    } catch (rpcErr) {
      console.log('Erro ao chamar RPC:', rpcErr)
    }
  }

  return { novas: totalNovas, atualizadas: totalAtualizadas }
}

// ============================================
// SALVAR PUBLICAÇÃO NO BANCO
// ============================================

async function salvarPublicacao(
  supabase: any,
  escritorioId: string,
  associadoId: string,
  pub: any
): Promise<'nova' | 'atualizada' | 'existente'> {

  // Extrair ID único da AASP
  // Campos conhecidos da API: codigoRelacionamento, numeroPublicacao
  const aaspId = pub.codigoRelacionamento ||
                 pub.numeroPublicacao ||
                 pub.id ||
                 pub.codigo ||
                 `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  console.log('Salvando publicação com AASP ID:', aaspId)

  // Verificar se já existe
  const { data: existente } = await supabase
    .from('publicacoes_publicacoes')
    .select('id, hash_conteudo')
    .eq('escritorio_id', escritorioId)
    .eq('aasp_id', String(aaspId))
    .single()

  // Extrair texto completo - campo da API AASP é textoPublicacao
  const textoCompleto = pub.textoPublicacao || pub.texto || pub.conteudo || pub.descricao || ''
  const hashConteudo = await gerarHash(textoCompleto)

  // Extrair data de publicação do objeto jornal
  let dataPublicacao = null
  if (pub.jornal && pub.jornal.dataDisponibilizacao_Publicacao) {
    dataPublicacao = pub.jornal.dataDisponibilizacao_Publicacao.split('T')[0]
  } else {
    dataPublicacao = parseDataAAsp(pub.dataPublicacao || pub.data)
  }

  // Extrair tribunal - pode estar em titulo ou jornal.nomeJornal
  const tribunal = pub.titulo || (pub.jornal && pub.jornal.nomeJornal) || pub.tribunal || 'Não informado'

  // Extrair número do processo - campo da API é numeroUnicoProcesso
  const numeroProcesso = pub.numeroUnicoProcesso || pub.processo || pub.numeroProcesso || null

  // Extrair tipo do cabecalho
  const tipoPub = pub.cabecalho ? pub.cabecalho.trim().replace(/[\r\n]/g, '') : (pub.tipo || pub.tipoPublicacao || 'outro')

  console.log('Dados extraídos - Tribunal:', tribunal, '| Processo:', numeroProcesso, '| Tipo:', tipoPub)

  // Mapear dados da API para nosso schema
  const registro = {
    escritorio_id: escritorioId,
    associado_id: associadoId,
    aasp_id: String(aaspId),
    data_publicacao: dataPublicacao,
    data_captura: new Date().toISOString(),
    tribunal: tribunal,
    vara: pub.vara || pub.unidade || null,
    tipo_publicacao: mapearTipoPublicacao(tipoPub),
    numero_processo: numeroProcesso,
    partes: extrairPartes(pub),
    texto_completo: textoCompleto,
    pdf_url: pub.pdfUrl || pub.linkPdf || null,
    hash_conteudo: hashConteudo,
    status: 'pendente',
    urgente: detectarUrgencia(textoCompleto, pub),
    source: 'aasp_api',
  }

  if (existente) {
    // Verificar se houve mudança
    if (existente.hash_conteudo === hashConteudo) {
      console.log(`Publicação ${aaspId} já existe e não mudou`)
      return 'existente'
    }

    // Atualizar registro existente
    const { error: updateError } = await supabase
      .from('publicacoes_publicacoes')
      .update({
        ...registro,
        updated_at: new Date().toISOString()
      })
      .eq('id', existente.id)

    if (updateError) {
      console.error('Erro ao atualizar publicação:', updateError)
      return 'existente'
    }

    console.log(`Publicação ${aaspId} atualizada`)
    return 'atualizada'
  }

  // Inserir nova publicação
  const { error: insertError } = await supabase
    .from('publicacoes_publicacoes')
    .insert(registro)

  if (insertError) {
    console.error('Erro ao inserir publicação:', insertError)
    return 'existente'
  }

  console.log(`Nova publicação inserida: ${aaspId}`)
  return 'nova'
}

// ============================================
// HELPERS
// ============================================

function parseDataAAsp(data: any): string {
  if (!data) return new Date().toISOString().split('T')[0]

  // Se já está em formato ISO
  if (typeof data === 'string' && data.includes('-')) {
    return data.split('T')[0]
  }

  // Formato DD/MM/YYYY
  if (typeof data === 'string' && data.includes('/')) {
    const [dia, mes, ano] = data.split('/')
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  return new Date().toISOString().split('T')[0]
}

function mapearTipoPublicacao(tipo: string | undefined): string {
  if (!tipo) return 'outro'

  const tipoLower = tipo.toLowerCase()

  if (tipoLower.includes('intima')) return 'intimacao'
  if (tipoLower.includes('senten')) return 'sentenca'
  if (tipoLower.includes('despa')) return 'despacho'
  if (tipoLower.includes('decis')) return 'decisao'
  if (tipoLower.includes('acord') || tipoLower.includes('acórd')) return 'acordao'
  if (tipoLower.includes('cita')) return 'citacao'

  return 'outro'
}

function extrairPartes(pub: any): string[] {
  const partes: string[] = []

  if (pub.autor) partes.push(`Autor: ${pub.autor}`)
  if (pub.reu || pub.réu) partes.push(`Réu: ${pub.reu || pub.réu}`)
  if (pub.partes && Array.isArray(pub.partes)) {
    partes.push(...pub.partes)
  }
  if (pub.partesProcesso) partes.push(pub.partesProcesso)

  return partes
}

function detectarUrgencia(texto: string, pub: any): boolean {
  const textoLower = texto.toLowerCase()

  // Palavras-chave de urgência
  const palavrasUrgentes = [
    'urgente', 'urgência', 'liminar', 'tutela',
    'citação pessoal', 'prazo fatal', 'improrrogável',
    'mandado de segurança', 'habeas corpus'
  ]

  if (palavrasUrgentes.some(p => textoLower.includes(p))) {
    return true
  }

  // Tipos urgentes
  const tiposUrgentes = ['sentenca', 'acordao', 'decisao']
  if (pub.tipo && tiposUrgentes.includes(mapearTipoPublicacao(pub.tipo))) {
    return true
  }

  return false
}

async function gerarHash(texto: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(texto)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================
// RESPONSE HELPERS
// ============================================

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
