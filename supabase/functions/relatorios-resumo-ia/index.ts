// ============================================
// EDGE FUNCTION: RESUMO DE PROCESSO COM IA
// ============================================
// Gera um resumo do processo para enviar ao cliente
// usando linguagem simples e acessível

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Você é um assistente jurídico que cria resumos de processos para clientes leigos.

O CLIENTE que vai ler NÃO É ADVOGADO. Use linguagem simples e direta.

REGRAS IMPORTANTES:
1. Escreva 2-3 frases curtas e objetivas
2. SEMPRE mencione algo específico sobre o processo - nunca use frases genéricas
3. Se houver movimentações, foque nas mais importantes (decisões, audiências, prazos, sentenças)
4. Se não houver movimentações recentes, descreva a situação atual baseada nos dados do processo (área, fase, objeto)
5. Traduza termos jurídicos para linguagem comum
6. Mencione datas quando relevante

EXEMPLOS DE TRADUÇÃO:
- "Sentença de procedência parcial" -> "O juiz decidiu parcialmente a favor"
- "Audiência de conciliação designada" -> "Audiência de tentativa de acordo marcada"
- "Recurso de apelação interposto" -> "Foi apresentado recurso contra a decisão"
- "Conclusos para despacho" -> "Aguardando análise do juiz"
- "Citação realizada" -> "A outra parte foi oficialmente comunicada"
- "Trânsito em julgado" -> "Decisão final sem mais recursos"
- "Despacho de mero expediente" -> (ignorar se não for relevante)
- "Juntada de petição" -> (mencionar apenas se for relevante o conteúdo)
- "Conclusos para sentença" -> "Aguardando decisão final do juiz"
- "Certidão" -> (geralmente ignorar, exceto se for certidão de trânsito)

NUNCA responda com frases vagas como "processo em andamento" ou "aguardando próximos trâmites".
Sempre seja ESPECÍFICO sobre a situação do processo baseado nas movimentações ou dados fornecidos.`

interface MovimentacaoInput {
  id?: string
  data_movimento: string
  tipo_descricao?: string | null
  descricao: string
}

interface RequestBody {
  processo_id: string
  numero_cnj: string
  area: string
  fase?: string
  status?: string
  cliente_nome: string
  polo_cliente: string
  objeto_acao?: string
  movimentacoes: MovimentacaoInput[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()

    const {
      numero_cnj,
      area,
      fase,
      status,
      cliente_nome,
      polo_cliente,
      objeto_acao,
      movimentacoes
    } = body

    console.log(`[Relatorios Resumo IA] Gerando resumo para: ${numero_cnj}`)

    // Verificar se a chave API está configurada
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      console.error('[Relatorios Resumo IA] ANTHROPIC_API_KEY não configurada')
      // Gerar mensagem básica sem IA
      return successResponse({
        resumo: gerarResumoPadrao(area, fase, status, objeto_acao, polo_cliente)
      })
    }

    // Formatar movimentações para o prompt (últimas 5)
    let movimentacoesTexto = ''
    if (movimentacoes && movimentacoes.length > 0) {
      movimentacoesTexto = movimentacoes
        .slice(0, 5)
        .map((m, i) => {
          const data = formatarData(m.data_movimento)
          const tipo = m.tipo_descricao ? `[${m.tipo_descricao}]` : ''
          return `${i + 1}. ${data} ${tipo}: ${m.descricao}`
        })
        .join('\n')
    }

    // Construir prompt com contexto completo
    const userPrompt = `Crie um resumo do status atual deste processo para enviar ao cliente:

DADOS DO PROCESSO:
- Número: ${numero_cnj}
- Área: ${area}
${fase ? `- Fase atual: ${fase}` : ''}
${status ? `- Status: ${status}` : ''}
- Cliente: ${cliente_nome} (${polo_cliente === 'ativo' ? 'Autor/Requerente' : 'Réu/Requerido'})
${objeto_acao ? `- Objeto da ação: ${objeto_acao}` : ''}

${movimentacoesTexto ? `ÚLTIMAS MOVIMENTAÇÕES (mais recentes primeiro):
${movimentacoesTexto}` : 'Nenhuma movimentação recente registrada.'}

Escreva um resumo de 2-3 frases para o cliente, explicando a situação atual do processo de forma clara e específica. ${movimentacoesTexto ? 'Foque nas movimentações mais importantes.' : 'Descreva a situação baseada na fase e área do processo.'}`

    // Chamar Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Relatorios Resumo IA] Erro API: ${response.status} - ${errorText}`)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()

    // Extrair texto da resposta
    const responseText = result.content?.[0]?.type === 'text'
      ? result.content[0].text.trim()
      : gerarResumoPadrao(area, fase, status, objeto_acao, polo_cliente)

    console.log(`[Relatorios Resumo IA] ✓ Resumo gerado com sucesso`)

    return successResponse({
      resumo: responseText
    })

  } catch (error) {
    console.error('[Relatorios Resumo IA] Erro:', error)
    return errorResponse(error.message || 'Erro ao gerar resumo', 500)
  }
})

// ============================================
// HELPERS
// ============================================

function formatarData(dataString: string): string {
  try {
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR')
  } catch {
    return dataString
  }
}

// Função para gerar resumo básico quando IA não está disponível
function gerarResumoPadrao(
  area: string,
  fase?: string,
  status?: string,
  objeto_acao?: string,
  polo_cliente?: string
): string {
  const polo = polo_cliente === 'ativo' ? 'autor' : 'réu'

  let resumo = `Processo da área ${area?.toLowerCase() || 'jurídica'}`

  if (objeto_acao) {
    resumo += ` referente a ${objeto_acao.toLowerCase()}`
  }

  resumo += `. O cliente figura como ${polo}.`

  if (fase) {
    const faseDescricao: Record<string, string> = {
      'conhecimento': 'O processo está na fase inicial de análise dos fatos e provas.',
      'recursal': 'O processo está em fase de recurso, aguardando decisão do tribunal.',
      'execucao': 'O processo está em fase de execução, buscando o cumprimento da decisão.',
      'cumprimento': 'O processo está em fase de cumprimento de sentença.',
      'encerrado': 'O processo foi encerrado.'
    }
    resumo += ' ' + (faseDescricao[fase.toLowerCase()] || `Atualmente na fase de ${fase.toLowerCase()}.`)
  }

  return resumo
}

// ============================================
// RESPONSES
// ============================================

function successResponse(data: any) {
  return new Response(
    JSON.stringify({ sucesso: true, ...data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ sucesso: false, erro: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
