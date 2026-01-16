// ============================================
// EDGE FUNCTION: CENTRO DE COMANDO COM IA
// ============================================
// Interface conversacional que permite ao usuário
// consultar e modificar dados usando linguagem natural.
// Utiliza GPT-5 com function calling para interpretar
// comandos e executar queries seguras no banco.
//
// MODO STREAMING: Envia eventos em tempo real mostrando
// o que a IA está fazendo, como se estivesse "pensando em voz alta".
//
// SEGURANÇA:
// - SELECT: executa direto
// - INSERT/UPDATE: requer confirmação
// - DELETE: requer dupla confirmação
// - DROP/TRUNCATE: bloqueado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// MENSAGENS AMIGÁVEIS PARA CADA TOOL
// ============================================
const MENSAGENS_TOOL: Record<string, { inicio: string; fim: (resultado: any) => string }> = {
  listar_tabelas: {
    inicio: '🔍 Consultando tabelas disponíveis no sistema...',
    fim: (r) => `📋 Encontrei ${r.total || 0} tabelas disponíveis.`,
  },
  consultar_schema: {
    inicio: '📖 Verificando estrutura da tabela...',
    fim: (r) => r.erro
      ? `❌ Erro ao consultar estrutura: ${r.erro}`
      : `📝 Tabela ${r.tabela} tem ${r.total || 0} campos.`,
  },
  consultar_dados: {
    inicio: '🔎 Buscando dados no banco...',
    fim: (r) => r.erro
      ? `❌ Erro na consulta: ${r.erro}`
      : `✅ Encontrei ${r.total || 0} ${r.total === 1 ? 'registro' : 'registros'}.`,
  },
  preparar_cadastro: {
    inicio: '✏️ Preparando o cadastro...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro}`
      : `📋 Cadastro preparado! Aguardando sua confirmação.`,
  },
  preparar_alteracao: {
    inicio: '✏️ Preparando a alteração...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro}`
      : `📋 Alteração preparada! Revise e confirme.`,
  },
  preparar_exclusao: {
    inicio: '⚠️ Preparando exclusão...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro}`
      : `🗑️ Exclusão preparada! Requer dupla confirmação.`,
  },
  pedir_informacao: {
    inicio: '❓ Preciso de mais informações...',
    fim: () => `📝 Aguardando suas informações.`,
  },
  navegar_pagina: {
    inicio: '🔗 Preparando navegação...',
    fim: (r) => `📍 Sugestão: ir para ${r.caminho}`,
  },
}

// ============================================
// TABELAS PERMITIDAS NO SISTEMA
// ============================================
const TABELAS_PERMITIDAS = [
  'processos_processos',
  'crm_pessoas',
  'profiles',
  'agenda_tarefas',
  'agenda_eventos',
  'agenda_audiencias',
  'financeiro_timesheet',
  'financeiro_honorarios',
  'financeiro_honorarios_parcelas',
  'v_agenda_consolidada',
  'v_processos_dashboard',
  'v_lancamentos_prontos_faturar',
  'v_prazos_vencendo',
]

// ============================================
// CACHE DE SCHEMA POR SESSÃO (in-memory)
// ============================================
const schemaCache = new Map<string, { schema: any; timestamp: number }>()
const SCHEMA_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function getCachedSchema(tabela: string): any | null {
  const cached = schemaCache.get(tabela)
  if (cached && Date.now() - cached.timestamp < SCHEMA_CACHE_TTL) {
    return cached.schema
  }
  return null
}

function setCachedSchema(tabela: string, schema: any) {
  schemaCache.set(tabela, { schema, timestamp: Date.now() })
}

// ============================================
// RESUMIR TOOL RESULTS PARA MEMÓRIA
// ============================================
function resumirToolResult(result: any): string {
  if (!result) return ''

  const { tool, dados, total, explicacao, erro, tabela, colunas, acao_pendente } = result

  // Se deu erro, retornar o erro
  if (erro) return `[${tool}] Erro: ${erro}`

  // Se é ação pendente
  if (acao_pendente) return `[${tool}] Ação preparada aguardando confirmação`

  // Resumos específicos por tool
  switch (tool) {
    case 'listar_tabelas':
      return `[listar_tabelas] Tabelas disponíveis: ${dados?.map((t: any) => t.tabela).join(', ')}`

    case 'consultar_schema':
      const camposResumo = colunas?.slice(0, 5).map((c: any) => c.column_name).join(', ')
      return `[consultar_schema] Tabela ${tabela}: ${total} campos (${camposResumo}...)`

    case 'consultar_dados':
      // Resumir dados encontrados (não repetir todos os dados)
      if (total === 0) return `[consultar_dados] ${explicacao}: Nenhum registro encontrado`

      // Se tem poucos registros, listar IDs
      if (total <= 10 && dados) {
        const ids = dados.map((d: any) => d.id || d.numero_cnj || '?').slice(0, 5).join(', ')
        return `[consultar_dados] ${explicacao}: ${total} registros (ex: ${ids}...)`
      }
      return `[consultar_dados] ${explicacao}: ${total} registros encontrados`

    default:
      return `[${tool}] ${explicacao || 'Executado com sucesso'}`
  }
}

// ============================================
// CONSTRUIR CONTEXTO DA SESSÃO
// ============================================
interface SessionContext {
  tabelasConhecidas: string[]
  schemasConsultados: Record<string, string[]> // tabela -> campos
  ultimaConsulta?: {
    tabela: string
    total: number
    descricao: string
  }
  opcoesOferecidas?: string[] // Opções que o assistente ofereceu
  acaoPendente?: {
    descricao: string
    opcaoSelecionada?: string
  }
}

function construirContextoSessao(historico: any[]): SessionContext {
  const contexto: SessionContext = {
    tabelasConhecidas: [],
    schemasConsultados: {},
  }

  for (const msg of historico) {
    // Extrair conhecimento dos tool_results
    if (msg.tool_results && Array.isArray(msg.tool_results)) {
      for (const result of msg.tool_results) {
        if (result.tool === 'listar_tabelas' && result.dados) {
          contexto.tabelasConhecidas = result.dados.map((t: any) => t.tabela)
        }
        if (result.tool === 'consultar_schema' && result.tabela && result.colunas) {
          contexto.schemasConsultados[result.tabela] = result.colunas.map((c: any) => c.column_name)
        }
        if (result.tool === 'consultar_dados' && result.total !== undefined) {
          contexto.ultimaConsulta = {
            tabela: result.tabela || 'desconhecida',
            total: result.total,
            descricao: result.explicacao || '',
          }
        }
      }
    }

    // Detectar opções oferecidas pelo assistente
    if (msg.role === 'assistant' && msg.content) {
      const opcoesMatch = msg.content.match(/(?:^|\n)(\d+)\)/gm)
      if (opcoesMatch && opcoesMatch.length >= 2) {
        contexto.opcoesOferecidas = opcoesMatch.map((o: string) => o.trim())
      }
    }
  }

  return contexto
}

// ============================================
// FERRAMENTAS (FUNCTION CALLING)
// ============================================
const TOOLS = [
  {
    type: "function",
    function: {
      name: "listar_tabelas",
      description: "Lista todas as tabelas disponíveis no sistema. Use PRIMEIRO para descobrir quais tabelas existem antes de fazer qualquer operação.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_schema",
      description: "Retorna a estrutura completa de uma tabela: colunas, tipos, constraints, valores permitidos. Use para entender como inserir ou alterar dados.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela para consultar o schema"
          }
        },
        required: ["tabela"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_dados",
      description: "Executa uma consulta SELECT no banco de dados para buscar informações. Use para qualquer tipo de leitura de dados.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Query SQL SELECT. OBRIGATÓRIO incluir WHERE escritorio_id = '{escritorio_id}' que será substituído automaticamente."
          },
          explicacao: {
            type: "string",
            description: "Explicação em português do que a consulta faz e o que vai retornar."
          }
        },
        required: ["query", "explicacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "preparar_cadastro",
      description: "Prepara a criação de um novo registro. NÃO executa diretamente - requer confirmação do usuário.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela onde inserir (ex: agenda_tarefas, crm_pessoas)"
          },
          dados: {
            type: "object",
            description: "Objeto com os campos e valores a inserir. NÃO incluir id, escritorio_id, created_at."
          },
          explicacao: {
            type: "string",
            description: "Explicação do que será criado para o usuário confirmar."
          }
        },
        required: ["tabela", "dados", "explicacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "preparar_alteracao",
      description: "Prepara a alteração de um registro existente. NÃO executa diretamente - requer confirmação do usuário.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela a alterar"
          },
          registro_id: {
            type: "string",
            description: "UUID do registro a alterar"
          },
          alteracoes: {
            type: "object",
            description: "Objeto com os campos e novos valores. NÃO incluir id, escritorio_id, created_at."
          },
          explicacao: {
            type: "string",
            description: "Explicação do que será alterado para o usuário confirmar."
          }
        },
        required: ["tabela", "registro_id", "alteracoes", "explicacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "preparar_exclusao",
      description: "Prepara a exclusão de um registro. NÃO executa diretamente - requer DUPLA confirmação do usuário.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela"
          },
          registro_id: {
            type: "string",
            description: "UUID do registro a excluir"
          },
          explicacao: {
            type: "string",
            description: "Explicação do que será excluído (ATENÇÃO: ação irreversível)."
          }
        },
        required: ["tabela", "registro_id", "explicacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pedir_informacao",
      description: "Solicita informações adicionais ao usuário quando os dados fornecidos são insuficientes para executar a ação.",
      parameters: {
        type: "object",
        properties: {
          campos_necessarios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                campo: { type: "string" },
                descricao: { type: "string" },
                obrigatorio: { type: "boolean" },
                tipo: { type: "string", enum: ["texto", "data", "numero", "selecao"] },
                opcoes: { type: "array", items: { type: "string" } }
              }
            },
            description: "Lista de campos que precisam ser informados"
          },
          contexto: {
            type: "string",
            description: "Explicação do que está sendo criado/alterado"
          }
        },
        required: ["campos_necessarios", "contexto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navegar_pagina",
      description: "Sugere navegação para uma página específica do sistema.",
      parameters: {
        type: "object",
        properties: {
          caminho: {
            type: "string",
            description: "Caminho da página (ex: /dashboard/processos, /dashboard/agenda)"
          },
          filtros: {
            type: "object",
            description: "Parâmetros de query string para filtrar a página"
          },
          explicacao: {
            type: "string",
            description: "Explicação de para onde está direcionando"
          }
        },
        required: ["caminho", "explicacao"]
      }
    }
  }
]

// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      mensagem,
      escritorio_id,
      user_id,
      sessao_id,
      historico_mensagens,
      // Para confirmação de ações
      confirmar_acao,
      acao_id,
      dados_adicionais,
      // Modo streaming
      streaming = true,
    } = body

    // Validação básica
    if (!escritorio_id || !user_id) {
      return errorResponse('escritorio_id e user_id são obrigatórios', 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ========================================
    // FLUXO 1: Confirmar ação pendente (não usa streaming)
    // ========================================
    if (confirmar_acao && acao_id) {
      const resultado = await executarAcaoConfirmada(supabase, acao_id, escritorio_id, dados_adicionais)

      // Salvar no histórico
      await salvarHistorico(supabase, {
        sessao_id,
        user_id,
        escritorio_id,
        role: 'system',
        content: resultado.sucesso
          ? `Ação executada com sucesso: ${resultado.mensagem}`
          : `Erro ao executar ação: ${resultado.erro}`,
        tool_results: resultado,
      })

      return successResponse(resultado)
    }

    // ========================================
    // FLUXO 2: Nova mensagem (com streaming)
    // ========================================
    if (!mensagem) {
      return errorResponse('mensagem é obrigatória', 400)
    }

    // Salvar mensagem do usuário no histórico
    await salvarHistorico(supabase, {
      sessao_id,
      user_id,
      escritorio_id,
      role: 'user',
      content: mensagem,
    })

    // Buscar chave OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return errorResponse('Chave OpenAI não configurada no servidor', 500)
    }

    // Buscar informações do usuário
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('nome_completo, role')
      .eq('id', user_id)
      .single()

    // Data atual para referência
    const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Construir contexto da sessão baseado no histórico
    const sessionContext = construirContextoSessao(historico_mensagens || [])

    // Construir bloco de memória da sessão
    let memoriaSection = ''
    if (sessionContext.tabelasConhecidas.length > 0 || Object.keys(sessionContext.schemasConsultados).length > 0) {
      memoriaSection = `

## 🧠 MEMÓRIA DA SESSÃO (Já descobri isso - NÃO preciso buscar de novo!)
`
      if (sessionContext.tabelasConhecidas.length > 0) {
        memoriaSection += `
### Tabelas que JÁ CONHEÇO:
${sessionContext.tabelasConhecidas.join(', ')}
`
      }
      if (Object.keys(sessionContext.schemasConsultados).length > 0) {
        memoriaSection += `
### Schemas que JÁ CONSULTEI:
${Object.entries(sessionContext.schemasConsultados).map(([tabela, campos]) =>
  `- ${tabela}: ${(campos as string[]).slice(0, 8).join(', ')}...`
).join('\n')}
`
      }
      if (sessionContext.ultimaConsulta) {
        memoriaSection += `
### Última consulta:
- ${sessionContext.ultimaConsulta.descricao}: ${sessionContext.ultimaConsulta.total} registros
`
      }
    }

    const systemPrompt = `Você é Zyra, assistente inteligente do sistema jurídico Zyra Legal.
Usuário: ${userProfile?.nome_completo || 'Usuário'} (${userProfile?.role || 'advogado'})
Escritório ID: ${escritorio_id}
Data de hoje: ${hoje}
Data de amanhã: ${amanha}
${memoriaSection}
## 🎯 PRINCÍPIO FUNDAMENTAL: MEMÓRIA E CONTINUIDADE

VOCÊ TEM MEMÓRIA! Você pode ver o histórico da conversa acima. Use-o!
- Se JÁ listou tabelas na conversa → NÃO liste de novo
- Se JÁ consultou o schema de uma tabela → NÃO consulte de novo
- Se JÁ fez uma consulta → Use os resultados, não refaça
- Se ofereceu OPÇÕES ao usuário (1, 2, 3...) e ele respondeu "opção X" ou apenas "X" → EXECUTE essa opção diretamente

## 🔢 RESPOSTAS DE OPÇÃO DO USUÁRIO

MUITO IMPORTANTE: Quando você oferece opções numeradas (1, 2, 3, 4...) e o usuário responde:
- "opção 2", "2", "a segunda", "a 2" → Execute a opção 2 que você ofereceu
- "sim", "ok", "confirma" → Execute a opção recomendada ou a primeira
- "não", "cancela" → Não execute nada, pergunte o que deseja fazer

Exemplo do contexto:
- Você ofereceu: "1) Pré-visualização 2) Preparar alterações 3) Adicionar tag 4) Cancelar"
- Usuário disse: "opção 2" ou "2"
- Você DEVE: Executar a opção 2 (preparar alterações) SEM refazer consultas anteriores

## FERRAMENTAS DISPONÍVEIS

### 1. listar_tabelas
Retorna todas as tabelas disponíveis no sistema.
⚠️ SÓ use se NUNCA listou antes nesta conversa.

### 2. consultar_schema
Retorna estrutura completa de uma tabela.
⚠️ SÓ use se NUNCA consultou essa tabela nesta conversa.

### 3. consultar_dados
Executa SELECT no banco. Sempre inclua WHERE escritorio_id = '{escritorio_id}'.
Os dados retornados são exibidos automaticamente em tabela - NÃO repita na resposta.

### 4. preparar_cadastro
Prepara INSERT para confirmação do usuário.

### 5. preparar_alteracao
Prepara UPDATE para confirmação.

### 6. preparar_exclusao
Prepara DELETE com dupla confirmação.

### 7. pedir_informacao
Solicita dados faltantes ao usuário.

### 8. navegar_pagina
Sugere navegação para outra página do sistema.

## FLUXO INTELIGENTE COM MEMÓRIA

Para CONSULTAS:
1. VERIFIQUE A MEMÓRIA: já conheço as tabelas? já conheço o schema?
2. Se SIM → pule direto para a consulta
3. Se NÃO → descubra o necessário (mas só o necessário!)
4. Se der erro → analise, corrija e tente novamente

Para AÇÕES (criar/alterar/excluir):
1. VERIFIQUE A MEMÓRIA: já tenho o schema? já tenho os dados necessários?
2. Se o usuário respondeu uma opção → execute diretamente
3. Se precisar de mais dados → use pedir_informacao

## REGRAS IMPORTANTES

1. TODAS as queries devem filtrar por escritorio_id = '${escritorio_id}'
2. Datas usam formato YYYY-MM-DD (hoje = ${hoje}, amanhã = ${amanha})
3. Dados retornados de consultas aparecem em tabela - apenas COMENTE, não liste
4. ⚠️ NÃO REPITA operações já feitas na conversa
5. Para múltiplas ações, execute uma de cada vez`

    // Montar histórico de mensagens para contexto
    const mensagensParaIA: Array<{role: string, content: string}> = [
      { role: 'system', content: systemPrompt }
    ]

    // Adicionar histórico se fornecido
    if (historico_mensagens && Array.isArray(historico_mensagens)) {
      for (const msg of historico_mensagens.slice(-10)) { // Últimas 10 mensagens
        if (msg.role && msg.content) {
          mensagensParaIA.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })
        }
      }
    }

    // Adicionar mensagem atual
    mensagensParaIA.push({ role: 'user', content: mensagem })

    // ========================================
    // MODO STREAMING - SSE
    // ========================================
    if (streaming) {
      return handleStreamingRequest(
        supabase,
        openaiKey,
        mensagensParaIA,
        escritorio_id,
        user_id,
        sessao_id
      )
    }

    // ========================================
    // MODO SEM STREAMING (fallback)
    // ========================================
    return handleNonStreamingRequest(
      supabase,
      openaiKey,
      mensagensParaIA,
      escritorio_id,
      user_id,
      sessao_id
    )

  } catch (error) {
    console.error('[Centro Comando] Erro:', error)
    return errorResponse(error.message || 'Erro interno', 500)
  }
})

// ============================================
// HANDLER STREAMING (SSE)
// ============================================
async function handleStreamingRequest(
  supabase: any,
  openaiKey: string,
  mensagensParaIA: Array<{role: string, content: string}>,
  escritorioId: string,
  userId: string,
  sessaoId: string | null
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Função helper para enviar evento SSE
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      try {
        const startTime = Date.now()
        const MAX_ITERACOES = 10
        let iteracao = 0
        let respostaTexto = ''
        let toolResults: any[] = []
        let acoesPendentes: any[] = []
        let mensagensAtual = [...mensagensParaIA]
        let ultimoToolCalls: any = null
        let tokensInput = 0
        let tokensOutput = 0

        // Enviar evento inicial - "Pensando..."
        sendEvent('thinking', { message: '🤔 Analisando sua solicitação...' })

        // Loop agêntico com streaming
        while (iteracao < MAX_ITERACOES) {
          iteracao++
          console.log(`[Centro Comando SSE] Iteração ${iteracao}/${MAX_ITERACOES}`)

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-5-mini',
              messages: mensagensAtual,
              tools: TOOLS,
              tool_choice: 'auto',
              max_completion_tokens: 2000,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[Centro Comando SSE] Erro OpenAI:', response.status, errorText)
            throw new Error(`Erro na API OpenAI: ${response.status}`)
          }

          const aiResponse = await response.json()
          const choice = aiResponse.choices[0]

          // Acumular tokens
          tokensInput += aiResponse.usage?.prompt_tokens || 0
          tokensOutput += aiResponse.usage?.completion_tokens || 0

          // Se a IA retornou tool_calls, processar com feedback
          if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            ultimoToolCalls = choice.message.tool_calls

            // Adicionar mensagem do assistente com tool_calls ao histórico
            mensagensAtual.push({
              role: 'assistant',
              content: choice.message.content || null,
              tool_calls: choice.message.tool_calls,
            } as any)

            // Processar cada tool call COM FEEDBACK EM TEMPO REAL
            for (const toolCall of choice.message.tool_calls) {
              const { name, arguments: argsString } = toolCall.function
              let args: any

              try {
                args = JSON.parse(argsString)
              } catch (e) {
                args = {}
              }

              // 📢 ENVIAR MENSAGEM INÍCIO DA TOOL
              const mensagemInicio = MENSAGENS_TOOL[name]?.inicio || `⚙️ Executando ${name}...`
              sendEvent('step', {
                type: 'tool_start',
                tool: name,
                message: mensagemInicio,
                args: args
              })

              console.log(`[Centro Comando SSE] Tool: ${name}`, args)

              // Executar a tool
              const resultado = await executarTool(supabase, name, args, escritorioId, userId, sessaoId)

              // 📢 ENVIAR MENSAGEM FIM DA TOOL
              const mensagemFim = MENSAGENS_TOOL[name]?.fim(resultado) || `✅ ${name} concluído.`
              sendEvent('step', {
                type: 'tool_end',
                tool: name,
                message: mensagemFim,
                resultado: resultado
              })

              // Guardar resultado para retorno final
              toolResults.push(resultado)
              if (resultado.acao_pendente && resultado.acao_id) {
                acoesPendentes.push({
                  id: resultado.acao_id,
                  tipo: resultado.tipo || 'insert',
                  tabela: resultado.tabela || args.tabela,
                  dados: resultado.preview || args.dados,
                  explicacao: resultado.explicacao,
                })
              }

              // Adicionar resultado da tool ao histórico para a IA
              mensagensAtual.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(resultado),
              } as any)
            }

            // Se ainda tem mais iterações, mostrar que está processando
            if (iteracao < MAX_ITERACOES) {
              sendEvent('thinking', { message: '💭 Processando resultados...' })
            }

            continue
          }

          // Se a IA retornou texto final (sem tool_calls), sair do loop
          respostaTexto = choice.message.content || ''

          // Se tem ações pendentes mas não tem texto, gerar texto automático
          if (!respostaTexto && acoesPendentes.length > 0) {
            respostaTexto = 'Preparei as ações solicitadas. Por favor, revise e confirme.'
          }

          break
        }

        const tempoExecucao = Date.now() - startTime
        console.log('[Centro Comando SSE] Tempo total:', tempoExecucao, 'ms, iterações:', iteracao)

        // Se a IA não retornou texto, gerar resposta automática baseada no contexto
        if (!respostaTexto) {
          if (toolResults.length > 0) {
            const resultadoComDados = toolResults.find(r => r.dados && r.total !== undefined)
            const resultadoComErro = toolResults.find(r => r.erro)

            if (resultadoComErro) {
              respostaTexto = `Houve um erro ao executar a consulta: ${resultadoComErro.erro}`
            } else if (resultadoComDados) {
              if (resultadoComDados.total === 0) {
                respostaTexto = `Não encontrei nenhum registro com os critérios especificados. Deseja ajustar a busca?`
              } else {
                respostaTexto = `Encontrei ${resultadoComDados.total} registro${resultadoComDados.total > 1 ? 's' : ''}. Os dados estão exibidos na tabela acima.`
              }
            } else {
              respostaTexto = 'Consulta executada com sucesso.'
            }
          } else if (acoesPendentes.length > 0) {
            respostaTexto = 'Preparei a ação solicitada. Por favor, revise os detalhes e confirme.'
          } else {
            respostaTexto = 'Desculpe, não consegui processar sua solicitação. Pode tentar reformular?'
          }
        }

        // Salvar resposta no histórico
        await salvarHistorico(supabase, {
          sessao_id: sessaoId,
          user_id: userId,
          escritorio_id: escritorioId,
          role: 'assistant',
          content: respostaTexto,
          tool_calls: ultimoToolCalls,
          tool_results: toolResults,
          tempo_execucao_ms: tempoExecucao,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
        })

        // 📢 ENVIAR RESULTADO FINAL
        sendEvent('done', {
          sucesso: true,
          resposta: respostaTexto,
          tool_results: toolResults,
          acoes_pendentes: acoesPendentes,
          tem_confirmacao_pendente: acoesPendentes.length > 0,
          sessao_id: sessaoId,
          tempo_execucao_ms: tempoExecucao,
        })

      } catch (error: any) {
        console.error('[Centro Comando SSE] Erro:', error)
        sendEvent('error', { erro: error.message || 'Erro interno' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ============================================
// HANDLER SEM STREAMING (FALLBACK)
// ============================================
async function handleNonStreamingRequest(
  supabase: any,
  openaiKey: string,
  mensagensParaIA: Array<{role: string, content: string}>,
  escritorioId: string,
  userId: string,
  sessaoId: string | null
) {
  const startTime = Date.now()
  const MAX_ITERACOES = 10
  let iteracao = 0
  let respostaTexto = ''
  let toolResults: any[] = []
  let acoesPendentes: any[] = []
  let mensagensAtual = [...mensagensParaIA]
  let ultimoToolCalls: any = null
  let tokensInput = 0
  let tokensOutput = 0

  // Loop agêntico: continua até a IA retornar texto final (sem tool_calls)
  while (iteracao < MAX_ITERACOES) {
    iteracao++
    console.log(`[Centro Comando] Iteração ${iteracao}/${MAX_ITERACOES}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: mensagensAtual,
        tools: TOOLS,
        tool_choice: 'auto',
        max_completion_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Centro Comando] Erro OpenAI:', response.status, errorText)
      throw new Error(`Erro na API OpenAI: ${response.status}`)
    }

    const aiResponse = await response.json()
    const choice = aiResponse.choices[0]

    // DEBUG: Log completo da resposta
    console.log('[Centro Comando] Resposta:', JSON.stringify({
      iteracao,
      finish_reason: choice.finish_reason,
      has_content: !!choice.message.content,
      content_preview: choice.message.content?.substring(0, 100),
      has_tool_calls: !!choice.message.tool_calls,
      tool_calls_count: choice.message.tool_calls?.length || 0,
      tool_names: choice.message.tool_calls?.map((t: any) => t.function.name) || [],
    }))

    // Acumular tokens
    tokensInput += aiResponse.usage?.prompt_tokens || 0
    tokensOutput += aiResponse.usage?.completion_tokens || 0

    // Se a IA retornou tool_calls, processar e continuar o loop
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      ultimoToolCalls = choice.message.tool_calls

      // Adicionar mensagem do assistente com tool_calls ao histórico
      mensagensAtual.push({
        role: 'assistant',
        content: choice.message.content || null,
        tool_calls: choice.message.tool_calls,
      } as any)

      // Processar cada tool call
      for (const toolCall of choice.message.tool_calls) {
        const { name, arguments: argsString } = toolCall.function
        let args: any

        try {
          args = JSON.parse(argsString)
        } catch (e) {
          args = {}
        }

        console.log(`[Centro Comando] Executando tool: ${name}`, args)

        // Executar a tool
        const resultado = await executarTool(supabase, name, args, escritorioId, userId, sessaoId)

        // Guardar resultado para retorno final
        toolResults.push(resultado)
        if (resultado.acao_pendente && resultado.acao_id) {
          acoesPendentes.push({
            id: resultado.acao_id,
            tipo: resultado.tipo || 'insert',
            tabela: resultado.tabela || args.tabela,
            dados: resultado.preview || args.dados,
            explicacao: resultado.explicacao,
          })
        }

        // Adicionar resultado da tool ao histórico para a IA
        mensagensAtual.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(resultado),
        } as any)
      }

      // Continuar o loop para a IA processar os resultados
      continue
    }

    // Se a IA retornou texto final (sem tool_calls), sair do loop
    respostaTexto = choice.message.content || ''

    // Se tem ações pendentes mas não tem texto, gerar texto automático
    if (!respostaTexto && acoesPendentes.length > 0) {
      respostaTexto = 'Preparei as ações solicitadas. Por favor, revise e confirme.'
    }

    break
  }

  const tempoExecucao = Date.now() - startTime
  console.log('[Centro Comando] Tempo total:', tempoExecucao, 'ms, iterações:', iteracao)

  // Se a IA não retornou texto, gerar resposta automática baseada no contexto
  if (!respostaTexto) {
    if (toolResults.length > 0) {
      // Tem resultados de tools
      const resultadoComDados = toolResults.find(r => r.dados && r.total !== undefined)
      const resultadoComErro = toolResults.find(r => r.erro)

      if (resultadoComErro) {
        respostaTexto = `Houve um erro ao executar a consulta: ${resultadoComErro.erro}`
      } else if (resultadoComDados) {
        if (resultadoComDados.total === 0) {
          respostaTexto = `Não encontrei nenhum registro com os critérios especificados. Deseja ajustar a busca?`
        } else {
          respostaTexto = `Encontrei ${resultadoComDados.total} registro${resultadoComDados.total > 1 ? 's' : ''}. Os dados estão exibidos na tabela acima.`
        }
      } else {
        respostaTexto = 'Consulta executada com sucesso.'
      }
    } else if (acoesPendentes.length > 0) {
      // Tem ações pendentes de confirmação
      respostaTexto = 'Preparei a ação solicitada. Por favor, revise os detalhes e confirme.'
    } else {
      // Fallback - IA não retornou nada
      console.log('[Centro Comando] AVISO: IA não retornou resposta nem executou tools')
      respostaTexto = 'Desculpe, não consegui processar sua solicitação. Pode tentar reformular?'
    }
  }

  // Salvar resposta no histórico
  await salvarHistorico(supabase, {
    sessao_id: sessaoId,
    user_id: userId,
    escritorio_id: escritorioId,
    role: 'assistant',
    content: respostaTexto,
    tool_calls: ultimoToolCalls,
    tool_results: toolResults,
    tempo_execucao_ms: tempoExecucao,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
  })

  // Retornar resposta
  return successResponse({
    resposta: respostaTexto,
    tool_results: toolResults,
    acoes_pendentes: acoesPendentes,
    tem_confirmacao_pendente: acoesPendentes.length > 0,
    sessao_id: sessaoId,
    tempo_execucao_ms: tempoExecucao,
  })
}

// ============================================
// EXECUTAR UMA TOOL INDIVIDUAL
// ============================================
async function executarTool(
  supabase: any,
  name: string,
  args: any,
  escritorioId: string,
  userId: string,
  sessaoId: string | null
): Promise<any> {
  switch (name) {
    case 'listar_tabelas': {
      const tabelasInfo = [
        { tabela: 'processos_processos', descricao: 'Processos judiciais e administrativos' },
        { tabela: 'crm_pessoas', descricao: 'Clientes, contatos e partes' },
        { tabela: 'profiles', descricao: 'Usuários/advogados do sistema' },
        { tabela: 'agenda_tarefas', descricao: 'Tarefas e afazeres' },
        { tabela: 'agenda_eventos', descricao: 'Eventos e compromissos' },
        { tabela: 'agenda_audiencias', descricao: 'Audiências judiciais' },
        { tabela: 'financeiro_timesheet', descricao: 'Registro de horas trabalhadas' },
        { tabela: 'financeiro_honorarios', descricao: 'Lançamentos de honorários' },
        { tabela: 'financeiro_honorarios_parcelas', descricao: 'Parcelas de honorários' },
        { tabela: 'v_agenda_consolidada', descricao: 'View: agenda unificada (leitura)' },
        { tabela: 'v_processos_dashboard', descricao: 'View: métricas de processos (leitura)' },
      ]
      return {
        tool: name,
        dados: tabelasInfo,
        total: tabelasInfo.length,
        explicacao: 'Tabelas disponíveis no sistema'
      }
    }

    case 'consultar_schema': {
      const tabela = args.tabela
      if (!tabela) {
        return { tool: name, erro: 'Campo "tabela" é obrigatório.' }
      }
      if (!TABELAS_PERMITIDAS.includes(tabela)) {
        return { tool: name, erro: `Tabela "${tabela}" não permitida.` }
      }
      try {
        const { data: schema, error } = await supabase.rpc('get_table_schema', { tabela_nome: tabela })
        if (error) throw error
        return {
          tool: name,
          tabela,
          colunas: schema?.colunas || [],
          total: schema?.colunas?.length || 0,
          explicacao: `Estrutura da tabela ${tabela}`,
          dica: 'Não inclua id, escritorio_id, created_at, updated_at ao inserir.'
        }
      } catch (err: any) {
        return { tool: name, erro: `Erro ao consultar schema: ${err.message}` }
      }
    }

    case 'consultar_dados': {
      const query = args.query?.replace(/\{escritorio_id\}/g, escritorioId)
      if (!isQuerySegura(query)) {
        return { tool: name, erro: 'Query contém comandos não permitidos' }
      }
      try {
        const { data, error } = await supabase.rpc('execute_safe_query', {
          query_text: query,
          escritorio_param: escritorioId,
        })
        if (error) throw error
        return {
          tool: name,
          explicacao: args.explicacao,
          dados: data,
          total: Array.isArray(data) ? data.length : 0,
        }
      } catch (err: any) {
        return {
          tool: name,
          erro: `Erro ao executar query: ${err.message}`,
          query_debug: query,
        }
      }
    }

    case 'preparar_cadastro': {
      if (!args.tabela) {
        return { tool: name, erro: 'Campo "tabela" é obrigatório.' }
      }
      if (!args.dados || typeof args.dados !== 'object' || Object.keys(args.dados).length === 0) {
        return { tool: name, erro: 'Campo "dados" é obrigatório e deve ser um objeto JSON.' }
      }
      if (!TABELAS_PERMITIDAS.includes(args.tabela)) {
        return { tool: name, erro: `Tabela "${args.tabela}" não permitida.` }
      }
      try {
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'insert',
            tabela: args.tabela,
            dados: args.dados,
            explicacao: args.explicacao || `Criar registro em ${args.tabela}`,
          })
          .select()
          .single()
        if (error) throw error
        return {
          tool: name,
          acao_pendente: true,
          acao_id: acao.id,
          tipo: 'insert',
          tabela: args.tabela,
          explicacao: args.explicacao || `Criar registro em ${args.tabela}`,
          preview: args.dados,
        }
      } catch (err: any) {
        return { tool: name, erro: `Erro ao preparar cadastro: ${err.message}` }
      }
    }

    case 'preparar_alteracao': {
      if (!args.tabela || !args.registro_id || !args.alteracoes) {
        return { tool: name, erro: 'Campos tabela, registro_id e alteracoes são obrigatórios.' }
      }
      try {
        const { data: registroAtual } = await supabase
          .from(args.tabela)
          .select('*')
          .eq('id', args.registro_id)
          .eq('escritorio_id', escritorioId)
          .single()
        if (!registroAtual) {
          return { tool: name, erro: 'Registro não encontrado' }
        }
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'update',
            tabela: args.tabela,
            dados: { registro_id: args.registro_id, alteracoes: args.alteracoes, registro_atual: registroAtual },
            explicacao: args.explicacao,
          })
          .select()
          .single()
        if (error) throw error
        return {
          tool: name,
          acao_pendente: true,
          acao_id: acao.id,
          tipo: 'update',
          explicacao: args.explicacao,
          antes: registroAtual,
          alteracoes: args.alteracoes,
        }
      } catch (err: any) {
        return { tool: name, erro: err.message }
      }
    }

    case 'preparar_exclusao': {
      if (!args.tabela || !args.registro_id) {
        return { tool: name, erro: 'Campos tabela e registro_id são obrigatórios.' }
      }
      try {
        const { data: registro } = await supabase
          .from(args.tabela)
          .select('*')
          .eq('id', args.registro_id)
          .eq('escritorio_id', escritorioId)
          .single()
        if (!registro) {
          return { tool: name, erro: 'Registro não encontrado' }
        }
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'delete',
            tabela: args.tabela,
            dados: { registro_id: args.registro_id, registro },
            explicacao: args.explicacao,
          })
          .select()
          .single()
        if (error) throw error
        return {
          tool: name,
          acao_pendente: true,
          acao_id: acao.id,
          tipo: 'delete',
          explicacao: args.explicacao,
          registro,
          aviso: 'ATENÇÃO: Esta ação é irreversível!',
          requer_dupla_confirmacao: true,
        }
      } catch (err: any) {
        return { tool: name, erro: err.message }
      }
    }

    case 'pedir_informacao': {
      return {
        tool: name,
        campos_necessarios: args.campos_necessarios,
        contexto: args.contexto,
        aguardando_input: true,
      }
    }

    case 'navegar_pagina': {
      return {
        tool: name,
        caminho: args.caminho,
        filtros: args.filtros,
        explicacao: args.explicacao,
        tipo: 'navegacao',
      }
    }

    default:
      return { tool: name, erro: 'Ferramenta não reconhecida' }
  }
}

// ============================================
// PROCESSAMENTO DE TOOL CALLS (LEGADO)
// ============================================
async function processarToolCalls(
  supabase: any,
  toolCalls: any[],
  escritorioId: string,
  userId: string,
  sessaoId: string | null
) {
  const resultados: any[] = []
  const acoesPendentes: any[] = []
  let temDados = false

  for (const call of toolCalls) {
    const { name, arguments: argsString } = call.function
    let args: any

    try {
      args = JSON.parse(argsString)
    } catch (e) {
      resultados.push({
        tool: name,
        erro: 'Erro ao parsear argumentos da ferramenta',
      })
      continue
    }

    console.log(`[Centro Comando] Tool: ${name}`, args)

    switch (name) {
      case 'listar_tabelas': {
        // Retorna lista de tabelas permitidas com descrição
        const tabelasInfo = [
          { tabela: 'processos_processos', descricao: 'Processos judiciais e administrativos' },
          { tabela: 'crm_pessoas', descricao: 'Clientes, contatos e partes' },
          { tabela: 'profiles', descricao: 'Usuários/advogados do sistema' },
          { tabela: 'agenda_tarefas', descricao: 'Tarefas e afazeres' },
          { tabela: 'agenda_eventos', descricao: 'Eventos e compromissos' },
          { tabela: 'agenda_audiencias', descricao: 'Audiências judiciais' },
          { tabela: 'financeiro_timesheet', descricao: 'Registro de horas trabalhadas' },
          { tabela: 'financeiro_honorarios', descricao: 'Lançamentos de honorários' },
          { tabela: 'financeiro_honorarios_parcelas', descricao: 'Parcelas de honorários' },
          { tabela: 'v_agenda_consolidada', descricao: 'View: agenda unificada (leitura)' },
          { tabela: 'v_processos_dashboard', descricao: 'View: métricas de processos (leitura)' },
        ]

        resultados.push({
          tool: name,
          dados: tabelasInfo,
          total: tabelasInfo.length,
          explicacao: 'Tabelas disponíveis no sistema'
        })
        break
      }

      case 'consultar_schema': {
        const tabela = args.tabela

        if (!tabela) {
          resultados.push({
            tool: name,
            erro: 'Campo "tabela" é obrigatório. Use listar_tabelas para ver as opções.',
          })
          break
        }

        if (!TABELAS_PERMITIDAS.includes(tabela)) {
          resultados.push({
            tool: name,
            erro: `Tabela "${tabela}" não permitida. Use listar_tabelas para ver as disponíveis.`,
          })
          break
        }

        try {
          // Busca schema da tabela usando função dedicada
          const { data: schema, error } = await supabase.rpc('get_table_schema', {
            tabela_nome: tabela,
          })

          if (error) throw error

          resultados.push({
            tool: name,
            tabela: tabela,
            colunas: schema?.colunas || [],
            total: schema?.colunas?.length || 0,
            explicacao: `Estrutura da tabela ${tabela}`,
            dica: schema?.dica || 'Não inclua id, escritorio_id, created_at, updated_at ao inserir.'
          })
        } catch (err: any) {
          resultados.push({
            tool: name,
            erro: `Erro ao consultar schema: ${err.message}`,
          })
        }
        break
      }

      case 'consultar_dados': {
        const query = args.query?.replace(/\{escritorio_id\}/g, escritorioId)

        // Validar query
        if (!isQuerySegura(query)) {
          resultados.push({
            tool: name,
            erro: 'Query contém comandos não permitidos',
            explicacao: args.explicacao,
          })
          continue
        }

        try {
          console.log('[Centro Comando] Executando query:', query)

          const { data, error } = await supabase.rpc('execute_safe_query', {
            query_text: query,
            escritorio_param: escritorioId,
          })

          if (error) {
            console.error('[Centro Comando] Erro na query:', error.message, 'Query:', query)
            throw error
          }

          temDados = true
          resultados.push({
            tool: name,
            explicacao: args.explicacao,
            dados: data,
            total: Array.isArray(data) ? data.length : 0,
          })
        } catch (err: any) {
          console.error('[Centro Comando] Query com erro:', query)
          resultados.push({
            tool: name,
            erro: `Erro ao executar query: ${err.message}`,
            explicacao: args.explicacao,
            query_debug: query, // Para debug
          })
        }
        break
      }

      case 'preparar_cadastro': {
        // Validar dados obrigatórios
        if (!args.tabela) {
          resultados.push({
            tool: name,
            erro: 'Campo "tabela" é obrigatório. Use listar_tabelas para ver as opções.',
          })
          break
        }

        if (!args.dados || typeof args.dados !== 'object' || Object.keys(args.dados).length === 0) {
          resultados.push({
            tool: name,
            erro: 'Campo "dados" é obrigatório e deve ser um objeto JSON com os campos a inserir. Use consultar_schema para ver os campos da tabela.',
          })
          break
        }

        if (!TABELAS_PERMITIDAS.includes(args.tabela)) {
          resultados.push({
            tool: name,
            erro: `Tabela "${args.tabela}" não permitida. Use listar_tabelas para ver as disponíveis.`,
          })
          break
        }

        // Criar ação pendente para confirmação
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'insert',
            tabela: args.tabela,
            dados: args.dados,
            explicacao: args.explicacao || `Criar registro em ${args.tabela}`,
          })
          .select()
          .single()

        if (error) {
          resultados.push({
            tool: name,
            erro: `Erro ao preparar cadastro: ${error.message}`,
          })
        } else {
          acoesPendentes.push({
            id: acao.id,
            tipo: 'insert',
            tabela: args.tabela,
            dados: args.dados,
            explicacao: args.explicacao || `Criar registro em ${args.tabela}`,
          })
          resultados.push({
            tool: name,
            acao_pendente: true,
            acao_id: acao.id,
            explicacao: args.explicacao || `Criar registro em ${args.tabela}`,
            preview: args.dados,
          })
        }
        break
      }

      case 'preparar_alteracao': {
        // Buscar registro atual para preview
        const { data: registroAtual } = await supabase
          .from(args.tabela)
          .select('*')
          .eq('id', args.registro_id)
          .eq('escritorio_id', escritorioId)
          .single()

        if (!registroAtual) {
          resultados.push({
            tool: name,
            erro: 'Registro não encontrado',
          })
          continue
        }

        // Criar ação pendente
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'update',
            tabela: args.tabela,
            dados: {
              registro_id: args.registro_id,
              alteracoes: args.alteracoes,
              registro_atual: registroAtual,
            },
            explicacao: args.explicacao,
          })
          .select()
          .single()

        if (error) {
          resultados.push({
            tool: name,
            erro: error.message,
          })
        } else {
          acoesPendentes.push({
            id: acao.id,
            tipo: 'update',
            tabela: args.tabela,
            registro_id: args.registro_id,
            antes: registroAtual,
            depois: { ...registroAtual, ...args.alteracoes },
            explicacao: args.explicacao,
          })
          resultados.push({
            tool: name,
            acao_pendente: true,
            acao_id: acao.id,
            explicacao: args.explicacao,
            antes: registroAtual,
            alteracoes: args.alteracoes,
          })
        }
        break
      }

      case 'preparar_exclusao': {
        // Buscar registro para preview
        const { data: registro } = await supabase
          .from(args.tabela)
          .select('*')
          .eq('id', args.registro_id)
          .eq('escritorio_id', escritorioId)
          .single()

        if (!registro) {
          resultados.push({
            tool: name,
            erro: 'Registro não encontrado',
          })
          continue
        }

        // Criar ação pendente
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'delete',
            tabela: args.tabela,
            dados: {
              registro_id: args.registro_id,
              registro: registro,
            },
            explicacao: args.explicacao,
          })
          .select()
          .single()

        if (error) {
          resultados.push({
            tool: name,
            erro: error.message,
          })
        } else {
          acoesPendentes.push({
            id: acao.id,
            tipo: 'delete',
            tabela: args.tabela,
            registro_id: args.registro_id,
            registro: registro,
            explicacao: args.explicacao,
            requer_dupla_confirmacao: true,
          })
          resultados.push({
            tool: name,
            acao_pendente: true,
            acao_id: acao.id,
            explicacao: args.explicacao,
            registro: registro,
            aviso: 'ATENÇÃO: Esta ação é irreversível!',
            requer_dupla_confirmacao: true,
          })
        }
        break
      }

      case 'pedir_informacao': {
        resultados.push({
          tool: name,
          campos_necessarios: args.campos_necessarios,
          contexto: args.contexto,
          aguardando_input: true,
        })
        break
      }

      case 'navegar_pagina': {
        resultados.push({
          tool: name,
          caminho: args.caminho,
          filtros: args.filtros,
          explicacao: args.explicacao,
          tipo: 'navegacao',
        })
        break
      }

      default:
        resultados.push({
          tool: name,
          erro: 'Ferramenta não reconhecida',
        })
    }
  }

  return { resultados, acoesPendentes, temDados }
}

// ============================================
// EXECUTAR AÇÃO CONFIRMADA
// ============================================
async function executarAcaoConfirmada(
  supabase: any,
  acaoId: string,
  escritorioId: string,
  dadosAdicionais?: any
) {
  // Buscar ação pendente
  const { data: acao, error: fetchError } = await supabase
    .from('centro_comando_acoes_pendentes')
    .select('*')
    .eq('id', acaoId)
    .eq('escritorio_id', escritorioId)
    .eq('confirmado', false)
    .eq('executado', false)
    .single()

  if (fetchError || !acao) {
    return {
      sucesso: false,
      erro: 'Ação não encontrada ou já executada',
    }
  }

  // Verificar se expirou
  if (new Date(acao.expira_em) < new Date()) {
    return {
      sucesso: false,
      erro: 'Ação expirada. Por favor, solicite novamente.',
    }
  }

  let resultado: any

  try {
    switch (acao.tipo_acao) {
      case 'insert': {
        const { data, error } = await supabase.rpc('execute_safe_insert', {
          tabela: acao.tabela,
          dados: acao.dados,
          escritorio_param: escritorioId,
        })

        if (error) throw error
        resultado = data
        break
      }

      case 'update': {
        const { data, error } = await supabase.rpc('execute_safe_update', {
          tabela: acao.tabela,
          registro_id: acao.dados.registro_id,
          alteracoes: acao.dados.alteracoes,
          escritorio_param: escritorioId,
        })

        if (error) throw error
        resultado = data
        break
      }

      case 'delete': {
        // Verificar dupla confirmação para delete
        if (!dadosAdicionais?.dupla_confirmacao) {
          return {
            sucesso: false,
            erro: 'Exclusão requer dupla confirmação',
            requer_dupla_confirmacao: true,
          }
        }

        const { data, error } = await supabase.rpc('execute_safe_delete', {
          tabela: acao.tabela,
          registro_id: acao.dados.registro_id,
          escritorio_param: escritorioId,
          confirmacao_dupla: true,
        })

        if (error) throw error
        resultado = data
        break
      }
    }

    // Marcar ação como executada
    await supabase
      .from('centro_comando_acoes_pendentes')
      .update({
        confirmado: true,
        executado: true,
        resultado: resultado,
        confirmado_em: new Date().toISOString(),
        executado_em: new Date().toISOString(),
      })
      .eq('id', acaoId)

    return {
      sucesso: resultado?.sucesso !== false,
      mensagem: `${acao.tipo_acao === 'insert' ? 'Registro criado' : acao.tipo_acao === 'update' ? 'Registro atualizado' : 'Registro excluído'} com sucesso`,
      dados: resultado,
    }

  } catch (err: any) {
    // Salvar erro na ação
    await supabase
      .from('centro_comando_acoes_pendentes')
      .update({
        erro: err.message,
      })
      .eq('id', acaoId)

    return {
      sucesso: false,
      erro: err.message,
    }
  }
}

// ============================================
// VALIDAÇÃO DE SEGURANÇA
// ============================================
function isQuerySegura(query: string): boolean {
  if (!query) return false

  const queryUpper = query.toUpperCase().trim()

  // Deve começar com SELECT
  if (!queryUpper.startsWith('SELECT')) {
    return false
  }

  // Palavras proibidas
  const proibidas = [
    'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE',
    'DELETE', 'UPDATE', 'INSERT', 'EXECUTE', 'COPY', 'VACUUM',
    'REINDEX', 'CLUSTER', 'REFRESH', 'LOAD', 'UNLOAD'
  ]

  for (const palavra of proibidas) {
    // Verificar se a palavra aparece como comando (não como parte de um nome)
    const regex = new RegExp(`\\b${palavra}\\b`, 'i')
    if (regex.test(query)) {
      return false
    }
  }

  return true
}

// ============================================
// SALVAR HISTÓRICO
// ============================================
async function salvarHistorico(supabase: any, dados: {
  sessao_id?: string | null
  user_id: string
  escritorio_id: string
  role: string
  content: string
  tool_calls?: any
  tool_results?: any
  tempo_execucao_ms?: number
  tokens_input?: number
  tokens_output?: number
  erro?: string
}) {
  try {
    await supabase
      .from('centro_comando_historico')
      .insert({
        sessao_id: dados.sessao_id,
        user_id: dados.user_id,
        escritorio_id: dados.escritorio_id,
        role: dados.role,
        content: dados.content,
        tool_calls: dados.tool_calls,
        tool_results: dados.tool_results,
        tempo_execucao_ms: dados.tempo_execucao_ms,
        tokens_input: dados.tokens_input,
        tokens_output: dados.tokens_output,
        erro: dados.erro,
      })
  } catch (err) {
    console.error('[Centro Comando] Erro ao salvar histórico:', err)
  }
}

// ============================================
// HELPERS DE RESPOSTA
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
