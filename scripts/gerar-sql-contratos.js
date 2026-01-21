/**
 * Script para gerar SQL de migração de contratos
 * Processa o CSV e gera statements SQL para inserção
 */

const fs = require('fs');
const path = require('path');

// Carregar mapeamento de clientes
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'migracao-contratos-mapping.json'), 'utf8'));

// Ler CSV
const csvContent = fs.readFileSync(path.join(__dirname, 'contratos.csv'), 'utf8');
const lines = csvContent.split('\n').slice(2); // Skip header rows

const escritorioId = mapping.escritorio_id;
const clientesMatch = mapping.clientes_match;

// Funções auxiliares
function sanitizeString(str) {
  if (!str) return null;
  return str.trim().replace(/'/g, "''");
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '00/00/0000' || dateStr.includes('0000')) return null;

  // Format: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  let [day, month, year] = parts;

  // Fix common typos like 0204 -> 2024
  if (year === '0204') year = '2024';
  if (year === '0214') year = '2014';
  if (year === '0213') year = '2013';
  if (parseInt(year) < 100) year = '20' + year;
  if (parseInt(year) < 1900 || parseInt(year) > 2100) return null;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseValue(valueStr) {
  if (!valueStr || valueStr === '0') return 0;
  // Remove everything except digits, comma, dot
  const cleaned = valueStr.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function mapTipoContrato(departamento) {
  const dept = (departamento || '').toLowerCase();
  if (dept.includes('cível') || dept.includes('civel')) return 'processo';
  if (dept.includes('consultivo')) return 'consultoria';
  if (dept.includes('trabalhista')) return 'processo';
  if (dept.includes('tributário') || dept.includes('tributario')) return 'consultoria';
  if (dept.includes('família') || dept.includes('familia')) return 'processo';
  if (dept.includes('criminal')) return 'processo';
  return 'misto';
}

function mapFormaCobranca(tipoHonorario, pasta) {
  const tipo = (tipoHonorario || '').toLowerCase();
  const nomePasta = (pasta || '').toLowerCase();

  if (tipo.includes('hora') || nomePasta.includes('time sheet') || nomePasta.includes('timesheet')) return 'por_hora';
  if (tipo.includes('porcentagem') || tipo.includes('%')) return 'por_etapa';
  if (tipo.includes('fixo')) return 'fixo';
  return 'fixo';
}

// Processar linhas
const contratos = [];
const erros = [];
let sequencial = 1; // Começa em 1 (base limpa)

lines.forEach((line, index) => {
  if (!line.trim()) return;

  const cols = line.split(';');
  if (cols.length < 20) return;

  const ci = cols[0];
  const pasta = cols[2];
  const departamento = cols[3];
  const status = cols[5];
  const clienteNome = cols[13];
  const dataInicio = cols[18];
  const valorContrato = cols[19];
  const tipoHonorario = cols[24];

  // Match cliente
  let clienteId = clientesMatch[clienteNome];
  if (!clienteId) {
    // Try case-insensitive match
    const clienteKey = Object.keys(clientesMatch).find(k =>
      k.toLowerCase() === (clienteNome || '').toLowerCase()
    );
    if (clienteKey) clienteId = clientesMatch[clienteKey];
  }

  if (!clienteId) {
    erros.push({
      linha: index + 3,
      ci,
      cliente: clienteNome,
      erro: 'Cliente não encontrado no CRM'
    });
    return;
  }

  const numeroContrato = `CONT-2026-${String(sequencial).padStart(4, '0')}`;
  sequencial++;

  const contrato = {
    numero_contrato: numeroContrato,
    escritorio_id: escritorioId,
    cliente_id: clienteId,
    tipo_contrato: mapTipoContrato(departamento),
    forma_cobranca: mapFormaCobranca(tipoHonorario, pasta),
    data_inicio: parseDate(dataInicio),
    valor_total: parseValue(valorContrato),
    descricao: sanitizeString(pasta) || 'Contrato migrado',
    ativo: (status || '').toLowerCase() === 'ativo'
  };

  contratos.push(contrato);
});

// Gerar SQL
let sql = `-- Migração de Contratos de Honorários
-- Total: ${contratos.length} contratos
-- Erros: ${erros.length} registros não migrados
-- Gerado em: ${new Date().toISOString()}

-- =====================================================
-- CONTRATOS COM ERRO (clientes não encontrados)
-- =====================================================
`;

erros.forEach(e => {
  sql += `-- Linha ${e.linha}: CI ${e.ci} - Cliente: ${e.cliente} - ${e.erro}\n`;
});

sql += `
-- =====================================================
-- INSERIR CONTRATOS
-- =====================================================

`;

// Gerar em lotes de 20
const batchSize = 20;
for (let i = 0; i < contratos.length; i += batchSize) {
  const batch = contratos.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;

  sql += `-- LOTE ${batchNum} (${i + 1} a ${Math.min(i + batchSize, contratos.length)})\n`;
  sql += `INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES\n`;

  const values = batch.map(c => {
    const dataInicio = c.data_inicio ? `'${c.data_inicio}'` : 'NULL';
    return `  ('${c.numero_contrato}', '${c.escritorio_id}', '${c.cliente_id}', '${c.tipo_contrato}', '${c.forma_cobranca}', ${dataInicio}, ${c.valor_total}, '${c.descricao}', ${c.ativo})`;
  });

  sql += values.join(',\n') + ';\n\n';
}

// Atualizar numeração
sql += `-- =====================================================
-- ATUALIZAR CONTADOR DE NUMERAÇÃO
-- =====================================================
UPDATE numeracao_modulos
SET ultimo_numero = ${sequencial - 1}
WHERE escritorio_id = '${escritorioId}'
  AND modulo = 'contratos';

-- Se não existir, criar
INSERT INTO numeracao_modulos (escritorio_id, modulo, prefixo, ultimo_numero, ano_atual)
SELECT '${escritorioId}', 'contratos', 'CONT', ${sequencial - 1}, 2026
WHERE NOT EXISTS (
  SELECT 1 FROM numeracao_modulos
  WHERE escritorio_id = '${escritorioId}' AND modulo = 'contratos'
);
`;

// Salvar arquivos
fs.writeFileSync(path.join(__dirname, 'migracao-contratos.sql'), sql);

// Resumo JSON
const resumo = {
  total_csv: lines.filter(l => l.trim()).length,
  total_migrar: contratos.length,
  total_erros: erros.length,
  proximo_numero: sequencial,
  erros: erros
};
fs.writeFileSync(path.join(__dirname, 'migracao-contratos-resumo.json'), JSON.stringify(resumo, null, 2));

console.log('=== RESUMO DA MIGRAÇÃO ===');
console.log(`Total no CSV: ${resumo.total_csv}`);
console.log(`Prontos para migrar: ${resumo.total_migrar}`);
console.log(`Com erros (não migrar): ${resumo.total_erros}`);
console.log(`\nArquivos gerados:`);
console.log(`- migracao-contratos.sql`);
console.log(`- migracao-contratos-resumo.json`);
console.log(`\nClientes não encontrados:`);
erros.forEach(e => console.log(`  - ${e.cliente} (CI: ${e.ci})`));
