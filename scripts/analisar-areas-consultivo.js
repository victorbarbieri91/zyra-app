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

// Filtrar em andamento
const emAndamento = records.filter(r => {
  const etiqueta = r['Etiquetas'] || '';
  return etiqueta.includes('andamento') || etiqueta === 'Aberto' || etiqueta === 'Pro bono';
});

// Áreas únicas
const areas = {};
emAndamento.forEach(r => {
  const area = r['Área'] || 'sem_area';
  areas[area] = (areas[area] || 0) + 1;
});
console.log('=== ÁREAS NO XLSX ===');
Object.entries(areas).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(k + ': ' + v));

// Departamentos únicos
const deps = {};
emAndamento.forEach(r => {
  const dep = r['Departamento'] || 'sem_departamento';
  deps[dep] = (deps[dep] || 0) + 1;
});
console.log('\n=== DEPARTAMENTOS NO XLSX ===');
Object.entries(deps).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(k + ': ' + v));

// Mostrar todas as colunas disponíveis
console.log('\n=== COLUNAS DISPONÍVEIS NO XLSX ===');
console.log(headers.filter(Boolean).join(', '));

// Amostra de registros
console.log('\n=== AMOSTRA (3 primeiros em andamento) ===');
emAndamento.slice(0, 3).forEach((r, i) => {
  console.log(`\n--- Registro ${i + 1} ---`);
  Object.entries(r).forEach(([k,v]) => console.log(`${k}: ${v}`));
});
