// ============================================
// EDGE FUNCTION: CENTRO DE COMANDO COM IA
// ============================================
// Interface conversacional que permite ao usuário
// consultar e modificar dados usando linguagem natural.
// Utiliza DeepSeek Reasoner com function calling para interpretar
// comandos e executar queries seguras no banco.
//
// MODO STREAMING: Envia eventos em tempo real mostrando
// o que a IA está fazendo, como se estivesse "pensando em voz alta".
// O DeepSeek Reasoner possui chain-of-thought nativo que é
// exibido como "reasoning" antes da resposta final.
//
// SEGURANÇA:
// - SELECT: executa direto
// - INSERT/UPDATE: requer confirmação
// - DELETE: requer dupla confirmação
// - DROP/TRUNCATE: bloqueado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildRAGContext,
  formatRAGContextForPrompt,
  extractFactsFromConversation,
  saveExtractedFacts,
  type RAGContext,
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
  consultar_schema: {
    inicio: '📖 Verificando estrutura da tabela...',
    fim: (r) => r.erro
      ? `❌ Erro ao consultar estrutura: ${r.erro || 'Erro desconhecido'}`
      : `📝 Tabela ${r.tabela} tem ${r.total || 0} campos.`,
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
// SCHEMA PRÉ-CARREGADO DAS TABELAS PRINCIPAIS
// ============================================
// Isso ELIMINA a necessidade de chamar listar_tabelas e consultar_schema
// para as operações mais comuns, economizando 2-3 iterações por request.
const SCHEMA_PRINCIPAIS = `
### TABELAS DISPONÍVEIS (use diretamente, não precisa listar_tabelas):

1. **processos_processos** - Processos judiciais
   Campos: id, numero_cnj, numero_pasta, tipo, area, fase, tribunal, comarca, vara, juiz,
   data_distribuicao, cliente_id, responsavel_id, status, valor_causa, objeto_acao, autor, reu, tags
   Filtros comuns: status='ativo', area='trabalhista'/'civel'/'criminal'

2. **crm_pessoas** - Clientes e contatos (NÃO usar para responsável de tarefas!)
   Campos: id, nome_completo, tipo_pessoa, cpf_cnpj, email, telefone, endereco, tipo_contato (cliente/contato/adverso)
   Filtros comuns: tipo_contato='cliente'

2b. **profiles** - Usuários do sistema (usar para responsavel_id em tarefas/eventos)
   Campos: id, nome_completo, email, cargo, escritorio_id
   Use esta tabela para buscar IDs de responsáveis para agenda_tarefas e agenda_eventos

3. **agenda_tarefas** - Tarefas e afazeres
   Campos: id, titulo, descricao, tipo (obrigatório: 'prazo_processual'/'acompanhamento'/'follow_up'/'administrativo'/'outro'),
   prioridade ('alta'/'media'/'baixa'), status ('pendente'/'em_andamento'/'concluida'/'cancelada'),
   data_inicio (timestamptz, obrigatório), data_fim (timestamptz), prazo_data_limite (date),
   responsavel_id (uuid - DEVE vir de profiles.id, NÃO de crm_pessoas!), processo_id
   Para INSERT usar: titulo, tipo='administrativo', data_inicio, prioridade, status='pendente'
   IMPORTANTE: responsavel_id é OPCIONAL. Se não souber o ID correto do profiles, NÃO inclua este campo.
   Filtros comuns: status='pendente', prazo_data_limite >= CURRENT_DATE

4. **agenda_eventos** - Eventos e compromissos
   Campos: id, titulo, descricao, data_inicio, data_fim, tipo, local, responsavel_id, processo_id

5. **agenda_audiencias** - Audiências judiciais
   Campos: id, data_hora, tipo, local, vara, processo_id, responsavel_id, status

6. **financeiro_timesheet** - Registro de horas
   Campos: id, data, horas, descricao, processo_id, usuario_id, valor_hora, faturado

7. **financeiro_honorarios** - Lançamentos financeiros
   Campos: id, descricao, valor, data_vencimento, data_pagamento, status, processo_id, cliente_id

8. **v_agenda_consolidada** - View: agenda unificada (LEITURA)
   Campos: id, tipo_entidade, titulo, descricao, data_inicio, data_fim, status, prioridade, responsavel_nome, processo_numero

### REGRA DE OURO: SEMPRE inclua WHERE escritorio_id = '{escritorio_id}'
`

// ============================================
// EXEMPLOS DE QUERIES PARA OPERAÇÕES COMUNS
// ============================================
const EXEMPLOS_QUERIES = `
### EXEMPLOS DE QUERIES (copie e adapte):

-- Todos os processos ativos
SELECT id, numero_cnj, tipo, area, fase, tribunal, status, data_distribuicao, autor, reu
FROM processos_processos
WHERE escritorio_id = '{escritorio_id}' AND status = 'ativo'
ORDER BY data_distribuicao DESC;

-- Processos trabalhistas
SELECT * FROM processos_processos
WHERE escritorio_id = '{escritorio_id}' AND status = 'ativo' AND LOWER(area) = 'trabalhista';

-- Tarefas pendentes para hoje
SELECT id, titulo, prazo_data_limite, prioridade, status
FROM agenda_tarefas
WHERE escritorio_id = '{escritorio_id}' AND status = 'pendente' AND prazo_data_limite <= CURRENT_DATE;

-- Tarefas da semana
SELECT * FROM agenda_tarefas
WHERE escritorio_id = '{escritorio_id}' AND prazo_data_limite BETWEEN CURRENT_DATE AND CURRENT_DATE + 7;

-- Criar tarefa (INSERT)
-- Campos obrigatórios: titulo, tipo, data_inicio
-- tipo DEVE ser um de: 'prazo_processual', 'acompanhamento', 'follow_up', 'administrativo', 'outro'
-- INSERT via preparar_cadastro: {titulo: "...", tipo: "administrativo", data_inicio: "2026-01-17T10:00:00", prioridade: "alta", status: "pendente"}

-- Clientes ativos
SELECT id, nome, email, telefone FROM crm_pessoas
WHERE escritorio_id = '{escritorio_id}' AND tipo = 'cliente';

-- Horas do mês
SELECT SUM(horas) as total_horas FROM financeiro_timesheet
WHERE escritorio_id = '{escritorio_id}' AND DATE_TRUNC('month', data) = DATE_TRUNC('month', CURRENT_DATE);
`

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
      name: "consultar_schema",
      description: "⚠️ RARAMENTE NECESSÁRIO. Os campos das tabelas principais já estão documentados no prompt. Use APENAS para campos não documentados ou tabelas menos comuns.",
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
      description: "✅ USE ESTA TOOL para qualquer consulta. Você já conhece o schema - vá direto para a query SQL.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Query SQL SELECT. SEMPRE inclua WHERE escritorio_id = '{escritorio_id}'."
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
      description: "✅ USE ESTA TOOL para: 1) Coletar dados do usuário 2) CONFIRMAÇÕES (Sim/Não) 3) Escolhas entre opções. NUNCA faça perguntas no texto - use esta tool!",
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

    // Buscar chaves de API
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekKey) {
      return errorResponse('Chave DeepSeek não configurada no servidor', 500)
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    // OpenAI é opcional - se não tiver, desabilita RAG
    const ragEnabled = !!openaiApiKey

    // Buscar informações do usuário
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('nome_completo, role')
      .eq('id', user_id)
      .single()

    // Data atual para referência
    const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Construir contexto da sessão baseado no histórico (modo antigo, mantido para fallback)
    const sessionContext = construirContextoSessao(historico_mensagens || [])

    // ========================================
    // RAG: Buscar contexto relevante
    // ========================================
    let ragContext: RAGContext | null = null
    let ragSection = ''

    if (ragEnabled && openaiApiKey) {
      try {
        console.log('[Centro Comando] Buscando contexto RAG...')
        ragContext = await buildRAGContext(supabase, mensagem, {
          escritorioId: escritorio_id,
          userId: user_id,
          sessaoId: sessao_id,
          openaiApiKey,
        })
        ragSection = formatRAGContextForPrompt(ragContext)
        console.log(`[Centro Comando] RAG: ${ragContext.knowledge.length} chunks, ${ragContext.memories.length} memórias (~${ragContext.tokenEstimate} tokens)`)
      } catch (ragError) {
        console.error('[Centro Comando] Erro ao buscar RAG:', ragError)
        // Continua sem RAG
      }
    }

    // Construir bloco de memória da sessão (fallback/complemento)
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

    const systemPrompt = `Você é Zyra, assistente jurídica do Zyra Legal.
Usuário: ${userProfile?.nome_completo || 'Usuário'} | Escritório: ${escritorio_id}
Hoje: ${hoje} | Amanhã: ${amanha}

## REGRAS ABSOLUTAS

1. **SEJA CONCISA**: Máximo 2 frases.
2. **UMA CONSULTA** por vez.
3. **DETECTE CONFIRMAÇÕES**: Se o usuário disse "Sim", "confirmar", "aplicar" → EXECUTE a ação!

## ⚡ DETECTAR RESPOSTA DO USUÁRIO

Quando a mensagem contiver:
- "Sim", "sim, aplicar", "confirmar", "pode aplicar", "seguir" → É CONFIRMAÇÃO! Use preparar_alteracao_em_massa
- "Não", "cancelar" → Cancelar operação

## TOOLS

| Tool | Quando |
|------|--------|
| consultar_dados | Buscar dados |
| pedir_informacao | Perguntar ao usuário (coleta de dados, confirmação inicial) |
| preparar_alteracao_em_massa | APÓS usuário confirmar "Sim" - executa UPDATE em múltiplos registros |
| preparar_cadastro | INSERT de UM registro (para criar 5 tarefas, chame 5 vezes) |
| preparar_alteracao | UPDATE único (precisa registro_id) |
| preparar_exclusao | DELETE único |

## ⚠️ CRIAR MÚLTIPLOS REGISTROS

Para criar N registros (ex: 5 tarefas), chame preparar_cadastro N VEZES em paralelo:
- Cada chamada cria UM registro
- NÃO use arrays ou "registros" dentro de dados
- dados deve ser um objeto SIMPLES: {titulo: "...", descricao: "...", ...}

## FLUXO ALTERAÇÃO EM MASSA (CRÍTICO!)

### Etapa 1: Usuário pede alteração
Usuário: "Remova os prefixos dos autores"
→ Use consultar_dados para contar registros
→ Use pedir_informacao para perguntar

### Etapa 2: Usuário confirma "Sim"
Quando receber "Sim, aplicar" ou similar:
→ NÃO pergunte de novo!
→ Use preparar_alteracao_em_massa com a query SQL

Exemplo preparar_alteracao_em_massa:
\`\`\`json
{
  "tabela": "processos_processos",
  "query_update": "UPDATE processos_processos SET autor = TRIM(REGEXP_REPLACE(autor, '^[^:]+:\\s*', '')) WHERE escritorio_id = '{escritorio_id}' AND autor ~ '^[A-Za-zÀ-ú]+:'",
  "total_afetados": 158,
  "explicacao": "Remover prefixos como 'Autor:', 'Reclamante:' do campo autor"
}
\`\`\`

## Para coleta de dados:
\`\`\`json
{
  "campos_necessarios": [
    {"campo": "titulo", "descricao": "Título", "obrigatorio": true, "tipo": "texto"},
    {"campo": "data", "descricao": "Data", "obrigatorio": true, "tipo": "data"}
  ],
  "contexto": "Preciso das informações para criar a tarefa"
}
\`\`\`

${ragSection ? ragSection : SCHEMA_PRINCIPAIS + '\n' + EXEMPLOS_QUERIES}
${memoriaSection}

## SQL

- SEMPRE: WHERE escritorio_id = '${escritorio_id}'
- Strings: ILIKE ou LOWER()
- Datas: YYYY-MM-DD
- Resultados vão para tabela - não liste na resposta`

    // Montar histórico de mensagens para contexto
    const mensagensParaIA: Array<{role: string, content: string}> = [
      { role: 'system', content: systemPrompt }
    ]

    // Adicionar histórico se fornecido - COM tool_results resumidos
    // OTIMIZAÇÃO RAG: Reduzido de 10 para 3 mensagens quando RAG está ativo
    const maxHistorico = ragContext ? 3 : 10
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
        deepseekKey,
        mensagensParaIA,
        escritorio_id,
        user_id,
        sessao_id,
        openaiApiKey || null
      )
    }

    // ========================================
    // MODO SEM STREAMING (fallback)
    // ========================================
    return handleNonStreamingRequest(
      supabase,
      deepseekKey,
      mensagensParaIA,
      escritorio_id,
      user_id,
      sessao_id,
      openaiApiKey || null
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
  deepseekKey: string,
  mensagensParaIA: Array<{role: string, content: string}>,
  escritorioId: string,
  userId: string,
  sessaoId: string | null,
  openaiApiKey: string | null
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

          const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${deepseekKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'deepseek-reasoner',
              messages: mensagensAtual,
              tools: TOOLS,
              tool_choice: 'auto',
              max_tokens: 4000,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[Centro Comando SSE] Erro DeepSeek:', response.status, errorText)
            throw new Error(`Erro na API DeepSeek: ${response.status}`)
          }

          const aiResponse = await response.json()
          const choice = aiResponse.choices[0]

          // Acumular tokens
          tokensInput += aiResponse.usage?.prompt_tokens || 0
          tokensOutput += aiResponse.usage?.completion_tokens || 0

          // 📢 Se o DeepSeek retornou reasoning_content (chain-of-thought), mostrar
          if (choice.message.reasoning_content) {
            sendEvent('thinking', {
              message: '💭 ' + choice.message.reasoning_content.substring(0, 200) + '...',
              reasoning: choice.message.reasoning_content
            })
          }

          // Se a IA retornou tool_calls, processar com feedback
          if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            ultimoToolCalls = choice.message.tool_calls

            // Adicionar mensagem do assistente com tool_calls ao histórico
            // IMPORTANTE: Incluir reasoning_content para que o DeepSeek continue o raciocínio
            const assistantMessage: any = {
              role: 'assistant',
              content: choice.message.content || null,
              tool_calls: choice.message.tool_calls,
            }
            if (choice.message.reasoning_content) {
              assistantMessage.reasoning_content = choice.message.reasoning_content
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
        // RAG: Extrair e salvar memórias (async, não bloqueia)
        // ========================================
        if (openaiApiKey && sessaoId && respostaTexto) {
          // Executar de forma assíncrona para não atrasar a resposta
          (async () => {
            try {
              // Preparar conversa para extração
              const conversaParaExtracao = mensagensAtual
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role, content: m.content || '' }))

              // Adicionar resposta atual
              conversaParaExtracao.push({ role: 'assistant', content: respostaTexto })

              // Extrair fatos
              const facts = await extractFactsFromConversation(conversaParaExtracao, deepseekKey)

              if (facts.length > 0) {
                console.log(`[Centro Comando] Extraídos ${facts.length} fatos da conversa`)
                await saveExtractedFacts(supabase, facts, {
                  escritorioId,
                  userId,
                  sessaoId,
                  openaiApiKey,
                })
              }
            } catch (memError) {
              console.error('[Centro Comando] Erro ao extrair memórias:', memError)
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
  deepseekKey: string,
  mensagensParaIA: Array<{role: string, content: string}>,
  escritorioId: string,
  userId: string,
  sessaoId: string | null,
  openaiApiKey: string | null
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

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: mensagensAtual,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Centro Comando] Erro DeepSeek:', response.status, errorText)
      throw new Error(`Erro na API DeepSeek: ${response.status}`)
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
      // IMPORTANTE: Incluir reasoning_content para que o DeepSeek continue o raciocínio
      const assistantMessage: any = {
        role: 'assistant',
        content: choice.message.content || null,
        tool_calls: choice.message.tool_calls,
      }
      if (choice.message.reasoning_content) {
        assistantMessage.reasoning_content = choice.message.reasoning_content
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
  // RAG: Extrair e salvar memórias (async, não bloqueia)
  // ========================================
  if (openaiApiKey && sessaoId && respostaTexto) {
    // Executar de forma assíncrona para não atrasar a resposta
    (async () => {
      try {
        const conversaParaExtracao = mensagensAtual
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content || '' }))

        conversaParaExtracao.push({ role: 'assistant', content: respostaTexto })

        const facts = await extractFactsFromConversation(conversaParaExtracao, deepseekKey)

        if (facts.length > 0) {
          console.log(`[Centro Comando] Extraídos ${facts.length} fatos da conversa`)
          await saveExtractedFacts(supabase, facts, {
            escritorioId,
            userId,
            sessaoId,
            openaiApiKey,
          })
        }
      } catch (memError) {
        console.error('[Centro Comando] Erro ao extrair memórias:', memError)
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

    case 'consultar_schema': {
      const tabela = args.tabela
      if (!tabela) {
        return { tool: name, erro: 'Campo "tabela" é obrigatório.' }
      }
      if (!TABELAS_PERMITIDAS.includes(tabela)) {
        return { tool: name, erro: `Tabela "${tabela}" não permitida.` }
      }

      // Verificar cache primeiro
      const cachedSchema = getCachedSchema(tabela)
      if (cachedSchema) {
        console.log(`[Centro Comando] Schema de ${tabela} retornado do cache`)
        return {
          tool: name,
          tabela,
          colunas: cachedSchema.colunas || [],
          total: cachedSchema.colunas?.length || 0,
          explicacao: `Estrutura da tabela ${tabela} (do cache)`,
          dica: 'Não inclua id, escritorio_id, created_at, updated_at ao inserir.',
          fromCache: true,
        }
      }

      try {
        const { data: schema, error } = await supabase.rpc('get_table_schema', { tabela_nome: tabela })
        if (error) throw error

        // Guardar no cache
        setCachedSchema(tabela, schema)

        return {
          tool: name,
          tabela,
          colunas: schema?.colunas || [],
          total: schema?.colunas?.length || 0,
          explicacao: `Estrutura da tabela ${tabela}`,
          dica: 'Não inclua id, escritorio_id, created_at, updated_at ao inserir.'
        }
      } catch (err: any) {
        return { tool: name, erro: `Erro ao consultar schema: ${err?.message || String(err) || 'Erro desconhecido'}` }
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
      if (!TABELAS_PERMITIDAS.includes(args.tabela)) {
        return { tool: name, erro: `Tabela "${args.tabela}" não permitida.` }
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

      // Validar que a query tem WHERE escritorio_id
      if (!args.query_update.toLowerCase().includes('escritorio_id')) {
        return { tool: name, erro: 'Query DEVE incluir WHERE escritorio_id para segurança.' }
      }

      // Substituir placeholder pelo ID real
      const queryFinal = args.query_update.replace(/\{escritorio_id\}/g, escritorioId)

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
            erro: `Erro ao consultar schema: ${err?.message || String(err) || 'Erro desconhecido'}`,
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
            erro: `Erro ao executar query: ${err?.message || String(err) || 'Erro desconhecido'}`,
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
            erro: `Erro ao preparar cadastro: ${error?.message || error?.code || 'Erro desconhecido'}`,
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
            erro: error?.message || error?.code || 'Erro ao preparar alteração',
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
            erro: error?.message || error?.code || 'Erro ao preparar exclusão',
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

      case 'preparar_alteracao_em_massa': {
        if (!args.tabela || !args.query_update || !args.total_afetados) {
          resultados.push({
            tool: name,
            erro: 'Campos tabela, query_update e total_afetados são obrigatórios.',
          })
          break
        }

        // Validar que a query tem WHERE escritorio_id
        if (!args.query_update.toLowerCase().includes('escritorio_id')) {
          resultados.push({
            tool: name,
            erro: 'Query DEVE incluir WHERE escritorio_id para segurança.',
          })
          break
        }

        // Substituir placeholder pelo ID real
        const queryFinal = args.query_update.replace(/\{escritorio_id\}/g, escritorioId)

        // Criar ação pendente
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

        if (error) {
          resultados.push({
            tool: name,
            erro: error?.message || error?.code || 'Erro ao preparar alteração em massa',
          })
        } else {
          acoesPendentes.push({
            id: acao.id,
            tipo: 'update_em_massa',
            tabela: args.tabela,
            total_afetados: args.total_afetados,
            explicacao: args.explicacao,
          })
          resultados.push({
            tool: name,
            acao_pendente: true,
            acao_id: acao.id,
            tipo: 'update_em_massa',
            explicacao: args.explicacao,
            total_afetados: args.total_afetados,
            preview: `UPDATE em ${args.total_afetados} registros na tabela ${args.tabela}`,
            aviso: `⚠️ Esta ação alterará ${args.total_afetados} registros!`,
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
