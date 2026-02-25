/**
 * Script para popular a knowledge base com embeddings dos documentos de módulos
 *
 * Uso: npx ts-node scripts/seed-knowledge-base.ts
 *
 * O script:
 * 1. Lê todos os arquivos markdown em docs/agente/
 * 2. Divide em chunks semânticos (por tabela/seção)
 * 3. Gera embeddings usando OpenAI text-embedding-3-small
 * 4. Insere no banco centro_comando_knowledge_base
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis Supabase não encontradas!')
  console.error('   Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY não encontrada!')
  console.error('   Defina OPENAI_API_KEY em .env.local para gerar embeddings')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configurações
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const MAX_CHUNK_SIZE = 2000 // caracteres
const BATCH_SIZE = 10 // chunks por batch

interface Chunk {
  source: string
  chunkId: string
  title: string
  content: string
  metadata: {
    module: string
    type: 'workflow' | 'regra' | 'glossario' | 'relacao' | 'query' | 'erro' | 'description'
    section?: string
  }
  hash: string
}

// Função para gerar hash do conteúdo
function generateHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

// Função para gerar embedding via OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
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
  return data.data[0].embedding
}

// Inferir tipo do módulo baseado no nome do arquivo
function inferModuleType(fileName: string): Chunk['metadata']['type'] {
  if (fileName.includes('workflow')) return 'workflow'
  if (fileName.includes('regras')) return 'regra'
  if (fileName.includes('glossario')) return 'glossario'
  if (fileName.includes('relacoes')) return 'relacao'
  if (fileName.includes('views') || fileName.includes('queries')) return 'query'
  if (fileName.includes('erros')) return 'erro'
  return 'description'
}

// Gerar slug seguro para chunkId
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60)
}

// Função para dividir markdown em chunks por seções ##
function splitIntoChunks(filePath: string, content: string): Chunk[] {
  const fileName = path.basename(filePath, '.md')
  const moduleName = fileName.replace(/^\d+-/, '').toLowerCase()
  const moduleType = inferModuleType(moduleName)
  const chunks: Chunk[] = []

  // Extrair título do documento (# Título)
  const titleMatch = content.match(/^# (.+)$/m)
  const docTitle = titleMatch ? titleMatch[1] : moduleName

  // Dividir por seções ## (nível 2)
  const sections = content.split(/\n(?=## )/)

  for (const section of sections) {
    const sectionTitleMatch = section.match(/^## (.+)$/m)
    if (!sectionTitleMatch) {
      // Bloco inicial (antes do primeiro ##) — incluir como intro se tiver conteúdo relevante
      const introContent = section.replace(/^# .+$/m, '').replace(/^>.*$/gm, '').trim()
      if (introContent.length > 50) {
        chunks.push({
          source: fileName,
          chunkId: `${moduleName}_intro`,
          title: `${docTitle} - Introdução`,
          content: introContent,
          metadata: { module: moduleName, type: moduleType },
          hash: generateHash(introContent),
        })
      }
      continue
    }

    const sectionTitle = sectionTitleMatch[1]
    const sectionContent = section.trim()
    const sectionSlug = slugify(sectionTitle)

    // Se o conteúdo for menor que MAX_CHUNK_SIZE, inserir como um chunk
    if (sectionContent.length <= MAX_CHUNK_SIZE) {
      chunks.push({
        source: fileName,
        chunkId: `${moduleName}_${sectionSlug}`,
        title: `${docTitle} - ${sectionTitle}`,
        content: sectionContent,
        metadata: { module: moduleName, type: moduleType, section: sectionTitle },
        hash: generateHash(sectionContent),
      })
    } else {
      // Se a seção for grande, dividir por subseções ### ou por parágrafos
      const subSections = sectionContent.split(/\n(?=### )/)

      if (subSections.length > 1) {
        // Dividir por subseções ###
        for (let i = 0; i < subSections.length; i++) {
          const subContent = subSections[i].trim()
          if (subContent.length < 30) continue

          const subTitleMatch = subContent.match(/^### (.+)$/m)
          const subTitle = subTitleMatch ? subTitleMatch[1] : `Parte ${i + 1}`
          const subSlug = slugify(subTitle)

          chunks.push({
            source: fileName,
            chunkId: `${moduleName}_${sectionSlug}_${subSlug}`,
            title: `${docTitle} - ${sectionTitle} - ${subTitle}`,
            content: subContent.substring(0, MAX_CHUNK_SIZE),
            metadata: { module: moduleName, type: moduleType, section: `${sectionTitle} > ${subTitle}` },
            hash: generateHash(subContent),
          })
        }
      } else {
        // Sem subseções — dividir em partes de MAX_CHUNK_SIZE
        const parts = Math.ceil(sectionContent.length / MAX_CHUNK_SIZE)
        for (let i = 0; i < parts; i++) {
          const partContent = sectionContent.substring(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE)
          chunks.push({
            source: fileName,
            chunkId: `${moduleName}_${sectionSlug}_part${i + 1}`,
            title: `${docTitle} - ${sectionTitle} (Parte ${i + 1})`,
            content: partContent,
            metadata: { module: moduleName, type: moduleType, section: sectionTitle },
            hash: generateHash(partContent),
          })
        }
      }
    }
  }

  return chunks
}

// Função principal
async function main() {
  console.log('🚀 Iniciando seed da knowledge base...\n')

  const docsDir = path.join(process.cwd(), 'docs', 'agente')

  // Verificar se o diretório existe
  if (!fs.existsSync(docsDir)) {
    console.error('❌ Diretório docs/agente não encontrado!')
    console.error('   Execute primeiro: node scripts/process-docs.js')
    process.exit(1)
  }

  // Listar arquivos markdown
  const files = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort()

  console.log(`📂 Encontrados ${files.length} arquivos de módulos\n`)

  // Coletar todos os chunks
  const allChunks: Chunk[] = []

  for (const file of files) {
    const filePath = path.join(docsDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const chunks = splitIntoChunks(filePath, content)
    allChunks.push(...chunks)
    console.log(`   📄 ${file}: ${chunks.length} chunks`)
  }

  console.log(`\n📊 Total de chunks: ${allChunks.length}`)

  // Verificar chunks existentes
  console.log('\n🔍 Verificando chunks existentes...')
  const { data: existingChunks } = await supabase
    .from('centro_comando_knowledge_base')
    .select('chunk_id, hash')

  const existingMap = new Map(
    (existingChunks || []).map(c => [c.chunk_id, c.hash])
  )

  // Filtrar chunks que precisam ser atualizados
  const chunksToInsert = allChunks.filter(chunk => {
    const existingHash = existingMap.get(chunk.chunkId)
    return !existingHash || existingHash !== chunk.hash
  })

  const chunksToDelete = [...existingMap.keys()].filter(
    chunkId => !allChunks.find(c => c.chunkId === chunkId)
  )

  console.log(`   ✅ Existentes: ${existingMap.size}`)
  console.log(`   🆕 Novos/atualizados: ${chunksToInsert.length}`)
  console.log(`   🗑️  Removidos: ${chunksToDelete.length}`)

  // Deletar chunks obsoletos
  if (chunksToDelete.length > 0) {
    console.log('\n🗑️  Removendo chunks obsoletos...')
    const { error: deleteError } = await supabase
      .from('centro_comando_knowledge_base')
      .delete()
      .in('chunk_id', chunksToDelete)

    if (deleteError) {
      console.error('   ❌ Erro ao deletar:', deleteError)
    } else {
      console.log(`   ✅ Removidos ${chunksToDelete.length} chunks`)
    }
  }

  // Inserir/atualizar chunks novos
  if (chunksToInsert.length > 0) {
    console.log('\n📤 Gerando embeddings e inserindo chunks...')

    // Processar em batches
    for (let i = 0; i < chunksToInsert.length; i += BATCH_SIZE) {
      const batch = chunksToInsert.slice(i, i + BATCH_SIZE)
      const progress = Math.min(i + BATCH_SIZE, chunksToInsert.length)

      console.log(`   Processando ${i + 1}-${progress} de ${chunksToInsert.length}...`)

      // Gerar embeddings para o batch
      const records = []
      for (const chunk of batch) {
        try {
          // Preparar texto para embedding
          const textForEmbedding = `${chunk.title}\n\n${chunk.content}`
          const embedding = await generateEmbedding(textForEmbedding)

          records.push({
            source: chunk.source,
            chunk_id: chunk.chunkId,
            title: chunk.title,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: JSON.stringify(embedding),
            hash: chunk.hash,
            version: 1,
          })

          // Rate limiting - 3 chamadas por segundo
          await new Promise(resolve => setTimeout(resolve, 350))
        } catch (error) {
          console.error(`   ❌ Erro no chunk ${chunk.chunkId}:`, error)
        }
      }

      // Upsert no banco
      if (records.length > 0) {
        const { error: upsertError } = await supabase
          .from('centro_comando_knowledge_base')
          .upsert(records, {
            onConflict: 'chunk_id',
          })

        if (upsertError) {
          console.error('   ❌ Erro ao inserir:', upsertError)
        }
      }
    }

    console.log(`   ✅ Inseridos ${chunksToInsert.length} chunks`)
  }

  // Verificar resultado final
  const { count } = await supabase
    .from('centro_comando_knowledge_base')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✨ Knowledge base atualizada com sucesso!`)
  console.log(`   Total de chunks no banco: ${count}`)

  // Estatísticas de custo
  const tokensEstimate = chunksToInsert.reduce((acc, c) => acc + c.content.length / 4, 0)
  const costEstimate = (tokensEstimate / 1000000) * 0.02
  console.log(`\n💰 Custo estimado desta execução:`)
  console.log(`   Tokens processados: ~${Math.round(tokensEstimate)}`)
  console.log(`   Custo OpenAI: ~$${costEstimate.toFixed(4)}`)
}

main().catch(console.error)
