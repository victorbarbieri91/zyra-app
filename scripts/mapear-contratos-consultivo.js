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

// Contratos do banco de dados (copiados da query)
const contratosDB = [
  { id: "ae7aaeca-aeac-4db9-952a-3e254d57a19a", descricao: "João Hamilton - Time Sheet" },
  { id: "031d6fab-b0ae-46ba-85d0-f57612633e05", descricao: "Edvaldo Morata - Time Sheet" },
  { id: "4797401c-1645-40ca-a3de-41dfee13cce5", descricao: "Belcorp Corporativo" },
  { id: "ca1bd57f-3803-4335-9558-a868f2479c82", descricao: "Barra do Caí - Time Sheet" },
  { id: "30bea91a-88ce-41a5-8c99-00da2cc46c8a", descricao: "Platlog - Time Sheet" },
  { id: "35480478-3309-47f1-9d7d-eb505ec99466", descricao: "Veloso Time Sheet" },
  { id: "5e917dfe-5917-4493-9a2c-4e5f2361d1d8", descricao: "8 Inova - Time Sheet" },
  { id: "b17733ef-247f-4ecd-bbd4-4c8ab0ec0641", descricao: "Forfuturing - Time Sheet" },
  { id: "c3a918fe-4302-4b24-b174-c0665a23c460", descricao: "Time Sheet - Corporativo" },
  { id: "a4220cbb-b950-44bb-b469-30ae7db5a6c7", descricao: "221" },
  { id: "ab444312-e369-4bd1-8eb1-f317793d0c36", descricao: "431" },
  { id: "b0d3801f-fd89-434d-94c2-a3ad659e80c6", descricao: "Tributário - Time Sheet" },
  { id: "d4de3cab-cbe9-47ff-b934-daf87f5081d0", descricao: "Mello - Time Sheet" },
  { id: "881d26fa-1fe8-444d-8c0c-54b4bb41f523", descricao: "ZAIT - Time Sheet" },
  { id: "00852629-70a3-4a62-bda6-28a2cd4a6112", descricao: "390" },
  { id: "99c3cdc9-3703-44df-bc2a-ddf5969a5abd", descricao: "Silvia Veitzman - Time Sheet" },
  { id: "06123ede-8df7-4cac-8b34-6e9e0971c75f", descricao: "250" },
  { id: "2e4b05ba-a3c3-48fe-9c9e-2b05558a1a2a", descricao: "394" },
  { id: "e9afd6ac-a529-4ffb-bd5c-ddb6f111b7be", descricao: "Marco Vitiello - Time Sheet" },
  { id: "7cd1e477-8972-4ecc-8f3f-61043ab6ba43", descricao: "385" },
  { id: "4dfbf759-20ff-4cb6-a194-3b643b9e9ca0", descricao: "360" },
  { id: "0ffd5f56-1cfe-4433-adb4-56c73499415d", descricao: "361" },
  { id: "ec1c6445-fa53-4cc2-b574-fdaf6da6190d", descricao: "362" },
  { id: "cd731077-613c-4422-a17d-fcd90c969bbe", descricao: "365 Dádiva - Time Sheet" },
  { id: "369ec31a-843a-49c4-ae8e-5adaf7f2d5f2", descricao: "359" },
  { id: "8d196eeb-3bfc-4fb1-a4c3-4065483c11c4", descricao: "Paloma Sequeiros - Time Sheet" },
  { id: "38220c39-769a-4a38-88cb-d2ab8ce8d915", descricao: "Eliane Luchetti - Time Sheet" },
  { id: "27c7b8b1-e16b-4ee3-b5b5-9581bc85df6c", descricao: "Le Bife Eventos - Time Sheet" },
  { id: "1f7d0559-07a3-4476-a9af-026349f83911", descricao: "403" },
  { id: "9acce60a-6ecd-4c3d-9844-93df03bb95bf", descricao: "Delquímica - Projeto Sucessão Societária" },
  { id: "3449c27b-65c4-4f31-ac9e-8409df0b6fb1", descricao: "325" },
  { id: "13d6d3e7-d352-41d5-aa15-379f50055000", descricao: "Prohabitat - M&A" },
];

// Mapeamento manual de contratos xlsx -> DB
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

// Filtrar apenas Em andamento
const emAndamento = records.filter(r => {
  const etiqueta = r['Etiquetas'] || '';
  return etiqueta.includes('andamento') || etiqueta === 'Aberto' || etiqueta === 'Pro bono';
});

console.log('=== ANÁLISE DE CONTRATOS - APENAS EM ANDAMENTO ===\n');
console.log('Total de consultas em andamento:', emAndamento.length);

// Consultas COM contrato referenciado
const comContrato = emAndamento.filter(r => r['Contrato do cliente']);
console.log('Consultas com contrato referenciado:', comContrato.length);

// Consultas SEM contrato referenciado
const semContrato = emAndamento.filter(r => !r['Contrato do cliente']);
console.log('Consultas sem contrato referenciado:', semContrato.length);

console.log('\n=== MAPEAMENTO DE CONTRATOS ===\n');

const contratosXlsx = [...new Set(emAndamento.map(r => r['Contrato do cliente']).filter(Boolean))];
let matched = 0;
let notMatched = [];

contratosXlsx.forEach(contratoXlsx => {
  const contratoId = mapeamentoContratos[contratoXlsx];
  if (contratoId) {
    const qtd = emAndamento.filter(r => r['Contrato do cliente'] === contratoXlsx).length;
    console.log(`✅ "${contratoXlsx}"`);
    console.log(`   → ID: ${contratoId} (${qtd} consultas)\n`);
    matched++;
  } else {
    const qtd = emAndamento.filter(r => r['Contrato do cliente'] === contratoXlsx).length;
    notMatched.push({ contrato: contratoXlsx, qtd });
  }
});

if (notMatched.length > 0) {
  console.log('\n=== CONTRATOS NÃO MAPEADOS ===\n');
  notMatched.forEach(({ contrato, qtd }) => {
    console.log(`❌ "${contrato}" (${qtd} consultas)`);
  });
}

console.log('\n=== RESUMO ===');
console.log('Contratos mapeados:', matched);
console.log('Contratos não mapeados:', notMatched.length);

// Verificar consulta do Edinei Mercure (único cliente não encontrado em andamento)
console.log('\n=== CONSULTA EDINEI MERCURE (cliente não encontrado) ===');
const consultaEdinei = emAndamento.find(r => r['Cliente'] === 'Edinei Mercure');
if (consultaEdinei) {
  console.log('CI:', consultaEdinei['CI']);
  console.log('Objeto:', consultaEdinei['Objeto']);
  console.log('Contrato:', consultaEdinei['Contrato do cliente'] || 'SEM CONTRATO');
  console.log('Responsável:', consultaEdinei['Responsável']);
  console.log('Data:', consultaEdinei['Data']);
}
