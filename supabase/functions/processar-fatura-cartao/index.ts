// Edge Function: processar-fatura-cartao
// Processa PDFs de faturas de cartão de crédito usando IA
// Prioridade: Claude Haiku 4.5 (principal) → GPT-5 (fallback)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PDF_SIZE_MB = 20
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024

const CLAUDE_MODEL = 'claude-haiku-4-5'
const GPT_MODEL = 'gpt-5'

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

// Prompt padrão para extração de dados
function buildPrompt(cartao: { banco: string; nome: string; bandeira: string }) {
  return `Você é um assistente especializado em extrair dados de faturas de cartão de crédito brasileiras.

Analise a fatura do cartão ${cartao.banco} - ${cartao.nome} (bandeira ${cartao.bandeira}) e extraia todas as transações.

Para cada transação, extraia:
- data: Data da compra no formato YYYY-MM-DD
- descricao: Nome do estabelecimento/descrição
- valor: Valor em reais (número decimal positivo, sem R$ e sem sinal)
- parcela: Se for compra parcelada, formato "1/3" ou null se não for
- categoria_sugerida: Uma das categorias: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, outras
- confianca: Nível de confiança na extração de 0 a 1
- tipo_transacao: "debito" para compras/gastos normais, "credito" para devoluções/estornos/pagamentos. Identifique pelo contexto: valores com "C", "+", "CR", "CREDITO", "ESTORNO", "DEVOLUCAO" ou sinal negativo geralmente são créditos. Na dúvida, assuma "debito"

Também extraia:
- valor_total: Valor total da fatura
- data_vencimento: Data de vencimento no formato YYYY-MM-DD
- data_fechamento: Data de fechamento no formato YYYY-MM-DD (se disponível)

Retorne APENAS um JSON válido no formato:
{
  "transacoes": [...],
  "valor_total": 1234.56,
  "data_vencimento": "2025-01-20",
  "data_fechamento": "2025-01-13"
}

IMPORTANTE: Retorne APENAS o JSON, sem explicações ou markdown.`
}

// Processar com Claude Haiku 4.5 (principal - com skill PDF para extração otimizada)
async function processWithClaude(
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
      'anthropic-beta': 'code-execution-2025-08-25,skills-2025-10-02',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      container: {
        skills: [{ type: 'anthropic', skill_id: 'pdf', version: 'latest' }],
      },
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
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
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Erro na API Anthropic:', errorText)
    throw new Error(`Erro na API do Claude: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // Com skills, a resposta pode ter múltiplos content blocks (text, tool_use, etc.)
  // Precisamos encontrar o bloco de texto com o JSON
  let resultText = ''
  for (const block of data.content) {
    if (block.type === 'text' && block.text) {
      resultText += block.text
    }
  }

  if (!resultText) {
    throw new Error('Claude não retornou texto na resposta')
  }

  return {
    text: resultText,
    model: CLAUDE_MODEL,
  }
}

// Processar com GPT (fallback - envia PDF como base64 via file input)
async function processWithGPT(
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
      max_completion_tokens: 8192,
      messages: [
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
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Erro na API OpenAI:', errorText)
    throw new Error(`Erro na API do GPT: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return {
    text: data.choices[0].message.content,
    model: GPT_MODEL,
  }
}

// Processar com fallback automático: Claude (principal) → GPT (fallback)
async function processWithFallback(
  pdfBase64: string,
  prompt: string,
  anthropicApiKey: string | undefined,
  openaiApiKey: string | undefined
): Promise<{ text: string; model: string }> {
  // Tentar Claude primeiro (principal - suporta PDF nativo)
  if (anthropicApiKey) {
    try {
      console.log(`Processando com Claude (${CLAUDE_MODEL})...`)
      return await processWithClaude(pdfBase64, prompt, anthropicApiKey)
    } catch (claudeError: any) {
      console.error('Claude falhou:', claudeError.message)

      // Se tem GPT disponível, tentar como fallback
      if (openaiApiKey) {
        console.log(`Tentando fallback com GPT (${GPT_MODEL})...`)
        try {
          return await processWithGPT(pdfBase64, prompt, openaiApiKey)
        } catch (gptError: any) {
          console.error('GPT também falhou:', gptError.message)
          throw new Error(`Claude falhou: ${claudeError.message}. GPT (${GPT_MODEL}) também falhou: ${gptError.message}`)
        }
      }

      // Sem fallback disponível
      throw claudeError
    }
  }

  // Se não tem Claude, tentar GPT direto
  if (openaiApiKey) {
    console.log(`Claude não configurado. Tentando GPT (${GPT_MODEL}) direto...`)
    return await processWithGPT(pdfBase64, prompt, openaiApiKey)
  }

  throw new Error('Nenhuma API key configurada (ANTHROPIC_API_KEY ou OPENAI_API_KEY)')
}

// Extrair JSON da resposta
function parseResponse(responseText: string): ResultadoProcessamento {
  try {
    // Tentar parsear diretamente
    return JSON.parse(responseText)
  } catch {
    // Tentar encontrar JSON na resposta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Não foi possível extrair dados estruturados do PDF')
  }
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Verificar se ao menos uma API key existe
    if (!anthropicApiKey && !openaiApiKey) {
      await supabase
        .from('cartoes_credito_importacoes')
        .update({
          status: 'erro',
          erro_mensagem: 'Nenhuma API key configurada. Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY nas variáveis de ambiente.',
          processado_em: new Date().toISOString(),
        })
        .eq('id', importacao_id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma API key configurada (ANTHROPIC_API_KEY ou OPENAI_API_KEY)',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Atualizar status para processando
    await supabase
      .from('cartoes_credito_importacoes')
      .update({ status: 'processando' })
      .eq('id', importacao_id)

    // Buscar informações do cartão
    const { data: cartao } = await supabase
      .from('cartoes_credito')
      .select('nome, banco, bandeira, dia_vencimento')
      .eq('id', cartao_id)
      .single()

    if (!cartao) {
      throw new Error('Cartão não encontrado')
    }

    // Baixar o PDF
    let pdfBase64: string

    try {
      const pdfResponse = await fetch(arquivo_url)
      if (!pdfResponse.ok) {
        throw new Error('Erro ao baixar PDF')
      }

      const pdfBuffer = await pdfResponse.arrayBuffer()

      // Validar tamanho do PDF
      if (pdfBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
        const sizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(1)
        throw new Error(`PDF muito grande (${sizeMB}MB). O tamanho máximo permitido é ${MAX_PDF_SIZE_MB}MB.`)
      }

      const bytes = new Uint8Array(pdfBuffer)
      const chunkSize = 8192
      let binaryString = ''
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binaryString += String.fromCharCode(...chunk)
      }
      pdfBase64 = btoa(binaryString)
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error)
      throw new Error(error.message || 'Não foi possível baixar o arquivo PDF')
    }

    // Construir prompt
    const prompt = buildPrompt(cartao)

    // Processar com fallback automático (Claude → GPT)
    const aiResponse = await processWithFallback(pdfBase64, prompt, anthropicApiKey, openaiApiKey)

    // Extrair JSON da resposta
    const resultado = parseResponse(aiResponse.text)

    // Calcular estatísticas
    const transacoesValidas = resultado.transacoes || []
    const confiancaMedia =
      transacoesValidas.length > 0
        ? transacoesValidas.reduce((acc, t) => acc + (t.confianca || 0.8), 0) / transacoesValidas.length
        : 0

    // Salvar resultado
    await supabase
      .from('cartoes_credito_importacoes')
      .update({
        status: 'concluido',
        transacoes_encontradas: transacoesValidas.length,
        transacoes_importadas: 0,
        modelo_ia: aiResponse.model,
        confianca_media: Math.round(confiancaMedia * 100),
        dados_extraidos: resultado,
        processado_em: new Date().toISOString(),
      })
      .eq('id', importacao_id)

    return new Response(
      JSON.stringify({
        success: true,
        importacao_id,
        model: aiResponse.model,
        transacoes_encontradas: transacoesValidas.length,
        confianca_media: Math.round(confiancaMedia * 100),
        valor_total: resultado.valor_total,
        data_vencimento: resultado.data_vencimento,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Erro no processamento:', error)

    // Atualizar importação com erro se tiver o ID
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
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
