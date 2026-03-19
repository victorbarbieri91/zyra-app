// ============================================
// EDGE FUNCTION: Processar E-mail para Tarefa
// ============================================
// Recebe texto de e-mail e usa IA para extrair:
// - titulo (assunto limpo)
// - descricao (resumo do corpo)
// - tipo_sugerido (baseado no conteudo)
// - prioridade_sugerida (baseada em urgencia)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailProcessado {
  titulo: string
  descricao: string
  tipo_sugerido: string
  prioridade_sugerida: 'alta' | 'media' | 'baixa'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email_text, modo } = await req.json()

    if (!email_text || typeof email_text !== 'string') {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'email_text e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limitar tamanho do texto para evitar tokens excessivos
    const textoLimitado = email_text.slice(0, 4000)
    const modoAtual = modo === 'consultivo' ? 'consultivo' : 'contencioso'

    // Buscar chave DeepSeek
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekKey) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Chave DeepSeek nao configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tiposContencioso = [
      'prazo_processual - Prazos judiciais com calculo de dias',
      'acompanhamento - Acompanhamento de processos/clientes',
      'follow_up - Follow-up e contato com clientes',
      'administrativo - Tarefas administrativas internas',
      'outro - Outras tarefas que nao se encaixam acima',
    ].join('\n')

    const tiposConsultivo = [
      'cons_parecer - Elaboracao de pareceres juridicos',
      'cons_contrato - Analise/revisao/elaboracao de contratos',
      'cons_pesquisa - Pesquisa de legislacao e jurisprudencia',
      'cons_providencia - Providencias internas do escritorio',
      'cons_outro - Outras tarefas consultivas',
    ].join('\n')

    const tiposDisponiveis = modoAtual === 'consultivo' ? tiposConsultivo : tiposContencioso

    const systemPrompt = `Voce e um assistente juridico de um escritorio de advocacia brasileiro.
Sua tarefa e analisar o texto de um e-mail e extrair informacoes para criar uma tarefa juridica.

REGRAS:
1. Extraia o assunto principal do e-mail como titulo (maximo 80 caracteres, claro e conciso)
2. Resuma o corpo do e-mail como descricao (maximo 300 caracteres, incluindo pontos-chave e acoes necessarias)
3. Sugira o tipo de tarefa mais adequado dentre as opcoes abaixo
4. Avalie a urgencia: se menciona prazo curto, audiencia proxima, ou linguagem urgente → alta; normal → media; sem urgencia → baixa

TIPOS DE TAREFA DISPONIVEIS (modo ${modoAtual}):
${tiposDisponiveis}

Responda APENAS com um JSON valido:
{
  "titulo": "Titulo limpo e conciso da tarefa",
  "descricao": "Resumo do e-mail com pontos-chave e acoes",
  "tipo_sugerido": "tipo_escolhido",
  "prioridade_sugerida": "alta|media|baixa"
}`

    const userPrompt = `Analise este e-mail e extraia as informacoes para criar uma tarefa:

${textoLimitado}

Retorne APENAS o JSON, sem explicacoes.`

    console.log('[Processar Email Tarefa] Chamando DeepSeek...')

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Processar Email Tarefa] Erro DeepSeek:', response.status, errorText)
      return new Response(
        JSON.stringify({ sucesso: false, erro: `Erro na API: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices[0]?.message?.content || ''

    console.log('[Processar Email Tarefa] Resposta:', content)

    // Parsear JSON
    let resultado: EmailProcessado
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON nao encontrado')
      resultado = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('[Processar Email Tarefa] Erro parse:', parseError)
      // Fallback: tentar extrair subject manualmente
      const subjectMatch = email_text.match(/(?:Subject|Assunto):\s*(.+)/i)
      resultado = {
        titulo: subjectMatch?.[1]?.trim().slice(0, 80) || 'Tarefa de e-mail',
        descricao: textoLimitado.slice(0, 300),
        tipo_sugerido: modoAtual === 'consultivo' ? 'cons_outro' : 'outro',
        prioridade_sugerida: 'media',
      }
    }

    return new Response(
      JSON.stringify({ sucesso: true, resultado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Processar Email Tarefa] Erro:', error)
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
