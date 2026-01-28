const fs = require('fs');
const path = require('path');

// Categorias que foram ignoradas na migração
const categoriasIgnorar = [
  'Baixa de aplicação',
  'Entre contas correntes',
  'Transferência de valores entre contas',
  'Aplicação de valores em investimento',
  'Conta Investimento',
  'Cartão de Crédito'
];

// Fornecedores de cartão que foram ignorados
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

function parseCSVWithMultiline(content) {
  const lines = content.split('\n');
  const results = [];
  let currentRecord = '';
  let inQuotes = false;

  // Pular a primeira linha (título) e pegar headers da segunda
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

function analisarArquivo(filename) {
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`\n[AVISO] Arquivo não encontrado: ${filename}`);
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const records = parseCSVWithMultiline(content);

  const excluidos = {
    porCategoria: {},
    porFornecedorCartao: {},
    totalRegistros: 0,
    totalValor: 0
  };

  const incluidos = {
    despesas: 0,
    receitas: 0,
    valorDespesas: 0,
    valorReceitas: 0
  };

  for (const r of records) {
    const tipo = r['Tipo'];
    const valor = parseValor(r['Valor']);
    const planoContas = r['Plano de Contas'] || '';
    const cliente = r['Cliente'] || '';
    const clienteUpper = cliente.toUpperCase();

    if (valor === 0) continue;

    // Verificar se foi excluído por categoria
    if (categoriasIgnorar.includes(planoContas)) {
      excluidos.porCategoria[planoContas] = excluidos.porCategoria[planoContas] || { count: 0, valor: 0, registros: [] };
      excluidos.porCategoria[planoContas].count++;
      excluidos.porCategoria[planoContas].valor += valor;
      excluidos.porCategoria[planoContas].registros.push({
        cliente,
        descricao: (r['Descrição'] || '').substring(0, 80),
        valor
      });
      excluidos.totalRegistros++;
      excluidos.totalValor += valor;
      continue;
    }

    // Verificar se foi excluído por ser fornecedor de cartão (apenas PAGAR)
    if (tipo === 'PAGAR') {
      const isCartao = fornecedoresCartao.some(fc => clienteUpper.includes(fc));
      if (isCartao) {
        const fornecedor = fornecedoresCartao.find(fc => clienteUpper.includes(fc)) || cliente;
        excluidos.porFornecedorCartao[fornecedor] = excluidos.porFornecedorCartao[fornecedor] || { count: 0, valor: 0, registros: [] };
        excluidos.porFornecedorCartao[fornecedor].count++;
        excluidos.porFornecedorCartao[fornecedor].valor += valor;
        excluidos.porFornecedorCartao[fornecedor].registros.push({
          descricao: (r['Descrição'] || '').substring(0, 80),
          valor
        });
        excluidos.totalRegistros++;
        excluidos.totalValor += valor;
        continue;
      }
    }

    // Registro incluído
    if (tipo === 'PAGAR') {
      incluidos.despesas++;
      incluidos.valorDespesas += valor;
    } else if (tipo === 'RECEBER') {
      incluidos.receitas++;
      incluidos.valorReceitas += valor;
    }
  }

  return { filename, excluidos, incluidos, totalOriginal: records.length };
}

// Analisar todos os arquivos
const arquivos = [
  'migracao-financeiro10.12.csv',
  'migracao-financeiro07.09.csv',
  'migracao-financeiro04.06.csv'
];

console.log('='.repeat(80));
console.log('ANÁLISE DE REGISTROS EXCLUÍDOS DA MIGRAÇÃO FINANCEIRA');
console.log('='.repeat(80));

const resultados = [];

for (const arquivo of arquivos) {
  const resultado = analisarArquivo(arquivo);
  if (resultado) {
    resultados.push(resultado);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`ARQUIVO: ${arquivo}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`Total registros no CSV: ${resultado.totalOriginal}`);
    console.log(`\nINCLUÍDOS NA MIGRAÇÃO:`);
    console.log(`  Despesas: ${resultado.incluidos.despesas} (R$ ${resultado.incluidos.valorDespesas.toFixed(2)})`);
    console.log(`  Receitas: ${resultado.incluidos.receitas} (R$ ${resultado.incluidos.valorReceitas.toFixed(2)})`);

    console.log(`\nEXCLUÍDOS DA MIGRAÇÃO:`);
    console.log(`  Total: ${resultado.excluidos.totalRegistros} registros (R$ ${resultado.excluidos.totalValor.toFixed(2)})`);

    if (Object.keys(resultado.excluidos.porCategoria).length > 0) {
      console.log(`\n  Por Categoria:`);
      for (const [cat, dados] of Object.entries(resultado.excluidos.porCategoria)) {
        console.log(`    - ${cat}: ${dados.count} registros (R$ ${dados.valor.toFixed(2)})`);
      }
    }

    if (Object.keys(resultado.excluidos.porFornecedorCartao).length > 0) {
      console.log(`\n  Por Fornecedor de Cartão:`);
      for (const [forn, dados] of Object.entries(resultado.excluidos.porFornecedorCartao)) {
        console.log(`    - ${forn}: ${dados.count} registros (R$ ${dados.valor.toFixed(2)})`);
      }
    }
  }
}

// Resumo geral
console.log(`\n${'='.repeat(80)}`);
console.log('RESUMO GERAL DOS EXCLUÍDOS');
console.log(`${'='.repeat(80)}`);

let totalExcluidos = 0;
let valorExcluido = 0;
const todasCategorias = {};
const todosFornecedores = {};

for (const r of resultados) {
  totalExcluidos += r.excluidos.totalRegistros;
  valorExcluido += r.excluidos.totalValor;

  for (const [cat, dados] of Object.entries(r.excluidos.porCategoria)) {
    todasCategorias[cat] = todasCategorias[cat] || { count: 0, valor: 0 };
    todasCategorias[cat].count += dados.count;
    todasCategorias[cat].valor += dados.valor;
  }

  for (const [forn, dados] of Object.entries(r.excluidos.porFornecedorCartao)) {
    todosFornecedores[forn] = todosFornecedores[forn] || { count: 0, valor: 0 };
    todosFornecedores[forn].count += dados.count;
    todosFornecedores[forn].valor += dados.valor;
  }
}

console.log(`\nTotal de registros excluídos: ${totalExcluidos}`);
console.log(`Valor total excluído: R$ ${valorExcluido.toFixed(2)}`);

console.log(`\nPor Categoria (todos os arquivos):`);
for (const [cat, dados] of Object.entries(todasCategorias).sort((a, b) => b[1].valor - a[1].valor)) {
  console.log(`  - ${cat}: ${dados.count} registros (R$ ${dados.valor.toFixed(2)})`);
}

console.log(`\nPor Fornecedor de Cartão (todos os arquivos):`);
for (const [forn, dados] of Object.entries(todosFornecedores).sort((a, b) => b[1].valor - a[1].valor)) {
  console.log(`  - ${forn}: ${dados.count} registros (R$ ${dados.valor.toFixed(2)})`);
}

// Salvar resultado em JSON
const outputJson = {
  arquivos: resultados,
  resumo: {
    totalExcluidos,
    valorExcluido,
    porCategoria: todasCategorias,
    porFornecedorCartao: todosFornecedores
  }
};

fs.writeFileSync(
  path.join(__dirname, 'analise-excluidos.json'),
  JSON.stringify(outputJson, null, 2)
);

console.log(`\n\nResultado salvo em: analise-excluidos.json`);
