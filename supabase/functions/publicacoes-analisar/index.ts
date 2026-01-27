// ============================================
// EDGE FUNCTION: Analisar Publicacao com IA
// ============================================
// Usa DeepSeek Reasoner para analisar o texto de uma publicacao
// e extrair informacoes estruturadas (prazo, tipo, acao sugerida, etc.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnaliseIA {
  resumo: string
  tipo_publicacao: 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao' | 'citacao' | 'outro'
  tem_prazo: boolean
  prazo_dias?: number
  prazo_tipo?: 'uteis' | 'corridos'
  data_limite_sugerida?: string
  urgente: boolean
  acao_sugerida?: string
  fundamentacao_legal?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { publicacao_id } = await req.json()

    if (!publicacao_id) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'publicacao_id e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar publicacao
    const { data: publicacao, error: pubError } = await supabase
      .from('publicacoes_publicacoes')
      .select('*')
      .eq('id', publicacao_id)
      .single()

    if (pubError || !publicacao) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Publicacao nao encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar cache (analise nas ultimas 24h)
    const { data: analiseExistente } = await supabase
      .from('publicacoes_analises')
      .select('*')
      .eq('publicacao_id', publicacao_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (analiseExistente) {
      console.log('[Analisar Publicacao] Retornando analise em cache')
      return new Response(
        JSON.stringify({ sucesso: true, analise: analiseExistente.resultado, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar chave DeepSeek
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekKey) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Chave DeepSeek nao configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Analisar Publicacao] Chamando DeepSeek...')

    const hoje = new Date().toISOString().split('T')[0]

    const systemPrompt = `Voce e um assistente juridico especializado em analisar publicacoes do Diario Oficial e da Justica.

Sua tarefa e analisar o texto de uma publicacao e extrair informacoes estruturadas.

REGRAS:
1. Seja objetivo e conciso
2. Identifique se ha prazo a cumprir
3. Para prazos, calcule a data limite considerando:
   - Data de hoje: ${hoje}
   - Data da publicacao: ${publicacao.data_publicacao}
   - Prazos processuais geralmente comecam a contar da intimacao/publicacao
4. Identifique o tipo correto da publicacao
5. Marque como urgente se o prazo for menor que 5 dias uteis

Responda APENAS com um JSON valido no seguinte formato:
{
  "resumo": "Resumo conciso em 2-3 frases do conteudo da publicacao",
  "tipo_publicacao": "intimacao|sentenca|despacho|decisao|acordao|citacao|outro",
  "tem_prazo": true|false,
  "prazo_dias": 15,
  "prazo_tipo": "uteis|corridos",
  "data_limite_sugerida": "YYYY-MM-DD",
  "urgente": true|false,
  "acao_sugerida": "Descricao da acao necessaria, ex: Apresentar contrarrazoes de apelacao",
  "fundamentacao_legal": "Artigo de lei que fundamenta o prazo, se identificavel"
}`

    const userPrompt = `Analise esta publicacao:

TRIBUNAL: ${publicacao.tribunal || 'Nao informado'}
VARA: ${publicacao.vara || 'Nao informada'}
DATA DA PUBLICACAO: ${publicacao.data_publicacao}
PROCESSO: ${publicacao.numero_processo || 'Nao informado'}

TEXTO DA PUBLICACAO:
${publicacao.texto_completo || 'Sem texto disponivel'}

Retorne APENAS o JSON com a analise, sem explicacoes adicionais.`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Analisar Publicacao] Erro DeepSeek:', response.status, errorText)
      return new Response(
        JSON.stringify({ sucesso: false, erro: `Erro na API DeepSeek: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices[0]?.message?.content || ''

    console.log('[Analisar Publicacao] Resposta DeepSeek:', content)

    // Parsear JSON da resposta
    let analise: AnaliseIA
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSON nao encontrado na resposta')
      }
      analise = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('[Analisar Publicacao] Erro ao parsear JSON:', parseError)
      analise = {
        resumo: 'Nao foi possivel analisar automaticamente esta publicacao.',
        tipo_publicacao: 'outro',
        tem_prazo: false,
        urgente: false
      }
    }

    // Salvar analise no banco
    const { error: insertError } = await supabase
      .from('publicacoes_analises')
      .insert({
        publicacao_id,
        escritorio_id: publicacao.escritorio_id,
        resultado: analise,
        modelo: 'deepseek-reasoner',
        tokens_usados: aiResponse.usage?.total_tokens || 0
      })

    if (insertError) {
      console.error('[Analisar Publicacao] Erro ao salvar analise:', insertError)
    }

    // Atualizar tipo_publicacao na publicacao se identificado
    if (analise.tipo_publicacao && analise.tipo_publicacao !== 'outro') {
      await supabase
        .from('publicacoes_publicacoes')
        .update({
          tipo_publicacao: analise.tipo_publicacao,
          urgente: analise.urgente
        })
        .eq('id', publicacao_id)
    }

    return new Response(
      JSON.stringify({ sucesso: true, analise, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Analisar Publicacao] Erro:', error)
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
