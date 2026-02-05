/**
 * Script para processar dados do MCP e gerar documentação dos módulos
 * Uso: node scripts/process-docs.js <caminho-arquivo-tabelas>
 */

const fs = require('fs');
const path = require('path');

// Mapeamento de prefixos para módulos
const MODULE_PREFIXES = {
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
  'dashboard_': { name: 'Sistema', description: 'Cache e configurações do sistema', order: 10 },
  'onboarding_': { name: 'Sistema', description: 'Onboarding e configurações', order: 10 },
  'numeracao_': { name: 'Sistema', description: 'Numeração sequencial', order: 10 },
  'datajud_': { name: 'Integracoes', description: 'Integrações DataJud e Escavador', order: 14 },
  'escavador_': { name: 'Integracoes', description: 'Integrações DataJud e Escavador', order: 14 },
  'user_': { name: 'Core', description: 'Perfis, escritórios e permissões', order: 1 },
  'cron_': { name: 'Sistema', description: 'Jobs e tarefas agendadas', order: 10 },
  'system_': { name: 'Sistema', description: 'Configurações do sistema', order: 10 },
  'indices_': { name: 'CorrecaoMonetaria', description: 'Índices econômicos e correção monetária', order: 15 },
  'relatorios_': { name: 'Relatorios', description: 'Relatórios e templates', order: 16 },
};

function getModuleForTable(tableName) {
  for (const [prefix, info] of Object.entries(MODULE_PREFIXES)) {
    if (tableName.startsWith(prefix) || tableName === prefix) {
      return info.name;
    }
  }
  return 'Outros';
}

function formatDataType(dataType, format) {
  if (dataType === 'USER-DEFINED') {
    return format || dataType;
  }
  if (dataType === 'ARRAY') {
    return `${format || 'array'}[]`;
  }
  return dataType;
}

function formatDefault(defaultValue) {
  if (!defaultValue) return '-';
  if (defaultValue.includes('gen_random_uuid')) return 'gen_random_uuid()';
  if (defaultValue.includes('uuid_generate_v4')) return 'uuid_generate_v4()';
  if (defaultValue.includes('now()')) return 'now()';
  if (defaultValue.includes('auth.uid()')) return 'auth.uid()';
  if (defaultValue.length > 40) return defaultValue.substring(0, 37) + '...';
  return defaultValue.replace(/'/g, '');
}

function generateModuleMarkdown(moduleName, moduleDescription, tables) {
  const now = new Date().toISOString().split('T')[0];

  // Filtrar tabelas do módulo
  const moduleTables = tables.filter(t => getModuleForTable(t.name) === moduleName);

  if (moduleTables.length === 0) return null;

  let md = `# Módulo: ${moduleName}

> Gerado automaticamente em: ${now}
> Tabelas: ${moduleTables.length}

## Descrição
${moduleDescription}

---

## Tabelas

`;

  // Gerar documentação para cada tabela
  for (const table of moduleTables) {
    const columns = table.columns || [];

    md += `### ${table.name}

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
`;

    for (const col of columns) {
      const nullable = col.options?.includes('nullable') ? 'Não' : 'Sim';
      const dataType = formatDataType(col.data_type, col.format);
      const defaultVal = formatDefault(col.default_value);

      md += `| ${col.name} | ${dataType} | ${nullable} | ${defaultVal} |\n`;
    }

    // Adicionar comentários se houver
    const columnsWithComments = columns.filter(c => c.comment);
    if (columnsWithComments.length > 0) {
      md += `\n**Notas**:\n`;
      for (const col of columnsWithComments) {
        md += `- \`${col.name}\`: ${col.comment}\n`;
      }
    }

    // Adicionar constraints se houver
    const columnsWithCheck = columns.filter(c => c.check);
    if (columnsWithCheck.length > 0) {
      md += `\n**Constraints**:\n`;
      for (const col of columnsWithCheck) {
        md += `- \`${col.name}\`: ${col.check}\n`;
      }
    }

    md += '\n---\n\n';
  }

  return md;
}

function main() {
  const tablesFilePath = process.argv[2];

  if (!tablesFilePath) {
    console.error('❌ Uso: node scripts/process-docs.js <caminho-arquivo-tabelas>');
    process.exit(1);
  }

  console.log('🚀 Iniciando geração de documentação dos módulos...\n');

  try {
    // Criar diretório se não existir
    const docsDir = path.join(process.cwd(), 'docs', 'agente');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
      console.log(`📁 Criado diretório: ${docsDir}`);
    }

    // Ler dados
    console.log('📊 Lendo dados das tabelas...');
    const rawData = JSON.parse(fs.readFileSync(tablesFilePath, 'utf8'));
    const tables = JSON.parse(rawData[0].text);
    console.log(`   Encontradas ${tables.length} tabelas`);

    // Agrupar por módulo
    const modules = new Map();

    for (const table of tables) {
      const moduleName = getModuleForTable(table.name);
      if (!modules.has(moduleName)) {
        const prefixInfo = Object.values(MODULE_PREFIXES).find(p => p.name === moduleName);
        modules.set(moduleName, prefixInfo || { name: moduleName, description: moduleName, order: 99 });
      }
    }

    // Ordenar módulos
    const sortedModules = Array.from(modules.entries())
      .sort((a, b) => a[1].order - b[1].order);

    console.log(`\n📝 Gerando documentação para ${sortedModules.length} módulos...\n`);

    // Gerar README
    let readme = `# Documentação do Agente - Zyra Legal

> Documentação automática do banco de dados para RAG do Centro de Comando.
> Gerado em: ${new Date().toISOString().split('T')[0]}

## Módulos

| # | Módulo | Descrição | Arquivo |
|---|--------|-----------|---------|
`;

    // Gerar arquivo para cada módulo
    let fileNumber = 1;
    for (const [moduleName, moduleInfo] of sortedModules) {
      const markdown = generateModuleMarkdown(
        moduleName,
        moduleInfo.description,
        tables
      );

      if (!markdown) continue;

      const fileName = `${String(fileNumber).padStart(2, '0')}-${moduleName.toLowerCase()}.md`;
      const filePath = path.join(docsDir, fileName);

      fs.writeFileSync(filePath, markdown);
      console.log(`   ✅ ${fileName}`);

      readme += `| ${fileNumber} | ${moduleName} | ${moduleInfo.description} | [${fileName}](./${fileName}) |\n`;

      fileNumber++;
    }

    // Salvar README
    readme += `
## Como Usar

Esta documentação é indexada automaticamente pelo sistema RAG do Centro de Comando.
Cada módulo é dividido em chunks e armazenado com embeddings para busca semântica.

## Atualização

Para atualizar a documentação:

\`\`\`bash
# 1. Buscar dados via MCP Supabase (list_tables)
# 2. Executar este script com o arquivo de resultado
node scripts/process-docs.js <caminho-arquivo-tabelas>
\`\`\`

Após atualizar, execute o script de seed para reindexar:

\`\`\`bash
npx ts-node scripts/seed-knowledge-base.ts
\`\`\`
`;

    fs.writeFileSync(path.join(docsDir, 'README.md'), readme);
    console.log(`   ✅ README.md`);

    console.log(`\n✨ Documentação gerada com sucesso em: ${docsDir}`);
    console.log(`   Total de arquivos: ${fileNumber}`);

  } catch (error) {
    console.error('❌ Erro ao gerar documentação:', error);
    process.exit(1);
  }
}

main();
