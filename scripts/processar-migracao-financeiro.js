const fs = require('fs');
const path = require('path');

// Função para parsear CSV com campos multiline
function parseCSVWithMultiline(content) {
  const lines = content.split('\n');
  const results = [];
  let currentRecord = '';
  let inQuotes = false;

  // Pular a primeira linha (título) e pegar headers da segunda
  const headers = lines[1].split(';').map(h => h.trim());

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    // Contar aspas para saber se estamos dentro de um campo multiline
    const quoteCount = (line.match(/"/g) || []).length;

    if (!inQuotes) {
      currentRecord = line;
      // Se tem número ímpar de aspas, estamos entrando num campo multiline
      if (quoteCount % 2 === 1) {
        inQuotes = true;
      } else {
        // Registro completo
        if (currentRecord.trim()) {
          const record = parseRecord(currentRecord, headers);
          if (record) results.push(record);
        }
        currentRecord = '';
      }
    } else {
      // Continuando campo multiline
      currentRecord += '\n' + line;
      if (quoteCount % 2 === 1) {
        // Fechando o campo multiline
        inQuotes = false;
        const record = parseRecord(currentRecord, headers);
        if (record) results.push(record);
        currentRecord = '';
      }
    }
  }

  return results;
}

function parseRecord(line, headers) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ';' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  if (values.length < 10) return null;

  const record = {};
  headers.forEach((h, i) => {
    record[h] = values[i] || '';
  });

  return record;
}

// Mapeamento de categorias (para ENUMs do banco)
const mapeamentoCategoria = {
  // Despesas - usando valores exatos do enum despesa_categoria_enum
  'OAB e Associações': 'associacoes',
  'Informática - Softwares': 'tecnologia',
  'Combustível': 'combustivel',
  'Materiais de escritório': 'material',
  'Seguro Saúde': 'beneficios',
  'Tarifas e custos bancários': 'taxas_bancarias',
  'Estacionamento': 'estacionamento',
  'Estadia': 'hospedagem',
  'Prestadores de Serviço': 'fornecedor',
  'ISS': 'impostos',
  'IRPJ': 'impostos',
  'Custas e depesas': 'custas',
  'Cursos e treinamentos': 'capacitacao',
  'Pró-labore': 'prolabore',
  'Transporte e pedágio': 'deslocamento',
  'Aluguel': 'aluguel',
  'Retirada dos sócios': 'retirada_socios',
  'Empréstimo': 'emprestimos',
  'Pagamento de empréstimos': 'emprestimos',
  'Pagamento de juros': 'juros',
  'Água e Esgoto': 'outra',
  'Telefone': 'telefonia',
  'Telefonia': 'telefonia',
  'Alimentação': 'alimentacao',
  'IOF': 'taxas_bancarias',
  'Contabilidade': 'fornecedor',
  'Publicidade e propaganda': 'marketing',
  'IRPF': 'impostos',
  'INSS': 'impostos',
  'FGTS': 'impostos',
  'Seguro': 'beneficios',
  'Seguro dental': 'beneficios',
  'GPS': 'impostos',
  'Simples Nacional': 'impostos',
  'Plano de Saúde': 'beneficios',
  'Internet': 'telefonia',
  'Energia': 'outra',
  'Outros tributos e taxas': 'impostos',
  'Parcelamento de impostos': 'impostos',
  'Outros valores cobrados pelo locador': 'aluguel',
  'Pagamento de condenações': 'custas',
  'Cartão de Crédito': 'cartao_credito',
  'Honorários': 'comissao',  // Para despesas: participação em honorários = comissão
  // Receitas - usando valores do enum receita_categoria_enum
  // Valores válidos: honorarios, custas_reembolsadas, exito, consultoria, outros
  'Honorários': 'honorarios',
  'Hora trabalhada': 'honorarios',
  'Reembolso de valores': 'custas_reembolsadas',
  'Baixa de aplicação': 'outros',
  'Êxito': 'exito',
  'Fixo mensal': 'honorarios',
  'TAP': 'honorarios',
  'Partido mensal': 'honorarios',
  'Participação em serviços': 'honorarios',
  // Transferências (ignorar)
  'Entre contas correntes': 'transferencia',
  'Transferência de valores entre contas': 'transferencia',
  'Aplicação de valores em investimento': 'investimento',
  'Conta Investimento': 'investimento',
};

// Mapeamento de forma de pagamento (para enum forma_pagamento_enum)
// Valores válidos: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito, cheque, deposito
const mapeamentoFormaPagamento = {
  'Crédito': 'cartao_credito',
  'Débito': 'cartao_debito',
  'Pix': 'pix',
  'Boleto': 'boleto',
  'Dinheiro': 'dinheiro',
  'Transferência': 'ted',
  'On line': 'ted',
  'Debito Automatico': 'ted',
  'TED': 'ted',
  'DOC': 'ted',
};

function getFormaPagamento(forma) {
  return mapeamentoFormaPagamento[forma] || 'ted';  // fallback para ted
}

function parseValor(valor) {
  if (!valor || valor === '---') return 0;
  // Remove qualquer caracter que não seja número, vírgula ou ponto
  let clean = valor.toString().replace(/[^\d,.-]/g, '');
  // Substitui vírgula por ponto
  clean = clean.replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseData(data) {
  if (!data || data === '00/00/0000') return null;
  const parts = data.split('/');
  if (parts.length !== 3) return null;
  const [dia, mes, ano] = parts;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function getCategoria(planoContas, descricao, tipo) {
  if (planoContas) {
    // Pode ter múltiplas categorias separadas por vírgula
    const categorias = planoContas.split(',').map(c => c.trim());
    for (const cat of categorias) {
      if (mapeamentoCategoria[cat]) {
        let categoria = mapeamentoCategoria[cat];
        // 'honorarios' só é válido para receitas, não para despesas
        if (tipo === 'PAGAR' && categoria === 'honorarios') {
          categoria = 'comissao';
        }
        return categoria;
      }
    }
  }

  // Inferir categoria pela descrição se não houver plano de contas
  const desc = (descricao || '').toLowerCase();

  // Receitas - usando valores do enum receita_categoria_enum
  // Valores válidos: honorarios, custas_reembolsadas, exito, consultoria, outros
  if (tipo === 'RECEBER') {
    if (desc.includes('ato processual') || desc.includes('taxa de acompanhamento') || desc.includes('hora trabalhada') || desc.includes('extrato - regra de contrato')) {
      return 'honorarios';
    }
    if (desc.includes('reembolso') || desc.includes('resgate judicial')) {
      return 'custas_reembolsadas';
    }
    if (desc.includes('êxito')) {
      return 'exito';
    }
    return 'outros';
  }

  // Despesas - usando valores do enum despesa_categoria_enum
  if (tipo === 'PAGAR') {
    if (desc.includes('pro-labore') || desc.includes('pró-labore') || desc.includes('prolabore')) {
      return 'prolabore';
    }
    if (desc.includes('aluguel') || desc.includes('regus') || desc.includes('coworking')) {
      return 'aluguel';
    }
    if (desc.includes('custas') || desc.includes('tribunal') || desc.includes('cartorio') || desc.includes('cartório')) {
      return 'custas';
    }
    if (desc.includes('tarifa bancária') || desc.includes('tarifa bancaria') || desc.includes('iof')) {
      return 'taxas_bancarias';
    }
    if (desc.includes('honorário') || desc.includes('honorario') || desc.includes('participação')) {
      return 'comissao';
    }
    return 'outra';
  }

  return 'outra';
}

function capitalizeName(name) {
  if (!name) return '';
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em'];
  const acronyms = ['S/A', 'S.A.', 'LTDA', 'LTDA.', 'ME', 'MEI', 'EIRELI', 'EPP'];

  return name.split(' ').map((word, index) => {
    const upper = word.toUpperCase();
    // Manter acrônimos
    if (acronyms.includes(upper)) {
      return upper === 'S/A' ? 'S/A' : upper;
    }
    // Preposições em minúsculo (exceto primeira palavra)
    if (index > 0 && prepositions.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    // Capitalizar
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function cleanDescription(desc) {
  if (!desc) return '';
  // Remove quebras de linha extras e espaços
  let clean = desc.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  // Limita tamanho
  if (clean.length > 500) {
    clean = clean.substring(0, 497) + '...';
  }
  return clean;
}

// Processar arquivo
const filename = process.argv[2] || 'migracao-financeiro10.12.csv';
const filepath = path.join(__dirname, filename);
const content = fs.readFileSync(filepath, 'utf-8');

const records = parseCSVWithMultiline(content);
console.log(`Total de registros encontrados: ${records.length}\n`);

const despesas = [];
const receitas = [];
const escritorioId = 'f2568999-0ae6-47db-9293-a6f1672ed421';

// Filtrar registros válidos (não incluir transferências, investimentos, etc.)
const categoriasIgnorar = [
  'Baixa de aplicação',
  'Entre contas correntes',
  'Transferência de valores entre contas',
  'Aplicação de valores em investimento',
  'Conta Investimento',
  'Cartão de Crédito'  // já importado via módulo de cartões
];

// Fornecedores que são operadoras de cartão (já importados via módulo de cartões)
const fornecedoresCartao = [
  'BANCO BRADESCO CARTOES S/A',
  'BANCO BRADESCO CARTOES',
  'CARTAO DE CREDITO SANTANDER',
  'BANCO ITAUCARD S/A',
  'BANCO ITAUCARD',
  'C6 CARTAO DE CREDITO',
  'BTG PACTUAL',
  'OUROCARD'
];

for (const r of records) {
  const tipo = r['Tipo'];
  const valor = Math.abs(parseValor(r['Valor']));
  const planoContas = r['Plano de Contas'];

  if (valor === 0) continue;
  if (categoriasIgnorar.includes(planoContas)) continue;

  // Ignorar despesas de cartão de crédito (já importadas via módulo de cartões)
  const entidadeUpper = (r['Cliente'] || '').toUpperCase();
  const isCartaoCredito = fornecedoresCartao.some(fc => entidadeUpper.includes(fc));
  if (tipo === 'PAGAR' && isCartaoCredito) continue;

  const dataVencimento = parseData(r['Data Vencimento']);
  const dataBaixa = parseData(r['Data Baixa']);
  const descricao = cleanDescription(r['Descrição']);
  const categoria = getCategoria(planoContas, r['Descrição'], tipo);
  const formaPagamento = getFormaPagamento(r['Forma']);
  const entidade = capitalizeName(r['Cliente']);

  if (tipo === 'PAGAR') {
    despesas.push({
      escritorio_id: escritorioId,
      descricao: descricao || `Despesa ${r['Nro Título']}`,
      valor: valor,
      data_vencimento: dataVencimento,
      data_pagamento: dataBaixa,
      status: dataBaixa ? 'pago' : 'pendente',
      categoria: categoria,
      forma_pagamento: formaPagamento,
      fornecedor: entidade,
    });
  } else if (tipo === 'RECEBER') {
    receitas.push({
      escritorio_id: escritorioId,
      descricao: descricao || `Receita ${r['Nro Título']}`,
      valor: valor,
      data_vencimento: dataVencimento,
      data_pagamento: dataBaixa,
      status: dataBaixa ? 'pago' : 'pendente',
      categoria: categoria === 'outros' ? 'outros' : categoria,
      forma_pagamento: formaPagamento,
      tipo: 'avulsa',
    });
  }
}

console.log(`Despesas processadas: ${despesas.length}`);
console.log(`Receitas processadas: ${receitas.length}`);

// Salvar em JSON
const output = { despesas, receitas };
fs.writeFileSync(
  path.join(__dirname, `dados-${filename.replace('.csv', '.json')}`),
  JSON.stringify(output, null, 2)
);

console.log(`\nArquivo salvo: dados-${filename.replace('.csv', '.json')}`);

// Mostrar resumo por categoria
console.log('\n--- Resumo Despesas por Categoria ---');
const despPorCat = {};
for (const d of despesas) {
  despPorCat[d.categoria] = (despPorCat[d.categoria] || 0) + d.valor;
}
Object.entries(despPorCat).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
  console.log(`${cat}: R$ ${val.toFixed(2)}`);
});

console.log('\n--- Resumo Receitas por Categoria ---');
const recPorCat = {};
for (const r of receitas) {
  recPorCat[r.categoria] = (recPorCat[r.categoria] || 0) + r.valor;
}
Object.entries(recPorCat).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
  console.log(`${cat}: R$ ${val.toFixed(2)}`);
});

// Total
const totalDesp = despesas.reduce((sum, d) => sum + d.valor, 0);
const totalRec = receitas.reduce((sum, r) => sum + r.valor, 0);
console.log(`\n=== TOTAIS ===`);
console.log(`Total Despesas: R$ ${totalDesp.toFixed(2)}`);
console.log(`Total Receitas: R$ ${totalRec.toFixed(2)}`);
