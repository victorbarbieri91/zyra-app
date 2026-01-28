const fs = require('fs');

// Ler CSV com encoding Latin1
const csv = fs.readFileSync('./scripts/migracao-financeiro01a03.csv', 'latin1');
const lines = csv.split('\n');

// Header na linha 2 (índice 1)
const header = lines[1].split(';');
console.log('=== ANÁLISE DA MIGRAÇÃO FINANCEIRA ===\n');
console.log('Colunas do CSV:');
header.forEach((col, i) => console.log(`  ${i}: ${col}`));

// Índices das colunas importantes
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
  pagar: { count: 0, valor: 0, categorias: {}, formas: {} },
  receber: { count: 0, valor: 0, categorias: {}, formas: {}, contratos: {} },
  datas: [],
  clientes: new Set(),
  fornecedores: new Set()
};

for (let i = 2; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (!cols[0] || cols[0].trim() === '') continue;

  const tipo = cols[idxTipo]?.trim();
  const forma = cols[idxForma]?.trim();
  const cliente = cols[idxCliente]?.trim();
  const descricao = cols[idxDescricao]?.trim();
  const valorStr = cols[idxValor]?.replace('.', '').replace(',', '.').trim();
  const valor = parseFloat(valorStr) || 0;
  const planoContas = cols[idxPlanoContas]?.trim();
  const contrato = cols[idxContrato]?.trim();
  const dataVenc = cols[idxDataVenc]?.trim();
  const dataBaixa = cols[idxDataBaixa]?.trim();

  stats.total++;

  if (dataVenc) stats.datas.push(dataVenc);

  if (tipo === 'PAGAR') {
    stats.pagar.count++;
    stats.pagar.valor += Math.abs(valor);
    stats.pagar.categorias[planoContas] = (stats.pagar.categorias[planoContas] || 0) + 1;
    stats.pagar.formas[forma] = (stats.pagar.formas[forma] || 0) + 1;
    if (cliente) stats.fornecedores.add(cliente);
  } else if (tipo === 'RECEBER') {
    stats.receber.count++;
    stats.receber.valor += Math.abs(valor);
    stats.receber.categorias[planoContas] = (stats.receber.categorias[planoContas] || 0) + 1;
    stats.receber.formas[forma] = (stats.receber.formas[forma] || 0) + 1;
    if (contrato) stats.receber.contratos[contrato] = (stats.receber.contratos[contrato] || 0) + 1;
    if (cliente) stats.clientes.add(cliente);
  }
}

console.log('\n=== RESUMO GERAL ===');
console.log(`Total de registros: ${stats.total}`);

console.log('\n=== DESPESAS (PAGAR) ===');
console.log(`Quantidade: ${stats.pagar.count}`);
console.log(`Valor total: R$ ${stats.pagar.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
console.log(`Fornecedores únicos: ${stats.fornecedores.size}`);

console.log('\nCategorias (Plano de Contas):');
Object.entries(stats.pagar.categorias)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

console.log('\nFormas de pagamento:');
Object.entries(stats.pagar.formas)
  .sort((a, b) => b[1] - a[1])
  .forEach(([forma, count]) => console.log(`  ${forma}: ${count}`));

console.log('\n=== RECEITAS (RECEBER) ===');
console.log(`Quantidade: ${stats.receber.count}`);
console.log(`Valor total: R$ ${stats.receber.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
console.log(`Clientes únicos: ${stats.clientes.size}`);

console.log('\nCategorias (Plano de Contas):');
Object.entries(stats.receber.categorias)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

console.log('\nFormas de pagamento:');
Object.entries(stats.receber.formas)
  .sort((a, b) => b[1] - a[1])
  .forEach(([forma, count]) => console.log(`  ${forma}: ${count}`));

console.log('\nContratos referenciados (top 15):');
Object.entries(stats.receber.contratos)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([contrato, count]) => console.log(`  ${contrato}: ${count}`));

// Período de datas
const datasUnicas = [...new Set(stats.datas)].sort();
console.log('\n=== PERÍODO ===');
console.log(`Primeira data: ${datasUnicas[0]}`);
console.log(`Última data: ${datasUnicas[datasUnicas.length - 1]}`);

// Salvar análise em JSON
const analise = {
  total: stats.total,
  pagar: {
    count: stats.pagar.count,
    valor: stats.pagar.valor,
    categorias: stats.pagar.categorias,
    formas: stats.pagar.formas,
    fornecedores: [...stats.fornecedores]
  },
  receber: {
    count: stats.receber.count,
    valor: stats.receber.valor,
    categorias: stats.receber.categorias,
    formas: stats.receber.formas,
    contratos: stats.receber.contratos,
    clientes: [...stats.clientes]
  },
  periodo: {
    inicio: datasUnicas[0],
    fim: datasUnicas[datasUnicas.length - 1]
  }
};

fs.writeFileSync('./scripts/analise-migracao-financeiro.json', JSON.stringify(analise, null, 2));
console.log('\nAnálise salva em: scripts/analise-migracao-financeiro.json');
