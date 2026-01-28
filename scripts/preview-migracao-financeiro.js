const fs = require('fs');

// Ler CSV com encoding Latin1
const csvContent = fs.readFileSync('./scripts/migracao-financeiro01a03.csv', 'latin1');

// Parser robusto para lidar com campos multi-linha
function parseCSVRobust(content) {
  const lines = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

// Contratos existentes (copiado da query)
const contratos = [
  // YOFC
  { numero: "CONT-2026-0001", titulo: "YOFC - A2M e Outros" },
  { numero: "CONT-2026-0049", titulo: "YOFC - LGPD" },
  { numero: "CONT-2026-0063", titulo: "YOFC - Relatório de Viabilidade" },
  { numero: "CONT-2026-0064", titulo: "YOFC - Tec WI" },
  { numero: "CONT-2026-0065", titulo: "YOFC - Cobrança Geral" },
  { numero: "CONT-2026-0068", titulo: "YOFC - Compliance" },
  { numero: "CONT-2026-0069", titulo: "YOFC - Comitê" },
  { numero: "CONT-2026-0070", titulo: "YOFC - Treinamento" },
  { numero: "CONT-2026-0088", titulo: "YOFC - Jaçanã e Líder" },
  // Belcorp
  { numero: "CONT-2026-0023", titulo: "Belcorp - Bandeira" },
  { numero: "CONT-2026-0051", titulo: "Belcorp - Tributário" },
  { numero: "CONT-2026-0052", titulo: "Belcorp - Corporativo" },
  { numero: "CONT-2026-0053", titulo: "Belcorp - Pastas Civel Trabalhista" },
  { numero: "CONT-2026-0100", titulo: "Time Sheet para Horas em Atendimentos Tributários" },
  { numero: "CONT-2026-0101", titulo: "Horas Trabalhadas no Regime de Time Sheet para o Corporativo" },
  // Prohabitat
  { numero: "CONT-2026-0025", titulo: "Prohabitat - Tributário Contencioso" },
  { numero: "CONT-2026-0027", titulo: "Prohabitat - Partido" },
  { numero: "CONT-2026-0113", titulo: "Negociação de M&A" },
  // Inova
  { numero: "CONT-2026-0055", titulo: "Inova Time Sheet" },
  { numero: "CONT-2026-0066", titulo: "Inova - Contencioso Cível" },
  { numero: "CONT-2026-0094", titulo: "Inova - Trabalhista 2025" },
  // ZAIT
  { numero: "CONT-2026-0056", titulo: "ZAIT - Trabalhista" },
  { numero: "CONT-2026-0103", titulo: "ZAIT - Time Sheet" },
  // Outros Time Sheets
  { numero: "CONT-2026-0017", titulo: "Forfuturing - Time Sheet" },
  { numero: "CONT-2026-0009", titulo: "Marco Vitiello - Time Sheet" },
  { numero: "CONT-2026-0059", titulo: "Dádiva - Time Sheet" },
  { numero: "CONT-2026-0067", titulo: "Le Bife - Time Sheet" },
  { numero: "CONT-2026-0074", titulo: "Armazens Vila Carioca - Time Sheet" },
  { numero: "CONT-2026-0075", titulo: "Bamboo - Time Sheet" },
  { numero: "CONT-2026-0077", titulo: "Radio Cidade - Time Sheet" },
];

// Mapeamento de categorias do CSV para ENUMs do sistema
// ENUMs válidos: 'custas', 'cartorio', 'oficial_justica', 'correios', 'copia', 'publicacao',
//   'certidao', 'protesto', 'honorarios_perito', 'fornecedor', 'material', 'tecnologia',
//   'assinatura', 'aluguel', 'telefonia', 'folha', 'prolabore', 'retirada_socios',
//   'beneficios', 'impostos', 'taxas_bancarias', 'combustivel', 'deslocamento',
//   'estacionamento', 'hospedagem', 'viagem', 'alimentacao', 'marketing', 'capacitacao',
//   'associacoes', 'emprestimos', 'juros', 'cartao_credito', 'comissao', 'outra', 'outros'
const mapeamentoCategoria = {
  // Categorias reais do CSV VIOS -> ENUMs válidos
  'OAB e Associações': 'associacoes',
  'Informática - Softwares': 'tecnologia',
  'Combustível': 'combustivel',
  'Materiais de escritório': 'material',
  'Alimentação': 'alimentacao',
  'Cartão de Crédito': 'cartao_credito',
  'IOF': 'impostos',
  'Tarifas e custos bancários': 'taxas_bancarias',
  'Retirada dos sócios': 'retirada_socios',
  'Pró-labore': 'prolabore',
  'Seguro Saúde': 'beneficios',
  'Pagamento de juros': 'juros',
  'Estacionamento': 'estacionamento',
  'Estadia': 'hospedagem',
  'Prestadores de Serviço': 'fornecedor',
  'ISS': 'impostos',
  'Pagamento de empréstimos': 'emprestimos',
  'Aluguel': 'aluguel',
  'Telefonia': 'telefonia',
  'Simples Nacional': 'impostos',
  'Outros tributos e taxas': 'impostos',
  'INSS': 'impostos',
  'Custas e depesas': 'custas',
  // Fallbacks
  'Sem categoria': 'outros'
};

// Mapeamento de formas de pagamento para ENUMs do sistema
// ENUMs válidos: 'dinheiro', 'pix', 'ted', 'boleto', 'cartao_credito', 'cartao_debito', 'cheque', 'deposito'
const mapeamentoFormaPagamento = {
  'Boleto': 'boleto',
  'Crédito': 'cartao_credito',
  'Débito': 'cartao_debito',
  'PIX': 'pix',
  'Transferência': 'ted',
  'Cartão de crédito': 'cartao_credito',
  'Dinheiro': 'dinheiro',
  'Cheque': 'cheque',
  'Depósito': 'deposito',
  'TED': 'ted',
  'DOC': 'ted'
};

const lines = parseCSVRobust(csvContent);
console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║         PREVIEW DA MIGRAÇÃO FINANCEIRA - JAN a MAR 2026                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

// Índices das colunas
const idxTipo = 7;        // PAGAR/RECEBER
const idxForma = 8;       // Forma de pagamento
const idxCliente = 12;    // Cliente/Fornecedor
const idxDescricao = 13;  // Descrição
const idxValor = 14;      // Valor
const idxValorPago = 19;  // Valor Pago
const idxDataBaixa = 20;  // Data Baixa
const idxContrato = 23;   // Contrato
const idxPlanoContas = 24; // Plano de Contas
const idxDataVenc = 3;    // Data Vencimento
const idxCompetencia = 6; // Competência

// Arrays para armazenar os registros processados
const despesas = [];
const receitas = [];
const despesasCartao = [];

// Função para encontrar contrato por título
function encontrarContrato(titulo) {
  if (!titulo || titulo === 'Não' || titulo.trim() === '') return null;

  const tituloLower = titulo.toLowerCase().trim();

  // Extrair palavras-chave do título do CSV
  // Formato comum: "8 Inova - Time Sheet - INOVA TIME SHEET" ou "250 - PROHABITAT - PARTIDO"
  const palavrasChave = tituloLower
    .replace(/^\d+\s*-?\s*/, '') // Remove números iniciais
    .split(/[-\s]+/)
    .filter(p => p.length > 2 && !['time', 'sheet', 'the', 'and', 'para', 'com', 'de', 'do', 'da'].includes(p));

  for (const contrato of contratos) {
    if (!contrato.titulo) continue;
    const contratoTituloLower = contrato.titulo.toLowerCase();

    // Match exato
    if (contratoTituloLower === tituloLower) return contrato;

    // Match por palavras-chave principais
    const mainKeywords = ['yofc', 'belcorp', 'inova', 'zait', 'prohabitat', 'bamboo', 'dádiva', 'dadiva', 'forfuturing'];

    for (const keyword of mainKeywords) {
      if (tituloLower.includes(keyword) && contratoTituloLower.includes(keyword)) {
        // Verificar se também corresponde ao tipo (time sheet, corporativo, etc)
        if (tituloLower.includes('time sheet') && contratoTituloLower.includes('time sheet')) return contrato;
        if (tituloLower.includes('corporativo') && contratoTituloLower.includes('corporativo')) return contrato;
        if (tituloLower.includes('tributário') && contratoTituloLower.includes('tributário')) return contrato;
        if (tituloLower.includes('partido') && contratoTituloLower.includes('partido')) return contrato;
        if (tituloLower.includes('m&a') && contratoTituloLower.includes('m&a')) return contrato;
        if (tituloLower.includes('compliance') && contratoTituloLower.includes('compliance')) return contrato;
        if (tituloLower.includes('cobrança') && contratoTituloLower.includes('cobrança')) return contrato;

        // Se só tem o nome principal, retorna o primeiro contrato desse cliente
        if (!tituloLower.includes('time sheet') && !tituloLower.includes('corporativo') &&
            !tituloLower.includes('tributário') && !tituloLower.includes('partido')) {
          return contrato;
        }
      }
    }

    // Match parcial genérico
    if (contratoTituloLower.includes(tituloLower) || tituloLower.includes(contratoTituloLower)) {
      return contrato;
    }
  }
  return null;
}

// Função para formatar data DD/MM/YYYY para YYYY-MM-DD
function formatarData(dataStr) {
  if (!dataStr || !dataStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return null;
  const [dia, mes, ano] = dataStr.split('/');
  return `${ano}-${mes}-${dia}`;
}

// Função para determinar status
function determinarStatus(dataBaixa, valorPago) {
  if (dataBaixa && dataBaixa.trim() !== '') return 'pago';
  return 'pendente';
}

for (let i = 2; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (!cols[0] || cols[0].trim() === '' || cols[0].includes('Vios')) continue;

  const tipo = cols[idxTipo]?.trim();
  const forma = cols[idxForma]?.trim();
  const cliente = cols[idxCliente]?.trim();
  let descricao = cols[idxDescricao]?.trim();
  if (descricao) descricao = descricao.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 200);

  const valorStr = cols[idxValor]?.replace('.', '').replace(',', '.').trim();
  const valor = Math.abs(parseFloat(valorStr) || 0);
  const planoContas = cols[idxPlanoContas]?.trim() || 'Sem categoria';
  const contrato = cols[idxContrato]?.trim();
  const dataVenc = cols[idxDataVenc]?.trim();
  const dataBaixa = cols[idxDataBaixa]?.trim();
  const valorPagoStr = cols[idxValorPago]?.replace('.', '').replace(',', '.').trim();
  const valorPago = Math.abs(parseFloat(valorPagoStr) || 0);

  if (!tipo || (tipo !== 'PAGAR' && tipo !== 'RECEBER')) continue;

  const categoria = mapeamentoCategoria[planoContas] || 'outros';
  // Fallback para 'boleto' que é o mais comum quando não especificado
  const formaPagamento = mapeamentoFormaPagamento[forma] || 'boleto';
  const status = determinarStatus(dataBaixa, valorPago);

  if (tipo === 'PAGAR') {
    const registro = {
      tipo: 'DESPESA',
      categoria,
      categoriaOriginal: planoContas,
      descricao: descricao || 'Despesa importada',
      valor,
      data_vencimento: formatarData(dataVenc),
      data_pagamento: status === 'pago' ? formatarData(dataBaixa) : null,
      status,
      forma_pagamento: formaPagamento,
      fornecedor: cliente || 'Não informado',
      formaOriginal: forma
    };

    // Separar cartão de crédito
    if (forma === 'Cartão de crédito') {
      despesasCartao.push(registro);
    } else {
      despesas.push(registro);
    }

  } else if (tipo === 'RECEBER') {
    const contratoEncontrado = encontrarContrato(contrato);

    receitas.push({
      tipo: 'RECEITA',
      categoria: 'honorarios',
      descricao: descricao || contrato || 'Receita importada',
      valor,
      valorPago,
      data_vencimento: formatarData(dataVenc),
      data_pagamento: status === 'pago' ? formatarData(dataBaixa) : null,
      status,
      forma_pagamento: formaPagamento,
      cliente: cliente || 'Não informado',
      contratoOriginal: contrato,
      contratoVinculado: contratoEncontrado ? contratoEncontrado.numero : null,
      contratoTitulo: contratoEncontrado ? contratoEncontrado.titulo : null,
      formaOriginal: forma
    });
  }
}

// ===========================================
// RESUMO
// ===========================================
console.log('┌──────────────────────────────────────────────────────────────────────────┐');
console.log('│                              RESUMO                                      │');
console.log('└──────────────────────────────────────────────────────────────────────────┘');

const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
const totalDespesasCartao = despesasCartao.reduce((acc, d) => acc + d.valor, 0);
const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);
const receitasVinculadas = receitas.filter(r => r.contratoVinculado).length;

console.log(`
  📊 DESPESAS (exceto cartão): ${despesas.length} registros
     Valor total: R$ ${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}

  💳 DESPESAS CARTÃO (não migrar): ${despesasCartao.length} registros
     Valor total: R$ ${totalDespesasCartao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}

  💰 RECEITAS: ${receitas.length} registros
     Valor total: R$ ${totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
     Com contrato vinculado: ${receitasVinculadas}/${receitas.length}
`);

// ===========================================
// PREVIEW DAS DESPESAS
// ===========================================
console.log('\n┌──────────────────────────────────────────────────────────────────────────┐');
console.log('│                    PREVIEW: DESPESAS (FINANCEIRO_DESPESAS)               │');
console.log('└──────────────────────────────────────────────────────────────────────────┘\n');

// Agrupar por categoria
const despesasPorCategoria = {};
despesas.forEach(d => {
  if (!despesasPorCategoria[d.categoria]) {
    despesasPorCategoria[d.categoria] = [];
  }
  despesasPorCategoria[d.categoria].push(d);
});

Object.entries(despesasPorCategoria)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([categoria, items]) => {
    const total = items.reduce((acc, d) => acc + d.valor, 0);
    console.log(`  📁 ${categoria.toUpperCase()} (${items.length} registros - R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`);

    // Mostrar até 3 exemplos
    items.slice(0, 3).forEach(d => {
      const statusIcon = d.status === 'pago' ? '✅' : '⏳';
      console.log(`      ${statusIcon} ${d.descricao.substring(0, 50)}... | R$ ${d.valor.toFixed(2)} | ${d.fornecedor.substring(0, 20)}`);
    });
    if (items.length > 3) {
      console.log(`      ... e mais ${items.length - 3} registros`);
    }
    console.log('');
  });

// ===========================================
// PREVIEW DAS RECEITAS
// ===========================================
console.log('\n┌──────────────────────────────────────────────────────────────────────────┐');
console.log('│                    PREVIEW: RECEITAS (FINANCEIRO_RECEITAS)               │');
console.log('└──────────────────────────────────────────────────────────────────────────┘\n');

receitas.forEach((r, i) => {
  const statusIcon = r.status === 'pago' ? '✅' : '⏳';
  const vinculoIcon = r.contratoVinculado ? '🔗' : '📄';

  console.log(`  ${i+1}. ${statusIcon} ${vinculoIcon} ${r.cliente.substring(0, 30)}`);
  console.log(`      Descrição: ${r.descricao.substring(0, 60)}...`);
  console.log(`      Valor: R$ ${r.valor.toFixed(2)} | Forma: ${r.formaOriginal}`);
  console.log(`      Vencimento: ${r.data_vencimento || 'N/D'} | Pagamento: ${r.data_pagamento || 'Pendente'}`);

  if (r.contratoVinculado) {
    console.log(`      ✓ Contrato: ${r.contratoVinculado} - ${r.contratoTitulo}`);
  } else {
    console.log(`      ⚠ Contrato no CSV: "${r.contratoOriginal}" (não encontrado - será avulso)`);
  }
  console.log('');
});

// ===========================================
// DESPESAS CARTÃO (NÃO MIGRAR)
// ===========================================
console.log('\n┌──────────────────────────────────────────────────────────────────────────┐');
console.log('│           DESPESAS CARTÃO DE CRÉDITO (NÃO SERÃO MIGRADAS)                │');
console.log('└──────────────────────────────────────────────────────────────────────────┘\n');

despesasCartao.slice(0, 10).forEach((d, i) => {
  console.log(`  ${i+1}. ${d.descricao.substring(0, 50)}... | R$ ${d.valor.toFixed(2)}`);
});
if (despesasCartao.length > 10) {
  console.log(`  ... e mais ${despesasCartao.length - 10} registros de cartão`);
}

// ===========================================
// ESTRUTURA DO REGISTRO (EXEMPLO)
// ===========================================
console.log('\n\n┌──────────────────────────────────────────────────────────────────────────┐');
console.log('│                  EXEMPLO DE REGISTRO (JSON)                              │');
console.log('└──────────────────────────────────────────────────────────────────────────┘\n');

if (despesas.length > 0) {
  console.log('DESPESA:');
  console.log(JSON.stringify({
    escritorio_id: 'f2568999-0ae6-47db-9293-a6f1672ed421',
    categoria: despesas[0].categoria,
    descricao: despesas[0].descricao,
    valor: despesas[0].valor,
    data_vencimento: despesas[0].data_vencimento,
    data_pagamento: despesas[0].data_pagamento,
    status: despesas[0].status,
    forma_pagamento: despesas[0].forma_pagamento,
    fornecedor: despesas[0].fornecedor
  }, null, 2));
}

if (receitas.length > 0) {
  console.log('\nRECEITA:');
  console.log(JSON.stringify({
    escritorio_id: 'f2568999-0ae6-47db-9293-a6f1672ed421',
    tipo: 'honorarios',
    categoria: 'honorarios',
    descricao: receitas[0].descricao,
    valor: receitas[0].valor,
    data_vencimento: receitas[0].data_vencimento,
    data_pagamento: receitas[0].data_pagamento,
    status: receitas[0].status,
    forma_pagamento: receitas[0].forma_pagamento,
    contrato_id: receitas[0].contratoVinculado ? '(UUID do contrato)' : null,
    observacoes: `Importado de: ${receitas[0].contratoOriginal}`
  }, null, 2));
}

// Salvar dados para migração
const dadosMigracao = {
  despesas: despesas,
  receitas: receitas,
  despesasCartaoIgnoradas: despesasCartao.length,
  resumo: {
    totalDespesas: despesas.length,
    valorDespesas: totalDespesas,
    totalReceitas: receitas.length,
    valorReceitas: totalReceitas,
    receitasVinculadas,
    receitasAvulsas: receitas.length - receitasVinculadas
  }
};

fs.writeFileSync('./scripts/dados-migracao-financeiro.json', JSON.stringify(dadosMigracao, null, 2));
console.log('\n\n✅ Dados salvos em: scripts/dados-migracao-financeiro.json');
console.log('   Use este arquivo para executar a migração após aprovação.');
