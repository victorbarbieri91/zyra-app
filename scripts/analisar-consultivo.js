const XLSX = require('xlsx');

// Ler o arquivo xlsx
const workbook = XLSX.readFile('./scripts/migracao-consultivo.xlsx');

console.log('=== ANÁLISE DO ARQUIVO DE MIGRAÇÃO CONSULTIVO ===\n');

const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// A primeira linha é título, a segunda é o header real
const titulo = rawData[0][0];
const headers = rawData[1];
const dataRows = rawData.slice(2); // Dados começam na linha 3

console.log('TÍTULO:', titulo);
console.log('\nCOLUNAS DO HEADER:');
headers.forEach((h, i) => console.log(`  ${i}: "${h}"`));

console.log('\nTOTAL DE REGISTROS:', dataRows.length);

// Converter para objetos usando os headers corretos
const records = dataRows.map(row => {
  const obj = {};
  headers.forEach((header, idx) => {
    if (header && row[idx] !== undefined) {
      obj[header] = row[idx];
    }
  });
  return obj;
}).filter(obj => Object.keys(obj).length > 0); // Filtrar linhas vazias

console.log('REGISTROS VÁLIDOS:', records.length);

// Mostrar primeiros registros
console.log('\n=== PRIMEIROS 5 REGISTROS ===');
records.slice(0, 5).forEach((row, idx) => {
  console.log(`\n--- Registro ${idx + 1} ---`);
  Object.entries(row).forEach(([key, value]) => {
    const displayValue = String(value).length > 80
      ? String(value).substring(0, 80) + '...'
      : value;
    console.log(`  ${key}: ${displayValue}`);
  });
});

// Análise de valores únicos
console.log('\n\n=== ANÁLISE DE VALORES ÚNICOS ===');

const analisarCampo = (campo) => {
  const valores = records.map(r => r[campo]).filter(v => v !== undefined && v !== null && v !== '');
  const unicos = [...new Set(valores)];
  console.log(`\n${campo.toUpperCase()} (${unicos.length} valores únicos de ${valores.length} preenchidos):`);
  unicos.forEach(v => {
    const count = valores.filter(x => x === v).length;
    console.log(`  - "${v}" (${count}x)`);
  });
};

// Campos categóricos
['Etiquetas', 'Departamento', 'Área'].forEach(analisarCampo);

// Responsáveis e Clientes
console.log('\n--- RESPONSÁVEIS ---');
analisarCampo('Responsável');

console.log('\n--- CLIENTES ---');
const clientes = records.map(r => r['Cliente']).filter(v => v !== undefined && v !== null && v !== '');
const clientesUnicos = [...new Set(clientes)];
console.log(`CLIENTE (${clientesUnicos.length} valores únicos):`);
clientesUnicos.slice(0, 15).forEach(v => {
  const count = clientes.filter(x => x === v).length;
  console.log(`  - "${v}" (${count}x)`);
});
if (clientesUnicos.length > 15) {
  console.log(`  ... e mais ${clientesUnicos.length - 15} clientes`);
}

// Verificar campos de data
console.log('\n--- DATAS ---');
const datas = records.map(r => r['Data']).filter(v => v !== undefined && v !== null);
console.log(`Total de datas: ${datas.length}`);
console.log('Exemplos:', datas.slice(0, 5));

// Verificar campos numéricos
console.log('\n--- CAMPOS NUMÉRICOS ---');
['CI', 'Pasta'].forEach(campo => {
  const valores = records.map(r => r[campo]).filter(v => v !== undefined && v !== null);
  console.log(`${campo}: ${valores.length} valores (ex: ${valores.slice(0, 5).join(', ')})`);
});

// Verificar Objetos (pode ser a descrição/assunto da consulta)
console.log('\n--- OBJETOS/ASSUNTOS ---');
const objetos = records.map(r => r['Objeto']).filter(v => v !== undefined && v !== null && v !== '');
const objetosUnicos = [...new Set(objetos)];
console.log(`Total de objetos preenchidos: ${objetos.length}`);
console.log(`Objetos únicos: ${objetosUnicos.length}`);
console.log('Exemplos:');
objetosUnicos.slice(0, 10).forEach(v => console.log(`  - "${v}"`));

console.log('\n\n=== FIM DA ANÁLISE ===');
