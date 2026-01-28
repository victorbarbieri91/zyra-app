const fs = require('fs');
const path = require('path');

// Carregar dados
const filename = process.argv[2] || 'dados-migracao-financeiro10.12.json';
const filepath = path.join(__dirname, filename);
const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function formatDate(date) {
  if (!date) return 'NULL';
  return `'${date}'`;
}

// Gerar SQL para despesas em lotes
const batchSize = 30;
let despesasSQL = [];

for (let i = 0; i < data.despesas.length; i += batchSize) {
  const batch = data.despesas.slice(i, i + batchSize);
  let sql = 'INSERT INTO financeiro_despesas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, status, categoria, forma_pagamento, fornecedor) VALUES\n';

  const values = batch.map(d => {
    // Limpar descrição
    let desc = d.descricao.substring(0, 255);
    return `('${d.escritorio_id}', '${escapeSQL(desc)}', ${d.valor}, ${formatDate(d.data_vencimento)}, ${formatDate(d.data_pagamento)}, '${d.status}', '${d.categoria}', '${d.forma_pagamento}', '${escapeSQL(d.fornecedor)}')`;
  });

  sql += values.join(',\n') + ';';
  despesasSQL.push(sql);
}

// Gerar SQL para receitas em lotes
let receitasSQL = [];

for (let i = 0; i < data.receitas.length; i += batchSize) {
  const batch = data.receitas.slice(i, i + batchSize);
  let sql = 'INSERT INTO financeiro_receitas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, status, categoria, forma_pagamento, tipo) VALUES\n';

  const values = batch.map(r => {
    let desc = r.descricao.substring(0, 255);
    return `('${r.escritorio_id}', '${escapeSQL(desc)}', ${r.valor}, ${formatDate(r.data_vencimento)}, ${formatDate(r.data_pagamento)}, '${r.status}', '${r.categoria}', '${r.forma_pagamento}', '${r.tipo}')`;
  });

  sql += values.join(',\n') + ';';
  receitasSQL.push(sql);
}

// Output JSON para ser usado via API
const output = {
  totalDespesas: data.despesas.length,
  totalReceitas: data.receitas.length,
  lotesDespesas: despesasSQL.length,
  lotesReceitas: receitasSQL.length,
  despesasSQL,
  receitasSQL
};

console.log(JSON.stringify(output, null, 2));
