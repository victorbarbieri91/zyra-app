const fs = require('fs');

const inputFile = process.argv[2] || 'dados-migracao-financeiro04.06.json';
const prefix = process.argv[3] || 'lote-0406';

const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const batchSize = 30;

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Gerar lotes de despesas
const despesas = data.despesas;
const numDespBatches = Math.ceil(despesas.length / batchSize);

console.log(`Despesas: ${despesas.length} registros em ${numDespBatches} lotes`);

for (let i = 0; i < numDespBatches; i++) {
  const batch = despesas.slice(i * batchSize, (i + 1) * batchSize);
  const values = batch.map(d =>
    `('${d.escritorio_id}', '${escapeSQL(d.descricao)}', ${d.valor}, '${d.data_vencimento}', '${d.data_pagamento}', '${d.status}', '${d.categoria}', '${d.forma_pagamento}', '${escapeSQL(d.fornecedor)}')`
  ).join(',\n');

  const sql = `INSERT INTO financeiro_despesas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, status, categoria, forma_pagamento, fornecedor) VALUES\n${values};`;

  fs.writeFileSync(`${prefix}-desp-${i + 1}.sql`, sql);
}

// Gerar lotes de receitas
const receitas = data.receitas;
const numRecBatches = Math.ceil(receitas.length / batchSize);

console.log(`Receitas: ${receitas.length} registros em ${numRecBatches} lotes`);

for (let i = 0; i < numRecBatches; i++) {
  const batch = receitas.slice(i * batchSize, (i + 1) * batchSize);
  const values = batch.map(r =>
    `('${r.escritorio_id}', '${escapeSQL(r.descricao)}', ${r.valor}, '${r.data_vencimento}', '${r.data_pagamento}', '${r.data_competencia}', '${r.status}', '${r.categoria}', '${r.forma_pagamento}', '${r.tipo}')`
  ).join(',\n');

  const sql = `INSERT INTO financeiro_receitas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, data_competencia, status, categoria, forma_pagamento, tipo) VALUES\n${values};`;

  fs.writeFileSync(`${prefix}-rec-${i + 1}.sql`, sql);
}

console.log(`\nArquivos gerados: ${prefix}-desp-*.sql e ${prefix}-rec-*.sql`);
