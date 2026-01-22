const XLSX = require('xlsx');
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

// Filtrar apenas Em andamento (incluindo 'AbertoEm andamento' e 'Pro bono')
const emAndamento = records.filter(r => {
  const etiqueta = r['Etiquetas'] || '';
  return etiqueta.includes('andamento') || etiqueta === 'Aberto' || etiqueta === 'Pro bono';
});

console.log('=== CONSULTAS EM ANDAMENTO ===');
console.log('Total:', emAndamento.length);

// Clientes únicos em andamento
const clientesEmAndamento = [...new Set(emAndamento.map(r => r['Cliente']).filter(Boolean))];
console.log('\nClientes únicos em andamento:', clientesEmAndamento.length);

// Contratos únicos
const contratos = [...new Set(emAndamento.map(r => r['Contrato do cliente']).filter(Boolean))];
console.log('\nContratos únicos referenciados:', contratos.length);
console.log('Contratos:', JSON.stringify(contratos, null, 2));

// Listar clientes em andamento
console.log('\n=== CLIENTES EM ANDAMENTO ===');
clientesEmAndamento.forEach(c => console.log('-', c));

// Responsáveis em andamento
const responsaveisEmAndamento = {};
emAndamento.forEach(r => {
  const resp = r['Responsável'] || 'Sem responsável';
  responsaveisEmAndamento[resp] = (responsaveisEmAndamento[resp] || 0) + 1;
});
console.log('\n=== RESPONSÁVEIS (Em Andamento) ===');
Object.entries(responsaveisEmAndamento).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(k + ':', v));

// Verificar clientes não encontrados anteriormente - estão em andamento?
const clientesNaoEncontrados = [
  '3Fg Negocios Imobiliarios e Intermediacao de Negocios Ltda',
  'César Augusto dos Santos',
  'David Paul Stevens',
  'Edinei Mercure',
  'Leonardo de Almeida Lira',
  'Maristella Fuganti Cabello Campos'
];

console.log('\n=== CLIENTES NÃO ENCONTRADOS - ESTÃO EM ANDAMENTO? ===');
clientesNaoEncontrados.forEach(cliente => {
  const consultasCliente = emAndamento.filter(r => r['Cliente'] === cliente);
  if (consultasCliente.length > 0) {
    console.log(`❌ ${cliente}: ${consultasCliente.length} consulta(s) EM ANDAMENTO`);
    consultasCliente.forEach(c => console.log(`   - CI: ${c['CI']}, Objeto: ${c['Objeto']}`));
  } else {
    const finalizadas = records.filter(r => r['Cliente'] === cliente);
    if (finalizadas.length > 0) {
      console.log(`✅ ${cliente}: ${finalizadas.length} consulta(s) FINALIZADA(s) - não precisa migrar`);
    } else {
      console.log(`? ${cliente}: não encontrado no xlsx`);
    }
  }
});

// Responsável não encontrado - tem consultas em andamento?
console.log('\n=== MARCIA XAVIER - CONSULTAS EM ANDAMENTO? ===');
const consultasMarcia = emAndamento.filter(r => r['Responsável'] === 'Marcia Xavier de Melo e Silva');
console.log('Consultas em andamento:', consultasMarcia.length);
if (consultasMarcia.length > 0) {
  consultasMarcia.forEach(c => console.log(`- CI: ${c['CI']}, Cliente: ${c['Cliente']}`));
}
