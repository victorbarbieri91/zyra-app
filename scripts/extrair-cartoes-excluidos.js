const fs = require('fs');
const path = require('path');

const escritorioId = 'f2568999-0ae6-47db-9293-a6f1672ed421';

// Fornecedores de cartão que foram excluídos
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

// Categoria "Cartão de Crédito" também foi excluída
const categoriasCartao = ['Cartão de Crédito'];

function parseCSVWithMultiline(content) {
  const lines = content.split('\n');
  const results = [];
  let currentRecord = '';
  let inQuotes = false;

  const headers = lines[1].split(';').map(h => h.trim());

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const quoteCount = (line.match(/"/g) || []).length;

    if (!inQuotes) {
      currentRecord = line;
      if (quoteCount % 2 === 1) {
        inQuotes = true;
      } else {
        if (currentRecord.trim()) {
          const record = parseRecord(currentRecord, headers);
          if (record) results.push(record);
        }
        currentRecord = '';
      }
    } else {
      currentRecord += '\n' + line;
      if (quoteCount % 2 === 1) {
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

function parseValor(valor) {
  if (!valor || valor === '---') return 0;
  let clean = valor.toString().replace(/[^\d,.-]/g, '');
  clean = clean.replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseData(data) {
  if (!data || data === '00/00/0000') return null;
  const parts = data.split('/');
  if (parts.length !== 3) return null;
  const [dia, mes, ano] = parts;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function cleanDescription(desc) {
  if (!desc) return '';
  let clean = desc.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length > 250) {
    clean = clean.substring(0, 247) + '...';
  }
  return clean.replace(/'/g, "''");
}

function capitalizeName(name) {
  if (!name) return '';
  return name.replace(/'/g, "''");
}

function extrairCartoesDoArquivo(filename) {
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`[AVISO] Arquivo não encontrado: ${filename}`);
    return [];
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const records = parseCSVWithMultiline(content);

  const cartoes = [];

  for (const r of records) {
    const tipo = r['Tipo'];
    const valor = parseValor(r['Valor']);
    const planoContas = r['Plano de Contas'] || '';
    const cliente = r['Cliente'] || '';
    const clienteUpper = cliente.toUpperCase();

    if (valor === 0) continue;
    if (tipo !== 'PAGAR') continue;

    // Verificar se é cartão por categoria
    const isCartaoCategoria = categoriasCartao.includes(planoContas);

    // Verificar se é cartão por fornecedor
    const isCartaoFornecedor = fornecedoresCartao.some(fc => clienteUpper.includes(fc.toUpperCase()));

    if (isCartaoCategoria || isCartaoFornecedor) {
      const dataVencimento = parseData(r['Data Vencimento']);
      const dataBaixa = parseData(r['Data Baixa']);
      const descricao = cleanDescription(r['Descrição']);

      if (dataVencimento) {
        cartoes.push({
          escritorio_id: escritorioId,
          descricao: descricao || `Fatura cartão ${r['Nro Título'] || ''}`.trim(),
          valor: valor,
          data_vencimento: dataVencimento,
          data_pagamento: dataBaixa || dataVencimento,
          status: 'pago',
          categoria: 'cartao_credito',
          forma_pagamento: 'cartao_credito',
          fornecedor: capitalizeName(cliente)
        });
      }
    }
  }

  return cartoes;
}

// Extrair de ambos os arquivos
const arquivos = [
  'migracao-financeiro10.12.csv',
  'migracao-financeiro07.09.csv'
];

let todosCartoes = [];

for (const arquivo of arquivos) {
  console.log(`\nProcessando: ${arquivo}`);
  const cartoes = extrairCartoesDoArquivo(arquivo);
  console.log(`  Encontrados: ${cartoes.length} registros de cartão`);
  todosCartoes = todosCartoes.concat(cartoes);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Total de registros de cartão a inserir: ${todosCartoes.length}`);
console.log(`Valor total: R$ ${todosCartoes.reduce((a, b) => a + b.valor, 0).toFixed(2)}`);

// Gerar SQL
const batchSize = 30;
const batches = [];

for (let i = 0; i < todosCartoes.length; i += batchSize) {
  batches.push(todosCartoes.slice(i, i + batchSize));
}

console.log(`\nGerando ${batches.length} lotes de SQL...`);

batches.forEach((batch, index) => {
  const values = batch.map(d =>
    `('${d.escritorio_id}', '${d.descricao}', ${d.valor}, '${d.data_vencimento}', '${d.data_pagamento}', '${d.status}', '${d.categoria}', '${d.forma_pagamento}', '${d.fornecedor}')`
  ).join(',\n');

  const sql = `INSERT INTO financeiro_despesas (escritorio_id, descricao, valor, data_vencimento, data_pagamento, status, categoria, forma_pagamento, fornecedor) VALUES\n${values};`;

  const filename = `lote-cartoes-${String(index + 1).padStart(2, '0')}.sql`;
  fs.writeFileSync(path.join(__dirname, filename), sql);
  console.log(`  Gerado: ${filename} (${batch.length} registros)`);
});

// Salvar JSON também
fs.writeFileSync(
  path.join(__dirname, 'cartoes-para-inserir.json'),
  JSON.stringify(todosCartoes, null, 2)
);

console.log(`\nJSON salvo: cartoes-para-inserir.json`);

// Resumo por fornecedor
console.log(`\n${'='.repeat(60)}`);
console.log('RESUMO POR FORNECEDOR:');
const porFornecedor = {};
todosCartoes.forEach(c => {
  porFornecedor[c.fornecedor] = porFornecedor[c.fornecedor] || { count: 0, valor: 0 };
  porFornecedor[c.fornecedor].count++;
  porFornecedor[c.fornecedor].valor += c.valor;
});

Object.entries(porFornecedor)
  .sort((a, b) => b[1].valor - a[1].valor)
  .forEach(([forn, dados]) => {
    console.log(`  ${forn}: ${dados.count} reg (R$ ${dados.valor.toFixed(2)})`);
  });
