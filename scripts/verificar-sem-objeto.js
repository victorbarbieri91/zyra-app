const data = require('./dados-consultivo.json');

// Consultas sem objeto
const semObjeto = data.filter(d => !d.objeto || d.objeto.trim() === '');
console.log('Consultas sem objeto definido:', semObjeto.length);
console.log('\nDetalhes:');
semObjeto.forEach(d => {
  console.log(`- CI: ${d.ci} | Cliente: ${d.cliente}`);
});

// Verificar no arquivo original
const XLSX = require('xlsx');
const workbook = XLSX.readFile('./scripts/migracao-consultivo.xlsx');
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const headers = rawData[1];
const dataRows = rawData.slice(2);

const records = dataRows.map(row => {
  const obj = {};
  headers.forEach((header, idx) => {
    if (header && row[idx] !== undefined) obj[header] = row[idx];
  });
  return obj;
}).filter(obj => Object.keys(obj).length > 0);

// Filtrar Em andamento
const emAndamento = records.filter(r => {
  const etiqueta = r['Etiquetas'] || '';
  return etiqueta.includes('andamento') || etiqueta === 'Aberto' || etiqueta === 'Pro bono';
});

// Verificar os que não têm Objeto
const semObjetoXlsx = emAndamento.filter(r => !r['Objeto'] || r['Objeto'].trim() === '');
console.log('\n=== NO XLSX ORIGINAL ===');
console.log('Consultas em andamento sem campo Objeto:', semObjetoXlsx.length);
semObjetoXlsx.forEach(r => {
  console.log(`- CI: ${r['CI']} | Cliente: ${r['Cliente']} | Departamento: ${r['Departamento']}`);
});
