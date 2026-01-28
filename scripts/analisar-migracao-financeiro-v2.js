const fs = require('fs');

// Ler CSV com encoding Latin1
const csvContent = fs.readFileSync('./scripts/migracao-financeiro01a03.csv', 'latin1');

// Parser mais robusto para lidar com campos multi-linha
function parseCSVRobust(content) {
  const lines = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

const lines = parseCSVRobust(csvContent);
console.log('=== ANÁLISE DA MIGRAÇÃO FINANCEIRA ===\n');
console.log(`Total de linhas parseadas: ${lines.length}`);

// Índices das colunas
const idxTipo = 7;        // PAGAR/RECEBER
const idxForma = 8;       // Forma de pagamento
const idxCliente = 12;    // Cliente/Fornecedor
const idxDescricao = 13;  // Descrição
const idxValor = 14;      // Valor
const idxValorPago = 19;  // Valor Pago
const idxDataBaixa = 20;  // Data Baixa
const idxContrato = 23;   // Contrato
const idxPlanoContas = 24; // Plano de Contas
const idxDataVenc = 3;    // Data Vencimento
const idxCompetencia = 6; // Competência

// Análise
const stats = {
  total: 0,
  pagar: { count: 0, valor: 0, categorias: {}, formas: {}, fornecedores: new Set() },
  receber: { count: 0, valor: 0, categorias: {}, formas: {}, contratos: {}, clientes: new Set() },
  datas: new Set(),
  exemplos: { pagar: [], receber: [] }
};

for (let i = 2; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (!cols[0] || cols[0].trim() === '' || cols[0].includes('Vios')) continue;

  const tipo = cols[idxTipo]?.trim();
  const forma = cols[idxForma]?.trim();
  const cliente = cols[idxCliente]?.trim();
  let descricao = cols[idxDescricao]?.trim();
  // Limpar descrição multi-linha
  if (descricao) descricao = descricao.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 100);

  const valorStr = cols[idxValor]?.replace('.', '').replace(',', '.').trim();
  const valor = parseFloat(valorStr) || 0;
  const planoContas = cols[idxPlanoContas]?.trim() || 'Sem categoria';
  const contrato = cols[idxContrato]?.trim();
  const dataVenc = cols[idxDataVenc]?.trim();
  const dataBaixa = cols[idxDataBaixa]?.trim();

  // Validar que é uma linha de dados
  if (!tipo || (tipo !== 'PAGAR' && tipo !== 'RECEBER')) continue;

  stats.total++;

  // Coletar datas válidas
  if (dataVenc && dataVenc.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    stats.datas.add(dataVenc);
  }

  if (tipo === 'PAGAR') {
    stats.pagar.count++;
    stats.pagar.valor += Math.abs(valor);
    stats.pagar.categorias[planoContas] = (stats.pagar.categorias[planoContas] || 0) + 1;
    stats.pagar.formas[forma || 'N/D'] = (stats.pagar.formas[forma || 'N/D'] || 0) + 1;
    if (cliente) stats.pagar.fornecedores.add(cliente);

    // Coletar exemplos
    if (stats.exemplos.pagar.length < 5) {
      stats.exemplos.pagar.push({ cliente, descricao, valor, planoContas, forma, dataVenc });
    }
  } else if (tipo === 'RECEBER') {
    stats.receber.count++;
    stats.receber.valor += Math.abs(valor);
    stats.receber.categorias[planoContas] = (stats.receber.categorias[planoContas] || 0) + 1;
    stats.receber.formas[forma || 'N/D'] = (stats.receber.formas[forma || 'N/D'] || 0) + 1;
    if (contrato) stats.receber.contratos[contrato] = (stats.receber.contratos[contrato] || 0) + 1;
    if (cliente) stats.receber.clientes.add(cliente);

    // Coletar exemplos
    if (stats.exemplos.receber.length < 5) {
      stats.exemplos.receber.push({ cliente, descricao, valor, planoContas, contrato, forma, dataVenc });
    }
  }
}

console.log('\n=== RESUMO GERAL ===');
console.log(`Total de registros válidos: ${stats.total}`);

console.log('\n=== DESPESAS (PAGAR) ===');
console.log(`Quantidade: ${stats.pagar.count}`);
console.log(`Valor total: R$ ${stats.pagar.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
console.log(`Fornecedores únicos: ${stats.pagar.fornecedores.size}`);

console.log('\nCategorias (Plano de Contas):');
Object.entries(stats.pagar.categorias)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

console.log('\nFormas de pagamento:');
Object.entries(stats.pagar.formas)
  .sort((a, b) => b[1] - a[1])
  .forEach(([forma, count]) => console.log(`  ${forma}: ${count}`));

console.log('\nExemplos de DESPESAS:');
stats.exemplos.pagar.forEach((ex, i) => {
  console.log(`  ${i+1}. ${ex.fornecedor || 'N/D'} | R$ ${Math.abs(ex.valor).toFixed(2)} | ${ex.planoContas} | ${ex.forma}`);
});

console.log('\n=== RECEITAS (RECEBER) ===');
console.log(`Quantidade: ${stats.receber.count}`);
console.log(`Valor total: R$ ${stats.receber.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
console.log(`Clientes únicos: ${stats.receber.clientes.size}`);

console.log('\nCategorias (Plano de Contas):');
Object.entries(stats.receber.categorias)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

console.log('\nFormas de pagamento:');
Object.entries(stats.receber.formas)
  .sort((a, b) => b[1] - a[1])
  .forEach(([forma, count]) => console.log(`  ${forma}: ${count}`));

console.log('\nContratos referenciados:');
Object.entries(stats.receber.contratos)
  .sort((a, b) => b[1] - a[1])
  .forEach(([contrato, count]) => console.log(`  ${contrato}: ${count}`));

console.log('\nExemplos de RECEITAS:');
stats.exemplos.receber.forEach((ex, i) => {
  console.log(`  ${i+1}. ${ex.cliente} | R$ ${ex.valor.toFixed(2)} | ${ex.contrato || 'Avulso'}`);
});

// Período de datas
const datasArray = [...stats.datas].sort((a, b) => {
  const [dA, mA, yA] = a.split('/').map(Number);
  const [dB, mB, yB] = b.split('/').map(Number);
  return new Date(yA, mA-1, dA) - new Date(yB, mB-1, dB);
});

console.log('\n=== PERÍODO ===');
console.log(`Primeira data: ${datasArray[0]}`);
console.log(`Última data: ${datasArray[datasArray.length - 1]}`);

// Meses cobertos
const meses = new Set(datasArray.map(d => d.split('/').slice(1).join('/')));
console.log(`Meses cobertos: ${[...meses].join(', ')}`);
