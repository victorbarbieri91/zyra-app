import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente manualmente
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};

    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });

    return env;
  } catch (err) {
    console.error('Erro ao carregar .env.local:', err.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função auxiliar para executar queries SQL
async function executeQuery(name, query) {
  console.log(`\n📊 Executando: ${name}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query });

    if (error) {
      // Tentar executar diretamente se RPC não existir
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    }

    return data;
  } catch (err) {
    console.error(`❌ Erro ao executar ${name}:`, err.message);
    return null;
  }
}

// Função para executar query simples via PostgREST
async function simpleQuery(tableName, select = '*', limit = 100) {
  console.log(`\n📋 Consultando tabela: ${tableName}...`);
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(select)
      .limit(limit);

    if (error) {
      console.error(`❌ Erro: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`❌ Erro ao consultar ${tableName}:`, err.message);
    return null;
  }
}

async function auditDatabase() {
  const report = {
    timestamp: new Date().toISOString(),
    sections: []
  };

  console.log('🔍 INICIANDO AUDITORIA DO BANCO DE DADOS SUPABASE');
  console.log('=' .repeat(60));

  // 1. LISTAR TODAS AS TABELAS
  console.log('\n\n═══ 1. LISTAGEM DE TABELAS ═══');

  const tablesQuery = `
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;

  // Como não temos RPC custom, vamos usar information_schema via REST API
  console.log('\n📋 Listando tabelas do schema public...');

  try {
    // Tentar via pg_catalog
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok && response.status !== 404) {
      console.log('⚠️  RPC não disponível, usando abordagem alternativa...');
    }
  } catch (err) {
    console.log('⚠️  Usando abordagem alternativa para listar tabelas...');
  }

  // 2. VERIFICAR TABELAS CRÍTICAS
  console.log('\n\n═══ 2. VERIFICAÇÃO DE TABELAS CRÍTICAS ═══');

  const criticalTables = [
    'profiles',
    'escritorios',
    'escritorios_usuarios',
    'clientes',
    'processos',
    'eventos',
    'honorarios',
    'documentos',
    'publicacoes',
    'consultas',
    'centro_comando_historico'
  ];

  const tableResults = {};

  for (const tableName of criticalTables) {
    console.log(`\n📌 Verificando: ${tableName}`);

    // Tentar consultar a tabela
    const data = await simpleQuery(tableName, '*', 1);

    if (data !== null) {
      tableResults[tableName] = {
        exists: true,
        hasData: data.length > 0,
        sampleData: data[0] || null,
        columns: data[0] ? Object.keys(data[0]) : []
      };

      console.log(`  ✅ Existe: sim`);
      console.log(`  📊 Tem dados: ${data.length > 0 ? 'sim' : 'não'}`);
      console.log(`  🔧 Colunas: ${tableResults[tableName].columns.join(', ')}`);
    } else {
      tableResults[tableName] = {
        exists: false,
        hasData: false,
        error: 'Tabela não encontrada ou sem permissão'
      };
      console.log(`  ❌ Não encontrada ou sem acesso`);
    }
  }

  report.sections.push({
    title: 'Tabelas Críticas',
    data: tableResults
  });

  // 3. CONTAGEM DE REGISTROS
  console.log('\n\n═══ 3. CONTAGEM DE REGISTROS ═══');

  const counts = {};

  for (const tableName of Object.keys(tableResults).filter(t => tableResults[t].exists)) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        counts[tableName] = count;
        console.log(`  ${tableName}: ${count} registros`);
      } else {
        counts[tableName] = 'erro';
        console.log(`  ${tableName}: erro ao contar`);
      }
    } catch (err) {
      counts[tableName] = 'erro';
    }
  }

  report.sections.push({
    title: 'Contagem de Registros',
    data: counts
  });

  // 4. ESTRUTURA DETALHADA DAS PRINCIPAIS TABELAS
  console.log('\n\n═══ 4. ESTRUTURA DETALHADA ═══');

  const structures = {};

  for (const tableName of ['profiles', 'escritorios', 'clientes', 'processos']) {
    if (tableResults[tableName]?.exists) {
      console.log(`\n📋 Estrutura de: ${tableName}`);

      const sample = await simpleQuery(tableName, '*', 1);

      if (sample && sample[0]) {
        structures[tableName] = {
          columns: Object.keys(sample[0]).map(col => ({
            name: col,
            sampleValue: sample[0][col],
            type: typeof sample[0][col]
          }))
        };

        console.log(`  Colunas encontradas: ${structures[tableName].columns.length}`);
        structures[tableName].columns.forEach(col => {
          console.log(`    - ${col.name} (${col.type})`);
        });
      }
    }
  }

  report.sections.push({
    title: 'Estruturas Detalhadas',
    data: structures
  });

  // 5. TESTE DE RELACIONAMENTOS (tentar inserções)
  console.log('\n\n═══ 5. ANÁLISE DE RELACIONAMENTOS ═══');
  console.log('⚠️  Verificando relacionamentos existentes através de dados...');

  const relationships = {};

  // Verificar se existem FKs através dos dados
  if (tableResults.clientes?.exists && tableResults.clientes.hasData) {
    const clientes = await simpleQuery('clientes', '*', 5);
    if (clientes && clientes[0]) {
      const fkColumns = Object.keys(clientes[0]).filter(k =>
        k.includes('_id') || k === 'escritorio_id' || k === 'criado_por'
      );
      relationships.clientes = {
        possibleFKs: fkColumns,
        sample: clientes[0]
      };
      console.log(`  clientes: Possíveis FKs encontradas: ${fkColumns.join(', ')}`);
    }
  }

  if (tableResults.processos?.exists && tableResults.processos.hasData) {
    const processos = await simpleQuery('processos', '*', 5);
    if (processos && processos[0]) {
      const fkColumns = Object.keys(processos[0]).filter(k =>
        k.includes('_id') || k === 'escritorio_id' || k === 'cliente_id'
      );
      relationships.processos = {
        possibleFKs: fkColumns,
        sample: processos[0]
      };
      console.log(`  processos: Possíveis FKs encontradas: ${fkColumns.join(', ')}`);
    }
  }

  report.sections.push({
    title: 'Relacionamentos',
    data: relationships
  });

  // 6. GERAR RELATÓRIO FINAL
  console.log('\n\n═══ 6. GERANDO RELATÓRIO ═══');

  const reportContent = generateMarkdownReport(report, tableResults, counts, structures, relationships);

  const reportPath = path.join(process.cwd(), 'AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  console.log(`\n✅ Relatório salvo em: ${reportPath}`);
  console.log('\n' + '='.repeat(60));
  console.log('🎉 AUDITORIA CONCLUÍDA!');
}

function generateMarkdownReport(report, tableResults, counts, structures, relationships) {
  let md = `# 📊 RELATÓRIO DE AUDITORIA - BANCO DE DADOS SUPABASE\n\n`;
  md += `**Data da Auditoria:** ${new Date(report.timestamp).toLocaleString('pt-BR')}\n\n`;
  md += `**Projeto:** Zyra Legal\n\n`;
  md += `**Banco:** Supabase (Produção/Remoto)\n\n`;
  md += `---\n\n`;

  // Sumário Executivo
  md += `## 📋 Sumário Executivo\n\n`;

  const existingTables = Object.keys(tableResults).filter(t => tableResults[t].exists);
  const tablesWithData = existingTables.filter(t => tableResults[t].hasData);
  const emptyTables = existingTables.filter(t => !tableResults[t].hasData);

  md += `- **Tabelas Verificadas:** ${Object.keys(tableResults).length}\n`;
  md += `- **Tabelas Existentes:** ${existingTables.length}\n`;
  md += `- **Tabelas com Dados:** ${tablesWithData.length}\n`;
  md += `- **Tabelas Vazias:** ${emptyTables.length}\n`;
  md += `- **Tabelas Não Encontradas:** ${Object.keys(tableResults).length - existingTables.length}\n\n`;

  // Status das Tabelas Críticas
  md += `## 🔍 Status das Tabelas Críticas\n\n`;
  md += `| Tabela | Status | Tem Dados? | Qtd. Registros | Colunas |\n`;
  md += `|--------|--------|------------|----------------|----------|\n`;

  for (const [tableName, info] of Object.entries(tableResults)) {
    const status = info.exists ? '✅ Existe' : '❌ Não encontrada';
    const hasData = info.hasData ? '✅ Sim' : '⚠️ Vazia';
    const count = counts[tableName] || '-';
    const colCount = info.columns?.length || 0;

    md += `| ${tableName} | ${status} | ${hasData} | ${count} | ${colCount} |\n`;
  }

  md += `\n`;

  // Estruturas Detalhadas
  if (Object.keys(structures).length > 0) {
    md += `## 🏗️ Estruturas Detalhadas\n\n`;

    for (const [tableName, structure] of Object.entries(structures)) {
      md += `### ${tableName}\n\n`;
      md += `**Total de Colunas:** ${structure.columns.length}\n\n`;
      md += `| Coluna | Tipo | Valor Exemplo |\n`;
      md += `|--------|------|---------------|\n`;

      for (const col of structure.columns) {
        const sampleValue = col.sampleValue === null
          ? 'NULL'
          : typeof col.sampleValue === 'object'
            ? JSON.stringify(col.sampleValue).substring(0, 50) + '...'
            : String(col.sampleValue).substring(0, 50);

        md += `| ${col.name} | ${col.type} | ${sampleValue} |\n`;
      }

      md += `\n`;
    }
  }

  // Análise de Relacionamentos
  if (Object.keys(relationships).length > 0) {
    md += `## 🔗 Análise de Relacionamentos\n\n`;

    for (const [tableName, rel] of Object.entries(relationships)) {
      md += `### ${tableName}\n\n`;
      md += `**Possíveis Foreign Keys:** ${rel.possibleFKs.join(', ')}\n\n`;
    }
  }

  // Problemas Identificados
  md += `## ⚠️ Problemas Identificados\n\n`;

  if (emptyTables.length > 0) {
    md += `### Tabelas Vazias\n\n`;
    md += `As seguintes tabelas existem mas não possuem dados:\n\n`;
    emptyTables.forEach(t => {
      md += `- \`${t}\`\n`;
    });
    md += `\n`;
  }

  const missingTables = Object.keys(tableResults).filter(t => !tableResults[t].exists);
  if (missingTables.length > 0) {
    md += `### Tabelas Não Encontradas\n\n`;
    md += `As seguintes tabelas críticas não foram encontradas:\n\n`;
    missingTables.forEach(t => {
      md += `- \`${t}\`\n`;
    });
    md += `\n`;
  }

  // Recomendações
  md += `## 💡 Recomendações\n\n`;

  if (emptyTables.length > 0) {
    md += `1. **Popular Tabelas Vazias**: As tabelas ${emptyTables.slice(0, 3).map(t => `\`${t}\``).join(', ')} estão vazias e podem precisar de dados iniciais.\n\n`;
  }

  if (missingTables.length > 0) {
    md += `2. **Criar Tabelas Faltantes**: Executar migrations para criar as tabelas faltantes.\n\n`;
  }

  md += `3. **Verificar Constraints**: Validar se as foreign keys estão configuradas corretamente.\n\n`;
  md += `4. **Testes de Integridade**: Executar testes de inserção/atualização para validar relacionamentos.\n\n`;

  // Footer
  md += `---\n\n`;
  md += `*Relatório gerado automaticamente pelo script de auditoria*\n`;

  return md;
}

// Executar auditoria
auditDatabase().catch(err => {
  console.error('\n❌ ERRO FATAL:', err);
  process.exit(1);
});
