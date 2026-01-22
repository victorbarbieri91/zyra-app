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

// Mapeamento de contratos xlsx -> DB (do script anterior)
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

// Responsável padrão (Almir) para casos não mapeados
const RESPONSAVEL_PADRAO = "d33b167b-01ed-4dd6-accd-3bab78c86573";

async function carregarClientes() {
  const { data, error } = await supabase
    .from('crm_pessoas')
    .select('id, nome_completo')
    .eq('escritorio_id', ESCRITORIO_ID)
    .eq('tipo_cadastro', 'cliente');

  if (error) {
    console.error('Erro ao carregar clientes:', error);
    return {};
  }

  const mapa = {};
  data.forEach(c => {
    mapa[c.nome_completo] = c.id;
    // Também mapear versões normalizadas
    mapa[c.nome_completo.toLowerCase()] = c.id;
  });
  return mapa;
}

function parseExcelDate(excelValue) {
  if (!excelValue) return null;

  // Se for número (serial date do Excel)
  if (typeof excelValue === 'number') {
    const date = new Date((excelValue - 25569) * 86400 * 1000);
    return date.toISOString();
  }

  // Se for string no formato dd/mm/yyyy
  if (typeof excelValue === 'string') {
    const parts = excelValue.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(year, month - 1, day).toISOString();
    }
  }

  return null;
}

function mapearArea(areaXlsx) {
  if (!areaXlsx) return 'outra';
  const mapped = mapeamentoAreas[areaXlsx];
  return mapped || 'outra';
}

function mapearTipo(departamentoXlsx) {
  if (!departamentoXlsx) return 'simples';
  const mapped = mapeamentoTipos[departamentoXlsx];
  return mapped || 'simples';
}

function mapearResponsavel(responsavelXlsx) {
  if (!responsavelXlsx) return RESPONSAVEL_PADRAO;
  const mapped = mapeamentoResponsaveis[responsavelXlsx];
  return mapped || RESPONSAVEL_PADRAO;
}

async function migrar() {
  console.log('=== MIGRAÇÃO CONSULTIVO ===\n');

  // Carregar clientes do banco
  console.log('Carregando clientes do CRM...');
  const clientesMap = await carregarClientes();
  console.log(`${Object.keys(clientesMap).length / 2} clientes carregados\n`);

  // Ler xlsx
  console.log('Lendo arquivo xlsx...');
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

  console.log(`Total de registros: ${records.length}`);
  console.log(`Em andamento: ${emAndamento.length}\n`);

  // Preparar dados para inserção
  const consultasParaInserir = [];
  const erros = [];

  for (const registro of emAndamento) {
    const clienteNome = registro['Cliente'];
    const clienteId = clientesMap[clienteNome] || clientesMap[clienteNome?.toLowerCase()];

    if (!clienteId) {
      erros.push({ registro, erro: `Cliente não encontrado: ${clienteNome}` });
      continue;
    }

    const contratoXlsx = registro['Contrato do cliente'];
    const contratoId = contratoXlsx ? mapeamentoContratos[contratoXlsx] : null;

    // Construir observações com CI legado
    const ciLegado = registro['CI'];
    let observacoes = registro['Observação'] || '';
    if (ciLegado) {
      observacoes = `CI legado: ${ciLegado}${observacoes ? '\n' + observacoes : ''}`;
    }

    // Tags das etiquetas
    const etiquetasRaw = registro['Etiquetas'] || '';
    const tags = etiquetasRaw.split(/[,;]/).map(t => t.trim()).filter(Boolean);

    const consulta = {
      escritorio_id: ESCRITORIO_ID,
      tipo: mapearTipo(registro['Departamento']),
      area: mapearArea(registro['Área']),
      cliente_id: clienteId,
      assunto: registro['Objeto'] || 'Consulta migrada',
      descricao: registro['Descrição'] || null,
      prioridade: 'media', // Padrão para migração
      prazo: null, // Não temos prazo no xlsx
      data_recebimento: parseExcelDate(registro['Data']) || new Date().toISOString(),
      responsavel_id: mapearResponsavel(registro['Responsável']),
      status: 'em_analise', // Em andamento = em_analise
      observacoes: observacoes || null,
      tags: tags.length > 0 ? tags : null,
      contrato_id: contratoId,
    };

    consultasParaInserir.push(consulta);
  }

  console.log(`Consultas preparadas para inserção: ${consultasParaInserir.length}`);
  console.log(`Erros de mapeamento: ${erros.length}\n`);

  if (erros.length > 0) {
    console.log('=== ERROS DE MAPEAMENTO ===');
    erros.forEach(e => console.log(`- ${e.erro}`));
    console.log('');
  }

  // Preview
  console.log('=== PREVIEW (3 primeiros) ===\n');
  consultasParaInserir.slice(0, 3).forEach((c, i) => {
    console.log(`--- Consulta ${i + 1} ---`);
    console.log(`  Assunto: ${c.assunto}`);
    console.log(`  Área: ${c.area}`);
    console.log(`  Tipo: ${c.tipo}`);
    console.log(`  Cliente ID: ${c.cliente_id}`);
    console.log(`  Responsável ID: ${c.responsavel_id}`);
    console.log(`  Contrato ID: ${c.contrato_id || 'N/A'}`);
    console.log(`  Data: ${c.data_recebimento}`);
    console.log(`  Observações: ${c.observacoes?.substring(0, 50) || 'N/A'}...`);
    console.log('');
  });

  // Verificar se deve executar
  const args = process.argv.slice(2);
  if (!args.includes('--execute')) {
    console.log('=== MODO PREVIEW ===');
    console.log('Para executar a migração, rode: node scripts/migrar-consultivo.js --execute');
    return;
  }

  // Executar inserção
  console.log('=== EXECUTANDO MIGRAÇÃO ===\n');

  let sucesso = 0;
  let falhas = 0;

  for (const consulta of consultasParaInserir) {
    const { data, error } = await supabase
      .from('consultivo_consultas')
      .insert(consulta)
      .select('id, numero');

    if (error) {
      console.error(`Erro ao inserir: ${consulta.assunto}`);
      console.error(error.message);
      falhas++;
    } else {
      console.log(`✅ ${data[0].numero}: ${consulta.assunto.substring(0, 50)}...`);
      sucesso++;
    }
  }

  console.log('\n=== RESULTADO FINAL ===');
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falhas: ${falhas}`);
}

migrar().catch(console.error);
