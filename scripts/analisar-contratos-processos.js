const XLSX = require('xlsx');

// Ler xlsx
const workbook = XLSX.readFile('./scripts/migracao-processos.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Headers estão na linha 1 (segunda linha)
const headers = rawData[1];
console.log('=== HEADERS ===');
headers.forEach((h, i) => console.log(i, ':', h));

// Encontrar índices das colunas importantes
const contratoIdx = headers.findIndex(h => h && h.toLowerCase().includes('contrato'));
const numeroIdx = headers.findIndex(h => h && h === 'Número');
const clienteIdx = headers.findIndex(h => h && h === 'Cliente');
const situacaoIdx = headers.findIndex(h => h && h.toLowerCase().includes('situação'));

console.log('\n=== ÍNDICES ===');
console.log('Contrato:', contratoIdx);
console.log('Número:', numeroIdx);
console.log('Cliente:', clienteIdx);
console.log('Situação:', situacaoIdx);

// Extrair dados (a partir da linha 2)
const dataRows = rawData.slice(2).filter(row => row && row.length > 0);
console.log('\nTotal de linhas:', dataRows.length);

// Filtrar apenas processos ativos com contrato
const processosComContrato = dataRows
  .filter(row => row[contratoIdx] && row[contratoIdx].toString().trim())
  .filter(row => row[situacaoIdx] === 'Ativo')
  .map(row => ({
    numero: row[numeroIdx],
    contrato: row[contratoIdx],
    cliente: row[clienteIdx],
    situacao: row[situacaoIdx]
  }));

console.log('\n=== PROCESSOS ATIVOS COM CONTRATO ===');
console.log('Total:', processosComContrato.length);

// Listar contratos únicos
const contratosUnicos = [...new Set(processosComContrato.map(p => p.contrato))];
console.log('\n=== CONTRATOS ÚNICOS ===');
console.log('Total:', contratosUnicos.length);
contratosUnicos.forEach(c => console.log('-', c));

// Salvar para análise
const fs = require('fs');
fs.writeFileSync('./scripts/processos-com-contrato.json', JSON.stringify(processosComContrato, null, 2));
console.log('\nSalvo em: scripts/processos-com-contrato.json');
