/**
 * Script para gerar SQL de migração da agenda
 * Processa o CSV e gera statements SQL para inserção
 */

const fs = require('fs');
const path = require('path');

// Carregar mapeamentos
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'migracao-agenda-mapping.json'), 'utf8'));

// Ler CSV com encoding UTF-8
const csvContent = fs.readFileSync(path.join(__dirname, 'migracao-agenda-utf8.csv'), 'utf8');

const escritorioId = mapping.escritorio_id;
const responsaveisMatch = mapping.responsaveis_match;
const clientesMatch = mapping.clientes_match;
const tipoTarefaMap = mapping.mapeamento_tipo_tarefa;
const processosCnj = mapping.processos_cnj;

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
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim())) {
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

  if (currentRow.length > 0 || currentField) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Funções auxiliares

// Converter CAPSLOCK para Title Case
function toTitleCase(str) {
  if (!str) return str;

  // Lista de palavras que devem ficar em minúsculas (exceto no início)
  const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'ou', 'a', 'o', 'as', 'os'];

  // Lista de siglas/abreviações que devem ficar em maiúsculas
  const siglas = ['ltda', 'me', 'epp', 'eireli', 's/a', 'sa', 'cnj', 'tjsp', 'trt', 'stj', 'stf'];

  // Se não tem maiúsculas excessivas (menos de 60% maiúsculas), retorna como está
  const totalLetras = str.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
  const maiusculas = str.replace(/[^A-ZÀ-Ÿ]/g, '').length;
  if (totalLetras > 0 && maiusculas / totalLetras < 0.6) {
    return str;
  }

  return str
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      if (!palavra) return palavra;

      // Siglas ficam em maiúsculas
      if (siglas.includes(palavra.toLowerCase())) {
        return palavra.toUpperCase();
      }

      // Palavras de ligação ficam em minúsculas (exceto no início)
      if (index > 0 && minusculas.includes(palavra.toLowerCase())) {
        return palavra.toLowerCase();
      }

      // Capitalizar primeira letra
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}

// Corrigir caracteres problemáticos
function fixCharacters(str) {
  if (!str) return str;
  return str
    .replace(/^ngela\s/i, 'Ângela ')  // Fix "ngela" -> "Ângela"
    .replace(/\s+/g, ' ')              // Múltiplos espaços -> um espaço
    .replace(/\n{2,}/g, '\n')          // Múltiplas quebras -> uma quebra
    .trim();
}

function sanitizeString(str) {
  if (!str) return null;
  let cleaned = str.trim();
  cleaned = fixCharacters(cleaned);
  cleaned = toTitleCase(cleaned);
  return cleaned.replace(/'/g, "''").replace(/\n/g, ' ').replace(/\r/g, '');
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Format: DD/MM/YYYY
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  if (parseInt(year) < 1900 || parseInt(year) > 2100) return null;
  return `${year}-${month}-${day}`;
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{2}):(\d{2})/);
  if (!match) return null;
  return `${match[1]}:${match[2]}:00`;
}

function extractDataConclusao(datas) {
  if (!datas) return { data: null, horario: null };
  const dataMatch = datas.match(/Para conclusão: (\d{2}\/\d{2}\/\d{4})/);
  const horarioMatch = datas.match(/Para conclusão: \d{2}\/\d{2}\/\d{4} \((\d{2}:\d{2})/);
  return {
    data: dataMatch ? parseDate(dataMatch[1]) : null,
    horario: horarioMatch ? parseTime(horarioMatch[1]) : null
  };
}

function extractDataLimite(datas) {
  if (!datas) return null;
  const match = datas.match(/Limite: (\d{2}\/\d{2}\/\d{4})/);
  return match ? parseDate(match[1]) : null;
}

function extractNumeroCnj(numProcesso) {
  if (!numProcesso) return null;
  const match = numProcesso.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  return match ? match[1] : null;
}

function extractResponsavel(envolvidos) {
  if (!envolvidos) return null;
  const match = envolvidos.match(/Responsável\(eis\): ([^\n]+)/);
  if (!match) return null;
  const nomes = match[1].split(/[,\n]/).map(n => n.trim()).filter(Boolean);
  if (nomes.length === 0) return null;

  // Tentar encontrar o primeiro responsável que temos mapeado
  for (const nome of nomes) {
    if (responsaveisMatch[nome]) {
      return responsaveisMatch[nome];
    }
  }
  return null;
}

function mapTipoTarefa(tipoOriginal) {
  if (!tipoOriginal) return 'outro';

  // Limpar o tipo (remover quebras de linha extras)
  const tipoClean = tipoOriginal.trim();

  // Busca exata primeiro
  if (tipoTarefaMap[tipoClean]) {
    return tipoTarefaMap[tipoClean];
  }

  // Busca parcial
  const tipoLower = tipoClean.toLowerCase();
  if (tipoLower.includes('prazo') || tipoLower.includes('julgamento') || tipoLower.includes('publicação')) {
    return 'prazo_processual';
  }
  if (tipoLower.includes('acompanhamento') || tipoLower.includes('acordo') || tipoLower.includes('parcelamento')) {
    return 'acompanhamento';
  }
  if (tipoLower.includes('follow') || tipoLower.includes('f-up')) {
    return 'follow_up';
  }
  if (tipoLower.includes('providência') || tipoLower.includes('administrativ') || tipoLower.includes('apontamento')) {
    return 'administrativo';
  }
  if (tipoLower.includes('audiência') || tipoLower.includes('audiencia')) {
    return 'audiencia'; // Será tratado separadamente
  }

  return 'outro';
}

function isAudiencia(tipoOriginal) {
  if (!tipoOriginal) return false;
  const tipoLower = tipoOriginal.toLowerCase();
  return tipoLower.includes('audiência') || tipoLower.includes('audiencia');
}

// Parse CSV
const rows = parseCSV(csvContent);

// Processar dados (a partir da linha 3, índice 2)
const tarefas = [];
const audiencias = [];
const erros = [];

for (let i = 2; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 10) continue;

  const ci = row[1]?.trim();
  if (!ci || isNaN(parseInt(ci))) continue;

  const tipoOriginal = row[4]?.trim();
  const cliente = row[9]?.trim();
  const numProcessoRaw = row[5]?.trim();
  const numeroCnj = extractNumeroCnj(numProcessoRaw);
  const { data: dataConclusao, horario } = extractDataConclusao(row[3]);
  const dataLimite = extractDataLimite(row[3]);
  const responsavelId = extractResponsavel(row[11]);
  const descricao = row[12]?.trim();

  // Buscar cliente_id
  let clienteId = null;
  if (cliente) {
    clienteId = clientesMatch[cliente];
    if (!clienteId) {
      // Busca case-insensitive
      const clienteKey = Object.keys(clientesMatch).find(k =>
        k.toLowerCase() === cliente.toLowerCase()
      );
      if (clienteKey) clienteId = clientesMatch[clienteKey];
    }
  }

  // Buscar processo_id
  let processoId = null;
  if (numeroCnj) {
    processoId = processosCnj[numeroCnj];
  }

  if (isAudiencia(tipoOriginal)) {
    // É uma audiência - precisa de processo_id
    if (!processoId) {
      erros.push({
        linha: i + 1,
        ci,
        tipo: 'audiencia',
        erro: 'Audiência sem processo vinculado',
        cliente,
        processo: numeroCnj
      });
      continue;
    }

    audiencias.push({
      ci,
      escritorio_id: escritorioId,
      processo_id: processoId,
      titulo: sanitizeString(descricao?.substring(0, 200)) || 'Audiência migrada',
      data_hora: dataConclusao && horario
        ? `${dataConclusao} ${horario}`
        : (dataConclusao ? `${dataConclusao} 09:00:00` : null),
      tipo_audiencia: 'outra',
      modalidade: tipoOriginal?.toLowerCase().includes('tele') ? 'virtual' : 'presencial',
      tribunal: sanitizeString(row[7])?.substring(0, 100),
      responsavel_id: responsavelId,
      observacoes: sanitizeString(descricao)
    });
  } else {
    // É uma tarefa normal
    const tipo = mapTipoTarefa(tipoOriginal);

    if (!dataConclusao) {
      erros.push({
        linha: i + 1,
        ci,
        tipo: 'tarefa',
        erro: 'Tarefa sem data de conclusão',
        cliente,
        processo: numeroCnj
      });
      continue;
    }

    tarefas.push({
      ci,
      escritorio_id: escritorioId,
      titulo: sanitizeString(descricao?.substring(0, 200)) || 'Tarefa migrada',
      descricao: sanitizeString(descricao),
      tipo,
      prioridade: 'media',
      status: 'pendente',
      data_inicio: dataConclusao,
      data_fim: dataLimite || dataConclusao,
      prazo_data_limite: dataLimite || dataConclusao,
      responsavel_id: responsavelId,
      processo_id: processoId,
      horario_planejado_dia: horario
    });
  }
}

// Gerar SQL
let sql = `-- Migração de Agenda
-- Total Tarefas: ${tarefas.length}
-- Total Audiências: ${audiencias.length}
-- Erros: ${erros.length} registros não migrados
-- Gerado em: ${new Date().toISOString()}

-- =====================================================
-- REGISTROS COM ERRO (não migrados)
-- =====================================================
`;

erros.forEach(e => {
  sql += `-- CI ${e.ci}: ${e.tipo} - ${e.erro} | Cliente: ${e.cliente || 'N/A'} | Processo: ${e.processo || 'N/A'}\n`;
});

// SQL para tarefas
sql += `
-- =====================================================
-- INSERIR TAREFAS (${tarefas.length})
-- =====================================================

`;

const batchSize = 20;
for (let i = 0; i < tarefas.length; i += batchSize) {
  const batch = tarefas.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;

  sql += `-- LOTE ${batchNum} (tarefas ${i + 1} a ${Math.min(i + batchSize, tarefas.length)})\n`;
  sql += `INSERT INTO agenda_tarefas
  (escritorio_id, titulo, descricao, tipo, prioridade, status, data_inicio, data_fim, prazo_data_limite, responsavel_id, processo_id, horario_planejado_dia)
VALUES\n`;

  const values = batch.map(t => {
    const descricaoVal = t.descricao ? `'${t.descricao.substring(0, 500)}'` : 'NULL';
    const responsavelVal = t.responsavel_id ? `'${t.responsavel_id}'` : 'NULL';
    const processoVal = t.processo_id ? `'${t.processo_id}'` : 'NULL';
    const horarioVal = t.horario_planejado_dia ? `'${t.horario_planejado_dia}'` : 'NULL';

    return `  ('${t.escritorio_id}', '${t.titulo}', ${descricaoVal}, '${t.tipo}', '${t.prioridade}', '${t.status}', '${t.data_inicio}', '${t.data_fim}', '${t.prazo_data_limite}', ${responsavelVal}, ${processoVal}, ${horarioVal})`;
  });

  sql += values.join(',\n') + ';\n\n';
}

// SQL para audiências
if (audiencias.length > 0) {
  sql += `
-- =====================================================
-- INSERIR AUDIÊNCIAS (${audiencias.length})
-- =====================================================

`;

  for (let i = 0; i < audiencias.length; i += batchSize) {
    const batch = audiencias.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    sql += `-- LOTE ${batchNum} (audiências ${i + 1} a ${Math.min(i + batchSize, audiencias.length)})\n`;
    sql += `INSERT INTO agenda_audiencias
  (escritorio_id, processo_id, titulo, data_hora, tipo_audiencia, modalidade, tribunal, responsavel_id, observacoes)
VALUES\n`;

    const values = batch.map(a => {
      const tribunalVal = a.tribunal ? `'${a.tribunal}'` : 'NULL';
      const responsavelVal = a.responsavel_id ? `'${a.responsavel_id}'` : 'NULL';
      const observacoesVal = a.observacoes ? `'${a.observacoes.substring(0, 500)}'` : 'NULL';

      return `  ('${a.escritorio_id}', '${a.processo_id}', '${a.titulo}', '${a.data_hora}', '${a.tipo_audiencia}', '${a.modalidade}', ${tribunalVal}, ${responsavelVal}, ${observacoesVal})`;
    });

    sql += values.join(',\n') + ';\n\n';
  }
}

// Salvar SQL
fs.writeFileSync(path.join(__dirname, 'migracao-agenda.sql'), sql);

// Resumo JSON
const resumo = {
  total_csv: rows.length - 2,
  total_tarefas: tarefas.length,
  total_audiencias: audiencias.length,
  total_erros: erros.length,
  erros: erros
};
fs.writeFileSync(
  path.join(__dirname, 'migracao-agenda-resumo.json'),
  JSON.stringify(resumo, null, 2)
);

console.log('=== RESUMO DA MIGRAÇÃO ===');
console.log(`Total no CSV: ${resumo.total_csv}`);
console.log(`Tarefas prontas: ${resumo.total_tarefas}`);
console.log(`Audiências prontas: ${resumo.total_audiencias}`);
console.log(`Com erros (não migrar): ${resumo.total_erros}`);
console.log('\nArquivos gerados:');
console.log('- migracao-agenda.sql');
console.log('- migracao-agenda-resumo.json');
if (erros.length > 0) {
  console.log('\nRegistros com erro:');
  erros.forEach(e => console.log(`  - CI ${e.ci}: ${e.erro}`));
}
