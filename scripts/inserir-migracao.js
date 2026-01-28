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

// Gerar SQL para despesas
console.log('-- =====================');
console.log('-- DESPESAS');
console.log('-- =====================\n');

const batchSize = 20;
for (let i = 0; i < data.despesas.length; i += batchSize) {
  const batch = data.despesas.slice(i, i + batchSize);
  console.log(`-- Lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(data.despesas.length/batchSize)}`);
  console.log('INSERT INTO financeiro_despesas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, status, categoria, forma_pagamento, fornecedor) VALUES');

  const values = batch.map(d => {
    return `('${d.escritorio_id}', '${escapeSQL(d.descricao)}', ${d.valor}, ${formatDate(d.data_vencimento)}, ${formatDate(d.data_pagamento)}, '${d.status}', '${d.categoria}', '${d.forma_pagamento}', '${escapeSQL(d.fornecedor)}')`;
  });

  console.log(values.join(',\n') + ';\n');
}

// Gerar SQL para receitas
console.log('\n-- =====================');
console.log('-- RECEITAS');
console.log('-- =====================\n');

for (let i = 0; i < data.receitas.length; i += batchSize) {
  const batch = data.receitas.slice(i, i + batchSize);
  console.log(`-- Lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(data.receitas.length/batchSize)}`);
  console.log('INSERT INTO financeiro_receitas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, status, categoria, forma_pagamento, tipo) VALUES');

  const values = batch.map(r => {
    return `('${r.escritorio_id}', '${escapeSQL(r.descricao)}', ${r.valor}, ${formatDate(r.data_vencimento)}, ${formatDate(r.data_pagamento)}, '${r.status}', '${r.categoria}', '${r.forma_pagamento}', '${r.tipo}')`;
  });

  console.log(values.join(',\n') + ';\n');
}

console.log('\n-- Resumo:');
console.log(`-- Total Despesas: ${data.despesas.length}`);
console.log(`-- Total Receitas: ${data.receitas.length}`);
