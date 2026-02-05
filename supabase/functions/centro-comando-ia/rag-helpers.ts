/**
 * RAG (Retrieval Augmented Generation) Helpers
 *
 * Funções para busca semântica na knowledge base e memórias,
 * geração de embeddings e extração de fatos das conversas.
 */

import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.208.0/crypto/mod.ts'

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
  tipo: 'preferencia' | 'contexto' | 'fato' | 'entidade'
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

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

// Thresholds
const KNOWLEDGE_THRESHOLD = 0.65
const MEMORY_THRESHOLD = 0.55
const MAX_KNOWLEDGE_RESULTS = 5
const MAX_MEMORY_RESULTS = 8

// ============================================================================
// EMBEDDING
// ============================================================================

/**
 * Gera hash MD5 de um texto
 */
function hashText(text: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = createHash('md5').update(data).digest()
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
  const inputHash = hashText(text)

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
  const inputHash = hashText(text)

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
// CONSTRUIR CONTEXTO RAG
// ============================================================================

/**
 * Busca contexto relevante na knowledge base e memórias
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
  // Gerar embedding da mensagem do usuário
  const embedding = await generateEmbedding(supabase, userMessage, options.openaiApiKey)

  // Buscar em paralelo
  const [knowledge, memories] = await Promise.all([
    searchKnowledgeBase(supabase, embedding),
    searchMemories(supabase, embedding, {
      escritorioId: options.escritorioId,
      userId: options.userId,
      sessaoId: options.sessaoId,
    }),
  ])

  // Estimar tokens (aproximação: 1 token = 4 caracteres)
  const knowledgeTokens = knowledge.reduce((acc, k) => acc + k.content.length / 4, 0)
  const memoryTokens = memories.reduce((acc, m) => acc + (m.content_resumido || m.content).length / 4, 0)

  return {
    knowledge,
    memories,
    tokenEstimate: Math.round(knowledgeTokens + memoryTokens),
  }
}

// ============================================================================
// FORMATAR CONTEXTO PARA PROMPT
// ============================================================================

/**
 * Formata o contexto RAG para inclusão no system prompt
 */
export function formatRAGContextForPrompt(context: RAGContext): string {
  let formatted = ''

  // Adicionar conhecimento relevante
  if (context.knowledge.length > 0) {
    formatted += '\n\n## CONHECIMENTO RELEVANTE DO BANCO DE DADOS\n'
    for (const k of context.knowledge) {
      formatted += `\n### ${k.title}\n${k.content}\n`
    }
  }

  // Adicionar memórias relevantes
  if (context.memories.length > 0) {
    formatted += '\n\n## MEMÓRIAS E CONTEXTO DO USUÁRIO\n'
    for (const m of context.memories) {
      const label = m.tipo === 'correcao' ? '⚠️ CORREÇÃO' :
                    m.tipo === 'preferencia' ? '💡 PREFERÊNCIA' :
                    m.tipo === 'fato' ? '📌 FATO' : '📝 CONTEXTO'
      formatted += `\n${label}: ${m.content_resumido || m.content}\n`
    }
  }

  return formatted
}

// ============================================================================
// EXTRAÇÃO DE FATOS/MEMÓRIAS
// ============================================================================

/**
 * Extrai fatos relevantes de uma conversa usando DeepSeek
 */
export async function extractFactsFromConversation(
  conversation: { role: string; content: string }[],
  deepseekApiKey: string
): Promise<ExtractedFact[]> {
  if (conversation.length < 2) return []

  const systemPrompt = `Você é um extrator de fatos e preferências.
Analise a conversa e extraia APENAS informações importantes que devem ser lembradas:

1. PREFERÊNCIAS: Como o usuário prefere receber informações
2. FATOS: Informações específicas sobre processos, clientes, valores
3. CORREÇÕES: Se o usuário corrigiu algo que foi dito errado
4. ENTIDADES: Nomes de clientes, processos, advogados mencionados

Responda APENAS com JSON no formato:
{
  "facts": [
    {
      "tipo": "preferencia|fato|correcao|entidade",
      "entidade": "nome se for entidade",
      "content": "descrição clara do fato",
      "permanente": true/false
    }
  ]
}

Se não houver fatos relevantes, retorne: {"facts": []}

IMPORTANTE:
- NÃO extraia informações genéricas ou óbvias
- FOQUE em informações que ajudariam em futuras conversas
- Preferências e correções devem ser permanentes
- Fatos específicos podem ser temporários`

  const recentMessages = conversation.slice(-6).map(m =>
    `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
  ).join('\n')

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
