const fs = require('fs');

// Ler CSV com encoding Latin1
const csv = fs.readFileSync('./scripts/migracao-contratos.csv', 'latin1');
const lines = csv.split('\n');

// Headers na linha 1 (índice 1)
const headers = lines[1].split(';');
console.log('=== HEADERS ===');
headers.forEach((h, i) => console.log(`${i}: ${h}`));

// Índices importantes
const ciIdx = 0;
const pastaIdx = 2;
const objetoIdx = 10;
const clienteIdx = 13;
const statusIdx = 5;

console.log('\n=== ANÁLISE DOS CONTRATOS ===\n');

// Processar dados (a partir da linha 2)
const contratos = [];
for (let i = 2; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (!cols[ciIdx] || cols[ciIdx].trim() === '') continue;

  const ci = cols[ciIdx];
  const pasta = cols[pastaIdx];
  const objeto = cols[objetoIdx];
  const cliente = cols[clienteIdx];
  const status = cols[statusIdx];

  if (status !== 'Ativo') continue;

  contratos.push({ ci, pasta, objeto, cliente });
}

console.log(`Total de contratos ativos: ${contratos.length}\n`);

// Mostrar contratos com Objeto preenchido vs vazio
const comObjeto = contratos.filter(c => c.objeto && c.objeto.trim());
const semObjeto = contratos.filter(c => !c.objeto || !c.objeto.trim());

console.log(`Com Objeto (título): ${comObjeto.length}`);
console.log(`Sem Objeto: ${semObjeto.length}`);

console.log('\n=== AMOSTRA: CONTRATOS COM TÍTULO ===');
comObjeto.slice(0, 20).forEach(c => {
  console.log(`Pasta: "${c.pasta}" → Título: "${c.objeto}"`);
});

console.log('\n=== CONTRATOS SEM TÍTULO ===');
semObjeto.forEach(c => {
  console.log(`Pasta: "${c.pasta}" (${c.cliente})`);
});

// Salvar para análise
fs.writeFileSync('./scripts/contratos-para-titulo.json', JSON.stringify(comObjeto, null, 2));
console.log('\nDados salvos em: scripts/contratos-para-titulo.json');
