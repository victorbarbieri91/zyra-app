const fs = require('fs');

// Argumentos: arquivo de entrada e saída
const inputFile = process.argv[2] || 'migracao-financeiro04.06-utf8.csv';
const outputFile = process.argv[3] || 'dados-migracao-v2.json';

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

// Encontrar linha de cabeçalho
let headerIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Data Vencimento;Data Vencimento Orig.;Tipo;Cliente')) {
    headerIndex = i;
    break;
  }
}

if (headerIndex === -1) {
  console.error('Cabeçalho não encontrado!');
  process.exit(1);
}

console.log(`Cabeçalho encontrado na linha ${headerIndex + 1}`);

const escritorioId = 'f2568999-0ae6-47db-9293-a6f1672ed421';

// Mapeamento de categorias
const categoriasDespesa = {
  'taxas bancárias': 'taxas_bancarias',
  'taxas bancarias': 'taxas_bancarias',
  'iof': 'taxas_bancarias',
  'juros': 'juros',
  'encargos': 'taxas_bancarias',
  'pro-labore': 'prolabore',
  'prolabore': 'prolabore',
  'pró labore': 'prolabore',
  'retirada': 'retirada_socios',
  'plano de saúde': 'beneficios',
  'convênio médico': 'beneficios',
  'odontoprev': 'beneficios',
  'seguro dental': 'beneficios',
  'custas': 'custas',
  'imposto': 'impostos',
  'darf': 'impostos',
  'gps': 'impostos',
  'simples nacional': 'impostos',
  'das': 'impostos',
  'ppi': 'impostos',
  'telefon': 'telefonia',
  'celular': 'telefonia',
  'claro': 'telefonia',
  'vivo': 'telefonia',
  'aluguel': 'aluguel',
  'regus': 'aluguel',
  'goodstorage': 'aluguel',
  'empréstimo': 'emprestimos',
  'emprestimo': 'emprestimos',
  'pronampe': 'emprestimos',
  'fgi': 'emprestimos',
  'parcelamento c6': 'emprestimos',
  'tecnologia': 'tecnologia',
  'software': 'tecnologia',
  'informática': 'tecnologia',
  'informatica': 'tecnologia',
  'acronis': 'tecnologia',
  'vios': 'tecnologia',
  'contabilidade': 'fornecedor',
  'quali contabil': 'fornecedor',
  'marketing': 'outra',
  'tl marketing': 'outra',
  'seguro vida': 'outra',
  'pedágio': 'deslocamento',
  'pedagio': 'deslocamento',
  'combustível': 'deslocamento',
  'combustivel': 'deslocamento',
  'posto': 'deslocamento',
  'estacionamento': 'estacionamento',
  'material': 'material',
  'impressão': 'material',
  'oab': 'outra',
  'aasp': 'outra',
  'gamma': 'tecnologia',
  'aplicação automática': 'outra',
  'rende fácil': 'outra'
};

const categoriasReceita = {
  'honorários': 'honorarios',
  'honorarios': 'honorarios',
  'cobrança': 'honorarios',
  'hora trabalhada': 'honorarios',
  'valor fixo': 'honorarios',
  'ato processual': 'honorarios',
  'taxa de acompanhamento': 'honorarios',
  'reembolso': 'custas_reembolsadas',
  'resgate': 'custas_reembolsadas',
  'empréstimo': 'outros',
  'transferência': 'outros',
  'capital de giro': 'outros'
};

function detectarCategoriaDespesa(descricao, cliente) {
  const texto = (descricao + ' ' + cliente).toLowerCase();

  for (const [termo, categoria] of Object.entries(categoriasDespesa)) {
    if (texto.includes(termo)) {
      return categoria;
    }
  }
  return 'outra';
}

function detectarCategoriaReceita(descricao, cliente) {
  const texto = (descricao + ' ' + cliente).toLowerCase();

  for (const [termo, categoria] of Object.entries(categoriasReceita)) {
    if (texto.includes(termo)) {
      return categoria;
    }
  }
  return 'outros';
}

function detectarFormaPagamento(descricao, cliente) {
  const texto = (descricao + ' ' + cliente).toLowerCase();

  if (texto.includes('pix')) return 'pix';
  if (texto.includes('boleto')) return 'boleto';
  if (texto.includes('débito automático') || texto.includes('debito automatico')) return 'ted';
  if (texto.includes('ted')) return 'ted';
  if (texto.includes('cartão') || texto.includes('cartao')) return 'cartao_credito';
  return 'pix'; // default
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function parseValue(valueStr) {
  if (!valueStr) return 0;
  const clean = valueStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
  return Math.abs(parseFloat(clean) || 0);
}

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").substring(0, 250);
}

// Processar registros (formato simplificado)
const despesas = [];
const receitas = [];

let currentRecord = null;
let inMultiline = false;

for (let i = headerIndex + 1; i < lines.length; i++) {
  const line = lines[i];

  if (!line.trim()) {
    if (inMultiline && currentRecord) {
      currentRecord.descricao += '\n';
    }
    continue;
  }

  // Tentar parsear como nova linha de dados
  const parts = line.split(';');

  // Se começa com data válida (dd/mm/yyyy), é um novo registro
  if (parts[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0].trim())) {
    // Salvar registro anterior se existir
    if (currentRecord) {
      if (currentRecord.tipo === 'PAGAR') {
        despesas.push(currentRecord);
      } else if (currentRecord.tipo === 'RECEBER') {
        receitas.push(currentRecord);
      }
    }

    // Iniciar novo registro
    currentRecord = {
      dataVencimento: parseDate(parts[0]),
      dataVencimentoOrig: parseDate(parts[1]),
      tipo: parts[2]?.trim(),
      cliente: parts[3]?.trim() || '',
      descricao: (parts[4] || '').replace(/^"/, ''),
      valor: parts[5],
      valorPago: parts[6]
    };

    // Verificar se descrição termina com aspas (campo completo) ou não (multiline)
    if (parts[4] && !parts[4].includes('"') && parts.length >= 6 && parts[5]) {
      // Descrição simples, sem aspas - registro completo na linha
      inMultiline = false;
    } else if (parts[4] && parts[4].startsWith('"') && !line.includes('";')) {
      // Início de campo multiline
      inMultiline = true;
    } else {
      inMultiline = false;
    }
  } else if (inMultiline && currentRecord) {
    // Continuação de campo multiline
    if (line.includes('";')) {
      // Fim do campo multiline
      const match = line.match(/^(.*)";(-?[\d.,]+);(-?[\d.,]+)/);
      if (match) {
        currentRecord.descricao += ' ' + match[1].replace(/"$/, '');
        currentRecord.valor = match[2];
        currentRecord.valorPago = match[3];
        inMultiline = false;
      }
    } else {
      currentRecord.descricao += ' ' + line.trim();
    }
  }
}

// Salvar último registro
if (currentRecord) {
  if (currentRecord.tipo === 'PAGAR') {
    despesas.push(currentRecord);
  } else if (currentRecord.tipo === 'RECEBER') {
    receitas.push(currentRecord);
  }
}

console.log(`\nTotal registros PAGAR: ${despesas.length}`);
console.log(`Total registros RECEBER: ${receitas.length}`);

// Converter para formato de saída
const despesasProcessadas = despesas
  .filter(d => d.dataVencimento && d.valor)
  .map(d => {
    const descClean = d.descricao.replace(/\s+/g, ' ').trim();
    return {
      escritorio_id: escritorioId,
      descricao: escapeSQL(descClean),
      valor: parseValue(d.valor),
      data_vencimento: d.dataVencimento,
      data_pagamento: d.dataVencimentoOrig || d.dataVencimento,
      status: 'pago',
      categoria: detectarCategoriaDespesa(descClean, d.cliente),
      forma_pagamento: detectarFormaPagamento(descClean, d.cliente),
      fornecedor: escapeSQL(d.cliente)
    };
  })
  .filter(d => d.valor > 0);

const receitasProcessadas = receitas
  .filter(r => r.dataVencimento && r.valor)
  .map(r => {
    const descClean = r.descricao.replace(/\s+/g, ' ').trim();
    const dataComp = r.dataVencimento.substring(0, 8) + '01';
    return {
      escritorio_id: escritorioId,
      descricao: escapeSQL(descClean),
      valor: parseValue(r.valor),
      data_vencimento: r.dataVencimento,
      data_pagamento: r.dataVencimentoOrig || r.dataVencimento,
      data_competencia: dataComp,
      status: 'pago',
      categoria: detectarCategoriaReceita(descClean, r.cliente),
      forma_pagamento: detectarFormaPagamento(descClean, r.cliente),
      tipo: 'avulso'
    };
  })
  .filter(r => r.valor > 0);

// Salvar JSON
const output = { despesas: despesasProcessadas, receitas: receitasProcessadas };
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

console.log(`\nDespesas processadas: ${despesasProcessadas.length}`);
console.log(`Receitas processadas: ${receitasProcessadas.length}`);
console.log(`\nArquivo salvo: ${outputFile}`);

// Resumo por categoria
const resumoDespesas = {};
despesasProcessadas.forEach(d => {
  resumoDespesas[d.categoria] = (resumoDespesas[d.categoria] || 0) + d.valor;
});

const resumoReceitas = {};
receitasProcessadas.forEach(r => {
  resumoReceitas[r.categoria] = (resumoReceitas[r.categoria] || 0) + r.valor;
});

console.log('\n--- Resumo Despesas por Categoria ---');
Object.entries(resumoDespesas).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
  console.log(`${cat}: R$ ${val.toFixed(2)}`);
});

console.log('\n--- Resumo Receitas por Categoria ---');
Object.entries(resumoReceitas).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
  console.log(`${cat}: R$ ${val.toFixed(2)}`);
});

const totalDesp = despesasProcessadas.reduce((a, b) => a + b.valor, 0);
const totalRec = receitasProcessadas.reduce((a, b) => a + b.valor, 0);
console.log(`\n=== TOTAIS ===`);
console.log(`Total Despesas: R$ ${totalDesp.toFixed(2)}`);
console.log(`Total Receitas: R$ ${totalRec.toFixed(2)}`);
