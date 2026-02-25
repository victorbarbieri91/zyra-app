/**
 * RAG (Retrieval Augmented Generation) Helpers
 *
 * Funções para busca semântica na knowledge base e memórias,
 * geração de embeddings e extração de fatos das conversas.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// TIPOS
// ============================================================================

export interface KnowledgeResult {
  id: string
  title: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export interface MemoryResult {
  id: string
  tipo: string
  content: string
  content_resumido: string | null
  similarity: number
}

export interface RAGContext {
  knowledge: KnowledgeResult[]
  memories: MemoryResult[]
  tokenEstimate: number
}

export interface ExtractedFact {
  tipo: 'preferencia' | 'contexto' | 'fato' | 'entidade' | 'correcao'
  entidade?: string
  content: string
  permanente: boolean
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

// Thresholds
const KNOWLEDGE_THRESHOLD = 0.65
const MEMORY_THRESHOLD = 0.55
const MAX_KNOWLEDGE_RESULTS = 5
const MAX_MEMORY_RESULTS = 8

// ============================================================================
// EMBEDDING
// ============================================================================

/**
 * Gera hash SHA-256 de um texto (Web Crypto API nativa, sem imports)
 */
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verifica cache de embedding e retorna se existir
 */
async function getEmbeddingFromCache(
  supabase: SupabaseClient,
  text: string
): Promise<number[] | null> {
  const inputHash = await hashText(text)

  const { data, error } = await supabase
    .from('centro_comando_embedding_cache')
    .select('embedding')
    .eq('input_hash', inputHash)
    .single()

  if (error || !data) return null

  // Atualizar contador de uso
  await supabase.rpc('update_embedding_cache_usage', { p_input_hash: inputHash })

  // Parse do embedding string para array
  if (typeof data.embedding === 'string') {
    try {
      return JSON.parse(data.embedding)
    } catch {
      return data.embedding as number[]
    }
  }

  return data.embedding as number[]
}

/**
 * Salva embedding no cache
 */
async function saveEmbeddingToCache(
  supabase: SupabaseClient,
  text: string,
  embedding: number[]
): Promise<void> {
  const inputHash = await hashText(text)

  await supabase
    .from('centro_comando_embedding_cache')
    .upsert({
      input_hash: inputHash,
      input_text: text.substring(0, 2000),
      embedding: JSON.stringify(embedding),
      uso_count: 1,
    }, { onConflict: 'input_hash' })
}

/**
 * Gera embedding para um texto usando OpenAI
 * Usa cache para evitar chamadas repetidas
 */
export async function generateEmbedding(
  supabase: SupabaseClient,
  text: string,
  openaiApiKey: string
): Promise<number[]> {
  // Tentar buscar do cache primeiro
  const cached = await getEmbeddingFromCache(supabase, text)
  if (cached) {
    return cached
  }

  // Gerar novo embedding
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const embedding = data.data[0].embedding

  // Salvar no cache
  await saveEmbeddingToCache(supabase, text, embedding)

  return embedding
}

// ============================================================================
// BUSCA NO KNOWLEDGE BASE
// ============================================================================

/**
 * Busca chunks relevantes na knowledge base
 */
export async function searchKnowledgeBase(
  supabase: SupabaseClient,
  embedding: number[],
  options: {
    threshold?: number
    limit?: number
    module?: string
  } = {}
): Promise<KnowledgeResult[]> {
  const threshold = options.threshold ?? KNOWLEDGE_THRESHOLD
  const limit = options.limit ?? MAX_KNOWLEDGE_RESULTS

  const { data, error } = await supabase.rpc('search_knowledge_base', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Erro ao buscar knowledge base:', error)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    metadata: row.metadata as Record<string, unknown>,
    similarity: row.similarity as number,
  }))
}

// ============================================================================
// BUSCA DE MEMÓRIAS
// ============================================================================

/**
 * Busca memórias relevantes do usuário
 */
export async function searchMemories(
  supabase: SupabaseClient,
  embedding: number[],
  options: {
    escritorioId: string
    userId: string
    sessaoId?: string
    threshold?: number
    limit?: number
  }
): Promise<MemoryResult[]> {
  const threshold = options.threshold ?? MEMORY_THRESHOLD
  const limit = options.limit ?? MAX_MEMORY_RESULTS

  const { data, error } = await supabase.rpc('search_memories', {
    p_escritorio_id: options.escritorioId,
    p_user_id: options.userId,
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: limit,
    p_sessao_id: options.sessaoId || null,
  })

  if (error) {
    console.error('Erro ao buscar memórias:', error)
    return []
  }

  // Atualizar uso das memórias retornadas
  const memoryIds = (data || []).map((m: Record<string, unknown>) => m.id as string)
  if (memoryIds.length > 0) {
    await supabase.rpc('update_memory_usage', { memory_ids: memoryIds })
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    tipo: row.tipo as string,
    content: row.content as string,
    content_resumido: row.content_resumido as string | null,
    similarity: row.similarity as number,
  }))
}

// ============================================================================
// BUSCA DE KNOWLEDGE BASE (usada a cada mensagem)
// ============================================================================

/**
 * Busca conhecimento relevante na knowledge base via embedding semântico.
 * Usada a cada mensagem para complementar o contexto do domínio.
 */
export async function searchKnowledge(
  supabase: SupabaseClient,
  userMessage: string,
  openaiApiKey: string
): Promise<KnowledgeResult[]> {
  const embedding = await generateEmbedding(supabase, userMessage, openaiApiKey)
  return searchKnowledgeBase(supabase, embedding)
}

// ============================================================================
// CARREGAR MEMÓRIAS CROSS-SESSION (usada apenas na 1ª mensagem da sessão)
// ============================================================================

/**
 * Carrega memórias do usuário de sessões anteriores.
 * Sem busca semântica — carrega as mais relevantes e recentes.
 * Usada apenas no início de uma nova sessão.
 */
export async function loadUserMemories(
  supabase: SupabaseClient,
  userId: string,
  escritorioId: string,
  limit: number = 10
): Promise<MemoryResult[]> {
  const { data, error } = await supabase
    .from('centro_comando_memories')
    .select('id, tipo, content, content_resumido, relevancia_score')
    .eq('escritorio_id', escritorioId)
    .eq('user_id', userId)
    .eq('ativo', true)
    .or('expira_em.is.null,expira_em.gt.now()')
    .order('relevancia_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Erro ao carregar memórias:', error)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    tipo: row.tipo as string,
    content: row.content as string,
    content_resumido: row.content_resumido as string | null,
    similarity: row.relevancia_score as number || 1.0,
  }))
}

// ============================================================================
// LEGACY: buildRAGContext e formatRAGContextForPrompt (mantidos para compatibilidade)
// ============================================================================

/**
 * @deprecated Use searchKnowledge + loadUserMemories separadamente
 */
export async function buildRAGContext(
  supabase: SupabaseClient,
  userMessage: string,
  options: {
    escritorioId: string
    userId: string
    sessaoId?: string
    openaiApiKey: string
  }
): Promise<RAGContext> {
  const embedding = await generateEmbedding(supabase, userMessage, options.openaiApiKey)
  const [knowledge, memories] = await Promise.all([
    searchKnowledgeBase(supabase, embedding),
    searchMemories(supabase, embedding, {
      escritorioId: options.escritorioId,
      userId: options.userId,
      sessaoId: options.sessaoId,
    }),
  ])
  return { knowledge, memories, tokenEstimate: 0 }
}

/**
 * @deprecated Formatação agora é feita diretamente no index.ts
 */
export function formatRAGContextForPrompt(context: RAGContext): string {
  let formatted = ''
  if (context.knowledge.length > 0) {
    formatted += '\n\n## CONHECIMENTO COMPLEMENTAR\n'
    for (const k of context.knowledge) {
      formatted += `\n### ${k.title}\n${k.content}\n`
    }
  }
  return formatted
}

// ============================================================================
// EXTRAÇÃO DE FATOS/MEMÓRIAS
// ============================================================================

/**
 * Extrai fatos relevantes de uma conversa usando OpenAI
 */
export async function extractFactsFromConversation(
  conversation: { role: string; content: string }[],
  openaiApiKey: string,
  model?: string
): Promise<ExtractedFact[]> {
  if (conversation.length < 2) return []

  const systemPrompt = `Extraia APENAS informações que serão úteis em FUTURAS sessões de conversa:

1. PREFERÊNCIAS: Como o usuário prefere receber informações (formato, nível de detalhe, estilo de resposta)
2. CORREÇÕES: Quando o usuário corrigiu algo errado que a assistente fez ou disse
3. CONTEXTO PESSOAL: Informações sobre o trabalho do usuário (casos importantes, clientes recorrentes, rotinas)

NÃO extraia:
- Dados retornados por consultas ao banco (valores, quantidades, listas) — são transientes e podem ser consultados novamente
- Informações que vieram diretamente do sistema (status de tarefas, datas de prazos, etc.)
- Fatos óbvios ou genéricos que qualquer pessoa saberia
- Nomes de entidades mencionados apenas de passagem sem contexto relevante

Responda APENAS com JSON:
{"facts": [{"tipo": "preferencia|correcao|contexto", "content": "descrição clara e útil", "permanente": true}]}

Se nada relevante para futuras sessões, retorne: {"facts": []}`

  const recentMessages = conversation.slice(-6).map(m =>
    `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
  ).join('\n')

  try {
    const extractionModel = model || 'gpt-4o-mini'
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: extractionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extraia fatos desta conversa:\n\n${recentMessages}` },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      console.error('Erro ao extrair fatos:', await response.text())
      return []
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse do JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    return parsed.facts || []
  } catch (error) {
    console.error('Erro ao extrair fatos:', error)
    return []
  }
}

/**
 * Salva fatos extraídos como memórias
 */
export async function saveExtractedFacts(
  supabase: SupabaseClient,
  facts: ExtractedFact[],
  options: {
    escritorioId: string
    userId: string
    sessaoId: string
    openaiApiKey: string
  }
): Promise<void> {
  if (facts.length === 0) return

  for (const fact of facts) {
    try {
      // Gerar embedding do fato
      const embedding = await generateEmbedding(supabase, fact.content, options.openaiApiKey)

      // Verificar se já existe memória similar (>90% similaridade)
      const { data: similar } = await supabase.rpc('search_memories', {
        p_escritorio_id: options.escritorioId,
        p_user_id: options.userId,
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.9,
        match_count: 1,
        p_sessao_id: null,
      })

      // Se não existe memória similar, inserir
      if (!similar || similar.length === 0) {
        await supabase.from('centro_comando_memories').insert({
          escritorio_id: options.escritorioId,
          user_id: options.userId,
          sessao_id: options.sessaoId,
          tipo: fact.tipo,
          entidade: fact.entidade || null,
          content: fact.content,
          embedding: JSON.stringify(embedding),
          permanente: fact.permanente,
          expira_em: fact.permanente ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        })
      }
    } catch (error) {
      console.error('Erro ao salvar fato:', error)
    }
  }
}

// ============================================================================
// FEEDBACK
// ============================================================================

/**
 * Registra feedback do usuário sobre uma resposta
 */
export async function saveFeedback(
  supabase: SupabaseClient,
  options: {
    escritorioId: string
    userId: string
    sessaoId: string
    mensagemId?: string
    tipoFeedback: 'positivo' | 'negativo' | 'correcao'
    rating?: number
    comentario?: string
    userMessage: string
    assistantResponse: string
    toolCalls?: unknown[]
    queryExecutada?: string
    respostaEsperada?: string
    openaiApiKey: string
  }
): Promise<void> {
  // Gerar embedding da interação para busca futura
  const interactionText = `${options.userMessage}\n${options.assistantResponse}`
  const embedding = await generateEmbedding(supabase, interactionText, options.openaiApiKey)

  await supabase.from('centro_comando_feedback').insert({
    escritorio_id: options.escritorioId,
    user_id: options.userId,
    sessao_id: options.sessaoId,
    mensagem_id: options.mensagemId || null,
    tipo_feedback: options.tipoFeedback,
    rating: options.rating || null,
    comentario: options.comentario || null,
    user_message: options.userMessage,
    assistant_response: options.assistantResponse,
    tool_calls: options.toolCalls || null,
    query_executada: options.queryExecutada || null,
    resposta_esperada: options.respostaEsperada || null,
    embedding: JSON.stringify(embedding),
  })

  // Se for correção, salvar como memória de alta prioridade
  if (options.tipoFeedback === 'correcao' && options.respostaEsperada) {
    const correctionContent = `CORREÇÃO: Quando perguntado "${options.userMessage.substring(0, 100)}...", a resposta correta é: ${options.respostaEsperada}`

    await supabase.from('centro_comando_memories').insert({
      escritorio_id: options.escritorioId,
      user_id: options.userId,
      sessao_id: options.sessaoId,
      tipo: 'correcao',
      content: correctionContent,
      embedding: JSON.stringify(embedding),
      permanente: true,
      relevancia_score: 2.0, // Alta prioridade
    })
  }
}
