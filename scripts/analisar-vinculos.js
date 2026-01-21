const fs = require('fs');
const mapping = JSON.parse(fs.readFileSync('migracao-agenda-mapping.json', 'utf8'));
const sql = fs.readFileSync('migracao-agenda.sql', 'utf8');

// Contar processos mapeados
const processosMapeados = Object.keys(mapping.processos_cnj).length;
const processosComId = Object.values(mapping.processos_cnj).filter(v => v !== null).length;

console.log('=== ANÁLISE DE VÍNCULOS ===');
console.log('CNJs no mapping:', processosMapeados);
console.log('CNJs com ID (existem no sistema):', processosComId);
console.log('CNJs sem ID (não existem):', processosMapeados - processosComId);

// Contar vínculos no SQL - processo_id é a penúltima coluna
// Padrão: ..., responsavel_id, processo_id, horario_planejado_dia)
const regexComProcesso = /', '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', (?:NULL|'[0-9:]+'\))/g;
const regexSemProcesso = /', NULL, (?:NULL|'[0-9:]+'\))/g;

const matchesComProcesso = sql.match(regexComProcesso) || [];
const matchesSemProcesso = sql.match(regexSemProcesso) || [];

console.log('');
console.log('=== NO SQL GERADO (TAREFAS) ===');
console.log('Tarefas COM processo vinculado:', matchesComProcesso.length);
console.log('Tarefas SEM processo:', matchesSemProcesso.length);

// Mostrar quais processos estão sendo vinculados
const processosUsados = new Set();
const regexProcessoId = /processo_id.*?'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'/g;
let match;
while ((match = regexProcessoId.exec(sql)) !== null) {
  processosUsados.add(match[1]);
}

console.log('');
console.log('=== PROCESSOS ÚNICOS VINCULADOS ===');
console.log('Total de processos diferentes usados:', processosUsados.size);

// Mapear IDs para CNJs
const idToCnj = {};
for (const [cnj, id] of Object.entries(mapping.processos_cnj)) {
  if (id) idToCnj[id] = cnj;
}

console.log('');
console.log('Processos vinculados:');
processosUsados.forEach(id => {
  const cnj = idToCnj[id] || '(CNJ não encontrado)';
  console.log('  -', cnj);
});
