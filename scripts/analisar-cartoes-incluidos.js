const fs = require('fs');
const path = require('path');

// Fornecedores de cartão que deveriam ter sido ignorados
const fornecedoresCartao = [
  'BANCO BRADESCO CARTOES',
  'CARTAO DE CREDITO SANTANDER',
  'BANCO ITAUCARD',
  'C6 CARTAO DE CREDITO',
  'BTG PACTUAL',
  'OUROCARD'
];

function parseValue(valueStr) {
  if (!valueStr) return 0;
  const clean = valueStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
  return Math.abs(parseFloat(clean) || 0);
}

function analisarArquivoSimplificado(filename) {
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`\n[AVISO] Arquivo não encontrado: ${filename}`);
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
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
    console.log(`[AVISO] Cabeçalho não encontrado em: ${filename}`);
    return null;
  }

  const cartaoIncluidos = {
    porFornecedor: {},
    total: 0,
    valor: 0,
    registros: []
  };

  const outros = {
    despesas: 0,
    receitas: 0,
    valorDespesas: 0,
    valorReceitas: 0
  };

  // Processar registros
  let currentRecord = null;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split(';');

    // Se começa com data válida, é um novo registro
    if (parts[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0].trim())) {
      // Processar registro anterior
      if (currentRecord && currentRecord.valor > 0) {
        const clienteUpper = (currentRecord.cliente || '').toUpperCase();
        const isCartao = fornecedoresCartao.some(fc => clienteUpper.includes(fc));

        if (isCartao && currentRecord.tipo === 'PAGAR') {
          const fornecedor = fornecedoresCartao.find(fc => clienteUpper.includes(fc)) || currentRecord.cliente;
          cartaoIncluidos.porFornecedor[fornecedor] = cartaoIncluidos.porFornecedor[fornecedor] || { count: 0, valor: 0 };
          cartaoIncluidos.porFornecedor[fornecedor].count++;
          cartaoIncluidos.porFornecedor[fornecedor].valor += currentRecord.valor;
          cartaoIncluidos.total++;
          cartaoIncluidos.valor += currentRecord.valor;
          cartaoIncluidos.registros.push({
            data: currentRecord.data,
            fornecedor: currentRecord.cliente,
            descricao: (currentRecord.descricao || '').substring(0, 60),
            valor: currentRecord.valor
          });
        } else if (currentRecord.tipo === 'PAGAR') {
          outros.despesas++;
          outros.valorDespesas += currentRecord.valor;
        } else if (currentRecord.tipo === 'RECEBER') {
          outros.receitas++;
          outros.valorReceitas += currentRecord.valor;
        }
      }

      // Novo registro
      currentRecord = {
        data: parts[0].trim(),
        tipo: parts[2]?.trim(),
        cliente: parts[3]?.trim() || '',
        descricao: (parts[4] || '').replace(/^"/, '').replace(/"$/, ''),
        valor: parseValue(parts[5])
      };
    }
  }

  // Processar último registro
  if (currentRecord && currentRecord.valor > 0) {
    const clienteUpper = (currentRecord.cliente || '').toUpperCase();
    const isCartao = fornecedoresCartao.some(fc => clienteUpper.includes(fc));

    if (isCartao && currentRecord.tipo === 'PAGAR') {
      const fornecedor = fornecedoresCartao.find(fc => clienteUpper.includes(fc)) || currentRecord.cliente;
      cartaoIncluidos.porFornecedor[fornecedor] = cartaoIncluidos.porFornecedor[fornecedor] || { count: 0, valor: 0 };
      cartaoIncluidos.porFornecedor[fornecedor].count++;
      cartaoIncluidos.porFornecedor[fornecedor].valor += currentRecord.valor;
      cartaoIncluidos.total++;
      cartaoIncluidos.valor += currentRecord.valor;
    } else if (currentRecord.tipo === 'PAGAR') {
      outros.despesas++;
      outros.valorDespesas += currentRecord.valor;
    } else if (currentRecord.tipo === 'RECEBER') {
      outros.receitas++;
      outros.valorReceitas += currentRecord.valor;
    }
  }

  return { filename, cartaoIncluidos, outros };
}

// Analisar arquivos de formato simplificado
const arquivos = [
  'migracao-financeiro04.06-utf8.csv',
  'migracao-financeiro01a03.25-utf8.csv'
];

console.log('='.repeat(80));
console.log('ANÁLISE DE REGISTROS DE CARTÃO INCLUÍDOS NA MIGRAÇÃO');
console.log('(Arquivos de formato simplificado - SEM filtro de cartão)');
console.log('='.repeat(80));

const resultados = [];

for (const arquivo of arquivos) {
  const resultado = analisarArquivoSimplificado(arquivo);
  if (resultado) {
    resultados.push(resultado);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`ARQUIVO: ${arquivo}`);
    console.log(`${'─'.repeat(80)}`);

    console.log(`\nREGISTROS DE CARTÃO DE CRÉDITO INCLUÍDOS (deveriam ter sido excluídos?):`);
    console.log(`  Total: ${resultado.cartaoIncluidos.total} registros (R$ ${resultado.cartaoIncluidos.valor.toFixed(2)})`);

    if (Object.keys(resultado.cartaoIncluidos.porFornecedor).length > 0) {
      console.log(`\n  Por Fornecedor:`);
      for (const [forn, dados] of Object.entries(resultado.cartaoIncluidos.porFornecedor).sort((a, b) => b[1].valor - a[1].valor)) {
        console.log(`    - ${forn}: ${dados.count} registros (R$ ${dados.valor.toFixed(2)})`);
      }
    }

    console.log(`\nOUTROS REGISTROS (incluídos normalmente):`);
    console.log(`  Despesas: ${resultado.outros.despesas} (R$ ${resultado.outros.valorDespesas.toFixed(2)})`);
    console.log(`  Receitas: ${resultado.outros.receitas} (R$ ${resultado.outros.valorReceitas.toFixed(2)})`);

    if (resultado.cartaoIncluidos.registros.length > 0) {
      console.log(`\n  Alguns registros de cartão incluídos:`);
      resultado.cartaoIncluidos.registros.slice(0, 5).forEach(r => {
        console.log(`    ${r.data} | ${r.fornecedor} | R$ ${r.valor.toFixed(2)} | ${r.descricao}`);
      });
      if (resultado.cartaoIncluidos.registros.length > 5) {
        console.log(`    ... e mais ${resultado.cartaoIncluidos.registros.length - 5} registros`);
      }
    }
  }
}

// Resumo geral
console.log(`\n${'='.repeat(80)}`);
console.log('RESUMO GERAL - CARTÕES INCLUÍDOS NOS ARQUIVOS SIMPLIFICADOS');
console.log(`${'='.repeat(80)}`);

let totalCartao = 0;
let valorCartao = 0;
const todosFornecedores = {};

for (const r of resultados) {
  totalCartao += r.cartaoIncluidos.total;
  valorCartao += r.cartaoIncluidos.valor;

  for (const [forn, dados] of Object.entries(r.cartaoIncluidos.porFornecedor)) {
    todosFornecedores[forn] = todosFornecedores[forn] || { count: 0, valor: 0 };
    todosFornecedores[forn].count += dados.count;
    todosFornecedores[forn].valor += dados.valor;
  }
}

console.log(`\nTotal de registros de cartão INCLUÍDOS: ${totalCartao}`);
console.log(`Valor total de cartão INCLUÍDO: R$ ${valorCartao.toFixed(2)}`);

if (Object.keys(todosFornecedores).length > 0) {
  console.log(`\nPor Fornecedor:`);
  for (const [forn, dados] of Object.entries(todosFornecedores).sort((a, b) => b[1].valor - a[1].valor)) {
    console.log(`  - ${forn}: ${dados.count} registros (R$ ${dados.valor.toFixed(2)})`);
  }
}

// Salvar
const output = { resultados, resumo: { totalCartao, valorCartao, porFornecedor: todosFornecedores } };
fs.writeFileSync(path.join(__dirname, 'analise-cartoes-incluidos.json'), JSON.stringify(output, null, 2));
console.log(`\n\nResultado salvo em: analise-cartoes-incluidos.json`);
