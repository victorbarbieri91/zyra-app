const XLSX = require('xlsx');

const workbook = XLSX.readFile('./scripts/migracao-processos.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = rawData[1];
const contratoIdx = 5;  // Contrato do cliente
const situacaoIdx = 7;  // Situação do Processo
const numeroIdx = 9;    // Número

const dataRows = rawData.slice(2).filter(row => row && row.length > 0);

console.log('=== ANÁLISE COMPLETA ===');
console.log('Total de linhas:', dataRows.length);

// Contar por situação
const porSituacao = {};
dataRows.forEach(row => {
  const sit = row[situacaoIdx] || '(vazio)';
  porSituacao[sit] = (porSituacao[sit] || 0) + 1;
});
console.log('\n=== POR SITUAÇÃO ===');
Object.entries(porSituacao).forEach(([k, v]) => console.log(`${k}: ${v}`));

// Contar com/sem contrato
const comContrato = dataRows.filter(row => row[contratoIdx] && row[contratoIdx].toString().trim());
const semContrato = dataRows.filter(row => !row[contratoIdx] || !row[contratoIdx].toString().trim());
console.log('\n=== CONTRATOS ===');
console.log('Com contrato:', comContrato.length);
console.log('Sem contrato:', semContrato.length);

// Ativos com contrato
const ativosComContrato = comContrato.filter(row => row[situacaoIdx] === 'Ativo');
console.log('\n=== ATIVOS COM CONTRATO ===');
console.log('Total:', ativosComContrato.length);

// Listar todos os contratos únicos (não só ativos)
const todosContratos = [...new Set(comContrato.map(row => row[contratoIdx]))];
console.log('\n=== TODOS OS CONTRATOS ÚNICOS ===');
console.log('Total:', todosContratos.length);
todosContratos.forEach(c => console.log('-', c));

// Mostrar distribuição por situação dos que têm contrato
console.log('\n=== COM CONTRATO POR SITUAÇÃO ===');
const comContratoPorSit = {};
comContrato.forEach(row => {
  const sit = row[situacaoIdx] || '(vazio)';
  comContratoPorSit[sit] = (comContratoPorSit[sit] || 0) + 1;
});
Object.entries(comContratoPorSit).forEach(([k, v]) => console.log(`${k}: ${v}`));
