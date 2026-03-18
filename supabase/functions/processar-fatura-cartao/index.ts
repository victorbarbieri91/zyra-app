// Edge Function: processar-fatura-cartao
// Processa PDFs de faturas de cartão de crédito usando IA
// Estratégia:
//   1. Tenta extrair texto do PDF (custo zero)
//   2. Se conseguiu texto → envia TEXTO para GPT-5 mini (muito barato)
//   3. Se não conseguiu → envia PDF base64 para GPT-5 mini (mais caro, mas funciona)
// Fallback IA: GPT-5 mini (primário) → Claude Haiku sem betas (fallback)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PDF_SIZE_MB = 20
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024

const GPT_MODEL = 'gpt-5-mini'
const CLAUDE_FALLBACK_MODEL = 'claude-haiku-3-5-sonnet-20241022'

interface TransacaoExtraida {
  data: string
  descricao: string
  valor: number
  parcela: string | null
  categoria_sugerida: string
  confianca: number
  tipo_transacao: 'debito' | 'credito'
}

interface ResultadoProcessamento {
  transacoes: TransacaoExtraida[]
  valor_total: number
  data_vencimento: string | null
  data_fechamento: string | null
}

// ========================================
// Extração de texto do PDF
// ========================================

// Tenta extrair texto do PDF usando unpdf (via esm.sh)
async function tryExtractPdfText(pdfBuffer: ArrayBuffer): Promise<string | null> {
  try {
    // Import dinâmico via esm.sh para compatibilidade com Deno Deploy
    const { extractText } = await import('https://esm.sh/unpdf@0.12.1')
    const result = await extractText(new Uint8Array(pdfBuffer))
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text || '')

    // Verificar se o texto extraído é útil (mínimo de conteúdo)
    if (text.trim().length < 100) {
      console.log(`Texto extraído muito curto (${text.trim().length} chars), usando PDF direto`)
      return null
    }

    console.log(`Texto extraído com sucesso: ${text.length} caracteres`)
    return text
  } catch (error: any) {
    console.warn(`Extração de texto falhou (${error.message}), usando PDF base64 direto`)
    return null
  }
}

// Converte ArrayBuffer para base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 8192
  let binaryString = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binaryString += String.fromCharCode(...chunk)
  }
  return btoa(binaryString)
}

// ========================================
// Prompts
// ========================================

function buildPrompt(cartao: { banco: string; nome: string; bandeira: string }, isTextMode: boolean) {
  const sourceDesc = isTextMode ? 'o TEXTO EXTRAÍDO da' : 'a'

  return `Você é um assistente especializado em extrair dados de faturas de cartão de crédito brasileiras.

Analise ${sourceDesc} fatura do cartão ${cartao.banco} - ${cartao.nome} (bandeira ${cartao.bandeira}) e extraia TODAS as transações.

Para cada transação, extraia:
- data: Data da compra no formato YYYY-MM-DD
- descricao: Nome do estabelecimento/descrição
- valor: Valor em reais (número decimal positivo, sem R$ e sem sinal)
- parcela: Se for compra parcelada, formato "1/3" ou null se não for
- categoria_sugerida: Uma das categorias: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, outros
- confianca: Nível de confiança na extração de 0 a 1
- tipo_transacao: "debito" para compras/gastos normais, "credito" para devoluções/estornos/pagamentos. Identifique pelo contexto: valores com "C", "+", "CR", "CREDITO", "ESTORNO", "DEVOLUCAO" ou sinal negativo geralmente são créditos. Na dúvida, assuma "debito"

Também extraia:
- valor_total: Valor total da fatura
- data_vencimento: Data de vencimento no formato YYYY-MM-DD
- data_fechamento: Data de fechamento no formato YYYY-MM-DD (se disponível)

IMPORTANTE:
- Extraia TODAS as transações sem exceção, não pule nenhuma
- Se houver muitas transações, inclua TODAS no JSON
- Retorne APENAS um JSON válido, sem explicações ou markdown

Retorne no formato:
{
  "transacoes": [...],
  "valor_total": 1234.56,
  "data_vencimento": "2025-01-20",
  "data_fechamento": "2025-01-13"
}`
}

function buildChunkPrompt(
  cartao: { banco: string; nome: string; bandeira: string },
  chunkIndex: number,
  totalChunks: number
) {
  return `Você é um assistente especializado em extrair dados de faturas de cartão de crédito brasileiras.

Esta é a PARTE ${chunkIndex + 1} de ${totalChunks} do texto da fatura do cartão ${cartao.banco} - ${cartao.nome} (bandeira ${cartao.bandeira}).

Extraia TODAS as transações encontradas neste trecho.

Para cada transação, extraia:
- data: Data da compra no formato YYYY-MM-DD
- descricao: Nome do estabelecimento/descrição
- valor: Valor em reais (número decimal positivo, sem R$ e sem sinal)
- parcela: Se for compra parcelada, formato "1/3" ou null se não for
- categoria_sugerida: Uma das categorias: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, outros
- confianca: Nível de confiança na extração de 0 a 1
- tipo_transacao: "debito" ou "credito"

${chunkIndex === 0 ? `Também extraia (se disponível):
- valor_total: Valor total da fatura
- data_vencimento: Data de vencimento no formato YYYY-MM-DD
- data_fechamento: Data de fechamento no formato YYYY-MM-DD` : 'Para valor_total, data_vencimento e data_fechamento, retorne null se não estiverem neste trecho.'}

IMPORTANTE: Retorne APENAS um JSON válido no formato:
{
  "transacoes": [...],
  "valor_total": null,
  "data_vencimento": null,
  "data_fechamento": null
}`
}

// ========================================
// Processamento com IA
// ========================================

// GPT-5 mini com TEXTO extraído (modo barato)
async function processTextWithGPT(
  text: string,
  prompt: string,
  apiKey: string
): Promise<{ text: string; model: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GPT_MODEL,
      max_completion_tokens: 16384,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Aqui está o texto extraído da fatura:\n\n${text}` },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API OpenAI (texto): ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return { text: data.choices[0].message.content, model: `${GPT_MODEL}-text` }
}

// GPT-5 mini com PDF base64 (modo fallback - mais caro mas funciona sempre)
async function processPdfWithGPT(
  pdfBase64: string,
  prompt: string,
  apiKey: string
): Promise<{ text: string; model: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GPT_MODEL,
      max_completion_tokens: 16384,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: {
                filename: 'fatura.pdf',
                file_data: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
            { type: 'text', text: 'Extraia todas as transações desta fatura conforme instruído.' },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API OpenAI (PDF): ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return { text: data.choices[0].message.content, model: `${GPT_MODEL}-pdf` }
}

// Claude Haiku com TEXTO (fallback - SEM skills/betas caras)
async function processTextWithClaude(
  text: string,
  prompt: string,
  apiKey: string
): Promise<{ text: string; model: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_FALLBACK_MODEL,
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nAqui está o texto extraído da fatura:\n\n${text}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API Anthropic: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  let resultText = ''
  for (const block of data.content) {
    if (block.type === 'text' && block.text) {
      resultText += block.text
    }
  }

  if (!resultText) throw new Error('Claude não retornou texto na resposta')
  return { text: resultText, model: `${CLAUDE_FALLBACK_MODEL}-text` }
}

// Claude Haiku com PDF base64 (fallback sem betas)
async function processPdfWithClaude(
  pdfBase64: string,
  prompt: string,
  apiKey: string
): Promise<{ text: string; model: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_FALLBACK_MODEL,
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API Anthropic (PDF): ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  let resultText = ''
  for (const block of data.content) {
    if (block.type === 'text' && block.text) {
      resultText += block.text
    }
  }

  if (!resultText) throw new Error('Claude não retornou texto na resposta')
  return { text: resultText, model: `${CLAUDE_FALLBACK_MODEL}-pdf` }
}

// Processamento com fallback completo
// Modo texto: GPT texto → Claude texto
// Modo PDF: GPT PDF → Claude PDF
async function processWithFallback(
  content: string,
  prompt: string,
  isTextMode: boolean,
  pdfBase64: string,
  openaiApiKey: string | undefined,
  anthropicApiKey: string | undefined
): Promise<{ text: string; model: string }> {

  if (isTextMode) {
    // MODO TEXTO (barato)
    if (openaiApiKey) {
      try {
        console.log('Processando TEXTO com GPT-5 mini...')
        return await processTextWithGPT(content, prompt, openaiApiKey)
      } catch (gptError: any) {
        console.error('GPT (texto) falhou:', gptError.message)
        if (anthropicApiKey) {
          try {
            console.log('Fallback: Claude Haiku com texto...')
            return await processTextWithClaude(content, prompt, anthropicApiKey)
          } catch (claudeError: any) {
            console.error('Claude (texto) também falhou:', claudeError.message)
          }
        }
      }
    } else if (anthropicApiKey) {
      try {
        console.log('Processando TEXTO com Claude Haiku...')
        return await processTextWithClaude(content, prompt, anthropicApiKey)
      } catch (claudeError: any) {
        console.error('Claude (texto) falhou:', claudeError.message)
      }
    }
  }

  // MODO PDF (fallback ou quando texto não está disponível)
  if (openaiApiKey) {
    try {
      console.log('Processando PDF base64 com GPT-5 mini...')
      return await processPdfWithGPT(pdfBase64, prompt, openaiApiKey)
    } catch (gptError: any) {
      console.error('GPT (PDF) falhou:', gptError.message)
      if (anthropicApiKey) {
        try {
          console.log('Fallback: Claude Haiku com PDF...')
          return await processPdfWithClaude(pdfBase64, prompt, anthropicApiKey)
        } catch (claudeError: any) {
          throw new Error(`Todos os métodos falharam. GPT: ${gptError.message}. Claude: ${claudeError.message}`)
        }
      }
      throw gptError
    }
  }

  if (anthropicApiKey) {
    console.log('Processando PDF com Claude Haiku...')
    return await processPdfWithClaude(pdfBase64, prompt, anthropicApiKey)
  }

  throw new Error('Nenhuma API key configurada (OPENAI_API_KEY ou ANTHROPIC_API_KEY)')
}

// ========================================
// Utilidades
// ========================================

function parseResponse(responseText: string): ResultadoProcessamento {
  try {
    return JSON.parse(responseText)
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Não foi possível extrair dados estruturados da resposta da IA')
  }
}

function splitTextIntoChunks(text: string, maxChars: number = 40000): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  const pages = text.split(/\n{2,}/)
  let currentChunk = ''

  for (const page of pages) {
    if (currentChunk.length + page.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = page
    } else {
      currentChunk += '\n\n' + page
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}

function mergeResults(results: ResultadoProcessamento[]): ResultadoProcessamento {
  const allTransacoes: TransacaoExtraida[] = []
  let valorTotal: number | null = null
  let dataVencimento: string | null = null
  let dataFechamento: string | null = null

  for (const result of results) {
    if (result.transacoes) allTransacoes.push(...result.transacoes)
    if (result.valor_total && !valorTotal) valorTotal = result.valor_total
    if (result.data_vencimento && !dataVencimento) dataVencimento = result.data_vencimento
    if (result.data_fechamento && !dataFechamento) dataFechamento = result.data_fechamento
  }

  return {
    transacoes: allTransacoes,
    valor_total: valorTotal || allTransacoes.reduce((sum, t) =>
      sum + (t.tipo_transacao === 'credito' ? -t.valor : t.valor), 0),
    data_vencimento: dataVencimento,
    data_fechamento: dataFechamento,
  }
}

// ========================================
// Handler principal
// ========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { importacao_id, arquivo_url, cartao_id } = await req.json()

    if (!importacao_id || !arquivo_url || !cartao_id) {
      throw new Error('Parâmetros obrigatórios: importacao_id, arquivo_url, cartao_id')
    }

    if (!anthropicApiKey && !openaiApiKey) {
      await supabase
        .from('cartoes_credito_importacoes')
        .update({
          status: 'erro',
          erro_mensagem: 'Nenhuma API key configurada.',
          processado_em: new Date().toISOString(),
        })
        .eq('id', importacao_id)

      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma API key configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Atualizar status
    await supabase
      .from('cartoes_credito_importacoes')
      .update({ status: 'processando' })
      .eq('id', importacao_id)

    // Buscar cartão
    const { data: cartao } = await supabase
      .from('cartoes_credito')
      .select('nome, banco, bandeira, dia_vencimento')
      .eq('id', cartao_id)
      .single()

    if (!cartao) throw new Error('Cartão não encontrado')

    // Baixar PDF
    const pdfResponse = await fetch(arquivo_url)
    if (!pdfResponse.ok) throw new Error('Erro ao baixar PDF')

    const pdfBuffer = await pdfResponse.arrayBuffer()
    if (pdfBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
      const sizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(1)
      throw new Error(`PDF muito grande (${sizeMB}MB). Máximo: ${MAX_PDF_SIZE_MB}MB.`)
    }

    // Converter para base64 (necessário para fallback PDF)
    const pdfBase64 = arrayBufferToBase64(pdfBuffer)

    // ========================================
    // ETAPA 1: Tentar extrair texto (custo zero)
    // ========================================
    const extractedText = await tryExtractPdfText(pdfBuffer)
    const isTextMode = extractedText !== null

    console.log(isTextMode
      ? `Modo TEXTO: ${extractedText!.length} caracteres extraídos`
      : 'Modo PDF: enviando base64 direto para IA'
    )

    // ========================================
    // ETAPA 2: Processar com IA
    // ========================================
    let resultado: ResultadoProcessamento
    let modelUsed = ''

    if (isTextMode && extractedText!.length > 40000) {
      // Fatura grande: chunking do texto
      const chunks = splitTextIntoChunks(extractedText!)
      console.log(`Fatura grande: ${chunks.length} chunks`)
      const chunkResults: ResultadoProcessamento[] = []

      for (let i = 0; i < chunks.length; i++) {
        const chunkPrompt = buildChunkPrompt(cartao, i, chunks.length)
        const aiResponse = await processWithFallback(
          chunks[i], chunkPrompt, true, pdfBase64, openaiApiKey, anthropicApiKey
        )
        chunkResults.push(parseResponse(aiResponse.text))
        modelUsed = aiResponse.model
      }

      resultado = mergeResults(chunkResults)
    } else {
      // Fatura normal: processamento único
      const prompt = buildPrompt(cartao, isTextMode)
      const aiResponse = await processWithFallback(
        extractedText || '', prompt, isTextMode, pdfBase64, openaiApiKey, anthropicApiKey
      )
      resultado = parseResponse(aiResponse.text)
      modelUsed = aiResponse.model
    }

    // Calcular estatísticas
    const transacoesValidas = resultado.transacoes || []
    const confiancaMedia = transacoesValidas.length > 0
      ? transacoesValidas.reduce((acc, t) => acc + (t.confianca || 0.8), 0) / transacoesValidas.length
      : 0

    // Salvar resultado
    await supabase
      .from('cartoes_credito_importacoes')
      .update({
        status: 'concluido',
        transacoes_encontradas: transacoesValidas.length,
        transacoes_importadas: 0,
        modelo_ia: modelUsed,
        confianca_media: Math.round(confiancaMedia * 100),
        dados_extraidos: resultado,
        processado_em: new Date().toISOString(),
      })
      .eq('id', importacao_id)

    return new Response(
      JSON.stringify({
        success: true,
        importacao_id,
        model: modelUsed,
        transacoes_encontradas: transacoesValidas.length,
        confianca_media: Math.round(confiancaMedia * 100),
        valor_total: resultado.valor_total,
        data_vencimento: resultado.data_vencimento,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erro no processamento:', error)

    try {
      const { importacao_id } = await (req.clone()).json()
      if (importacao_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await supabase
          .from('cartoes_credito_importacoes')
          .update({
            status: 'erro',
            erro_mensagem: error.message,
            processado_em: new Date().toISOString(),
          })
          .eq('id', importacao_id)
      }
    } catch {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
