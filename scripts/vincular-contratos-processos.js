const XLSX = require('xlsx');
const fs = require('fs');

// Mapeamento de contratos xlsx -> ID no banco
const mapeamentoContratos = {
  "Veloso Time Sheet - VELOSO - TIME SHEET": "35480478-3309-47f1-9d7d-eb505ec99466",
  "359 - YOFC - TEC WI": "369ec31a-843a-49c4-ae8e-5adaf7f2d5f2",
  "Dádiva - Indústria - Contencioso Cível": "8c6319d8-8af7-4b45-9e10-9504f17fe015",
  "391 - YOFC - A2M E OUTROS": "fc41f289-3177-4a55-8c84-1f0f2e3f3b16",
  "Belcorp - Tributário - BELCORP - TRIBUTÁRIO": "bd272d35-3e7d-4e29-8881-5f50938d3603",
  "Dádiva - Contencioso Cível - DÁDIVA - CONTENCIOSO CÍVEL": "0ac75204-b7c9-45f9-8dc9-5c5c4913334a",
  "366 - Dádiva - Indústria - Contencioso Tributário - DÁDIVA - INDÚSTRIA TRIBUTÁRIO": "7af931a9-7767-4611-a8d4-9d6eed57682c",
  "Carjim - Time Sheet": "3bee38cd-9461-4ca6-a9ef-28eec94286f2",
  "373 - SILVANA CARVALHO DA SILVA - MURAYAMA": "d00449e4-b489-41a7-8f67-c29f85036ff1",
  "Ana Carolina Pesciallo - Execução Débora - Ana Carolina Pesciallo - Execução Débora": "8840b9f0-9cdd-48f9-91a0-fc98dfa35272",
  "Belcorp Corporativo - BELCORP - CORPORATIVO": "4797401c-1645-40ca-a3de-41dfee13cce5",
  "Dádiva - Distribuidora - Tributário - Dádiva Contencioso Tributário Distribuidora": "3b73d933-4954-442d-8e78-269a39008a44",
  "358 - YOFC - Cobrança Geral": "ad8c2657-27e1-4b2a-9923-f34dd1e6bf85",
  "401 - YOFC - JAÇANÃ e LÍDER": "e885c38e-066f-4776-b663-497ffddf564a",
  "32 - ANDREA POLYCARPO": "8022fdd0-4637-4733-a1da-4221647adf2d",
};

// Função para extrair número CNJ
function extrairCNJ(numero) {
  if (!numero) return null;
  const match = numero.match(/CNJ:\s*([\d.-]+)/);
  return match ? match[1] : null;
}

// Ler xlsx
const workbook = XLSX.readFile('./scripts/migracao-processos.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = rawData[1];
const contratoIdx = 5;
const numeroIdx = 9;
const situacaoIdx = 7;

const dataRows = rawData.slice(2).filter(row => row && row.length > 0);

// Processar dados
const updates = [];
const semCNJ = [];
const semMapeamento = [];

dataRows.forEach(row => {
  const contrato = row[contratoIdx];
  const numero = row[numeroIdx];
  const situacao = row[situacaoIdx];

  if (!contrato || situacao !== 'Ativo') return;

  const contratoId = mapeamentoContratos[contrato];
  const cnj = extrairCNJ(numero);

  if (!contratoId) {
    semMapeamento.push({ contrato, numero });
    return;
  }

  if (!cnj) {
    semCNJ.push({ contrato, numero });
    return;
  }

  updates.push({ cnj, contratoId, contrato });
});

console.log('=== RESULTADOS ===');
console.log('Total updates:', updates.length);
console.log('Sem CNJ:', semCNJ.length);
console.log('Sem mapeamento:', semMapeamento.length);

if (semMapeamento.length > 0) {
  console.log('\n=== SEM MAPEAMENTO ===');
  semMapeamento.forEach(s => console.log('-', s.contrato));
}

if (semCNJ.length > 0) {
  console.log('\n=== SEM CNJ ===');
  semCNJ.forEach(s => console.log('-', s.contrato, '|', s.numero));
}

// Gerar SQL
console.log('\n=== SQL UPDATES ===');
updates.forEach(u => {
  console.log(`-- ${u.contrato}`);
  console.log(`UPDATE processos_processos SET contrato_id = '${u.contratoId}' WHERE numero_cnj = '${u.cnj}';`);
});

// Salvar SQL em arquivo
const sql = updates.map(u =>
  `UPDATE processos_processos SET contrato_id = '${u.contratoId}' WHERE numero_cnj = '${u.cnj}' AND escritorio_id = 'f2568999-0ae6-47db-9293-a6f1672ed421';`
).join('\n');

fs.writeFileSync('./scripts/vincular-contratos.sql', sql);
console.log('\nSQL salvo em: scripts/vincular-contratos.sql');
