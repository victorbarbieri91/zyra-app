import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { aiRateLimit } from '@/lib/rate-limit'
import { captureOperationError, logger } from '@/lib/logger'

const SYSTEM_PROMPT = `Voce e um assistente juridico que cria resumos de processos para clientes leigos.

O CLIENTE que vai ler NAO E ADVOGADO. Use linguagem simples e direta.

REGRAS IMPORTANTES:
1. Escreva 2-3 frases curtas e objetivas
2. SEMPRE mencione algo especifico sobre o processo - nunca use frases genericas
3. Se houver movimentacoes, foque nas mais importantes (decisoes, audiencias, prazos, sentencas)
4. Se nao houver movimentacoes recentes, descreva a situacao atual baseada nos dados do processo (area, fase, objeto)
5. Traduza termos juridicos para linguagem comum
6. Mencione datas quando relevante

EXEMPLOS DE TRADUCAO:
- "Sentenca de procedencia parcial" -> "O juiz decidiu parcialmente a favor"
- "Audiencia de conciliacao designada" -> "Audiencia de tentativa de acordo marcada"
- "Recurso de apelacao interposto" -> "Foi apresentado recurso contra a decisao"
- "Conclusos para despacho" -> "Aguardando analise do juiz"
- "Citacao realizada" -> "A outra parte foi oficialmente comunicada"
- "Transito em julgado" -> "Decisao final sem mais recursos"

NUNCA responda com frases vagas como "processo em andamento" ou "aguardando proximos tramites".
Sempre seja especifico sobre a situacao do processo.`

interface MovimentacaoInput {
  id: string
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

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = aiRateLimit.check(request)
    if (!rateLimitResult.success) {
      return aiRateLimit.errorResponse(rateLimitResult)
    }

    const body: RequestBody = await request.json()

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

    // Verificar se a chave API esta configurada
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      logger.warn('ANTHROPIC_API_KEY nao configurada', { module: 'API/Relatorios', action: 'resumo-ia' })
      // Gerar mensagem basica sem IA
      return NextResponse.json({
        sucesso: true,
        resumo: gerarResumoPadrao(area, fase, status, objeto_acao, polo_cliente)
      })
    }

    // Formatar movimentacoes para o prompt (ultimas 5)
    let movimentacoesTexto = ''
    if (movimentacoes && movimentacoes.length > 0) {
      movimentacoesTexto = movimentacoes
        .slice(0, 5)
        .map((m, i) => {
          const data = new Date(m.data_movimento).toLocaleDateString('pt-BR')
          const tipo = m.tipo_descricao ? `[${m.tipo_descricao}]` : ''
          return `${i + 1}. ${data} ${tipo}: ${m.descricao}`
        })
        .join('\n')
    }

    // Construir prompt com contexto completo
    const userPrompt = `Crie um resumo do status atual deste processo para enviar ao cliente:

DADOS DO PROCESSO:
- Numero: ${numero_cnj}
- Area: ${area}
${fase ? `- Fase atual: ${fase}` : ''}
${status ? `- Status: ${status}` : ''}
- Cliente: ${cliente_nome} (${polo_cliente === 'ativo' ? 'Autor/Requerente' : 'Reu/Requerido'})
${objeto_acao ? `- Objeto da acao: ${objeto_acao}` : ''}

${movimentacoesTexto ? `ULTIMAS MOVIMENTACOES (mais recentes primeiro):
${movimentacoesTexto}` : 'Nenhuma movimentacao recente registrada.'}

Escreva um resumo de 2-3 frases para o cliente, explicando a situacao atual do processo de forma clara e especifica. ${movimentacoesTexto ? 'Foque nas movimentacoes mais importantes.' : 'Descreva a situacao baseada na fase e area do processo.'}`

    // Chamar Claude API
    const client = new Anthropic({
      apiKey: apiKey
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: SYSTEM_PROMPT
    })

    // Extrair texto da resposta
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : gerarResumoPadrao(area, fase, status, objeto_acao, polo_cliente)

    return NextResponse.json({
      sucesso: true,
      resumo: responseText
    })

  } catch (error) {
    captureOperationError(error instanceof Error ? error : new Error(String(error)), { module: 'API/Relatorios', operation: 'gerar-resumo-ia' })
    // Em caso de erro, tentar gerar algo util
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro ao gerar resumo com IA. Tente novamente.'
    })
  }
}

// Funcao para gerar resumo basico quando IA nao esta disponivel
function gerarResumoPadrao(
  area: string,
  fase?: string,
  status?: string,
  objeto_acao?: string,
  polo_cliente?: string
): string {
  const polo = polo_cliente === 'ativo' ? 'autor' : 'reu'

  let resumo = `Processo da area ${area.toLowerCase()}`

  if (objeto_acao) {
    resumo += ` referente a ${objeto_acao.toLowerCase()}`
  }

  resumo += `. O cliente figura como ${polo}.`

  if (fase) {
    const faseDescricao: Record<string, string> = {
      'conhecimento': 'O processo esta na fase inicial de analise dos fatos e provas.',
      'recursal': 'O processo esta em fase de recurso, aguardando decisao do tribunal.',
      'execucao': 'O processo esta em fase de execucao, buscando o cumprimento da decisao.',
      'cumprimento': 'O processo esta em fase de cumprimento de sentenca.',
      'encerrado': 'O processo foi encerrado.'
    }
    resumo += ' ' + (faseDescricao[fase.toLowerCase()] || `Atualmente na fase de ${fase.toLowerCase()}.`)
  }

  return resumo
}
