// ============================================
// EDGE FUNCTION: CENTRO DE COMANDO COM IA
// ============================================
// Interface conversacional que permite ao usuário
// consultar e modificar dados usando linguagem natural.
// Utiliza OpenAI (modelo configurável via AI_MODEL env var)
// com function calling para interpretar comandos e
// executar queries seguras no banco.
//
// MODO STREAMING: Envia eventos SSE em tempo real mostrando
// o que a IA está fazendo (thinking, step, done, error).
//
// RAG: Busca semântica em knowledge base + memórias do usuário
// usando OpenAI embeddings (text-embedding-3-small).
//
// SEGURANÇA:
// - SELECT: executa direto
// - INSERT/UPDATE: requer confirmação
// - DELETE: requer dupla confirmação
// - DROP/TRUNCATE: bloqueado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  searchKnowledge,
  loadUserMemories,
  extractFactsFromConversation,
  saveExtractedFacts,
  type KnowledgeResult,
} from './rag-helpers.ts'

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
  descobrir_estrutura: {
    inicio: '🔍 Descobrindo estrutura da tabela...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro || 'Erro desconhecido'}`
      : `📝 ${r.tabela}: ${r.total_colunas || 0} colunas, ${r.total_constraints || 0} constraints, ${r.total_fks || 0} FKs.`,
  },
  consultar_dados: {
    inicio: '🔎 Buscando dados no banco...',
    fim: (r) => r.erro
      ? `❌ Erro na consulta: ${r.erro || 'Erro desconhecido'}`
      : `✅ Encontrei ${r.total || 0} ${r.total === 1 ? 'registro' : 'registros'}.`,
  },
  preparar_cadastro: {
    inicio: '✏️ Preparando o cadastro...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro || 'Erro ao preparar cadastro'}`
      : `📋 Cadastro preparado! Aguardando sua confirmação.`,
  },
  preparar_alteracao: {
    inicio: '✏️ Preparando a alteração...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro || 'Erro ao preparar alteração'}`
      : `📋 Alteração preparada! Revise e confirme.`,
  },
  preparar_alteracao_em_massa: {
    inicio: '⚙️ Preparando alteração em massa...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro || 'Erro ao preparar alteração em massa'}`
      : `📋 Alteração em ${r.total_afetados || 0} registros preparada! Aguardando confirmação.`,
  },
  preparar_exclusao: {
    inicio: '⚠️ Preparando exclusão...',
    fim: (r) => r.erro
      ? `❌ Erro: ${r.erro || 'Erro ao preparar exclusão'}`
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

// TABELAS_PERMITIDAS removido — validação centralizada na RPC get_tabelas_permitidas() do banco

// ============================================
// CONTEXTO DE DOMÍNIO — Índice de módulos + Regras de negócio
// ============================================
// Estrutura detalhada (colunas, constraints, FKs) vem da tool descobrir_estrutura.
// Este contexto foca no QUE cada módulo faz e nas REGRAS não deriváveis do schema.
const CONTEXTO_DOMINIO = `
### MÓDULOS E TABELAS (use descobrir_estrutura para ver colunas e valores válidos)
- **Processos**: processos_processos (caso judicial), processos_partes, processos_movimentacoes
- **CRM**: crm_pessoas (clientes/contatos), crm_interacoes, crm_oportunidades
- **Agenda**: agenda_tarefas, agenda_eventos, agenda_audiencias, agenda_recorrencias
- **Financeiro**: financeiro_timesheet, financeiro_honorarios, financeiro_honorarios_parcelas, financeiro_contratos_honorarios, financeiro_faturamento_faturas, financeiro_receitas_despesas, financeiro_contas_bancarias
- **Consultivo**: consultivo_consultas, consultivo_pareceres
- **Core**: profiles (usuários/advogados), escritorios, escritorios_usuarios
- **Views (SOMENTE LEITURA)**: v_agenda_consolidada, v_processos_dashboard, v_lancamentos_prontos_faturar, v_prazos_vencendo

### RELAÇÕES-CHAVE (para JOINs)
- processo.cliente_id → crm_pessoas.id | processo.responsavel_id → profiles.id
- tarefa/evento/audiencia.responsavel_id → profiles.id | .responsaveis_ids = uuid[] (múltiplos)
- tarefa/evento/audiencia.processo_id → processos_processos.id
- timesheet.user_id → profiles.id | timesheet.processo_id → processos_processos.id
- contrato/honorarios.cliente_id → crm_pessoas.id
- profiles ≠ crm_pessoas! profiles = advogados do escritório, crm_pessoas = clientes/contatos externos

### REGRAS DE NEGÓCIO (não deriváveis do schema)
- "Título" do processo = CONCAT(autor, ' x ', reu)
- v_agenda_consolidada unifica tarefas + eventos + audiências (somente SELECT, já tem responsavel_nome)
- Contratos definem cobrança (forma_cobranca + config jsonb) → timesheet × valor_hora → faturamento
- responsavel_id DEVE ser UUID de profiles.id — NUNCA inventar UUID
- data_inicio em agenda_tarefas é DATE (YYYY-MM-DD), não timestamptz
- data_inicio/data_fim em agenda_eventos é TIMESTAMPTZ

### WORKFLOWS OBRIGATÓRIOS
1. **Responsável por nome** → consultar_dados(SELECT id, nome_completo FROM profiles WHERE escritorio_id=... AND nome_completo ILIKE '%nome%') → usar UUID retornado
2. **Criar N registros** → chamar preparar_cadastro N vezes (um por registro)
3. **Reagendar** → consultar_dados (buscar registro) → preparar_alteracao (alterar data)

### PADRÕES SQL
- SEMPRE: WHERE escritorio_id = '{escritorio_id}'
- Pessoal: AND (responsavel_id = '{user_id}' OR '{user_id}' = ANY(responsaveis_ids))
- Nomes: LEFT JOIN profiles p ON p.id = t.responsavel_id → p.nome_completo
- Datas: TO_CHAR(campo AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
- LIMIT 20 padrão
`

// ============================================
// CACHE DE SCHEMA POR SESSÃO (in-memory)
// ============================================
const schemaCache = new Map<string, { schema: any; timestamp: number }>()
const SCHEMA_CACHE_TTL = 30 * 60 * 1000 // 30 minutos (efetivamente a sessão inteira)

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

    case 'descobrir_estrutura':
      const camposResumo = result.colunas_editaveis?.slice(0, 5).map((c: any) => c.coluna).join(', ')
      return `[descobrir_estrutura] Tabela ${tabela}: ${result.total_colunas} colunas, ${result.total_constraints} constraints (${camposResumo}...)`

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
        if (result.tool === 'descobrir_estrutura' && result.tabela && result.colunas_editaveis) {
          contexto.schemasConsultados[result.tabela] = result.colunas_editaveis.map((c: any) => c.coluna)
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
      description: "⚠️ RARAMENTE NECESSÁRIO. O schema das tabelas principais já está no prompt. Use APENAS para descobrir tabelas não documentadas.",
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
      name: "descobrir_estrutura",
      description: "Consulta a estrutura REAL de uma tabela: colunas editáveis, tipos, valores válidos (CHECK constraints) e foreign keys. USE ANTES de INSERT em tabela não consultada nesta sessão. USE quando INSERT falhar com erro de constraint. Resultado cacheado por sessão.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela (ex: agenda_tarefas, processos_processos)"
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
      description: "Executa SELECT SQL.\nREGRAS CRÍTICAS:\n1. NUNCA use SELECT * — selecione APENAS colunas relevantes para o usuário.\n2. SEMPRE JOIN profiles para nomes: LEFT JOIN profiles p ON p.id = t.responsavel_id\n3. NUNCA retorne: id, escritorio_id, created_at, updated_at, cor, fixa, status_data, recorrencia_id, responsaveis_ids (UUIDs crus).\n4. Para nomes de múltiplos responsáveis: use v_agenda_consolidada (já tem responsavel_nome).\n5. Datas: TO_CHAR(campo AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as data.\n6. LIMIT 20 por padrão.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Query SQL SELECT com colunas específicas (NUNCA SELECT *).\n- SEMPRE: WHERE escritorio_id = '{escritorio_id}'\n- Pessoal ('meu/minha/meus'): AND (responsavel_id = '{user_id}' OR '{user_id}' = ANY(responsaveis_ids))\n- SEMPRE JOIN profiles para nome do responsável\n- LIMIT 20"
          },
          explicacao: {
            type: "string",
            description: "Breve explicação do que a consulta retorna."
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
      description: "✅ Para INSERT de UM registro. Chame MÚLTIPLAS VEZES para criar vários registros (uma chamada por registro). NÃO use arrays ou 'registros'. Requer confirmação.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela (ex: agenda_tarefas)"
          },
          dados: {
            type: "object",
            description: "Campos e valores SIMPLES do registro. NÃO incluir id, escritorio_id. NÃO usar arrays ou objetos aninhados."
          },
          explicacao: {
            type: "string",
            description: "O que será criado (ex: Criar tarefa: Revisar contrato)"
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
      description: "✅ Para UPDATE. Precisa do registro_id. Requer confirmação.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela"
          },
          registro_id: {
            type: "string",
            description: "UUID do registro"
          },
          alteracoes: {
            type: "object",
            description: "Campos a alterar"
          },
          explicacao: {
            type: "string",
            description: "O que será alterado"
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
      description: "✅ Para DELETE. Requer DUPLA confirmação.",
      parameters: {
        type: "object",
        properties: {
          tabela: { type: "string", description: "Nome da tabela" },
          registro_id: { type: "string", description: "UUID do registro" },
          explicacao: { type: "string", description: "O que será excluído" }
        },
        required: ["tabela", "registro_id", "explicacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "preparar_alteracao_em_massa",
      description: "✅ Para UPDATE em múltiplos registros. Use APÓS o usuário confirmar 'Sim'. Requer confirmação final.",
      parameters: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description: "Nome da tabela (ex: processos_processos)"
          },
          query_update: {
            type: "string",
            description: "Query SQL UPDATE completa. DEVE incluir WHERE escritorio_id = '{escritorio_id}'"
          },
          total_afetados: {
            type: "number",
            description: "Quantidade de registros que serão alterados"
          },
          explicacao: {
            type: "string",
            description: "Descrição clara do que será alterado"
          }
        },
        required: ["tabela", "query_update", "total_afetados", "explicacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pedir_informacao",
      description: "✅ USE APENAS para coletar DADOS FALTANTES do usuário (ex: título, data, responsável). NUNCA use para confirmações Sim/Não — confirmações são feitas automaticamente pelo sistema via preparar_cadastro/preparar_alteracao.",
      parameters: {
        type: "object",
        properties: {
          campos_necessarios: {
            type: "array",
            description: "Lista de campos. Para confirmação: [{campo:'confirmacao', tipo:'selecao', opcoes:['Sim','Não']}]",
            items: {
              type: "object",
              properties: {
                campo: { type: "string", description: "Nome do campo (ex: 'titulo', 'confirmacao')" },
                descricao: { type: "string", description: "Texto amigável para o usuário" },
                obrigatorio: { type: "boolean" },
                tipo: { type: "string", enum: ["texto", "data", "numero", "selecao"] },
                opcoes: { type: "array", items: { type: "string" }, description: "Obrigatório se tipo='selecao'" }
              },
              required: ["campo", "descricao", "obrigatorio", "tipo"]
            }
          },
          contexto: { type: "string", description: "Explicação curta do que está sendo perguntado" }
        },
        required: ["campos_necessarios", "contexto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navegar_pagina",
      description: "Sugere ir para outra tela do sistema.",
      parameters: {
        type: "object",
        properties: {
          caminho: { type: "string", description: "Ex: /dashboard/processos" },
          filtros: { type: "object", description: "Query params" },
          explicacao: { type: "string", description: "Para onde vai" }
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

    // Buscar chave de API OpenAI (obrigatória)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return errorResponse('Chave OpenAI não configurada no servidor', 500)
    }
    const aiModel = Deno.env.get('AI_MODEL') || 'gpt-4o-mini'
    // RAG sempre habilitado com OpenAI (knowledge base + memórias separados)

    // Buscar informações do usuário
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('nome_completo, role')
      .eq('id', user_id)
      .single()

    // Data atual para referência (timezone Brasília)
    const agora = new Date()
    const hoje = agora.toISOString().split('T')[0] // YYYY-MM-DD
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
    const diaSemana = diasSemana[agora.getDay()]
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

    // Construir contexto da sessão baseado no histórico (modo antigo, mantido para fallback)
    const sessionContext = construirContextoSessao(historico_mensagens || [])

    // ========================================
    // KNOWLEDGE BASE: Busca semântica a cada mensagem
    // ========================================
    let knowledgeSection = ''

    if (openaiApiKey) {
      try {
        console.log('[Centro Comando] Buscando knowledge base...')
        const knowledge = await searchKnowledge(supabase, mensagem, openaiApiKey)
        if (knowledge.length > 0) {
          knowledgeSection = '\n## CONHECIMENTO COMPLEMENTAR\n' +
            knowledge.map(k => `### ${k.title}\n${k.content}`).join('\n')
        }
        console.log(`[Centro Comando] Knowledge: ${knowledge.length} chunks`)
      } catch (kbError) {
        console.error('[Centro Comando] Erro knowledge base:', kbError)
      }
    }

    // ========================================
    // MEMÓRIAS CROSS-SESSION: Carregadas apenas na 1ª mensagem
    // ========================================
    let memoriasCrossSessao = ''
    const isFirstMessage = !historico_mensagens || historico_mensagens.length === 0

    if (isFirstMessage && openaiApiKey) {
      try {
        const memories = await loadUserMemories(supabase, user_id, escritorio_id)
        if (memories.length > 0) {
          memoriasCrossSessao = '\n## O QUE SEI SOBRE VOCÊ (sessões anteriores)\n' +
            memories.map((m: any) => {
              const label = m.tipo === 'correcao' ? '⚠️' : m.tipo === 'preferencia' ? '💡' : '📌'
              return `${label} ${m.content_resumido || m.content}`
            }).join('\n')
        }
        console.log(`[Centro Comando] Memórias cross-session: ${memories.length}`)
      } catch (memError) {
        console.error('[Centro Comando] Erro memórias:', memError)
      }
    }

    // Construir bloco de memória da sessão (schemas já consultados nesta conversa)
    let memoriaSection = ''
    if (sessionContext.tabelasConhecidas.length > 0 || Object.keys(sessionContext.schemasConsultados).length > 0) {
      memoriaSection = '\n## CACHE DA SESSÃO (já descobri isso)\n'
      if (Object.keys(sessionContext.schemasConsultados).length > 0) {
        memoriaSection += Object.entries(sessionContext.schemasConsultados).map(([tabela, campos]) =>
          `- ${tabela}: ${(campos as string[]).slice(0, 8).join(', ')}...`
        ).join('\n')
      }
    }

    const systemPrompt = `Você é Zyra, assistente jurídica inteligente do sistema Zyra Legal.
Você mantém contexto da conversa e aprende com cada interação.

## USUÁRIO
- Nome: ${userProfile?.nome_completo || 'Usuário'}
- ID: ${user_id}
- Cargo: ${userProfile?.role || 'advogado'}
- Escritório: ${escritorio_id}
- Agora: ${hoje} (${diaSemana}), ${horaAtual}

## COMPORTAMENTO
- Respostas concisas (1-3 frases). Dados em tabela, não texto.
- "Minhas/meus" = filtrar por user_id. "Do escritório/equipe" = apenas escritorio_id.
- Para INSERT/UPDATE: chame preparar_cadastro/preparar_alteracao DIRETO. O sistema mostra tela de confirmação automaticamente.
- DELETE = dupla confirmação (via preparar_exclusao).
- Criar N registros = chamar preparar_cadastro N vezes (um objeto simples por chamada).
- Usar JOINs quando precisar cruzar informações entre módulos.

## AUTODESCOBERTA E CORREÇÃO
- ANTES de INSERT numa tabela não consultada nesta sessão: chame descobrir_estrutura para ver colunas, tipos e valores válidos.
- Se INSERT falhar com erro de constraint/tipo: chame descobrir_estrutura, veja os valores válidos nos constraints_check, corrija e tente novamente.
- Schemas descobertos ficam em cache da sessão (não precisa reconsultar a mesma tabela).
- Nunca assuma valores de memória — verifique via descobrir_estrutura se não tem certeza.

## ⚠️ REGRAS ANTI-LOOP
- NUNCA use pedir_informacao para pedir confirmação Sim/Não. Use preparar_cadastro/preparar_alteracao que já tem confirmação embutida.
- Se o usuário diz "Sim", "confirmar", "pode fazer", "pode aplicar" ou envia dados via formulário ("Aqui estao as informacoes:...") → EXECUTE a ação imediatamente. NÃO pergunte de novo.
- Se já tem todos os dados necessários → chame preparar_cadastro/preparar_alteracao DIRETO, sem perguntar.
- pedir_informacao é APENAS para coletar dados que estão FALTANDO (ex: título da tarefa, data, responsável).

## DOMÍNIO
${CONTEXTO_DOMINIO}

## SQL
- SEMPRE: WHERE escritorio_id = '${escritorio_id}'
- Filtro pessoal: responsavel_id = '{user_id}' OU '{user_id}' = ANY(responsaveis_ids)
- Timesheet pessoal: user_id = '{user_id}'
- Strings: ILIKE. Datas: YYYY-MM-DD.
- NUNCA SELECT * — sempre colunas específicas + JOINs para nomes.
- Para nomes: LEFT JOIN profiles p ON p.id = tabela.responsavel_id, retornar p.nome_completo as responsavel.
- Para múltiplos responsáveis: preferir v_agenda_consolidada que já tem responsavel_nome.
- Formatar datas na query: TO_CHAR(campo AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI').
- LIMIT 20 por padrão. Informar total se houver mais.

## FORMATAÇÃO DE RESPOSTAS
- Respostas conversacionais curtas. Se dados foram consultados, resuma os pontos principais em 1-2 frases, depois mostre tabela markdown.
- Tabelas Markdown: MÁXIMO 5-6 colunas relevantes. Colunas por contexto:
  * Agenda: Título, Tipo, Status, Prazo, Responsável
  * Processos: Número CNJ, Partes (autor x réu), Área, Status, Responsável
  * Financeiro: Descrição, Valor, Vencimento, Status
  * CRM: Nome, Tipo, Email/Telefone
- NUNCA mostrar UUIDs — sempre JOINar com profiles para obter nome_completo.
- NUNCA incluir campos internos (cor, fixa, status_data, prazo_dias_uteis, horario_planejado_dia, duracao_planejada_minutos, recorrencia_id, etc).
- Prioridades: use emoji (🔴 urgente, 🟠 alta, 🔵 média, ⚪ baixa).
- Status: use emoji (✅ concluída, ⏳ pendente, 🔄 em andamento, ❌ cancelada).
- Datas: formato dd/MM/yyyy ou dd/MM HH:mm. NUNCA formato ISO.
- Se 0 resultados: responda amigavelmente, sugira alternativas.
- Tabela Markdown: SEMPRE inclua TODOS os registros retornados (até LIMIT 20). NUNCA omita linhas — o usuário quer ver tudo.
- Se >20 resultados existirem no banco: mostre os 20 retornados e informe o total.

${knowledgeSection}
${memoriasCrossSessao}
${memoriaSection}`

    // Montar histórico de mensagens para contexto
    const mensagensParaIA: Array<{role: string, content: string}> = [
      { role: 'system', content: systemPrompt }
    ]

    // Adicionar histórico se fornecido - COM tool_results resumidos
    // OTIMIZAÇÃO RAG: Reduzido de 10 para 3 mensagens quando RAG está ativo
    const maxHistorico = 15 // Janela de conversa = memória de sessão
    if (historico_mensagens && Array.isArray(historico_mensagens)) {
      for (const msg of historico_mensagens.slice(-maxHistorico)) {
        if (msg.role && msg.content) {
          let content = msg.content

          // Se é mensagem do assistente e tem tool_results, adicionar resumo
          if (msg.role === 'assistant' && msg.tool_results && Array.isArray(msg.tool_results)) {
            const resumos = msg.tool_results
              .map((r: any) => resumirToolResult(r))
              .filter((r: string) => r)
              .join('\n')

            if (resumos) {
              content = `${msg.content}\n\n[RESULTADOS DAS FERRAMENTAS EXECUTADAS:]\n${resumos}`
            }
          }

          mensagensParaIA.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content
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
        openaiApiKey,
        aiModel,
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
      openaiApiKey,
      aiModel,
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
  openaiApiKey: string,
  aiModel: string,
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
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiModel,
              messages: mensagensAtual,
              tools: TOOLS,
              tool_choice: 'auto',
              max_tokens: 4000,
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
            const assistantMessage: any = {
              role: 'assistant',
              content: choice.message.content || null,
              tool_calls: choice.message.tool_calls,
            }
            mensagensAtual.push(assistantMessage)

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

            // VERIFICAR SE ALGUMA TOOL RETORNOU aguardando_input
            // Se sim, PARAR o loop e esperar resposta do usuário
            const temInputPendente = toolResults.some(r => r.aguardando_input === true)
            if (temInputPendente) {
              console.log('[Centro Comando SSE] Input pendente detectado - parando loop')
              respostaTexto = '' // Deixar vazio para não sobrescrever
              break
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
          // Verificar se há input pendente - NÃO gerar texto, deixar o card falar por si
          const resultadoInputPendente = toolResults.find(r => r.aguardando_input === true)

          if (resultadoInputPendente) {
            // Deixar vazio ou mensagem curta - o FormularioPendente já mostra as informações
            respostaTexto = ''
          } else if (toolResults.length > 0) {
            const resultadoComDados = toolResults.find(r => r.dados && r.total !== undefined)
            const resultadoComErro = toolResults.find(r => r.erro)

            if (resultadoComErro) {
              respostaTexto = `Houve um erro ao executar a consulta: ${resultadoComErro.erro}`
            } else if (resultadoComDados) {
              if (resultadoComDados.total === 0) {
                respostaTexto = `Não encontrei nenhum registro com os critérios especificados.`
              } else {
                respostaTexto = `Encontrei ${resultadoComDados.total} registro${resultadoComDados.total > 1 ? 's' : ''}.`
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

        // ========================================
        // RAG: Extrair e salvar memórias (async, throttled — a cada ~5 turnos)
        // ========================================
        const totalMensagens = mensagensAtual.filter((m: any) => m.role === 'user').length
        if (sessaoId && respostaTexto && totalMensagens % 5 === 0) {
          // Executar de forma assíncrona para não atrasar a resposta
          ;(async () => {
            try {
              console.log(`[Memory] Extração throttled (turno ${totalMensagens}) — iniciando...`)
              const conversaParaExtracao = mensagensAtual
                .filter((m: any) => m.role === 'user' || m.role === 'assistant')
                .map((m: any) => ({ role: m.role, content: m.content || '' }))

              conversaParaExtracao.push({ role: 'assistant', content: respostaTexto })

              const facts = await extractFactsFromConversation(conversaParaExtracao, openaiApiKey, aiModel)
              console.log(`[Memory] ${facts.length} fatos extraídos`)

              if (facts.length > 0) {
                await saveExtractedFacts(supabase, facts, {
                  escritorioId,
                  userId,
                  sessaoId,
                  openaiApiKey,
                })
                console.log(`[Memory] ${facts.length} fatos salvos com sucesso`)
              }
            } catch (memError) {
              console.error('[Memory] ERRO na extração de fatos:', memError)
            }
          })()
        }

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
  openaiApiKey: string,
  aiModel: string,
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
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: mensagensAtual,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 4000,
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
      const assistantMessage: any = {
        role: 'assistant',
        content: choice.message.content || null,
        tool_calls: choice.message.tool_calls,
      }
      mensagensAtual.push(assistantMessage)

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

      // VERIFICAR SE ALGUMA TOOL RETORNOU aguardando_input
      // Se sim, PARAR o loop e esperar resposta do usuário
      const temInputPendente = toolResults.some(r => r.aguardando_input === true)
      if (temInputPendente) {
        console.log('[Centro Comando] Input pendente detectado - parando loop')
        respostaTexto = '' // Deixar vazio para não sobrescrever
        break
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
    // Verificar se há input pendente - NÃO gerar texto, deixar o card falar por si
    const resultadoInputPendente = toolResults.find(r => r.aguardando_input === true)

    if (resultadoInputPendente) {
      // Deixar vazio - o FormularioPendente já mostra as informações
      respostaTexto = ''
    } else if (toolResults.length > 0) {
      // Tem resultados de tools
      const resultadoComDados = toolResults.find(r => r.dados && r.total !== undefined)
      const resultadoComErro = toolResults.find(r => r.erro)

      if (resultadoComErro) {
        respostaTexto = `Houve um erro ao executar a consulta: ${resultadoComErro.erro}`
      } else if (resultadoComDados) {
        if (resultadoComDados.total === 0) {
          respostaTexto = `Não encontrei nenhum registro com os critérios especificados.`
        } else {
          respostaTexto = `Encontrei ${resultadoComDados.total} registro${resultadoComDados.total > 1 ? 's' : ''}.`
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

  // ========================================
  // RAG: Extrair e salvar memórias (async, throttled — a cada ~5 turnos)
  // ========================================
  const totalMensagensNonSSE = mensagensAtual.filter((m: any) => m.role === 'user').length
  if (sessaoId && respostaTexto && totalMensagensNonSSE % 5 === 0) {
    ;(async () => {
      try {
        console.log(`[Memory] Extração throttled (turno ${totalMensagensNonSSE}) — iniciando...`)
        const conversaParaExtracao = mensagensAtual
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({ role: m.role, content: m.content || '' }))

        conversaParaExtracao.push({ role: 'assistant', content: respostaTexto })

        const facts = await extractFactsFromConversation(conversaParaExtracao, openaiApiKey, aiModel)
        console.log(`[Memory] ${facts.length} fatos extraídos`)

        if (facts.length > 0) {
          await saveExtractedFacts(supabase, facts, {
            escritorioId,
            userId,
            sessaoId,
            openaiApiKey,
          })
          console.log(`[Memory] ${facts.length} fatos salvos com sucesso`)
        }
      } catch (memError) {
        console.error('[Memory] ERRO na extração de fatos:', memError)
      }
    })()
  }

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

    case 'descobrir_estrutura': {
      const tabela = args.tabela
      if (!tabela) {
        return { tool: name, erro: 'Campo "tabela" é obrigatório.' }
      }

      // Verificar cache primeiro
      const cachedSchema = getCachedSchema(tabela)
      if (cachedSchema) {
        console.log(`[Centro Comando] Estrutura de ${tabela} retornada do cache`)
        return { ...cachedSchema, fromCache: true }
      }

      try {
        const { data: info, error } = await supabase.rpc('get_table_info', { tabela_nome: tabela })
        if (error) throw error

        // Filtrar campos auto (id, escritorio_id, etc.) para a IA ver apenas editáveis
        const todasColunas = info?.colunas || []
        const colunasEditaveis = todasColunas
          .filter((c: any) => !c.auto)
          .map((c: any) => {
            const constraint = (info?.constraints_check || []).find((cc: any) => cc.coluna === c.coluna)
            return {
              coluna: c.coluna,
              tipo: c.tipo,
              obrigatorio: c.obrigatorio,
              default: c.default,
              valores_validos: constraint?.definicao || null,
            }
          })

        const resultado = {
          tool: name,
          tabela,
          total_colunas: todasColunas.length,
          total_constraints: (info?.constraints_check || []).length,
          total_fks: (info?.foreign_keys || []).length,
          colunas_editaveis: colunasEditaveis,
          foreign_keys: info?.foreign_keys || [],
          explicacao: `Estrutura da tabela ${tabela}: ${colunasEditaveis.length} campos editáveis, ${(info?.constraints_check || []).length} constraints, ${(info?.foreign_keys || []).length} FKs`,
        }

        // Guardar no cache
        setCachedSchema(tabela, resultado)

        return resultado
      } catch (err: any) {
        return { tool: name, erro: `Erro ao descobrir estrutura: ${err?.message || String(err) || 'Erro desconhecido'}` }
      }
    }

    case 'consultar_dados': {
      const query = args.query
        ?.replace(/\{escritorio_id\}/g, escritorioId)
        ?.replace(/\{user_id\}/g, userId)
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
          erro: `Erro ao executar query: ${err?.message || String(err) || 'Erro desconhecido'}`,
          query_debug: query,
        }
      }
    }

    case 'preparar_cadastro': {
      if (!args.tabela) {
        return { tool: name, erro: 'Campo "tabela" é obrigatório.' }
      }
      if (!args.dados || typeof args.dados !== 'object' || Object.keys(args.dados).length === 0) {
        return { tool: name, erro: 'Campo "dados" é obrigatório e deve ser um objeto JSON com os campos do registro.' }
      }
      // Validar que dados não é uma estrutura aninhada (bulk insert não suportado)
      if (args.dados.registros || Array.isArray(args.dados)) {
        return {
          tool: name,
          erro: 'ERRO: preparar_cadastro aceita apenas UM registro por vez. Para criar múltiplos registros, chame preparar_cadastro uma vez para cada registro individualmente.'
        }
      }
      // Validar que os dados são campos simples, não objetos aninhados
      const camposInvalidos = Object.entries(args.dados).filter(([_, v]) => typeof v === 'object' && v !== null)
      if (camposInvalidos.length > 0) {
        return {
          tool: name,
          erro: `ERRO: Os campos devem ser valores simples (texto, número, data). Campos inválidos: ${camposInvalidos.map(([k]) => k).join(', ')}`
        }
      }
      try {
        console.log('[preparar_cadastro] Inserindo ação pendente:', { tabela: args.tabela, dados: args.dados })
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
          console.error('[preparar_cadastro] Erro Supabase:', error)
          return {
            tool: name,
            erro: `Erro ao salvar ação: ${error.message || error.code || JSON.stringify(error)}`
          }
        }

        if (!acao || !acao.id) {
          console.error('[preparar_cadastro] Ação criada mas sem ID:', acao)
          return { tool: name, erro: 'Erro: ação criada mas sem ID retornado' }
        }

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
        console.error('[preparar_cadastro] Exceção:', err)
        const errorMsg = err?.message || (err ? String(err) : 'Erro desconhecido ao preparar cadastro')
        return { tool: name, erro: errorMsg }
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
        return { tool: name, erro: err?.message || String(err) || 'Erro ao preparar alteração' }
      }
    }

    case 'preparar_alteracao_em_massa': {
      if (!args.tabela || !args.query_update || !args.total_afetados) {
        return { tool: name, erro: 'Campos tabela, query_update e total_afetados são obrigatórios.' }
      }

      // Validar que a query tem WHERE escritorio_id (regex mais rigorosa)
      if (!/WHERE\s+.*escritorio_id\s*=/i.test(args.query_update)) {
        return { tool: name, erro: 'Query DEVE incluir WHERE escritorio_id = ... para segurança.' }
      }

      // Substituir placeholders pelos IDs reais
      const queryFinal = args.query_update
        .replace(/\{escritorio_id\}/g, escritorioId)
        .replace(/\{user_id\}/g, userId)

      try {
        // Salvar ação pendente
        const { data: acao, error } = await supabase
          .from('centro_comando_acoes_pendentes')
          .insert({
            sessao_id: sessaoId,
            user_id: userId,
            escritorio_id: escritorioId,
            tipo_acao: 'update_em_massa',
            tabela: args.tabela,
            dados: {
              query: queryFinal,
              total_afetados: args.total_afetados,
            },
            explicacao: args.explicacao,
          })
          .select()
          .single()

        if (error) throw error

        return {
          tool: name,
          acao_pendente: true,
          acao_id: acao.id,
          tipo: 'update_em_massa',
          explicacao: args.explicacao,
          total_afetados: args.total_afetados,
          preview: `UPDATE em ${args.total_afetados} registros na tabela ${args.tabela}`,
          aviso: `⚠️ Esta ação alterará ${args.total_afetados} registros!`,
        }
      } catch (err: any) {
        return { tool: name, erro: `Erro ao preparar alteração em massa: ${err?.message || String(err) || 'Erro desconhecido'}` }
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
        return { tool: name, erro: err?.message || String(err) || 'Erro ao preparar exclusão' }
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
        console.log('[executarAcaoConfirmada] Executando INSERT:', { tabela: acao.tabela, dados: acao.dados })

        const { data, error } = await supabase.rpc('execute_safe_insert', {
          tabela: acao.tabela,
          dados: acao.dados,
          escritorio_param: escritorioId,
        })

        console.log('[executarAcaoConfirmada] Resultado INSERT:', { data, error })

        if (error) throw error
        // A função RPC retorna { sucesso: true/false, erro?: string }
        if (data && data.sucesso === false) {
          throw new Error(data.erro || 'Erro ao inserir registro')
        }
        resultado = data
        break
      }

      case 'update': {
        console.log('[executarAcaoConfirmada] Executando UPDATE:', { tabela: acao.tabela, dados: acao.dados })

        const { data, error } = await supabase.rpc('execute_safe_update', {
          tabela: acao.tabela,
          registro_id: acao.dados.registro_id,
          alteracoes: acao.dados.alteracoes,
          escritorio_param: escritorioId,
        })

        console.log('[executarAcaoConfirmada] Resultado UPDATE:', { data, error })

        if (error) throw error
        if (data && data.sucesso === false) {
          throw new Error(data.erro || 'Erro ao atualizar registro')
        }
        resultado = data
        break
      }

      case 'update_em_massa': {
        // Executar query de UPDATE em massa
        const query = acao.dados.query

        // Verificar segurança - deve ter WHERE escritorio_id
        if (!query.toLowerCase().includes('escritorio_id')) {
          throw new Error('Query de UPDATE em massa deve incluir filtro de escritorio_id')
        }

        console.log('[executarAcaoConfirmada] Executando UPDATE EM MASSA:', { query })

        // Executar via RPC para garantir segurança
        const { data, error } = await supabase.rpc('execute_raw_sql', {
          sql_query: query,
        })

        console.log('[executarAcaoConfirmada] Resultado UPDATE EM MASSA:', { data, error })

        if (error) throw error
        if (data && data.sucesso === false) {
          throw new Error(data.erro || 'Erro ao executar UPDATE em massa')
        }

        resultado = {
          sucesso: true,
          total_afetados: acao.dados.total_afetados,
          query_executada: query,
        }
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

        console.log('[executarAcaoConfirmada] Executando DELETE:', { tabela: acao.tabela, dados: acao.dados })

        const { data, error } = await supabase.rpc('execute_safe_delete', {
          tabela: acao.tabela,
          registro_id: acao.dados.registro_id,
          escritorio_param: escritorioId,
          confirmacao_dupla: true,
        })

        console.log('[executarAcaoConfirmada] Resultado DELETE:', { data, error })

        if (error) throw error
        if (data && data.sucesso === false) {
          throw new Error(data.erro || 'Erro ao excluir registro')
        }
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

    // Mensagem de sucesso baseada no tipo
    const mensagens: Record<string, string> = {
      'insert': 'Registro criado com sucesso',
      'update': 'Registro atualizado com sucesso',
      'update_em_massa': `${resultado?.total_afetados || acao.dados?.total_afetados || 'Múltiplos'} registros atualizados com sucesso`,
      'delete': 'Registro excluído com sucesso',
    }

    return {
      sucesso: resultado?.sucesso !== false,
      mensagem: mensagens[acao.tipo_acao] || 'Ação executada com sucesso',
      dados: resultado,
    }

  } catch (err: any) {
    // Log detalhado do erro
    console.error('[executarAcaoConfirmada] Erro completo:', JSON.stringify(err, null, 2))
    console.error('[executarAcaoConfirmada] err.message:', err?.message)
    console.error('[executarAcaoConfirmada] err.details:', err?.details)
    console.error('[executarAcaoConfirmada] err.hint:', err?.hint)
    console.error('[executarAcaoConfirmada] err.code:', err?.code)

    // Extrair mensagem de erro de várias fontes possíveis
    const errorMessage = err?.message || err?.details || err?.hint || err?.code ||
                        (typeof err === 'string' ? err : JSON.stringify(err)) ||
                        'Erro desconhecido ao executar ação'

    // Salvar erro na ação
    await supabase
      .from('centro_comando_acoes_pendentes')
      .update({
        erro: errorMessage,
      })
      .eq('id', acaoId)

    return {
      sucesso: false,
      erro: errorMessage,
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
