/**
 * Script para gerar documentação automática dos módulos do banco de dados
 * para alimentar a base de conhecimento RAG do Centro de Comando.
 *
 * Uso: npx ts-node scripts/generate-module-docs.ts
 *
 * O script:
 * 1. Conecta no Supabase
 * 2. Lista todas as tabelas, views e functions
 * 3. Agrupa por módulo (prefixo)
 * 4. Gera arquivos markdown em docs/agente/
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.error('   Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeamento de prefixos para módulos
const MODULE_PREFIXES: Record<string, { name: string; description: string; order: number }> = {
  'profiles': { name: 'Core', description: 'Perfis, escritórios e permissões', order: 1 },
  'escritorios': { name: 'Core', description: 'Perfis, escritórios e permissões', order: 1 },
  'crm_': { name: 'CRM', description: 'Pessoas, oportunidades e funil de vendas', order: 2 },
  'processos_': { name: 'Processos', description: 'Processos judiciais e movimentações', order: 3 },
  'agenda_': { name: 'Agenda', description: 'Eventos, tarefas e audiências', order: 4 },
  'financeiro_': { name: 'Financeiro', description: 'Contratos, faturamento, timesheet e receitas', order: 5 },
  'publicacoes_': { name: 'Publicacoes', description: 'Publicações AASP e análises', order: 6 },
  'consultivo_': { name: 'Consultivo', description: 'Consultas e pareceres jurídicos', order: 7 },
  'portfolio_': { name: 'Portfolio', description: 'Produtos e projetos', order: 8 },
  'cartoes_': { name: 'Cartoes', description: 'Cartões de crédito corporativos', order: 9 },
  'tags_': { name: 'Sistema', description: 'Tags, timers e configurações', order: 10 },
  'timers_': { name: 'Sistema', description: 'Tags, timers e configurações', order: 10 },
  'centro_comando_': { name: 'CentroComando', description: 'Centro de Comando e IA', order: 11 },
  'migracao_': { name: 'Sistema', description: 'Sistema de migração', order: 10 },
  'pecas_': { name: 'Pecas', description: 'Peças processuais e teses', order: 12 },
  'documentos': { name: 'Documentos', description: 'Gestão de documentos', order: 13 },
}

// Interfaces
interface TableInfo {
  table_name: string
  table_type: string
}

interface ColumnInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  udt_name: string
}

interface ForeignKeyInfo {
  table_name: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
}

interface FunctionInfo {
  routine_name: string
  routine_type: string
  data_type: string
  routine_definition: string
}

interface ViewInfo {
  table_name: string
  view_definition: string
}

// Funções auxiliares
function getModuleForTable(tableName: string): string {
  for (const [prefix, info] of Object.entries(MODULE_PREFIXES)) {
    if (tableName.startsWith(prefix) || tableName === prefix) {
      return info.name
    }
  }
  // Views consolidadas
  if (tableName.startsWith('v_')) {
    return 'Views'
  }
  return 'Outros'
}

function formatDataType(dataType: string, udtName: string): string {
  if (dataType === 'USER-DEFINED') {
    return udtName
  }
  if (dataType === 'ARRAY') {
    return `${udtName.replace('_', '')}[]`
  }
  return dataType
}

function formatDefault(defaultValue: string | null): string {
  if (!defaultValue) return '-'
  if (defaultValue.includes('gen_random_uuid')) return 'gen_random_uuid()'
  if (defaultValue.includes('uuid_generate_v4')) return 'uuid_generate_v4()'
  if (defaultValue.includes('now()')) return 'now()'
  if (defaultValue.includes('auth.uid()')) return 'auth.uid()'
  if (defaultValue.length > 30) return defaultValue.substring(0, 27) + '...'
  return defaultValue.replace(/'/g, '')
}

// Buscar dados do banco
async function fetchTables(): Promise<TableInfo[]> {
  const { data, error } = await supabase.rpc('execute_safe_query', {
    query_text: `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_type, table_name
    `,
    escritorio_param: '00000000-0000-0000-0000-000000000000'
  })

  if (error) throw error
  return data || []
}

async function fetchColumns(): Promise<ColumnInfo[]> {
  const { data, error } = await supabase.rpc('execute_safe_query', {
    query_text: `
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `,
    escritorio_param: '00000000-0000-0000-0000-000000000000'
  })

  if (error) throw error
  return data || []
}

async function fetchForeignKeys(): Promise<ForeignKeyInfo[]> {
  const { data, error } = await supabase.rpc('execute_safe_query', {
    query_text: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `,
    escritorio_param: '00000000-0000-0000-0000-000000000000'
  })

  if (error) throw error
  return data || []
}

async function fetchFunctions(): Promise<FunctionInfo[]> {
  const { data, error } = await supabase.rpc('execute_safe_query', {
    query_text: `
      SELECT
        routine_name,
        routine_type,
        data_type,
        SUBSTRING(routine_definition FROM 1 FOR 500) as routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `,
    escritorio_param: '00000000-0000-0000-0000-000000000000'
  })

  if (error) throw error
  return data || []
}

// Gerar markdown para um módulo
function generateModuleMarkdown(
  moduleName: string,
  moduleDescription: string,
  tables: TableInfo[],
  columns: ColumnInfo[],
  foreignKeys: ForeignKeyInfo[],
  functions: FunctionInfo[]
): string {
  const now = new Date().toISOString().split('T')[0]

  // Filtrar tabelas e views do módulo
  const moduleTables = tables.filter(t =>
    t.table_type === 'BASE TABLE' && getModuleForTable(t.table_name) === moduleName
  )
  const moduleViews = tables.filter(t =>
    t.table_type === 'VIEW' && getModuleForTable(t.table_name) === moduleName
  )

  // Filtrar functions do módulo (pelo prefixo ou nome relacionado)
  const moduleFunctions = functions.filter(f => {
    const fname = f.routine_name.toLowerCase()
    const prefix = moduleName.toLowerCase().replace('_', '')
    return fname.includes(prefix) ||
           moduleTables.some(t => fname.includes(t.table_name.replace('_', '')))
  }).slice(0, 20) // Limitar a 20 functions

  let md = `# Módulo: ${moduleName}

> Gerado automaticamente em: ${now}
> Tabelas: ${moduleTables.length} | Views: ${moduleViews.length} | Functions: ${moduleFunctions.length}

## Descrição
${moduleDescription}

---

## Tabelas

`

  // Gerar documentação para cada tabela
  for (const table of moduleTables) {
    const tableColumns = columns.filter(c => c.table_name === table.table_name)
    const tableFKs = foreignKeys.filter(fk => fk.table_name === table.table_name)

    md += `### ${table.table_name}

| Coluna | Tipo | Null | Default | FK |
|--------|------|------|---------|-----|
`

    for (const col of tableColumns) {
      const fk = tableFKs.find(f => f.column_name === col.column_name)
      const fkRef = fk ? `→ ${fk.foreign_table_name}` : '-'
      const dataType = formatDataType(col.data_type, col.udt_name)
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO'
      const defaultVal = formatDefault(col.column_default)

      md += `| ${col.column_name} | ${dataType} | ${nullable} | ${defaultVal} | ${fkRef} |\n`
    }

    // Relacionamentos
    if (tableFKs.length > 0) {
      md += `\n**Relacionamentos**:\n`
      for (const fk of tableFKs) {
        md += `- → ${fk.foreign_table_name} (via ${fk.column_name})\n`
      }
    }

    md += '\n---\n\n'
  }

  // Views
  if (moduleViews.length > 0) {
    md += `## Views\n\n`
    for (const view of moduleViews) {
      md += `### ${view.table_name}\n\n`
      const viewColumns = columns.filter(c => c.table_name === view.table_name)
      md += `**Colunas**: ${viewColumns.map(c => c.column_name).join(', ')}\n\n`
      md += '---\n\n'
    }
  }

  // Functions
  if (moduleFunctions.length > 0) {
    md += `## Functions\n\n`
    for (const func of moduleFunctions) {
      md += `### ${func.routine_name}\n`
      md += `**Retorna**: ${func.data_type || 'void'}\n\n`
    }
  }

  return md
}

// Função principal
async function main() {
  console.log('🚀 Iniciando geração de documentação dos módulos...\n')

  try {
    // Criar diretório se não existir
    const docsDir = path.join(process.cwd(), 'docs', 'agente')
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true })
      console.log(`📁 Criado diretório: ${docsDir}`)
    }

    // Buscar dados
    console.log('📊 Buscando tabelas...')
    const tables = await fetchTables()
    console.log(`   Encontradas ${tables.length} tabelas/views`)

    console.log('📊 Buscando colunas...')
    const columns = await fetchColumns()
    console.log(`   Encontradas ${columns.length} colunas`)

    console.log('📊 Buscando foreign keys...')
    const foreignKeys = await fetchForeignKeys()
    console.log(`   Encontradas ${foreignKeys.length} foreign keys`)

    console.log('📊 Buscando functions...')
    const functions = await fetchFunctions()
    console.log(`   Encontradas ${functions.length} functions`)

    // Agrupar por módulo
    const modules = new Map<string, { name: string; description: string; order: number }>()

    for (const table of tables) {
      const moduleName = getModuleForTable(table.table_name)
      if (!modules.has(moduleName)) {
        const prefixInfo = Object.values(MODULE_PREFIXES).find(p => p.name === moduleName)
        modules.set(moduleName, prefixInfo || { name: moduleName, description: moduleName, order: 99 })
      }
    }

    // Ordenar módulos
    const sortedModules = Array.from(modules.entries())
      .sort((a, b) => a[1].order - b[1].order)

    console.log(`\n📝 Gerando documentação para ${sortedModules.length} módulos...\n`)

    // Gerar README
    let readme = `# Documentação do Agente - Zyra Legal

> Documentação automática do banco de dados para RAG do Centro de Comando.
> Gerado em: ${new Date().toISOString().split('T')[0]}

## Módulos

| # | Módulo | Descrição | Arquivo |
|---|--------|-----------|---------|
`

    // Gerar arquivo para cada módulo
    let fileNumber = 1
    for (const [moduleName, moduleInfo] of sortedModules) {
      const fileName = `${String(fileNumber).padStart(2, '0')}-${moduleName.toLowerCase()}.md`
      const filePath = path.join(docsDir, fileName)

      const markdown = generateModuleMarkdown(
        moduleName,
        moduleInfo.description,
        tables,
        columns,
        foreignKeys,
        functions
      )

      fs.writeFileSync(filePath, markdown)
      console.log(`   ✅ ${fileName}`)

      readme += `| ${fileNumber} | ${moduleName} | ${moduleInfo.description} | [${fileName}](./${fileName}) |\n`

      fileNumber++
    }

    // Salvar README
    readme += `
## Como Usar

Esta documentação é indexada automaticamente pelo sistema RAG do Centro de Comando.
Cada módulo é dividido em chunks e armazenado com embeddings para busca semântica.

## Atualização

Para atualizar a documentação:

\`\`\`bash
npx ts-node scripts/generate-module-docs.ts
\`\`\`

Após atualizar, execute o script de seed para reindexar:

\`\`\`bash
npx ts-node scripts/seed-knowledge-base.ts
\`\`\`
`

    fs.writeFileSync(path.join(docsDir, 'README.md'), readme)
    console.log(`   ✅ README.md`)

    console.log(`\n✨ Documentação gerada com sucesso em: ${docsDir}`)
    console.log(`   Total de arquivos: ${fileNumber}`)

  } catch (error) {
    console.error('❌ Erro ao gerar documentação:', error)
    process.exit(1)
  }
}

main()
