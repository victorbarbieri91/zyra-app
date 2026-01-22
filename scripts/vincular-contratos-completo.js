const XLSX = require('xlsx');
const fs = require('fs');

// Mapeamento COMPLETO de contratos xlsx -> ID no banco
const mapeamentoContratos = {
  // Já mapeados anteriormente
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

  // Novos mapeamentos
  "Inova TS - Contencioso Cível - INOVA - Contencioso Cível": "d3954f37-bb9c-404a-ab40-63de6351a500",
  "Platlog - Êxito - Contencioso Cível - Remuneração no êxito": "5b17fd7d-c675-4770-8f05-2e8d91849681",
  "Digon - Movinord - DIGON - MOVINORD": "052f7775-3a9e-46cd-a199-a58c6191ab75",
  "Luiz Octávio - ITCMD - LUIZ OCTÁVIO - FAZENDA PÚBLICA ITCMD": "78d4f931-09b7-474b-97de-3f6befa95276",
  "Kona - Contencioso ~Exito": "9d6b1610-4789-4f66-b5b0-df462bd38e05",
  "393 - MAQBRIT - LIQUIDAÇÃO": "6acad4e7-bb08-4f38-8380-7bc10972ec1f",
  "BT - Tributário": "06bfd238-93ad-43bb-8df5-ce1992a429c9",
  "Fernanda Silva Santos": "41a55467-dcf5-4272-b878-d4e304487d58",
  "Karina Ochsenhofer x Sueli - KARINA OCHSENHOFER": "05e741ce-c659-426b-9f2d-6313dd67c959",
  "João Hamilton - Time Sheet - CONTRATO DE HONORARIOS": "ae7aaeca-aeac-4db9-952a-3e254d57a19a",
  "IDPJ - Edvan": "8b0669df-95c5-4d7c-9ea9-0a21638f1229",
  "309 - Processual - ANGELA PAGANI COSTA": "7099763a-c53c-42e2-b4c3-03ea4cb9aaa4",
  "Sciencia - CR Com. e Serv. Ltda - SCIENTIA - CR COM E SERV LTDA": "72429524-10cb-48d6-94d4-e27fcc17c504",
  "Scientia - Maria da Penha - SCIENTIA - MARIA DA PENHA": "5edf85ba-e7fb-4fb5-aa8b-9523edbf6710",
  "390 - POLYCARPO": "00852629-70a3-4a62-bda6-28a2cd4a6112",
  "91 - SHEILA GRASSO": "99b83454-9e8c-4e28-8941-8c5b4583b90b",
  "Platlog - Time Sheet": "30bea91a-88ce-41a5-8c99-00da2cc46c8a",
  "Crislene Marchioto": "d4a3f47f-f12d-45c0-9757-66e561e822f3",
  "WGS & Filhos - Contrato Pro-Bono": "569f60d2-92da-4447-9478-fe9f662f9a42",
  "28 - MARLENE - SANTANDER": "87730a4e-8a19-475b-ad9b-dac9e7c5a8a3",
  "4 fx - Uniqq - 4FX - UNIQQ": "2231e434-0343-4d41-be82-81acbc0775f8",
  "Platlog - Bertola": "de9c2c9a-4e3a-4795-96ea-66914d08ddfc",
  "Vale Verde - Contencioso Trabalhista - VALE VERDE - TRABALHISTA": "628ba2dc-b0d1-43a3-8647-8bfd23e82e38",
  "Inova TS - Contencioso Trabalhista - INOVA - Contencioso Trabalhista": "c2de14a4-2f75-49e6-a5b6-5bcb4bc53ad6",
  "Le Bife Restaurante Time Sheet - LE BIFE - TIME SHEET": "7f40e6d9-0a84-4386-97f8-7ceccc7a0d58",
  "339 - ANDRADE ENGENHARIA": "afccd20a-0780-4834-bf6f-3e45d7291c7b",
  "Le Bife - Expande - Defesa do Le bife na ação promovida pela Expand": "aed5a5f4-b1ee-4f23-99be-dcc039215d76",
  "Refricon - Êxito": "d4007c0f-bd48-41e5-99f8-f29b7e7ee62e",
  "Fábio Alexandre Galdeano - RT - Ricardo Lucindo Cruz - Reclamação trabalhista - Ricardo Lucindo Cruz": "49c82219-ea6c-47f5-88e6-fc4fa4224dca",
  "D'Rattan - Consultoria jurídica em geral": "433c48eb-a726-42b8-bd31-cc889246f4cb",
  "Inova - 2025 - Contencioso Trabalhista": "8a1495d7-300b-4b21-a6d9-fb9ddfdcd160",
  "Eliane - Processo Judicial Condomínio - Contrato de honorários para a condução do processo movido pelo condomínio": "b7670e94-4b05-4e31-bbdf-285978b9b625",
  "392 - MARIA DE FÁTIMA - PREVIDNCIÁRIO": "a82fe0d8-dead-4016-9096-a288c20ccad0",
  "Zait - Contencioso Trabalhistas": "5858fb0d-477b-49b4-ad42-5f6fb5697618",
  "Paloma Sequeiros - Time Sheet - PALOMA SEQUEIROS": "8d196eeb-3bfc-4fb1-a4c3-4065483c11c4",
  "´Marco Aurélio Raimundo - Êxito": "922ea1c6-75e8-4b0d-9b47-9c6b182d4378",
  "YOFC - MS Desembraço aduaneiro": "d22a5005-d957-4a75-8628-536e97becec2",
  "Brígida (Mocinha) - Pro-Bono": "2f79d9af-4d94-4981-ad15-d8407c865916",
  "Almeida - Reclamação Trabalhista - Contrato para processos trabalhistas": "e455c0b9-8127-442c-aab3-c999133fa958",
  "YOFC - Mandado de Segurança Compensação de Ofício nº 08114-00000737/2025 - Propositura de Mandado de Segurança para reconhecimento da prescrição do crédito exigido, com pedido de liminar para conceder o efeito suspensivo da dívida permitindo a obtenção de certidões negativas.": "d6838966-e61b-4a1b-9a95-0f771463d2fd",
  "RT Sebastião Joaquim de Souza": "e4d94bff-7d3a-4d48-a335-a7eef69ff612",
  "RT de Milene Galdino - Reclamação trabalhista de Milene Galdino": "de873cd8-c04f-4bd1-a431-48c7c30eb452",
  "Reclamação Trabalhista - processo particular - Ações pessoais do Antonio Carlos": "0debd935-f6c4-470c-82e9-50d1992983c7",
  "Sunglasses x Franco Boris Andrulis - RT de Franco Boris Andrulis": "38f25091-1016-454f-b5ed-f4836b36d3dd",
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
const clienteIdx = 19;

const dataRows = rawData.slice(2).filter(row => row && row.length > 0);

// Processar TODOS os dados (não só Ativos)
const updates = [];
const semCNJ = [];
const semMapeamento = [];

dataRows.forEach(row => {
  const contrato = row[contratoIdx];
  const numero = row[numeroIdx];
  const cliente = row[clienteIdx];

  if (!contrato) return; // Pular se não tem contrato

  const contratoId = mapeamentoContratos[contrato];
  const cnj = extrairCNJ(numero);

  if (!contratoId) {
    if (!semMapeamento.find(s => s.contrato === contrato)) {
      semMapeamento.push({ contrato, cliente });
    }
    return;
  }

  if (!cnj) {
    semCNJ.push({ contrato, numero: numero || '(vazio)', cliente });
    return;
  }

  // Evitar duplicatas
  if (!updates.find(u => u.cnj === cnj)) {
    updates.push({ cnj, contratoId, contrato, cliente });
  }
});

console.log('=== RESULTADOS ===');
console.log('Total com contrato no xlsx:', dataRows.filter(r => r[contratoIdx]).length);
console.log('Mapeamentos disponíveis:', Object.keys(mapeamentoContratos).length);
console.log('');
console.log('Updates a fazer:', updates.length);
console.log('Sem CNJ:', semCNJ.length);
console.log('Sem mapeamento:', semMapeamento.length);

if (semMapeamento.length > 0) {
  console.log('\n=== CONTRATOS SEM MAPEAMENTO ===');
  semMapeamento.forEach(s => console.log(`- ${s.contrato} (${s.cliente})`));
}

if (semCNJ.length > 0) {
  console.log('\n=== SEM CNJ (primeiros 10) ===');
  semCNJ.slice(0, 10).forEach(s => console.log(`- ${s.contrato} | ${s.numero}`));
  if (semCNJ.length > 10) console.log(`... e mais ${semCNJ.length - 10}`);
}

// Gerar SQL
const sql = updates.map(u =>
  `UPDATE processos_processos SET contrato_id = '${u.contratoId}' WHERE numero_cnj = '${u.cnj}' AND escritorio_id = 'f2568999-0ae6-47db-9293-a6f1672ed421' AND contrato_id IS NULL;`
).join('\n');

fs.writeFileSync('./scripts/vincular-contratos-completo.sql', sql);
console.log('\n=== SQL GERADO ===');
console.log('Arquivo: scripts/vincular-contratos-completo.sql');
console.log('Total de updates:', updates.length);

// Salvar dados para análise
fs.writeFileSync('./scripts/updates-contratos.json', JSON.stringify(updates, null, 2));
fs.writeFileSync('./scripts/sem-mapeamento.json', JSON.stringify(semMapeamento, null, 2));
