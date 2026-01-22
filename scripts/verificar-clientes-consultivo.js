const XLSX = require('xlsx');

// Ler o arquivo xlsx
const workbook = XLSX.readFile('./scripts/migracao-consultivo.xlsx');
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = rawData[1];
const dataRows = rawData.slice(2);

const records = dataRows.map(row => {
  const obj = {};
  headers.forEach((header, idx) => {
    if (header && row[idx] !== undefined) {
      obj[header] = row[idx];
    }
  });
  return obj;
}).filter(obj => Object.keys(obj).length > 0);

// Extrair clientes únicos do xlsx
const clientesXlsx = [...new Set(records.map(r => r['Cliente']).filter(Boolean))];

console.log('=== CLIENTES DO XLSX ===');
console.log('Total de clientes únicos:', clientesXlsx.length);
console.log('\nLista para busca SQL:');
console.log(clientesXlsx.map(c => `'${c.replace(/'/g, "''")}'`).join(',\n'));
