// Edge Function: processar-fatura-cartao
// Processa PDFs de faturas de cartão de crédito usando IA (OpenAI GPT ou Claude)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransacaoExtraida {
  data: string
  descricao: string
  valor: number
  parcela: string | null
  categoria_sugerida: string
  confianca: number
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
- valor: Valor em reais (número decimal, sem R$)
- parcela: Se for compra parcelada, formato "1/3" ou null se não for
- categoria_sugerida: Uma das categorias: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, outras
- confianca: Nível de confiança na extração de 0 a 1

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

// Processar com OpenAI GPT-4o
async function processWithOpenAI(
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
      model: 'gpt-4o',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
                detail: 'high',
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
    throw new Error(`Erro na API do OpenAI: ${response.status}`)
  }

  const data = await response.json()
  return {
    text: data.choices[0].message.content,
    model: 'gpt-4o',
  }
}

// Processar com Claude
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
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
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
    throw new Error(`Erro na API do Claude: ${response.status}`)
  }

  const data = await response.json()
  return {
    text: data.content[0].text,
    model: 'claude-sonnet-4-20250514',
  }
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

    const { importacao_id, arquivo_url, cartao_id, provider } = await req.json()

    if (!importacao_id || !arquivo_url || !cartao_id) {
      throw new Error('Parâmetros obrigatórios: importacao_id, arquivo_url, cartao_id')
    }

    // Determinar qual provider usar (prioridade: parâmetro > OpenAI > Claude)
    let selectedProvider: 'openai' | 'anthropic' | null = null

    if (provider === 'openai' && openaiApiKey) {
      selectedProvider = 'openai'
    } else if (provider === 'anthropic' && anthropicApiKey) {
      selectedProvider = 'anthropic'
    } else if (openaiApiKey) {
      selectedProvider = 'openai'
    } else if (anthropicApiKey) {
      selectedProvider = 'anthropic'
    }

    if (!selectedProvider) {
      await supabase
        .from('cartoes_credito_importacoes')
        .update({
          status: 'erro',
          erro_mensagem: 'Nenhuma API key configurada. Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY nas variáveis de ambiente.',
          processado_em: new Date().toISOString(),
        })
        .eq('id', importacao_id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma API key configurada (OPENAI_API_KEY ou ANTHROPIC_API_KEY)',
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
      pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))
    } catch (error) {
      console.error('Erro ao baixar PDF:', error)
      throw new Error('Não foi possível baixar o arquivo PDF')
    }

    // Construir prompt
    const prompt = buildPrompt(cartao)

    // Processar com o provider selecionado
    let aiResponse: { text: string; model: string }

    console.log(`Processando com ${selectedProvider}...`)

    if (selectedProvider === 'openai') {
      aiResponse = await processWithOpenAI(pdfBase64, prompt, openaiApiKey!)
    } else {
      aiResponse = await processWithClaude(pdfBase64, prompt, anthropicApiKey!)
    }

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
        transacoes_importadas: 0, // Será atualizado quando o usuário confirmar
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
        provider: selectedProvider,
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
