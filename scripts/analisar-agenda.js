/**
 * Script para analisar o CSV de agenda do sistema antigo
 * Identifica estrutura, tipos de tarefa, clientes e processos
 */

const fs = require('fs');
const path = require('path');

// Ler CSV com encoding UTF-8
const csvContent = fs.readFileSync(path.join(__dirname, 'migracao-agenda-utf8.csv'), 'utf8');

// Função para fazer parse de CSV com campos multiline
function parseCSV(content, delimiter = ';') {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim())) { // Skip empty rows
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (char === '\r') {
      // Skip carriage return
    } else {
      currentField += char;
    }
  }

  // Add last row
  if (currentRow.length > 0 || currentField) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Parse CSV
const rows = parseCSV(csvContent);
console.log(`Total de linhas parseadas: ${rows.length}`);

// Headers na linha 2 (índice 1)
const headers = rows[1];
console.log('\n=== COLUNAS DO CSV ===');
headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

// Processar dados (a partir da linha 3, índice 2)
const tarefas = [];
const tiposTarefa = new Map();
const clientesUnicos = new Set();
const processosUnicos = new Set();
const responsaveisUnicos = new Set();

for (let i = 2; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 10) continue; // Linha incompleta

  const ci = row[1]?.trim();
  if (!ci || isNaN(parseInt(ci))) continue; // Não é um registro válido

  const tarefa = {
    ci: ci,
    solicitacoes: row[2]?.trim(),
    datas: row[3]?.trim(),
    tipoTarefa: row[4]?.trim(),
    numProcesso: row[5]?.trim(),
    objeto: row[6]?.trim(),
    orgao: row[7]?.trim(),
    grupoCliente: row[8]?.trim(),
    cliente: row[9]?.trim(),
    partes: row[10]?.trim(),
    envolvidos: row[11]?.trim(),
    descricao: row[12]?.trim(),
    comentarios: row[13]?.trim()
  };

  tarefas.push(tarefa);

  // Contabilizar tipos
  const tipo = tarefa.tipoTarefa || '(vazio)';
  tiposTarefa.set(tipo, (tiposTarefa.get(tipo) || 0) + 1);

  // Clientes únicos
  if (tarefa.cliente) {
    clientesUnicos.add(tarefa.cliente);
  }

  // Extrair número de processo CNJ
  if (tarefa.numProcesso) {
    const cnj = tarefa.numProcesso.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
    if (cnj) processosUnicos.add(cnj[0]);
  }

  // Extrair responsáveis
  if (tarefa.envolvidos) {
    const matches = tarefa.envolvidos.match(/Responsável\(eis\): ([^\n]+)/);
    if (matches) {
      matches[1].split(/[,\n]/).forEach(r => {
        const nome = r.trim();
        if (nome) responsaveisUnicos.add(nome);
      });
    }
  }
}

console.log(`\n=== RESUMO ===`);
console.log(`Total de tarefas: ${tarefas.length}`);

console.log(`\n=== TIPOS DE TAREFA ===`);
const tiposOrdenados = [...tiposTarefa.entries()].sort((a, b) => b[1] - a[1]);
tiposOrdenados.forEach(([tipo, qtd]) => {
  console.log(`  ${tipo}: ${qtd}`);
});

console.log(`\n=== CLIENTES ÚNICOS (${clientesUnicos.size}) ===`);
[...clientesUnicos].sort().forEach(c => console.log(`  - ${c}`));

console.log(`\n=== PROCESSOS CNJ (${processosUnicos.size}) ===`);
[...processosUnicos].sort().slice(0, 20).forEach(p => console.log(`  - ${p}`));
if (processosUnicos.size > 20) console.log(`  ... e mais ${processosUnicos.size - 20}`);

console.log(`\n=== RESPONSÁVEIS (${responsaveisUnicos.size}) ===`);
[...responsaveisUnicos].sort().forEach(r => console.log(`  - ${r}`));

// Extrair datas para análise
console.log(`\n=== ANÁLISE DE DATAS ===`);
let comDataConclusao = 0;
let comDataLimite = 0;
let comHorario = 0;
tarefas.slice(0, 5).forEach(t => {
  console.log(`\nCI ${t.ci}:`);
  console.log(`  Datas raw: ${t.datas?.substring(0, 100)}`);

  // Extrair data de conclusão
  const conclusaoMatch = t.datas?.match(/Para conclusão: (\d{2}\/\d{2}\/\d{4})/);
  if (conclusaoMatch) {
    console.log(`  Data conclusão: ${conclusaoMatch[1]}`);
    comDataConclusao++;
  }

  // Extrair horário se existir
  const horarioMatch = t.datas?.match(/Para conclusão: \d{2}\/\d{2}\/\d{4} \((\d{2}:\d{2})/);
  if (horarioMatch) {
    console.log(`  Horário: ${horarioMatch[1]}`);
    comHorario++;
  }

  // Extrair data limite
  const limiteMatch = t.datas?.match(/Limite: (\d{2}\/\d{2}\/\d{4})/);
  if (limiteMatch) {
    console.log(`  Data limite: ${limiteMatch[1]}`);
    comDataLimite++;
  }
});

// Salvar análise em JSON
const analise = {
  total_tarefas: tarefas.length,
  tipos_tarefa: Object.fromEntries(tiposOrdenados),
  clientes: [...clientesUnicos].sort(),
  processos_cnj: [...processosUnicos].sort(),
  responsaveis: [...responsaveisUnicos].sort(),
  amostra: tarefas.slice(0, 10)
};

fs.writeFileSync(
  path.join(__dirname, 'migracao-agenda-analise.json'),
  JSON.stringify(analise, null, 2)
);

console.log('\n=== ARQUIVO GERADO ===');
console.log('migracao-agenda-analise.json');
