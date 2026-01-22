const XLSX = require('xlsx');
const fs = require('fs');

const ESCRITORIO_ID = 'f2568999-0ae6-47db-9293-a6f1672ed421';

// Mapeamento de áreas do xlsx para o sistema
const mapeamentoAreas = {
  'Tributária': 'tributaria',
  'Tributário': 'tributaria',
  'Cível': 'civel',
  'Civel': 'civel',
  'Corporativo': 'societaria',
  'Societária': 'societaria',
  'Societario': 'societaria',
  'Trabalhista': 'trabalhista',
  'Criminal': 'criminal',
  'Previdenciária': 'previdenciaria',
  'Consumidor': 'consumidor',
  'Empresarial': 'empresarial',
  'Ambiental': 'ambiental',
  'Compliance': 'compliance',
  'LGPD': 'compliance',
};

// Mapeamento de departamentos/tipos do xlsx para o sistema
const mapeamentoTipos = {
  'Consultivo': 'simples',
  'Parecer': 'parecer',
  'Contrato': 'contrato',
  'Due Diligence': 'due_diligence',
  'M&A': 'due_diligence',
  'Opinião': 'opiniao',
};

// Mapeamento de contratos xlsx -> DB
const mapeamentoContratos = {
  "João Hamilton - Time Sheet - CONTRATO DE HONORARIOS": "ae7aaeca-aeac-4db9-952a-3e254d57a19a",
  "Edvaldo Morata - Time Sheet": "031d6fab-b0ae-46ba-85d0-f57612633e05",
  "Belcorp Corporativo - BELCORP - CORPORATIVO": "4797401c-1645-40ca-a3de-41dfee13cce5",
  "Barra do Caí - Time Sheet - BARRA DO CAÍ - TIME SHEET": "ca1bd57f-3803-4335-9558-a868f2479c82",
  "Platlog - Time Sheet": "30bea91a-88ce-41a5-8c99-00da2cc46c8a",
  "Veloso Time Sheet - VELOSO - TIME SHEET": "35480478-3309-47f1-9d7d-eb505ec99466",
  "8 Inova - Time Sheet - INOVA TIME SHEET": "5e917dfe-5917-4493-9a2c-4e5f2361d1d8",
  "Forfuturing - Time Sheet - FORFUTURING - TIME SHEET": "b17733ef-247f-4ecd-bbd4-4c8ab0ec0641",
  "Time Sheet - Corporativo - Horas trabalhadas no regime de time sheet para o corporativo": "c3a918fe-4302-4b24-b174-c0665a23c460",
  "221 - OPTICAL SUNGLASSES": "a4220cbb-b950-44bb-b469-30ae7db5a6c7",
  "431 - CONSULTAS TRABALHISTAS": "ab444312-e369-4bd1-8eb1-f317793d0c36",
  "Tributário - Time Sheet - Time sheet para as horas trabalhadas em atendimentos tributários": "b0d3801f-fd89-434d-94c2-a3ad659e80c6",
  "Mello - Time Sheet - CARLOS EDUARDO MELLO": "d4de3cab-cbe9-47ff-b934-daf87f5081d0",
  "ZAIT - Time Sheet": "881d26fa-1fe8-444d-8c0c-54b4bb41f523",
  "390 - POLYCARPO": "00852629-70a3-4a62-bda6-28a2cd4a6112",
  "Silvia Veitzman - Time Sheet": "99c3cdc9-3703-44df-bc2a-ddf5969a5abd",
  "250 - PROHABITAT - PARTIDO": "06123ede-8df7-4cac-8b34-6e9e0971c75f",
  "394 - ALMIR": "2e4b05ba-a3c3-48fe-9c9e-2b05558a1a2a",
  "Marco Vitiello - Time Sheet - MARCO VITIELLO - TIME SHEET": "e9afd6ac-a529-4ffb-bd5c-ddb6f111b7be",
  "385 - YOFC - LGPD": "7cd1e477-8972-4ecc-8f3f-61043ab6ba43",
  "360 - YOFC - Compliance": "4dfbf759-20ff-4cb6-a194-3b643b9e9ca0",
  "361 - YOFC - COMITÊ": "0ffd5f56-1cfe-4433-adb4-56c73499415d",
  "362 - YOFC - TREINAMENTO": "ec1c6445-fa53-4cc2-b574-fdaf6da6190d",
  "365 Dádiva - Time Sheet - DÁDIVA - TIME SHEET": "cd731077-613c-4422-a17d-fcd90c969bbe",
  "359 - YOFC - TEC WI": "369ec31a-843a-49c4-ae8e-5adaf7f2d5f2",
  "Paloma Sequeiros - Time Sheet - PALOMA SEQUEIROS": "8d196eeb-3bfc-4fb1-a4c3-4065483c11c4",
  "Eliane Luchetti - Time Sheet - Eliane Luchetti": "38220c39-769a-4a38-88cb-d2ab8ce8d915",
  "Le Bife Eventos - Time Sheet - LE BIFE EVENTOS Time Sheet": "27c7b8b1-e16b-4ee3-b5b5-9581bc85df6c",
  "403 - Geraldo Rocha Mello": "1f7d0559-07a3-4476-a9af-026349f83911",
  "Delquímica - Projeto Sucessão Societária - Delquímica - Sucessão Societária": "9acce60a-6ecd-4c3d-9844-93df03bb95bf",
  "325 - FLÁVIA MARTINS FUZARO POLYCARPO": "3449c27b-65c4-4f31-ac9e-8409df0b6fb1",
  "Prohabitat - M&A - Negociação de M&A": "13d6d3e7-d352-41d5-aa15-379f50055000",
};

// Mapeamento de responsáveis
const mapeamentoResponsaveis = {
  "Almir Polycarpo": "d33b167b-01ed-4dd6-accd-3bab78c86573",
  "Andrei Gomes da Silva Pinto": "ddb9c4ea-874d-458c-8f9f-8659c02bebd5",
  "Flávia Martins Fuzaro Polycarpo": "f2f822f4-5660-4001-9626-9d29c305a40e",
  "Paloma Luczka": "3b2e1b3e-811c-4877-aea6-0546138c3f2b",
  "Victor Barbieri": "a7aebc01-3bc4-4f1d-a0c6-cddd0ac0941a",
};

const RESPONSAVEL_PADRAO = "d33b167b-01ed-4dd6-accd-3bab78c86573";

function parseExcelDate(excelValue) {
  if (!excelValue) return null;
  if (typeof excelValue === 'number') {
    const date = new Date((excelValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof excelValue === 'string') {
    const parts = excelValue.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return null;
}

function mapearArea(areaXlsx) {
  if (!areaXlsx) return 'outra';
  return mapeamentoAreas[areaXlsx] || 'outra';
}

function mapearTipo(departamentoXlsx) {
  if (!departamentoXlsx) return 'simples';
  return mapeamentoTipos[departamentoXlsx] || 'simples';
}

function mapearResponsavel(responsavelXlsx) {
  if (!responsavelXlsx) return RESPONSAVEL_PADRAO;
  return mapeamentoResponsaveis[responsavelXlsx] || RESPONSAVEL_PADRAO;
}

function escapeSQL(str) {
  if (!str) return null;
  return str.replace(/'/g, "''");
}

// Ler xlsx
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

// Filtrar apenas Em andamento
const emAndamento = records.filter(r => {
  const etiqueta = r['Etiquetas'] || '';
  return etiqueta.includes('andamento') || etiqueta === 'Aberto' || etiqueta === 'Pro bono';
});

console.log('Total em andamento:', emAndamento.length);

// Gerar lista de clientes únicos para mapeamento
const clientesUnicos = [...new Set(emAndamento.map(r => r['Cliente']).filter(Boolean))];
console.log('Clientes únicos:', clientesUnicos.length);

// Gerar JSON com dados resumidos para migração
const dadosParaMigracao = emAndamento.map(r => ({
  cliente: r['Cliente'],
  ci: r['CI'],
  objeto: r['Objeto'],
  departamento: r['Departamento'],
  area: r['Área'],
  responsavel: r['Responsável'],
  contrato: r['Contrato do cliente'],
  data: r['Data'],
  etiquetas: r['Etiquetas'],
  descricao: r['Descrição'],
  observacao: r['Observação'],
}));

// Salvar lista de clientes para busca no banco
fs.writeFileSync('./scripts/clientes-consultivo.json', JSON.stringify(clientesUnicos, null, 2));
console.log('\nClientes salvos em: scripts/clientes-consultivo.json');

// Salvar dados para migração
fs.writeFileSync('./scripts/dados-consultivo.json', JSON.stringify(dadosParaMigracao, null, 2));
console.log('Dados salvos em: scripts/dados-consultivo.json');

// Mostrar resumo
console.log('\n=== RESUMO ===');
console.log('Cliente sem nome:', emAndamento.filter(r => !r['Cliente']).length);

// Agrupar por área
const porArea = {};
emAndamento.forEach(r => {
  const area = mapearArea(r['Área']);
  porArea[area] = (porArea[area] || 0) + 1;
});
console.log('\nPor área:');
Object.entries(porArea).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

// Agrupar por responsável
const porResponsavel = {};
emAndamento.forEach(r => {
  const resp = r['Responsável'] || 'Sem responsável';
  porResponsavel[resp] = (porResponsavel[resp] || 0) + 1;
});
console.log('\nPor responsável:');
Object.entries(porResponsavel).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
