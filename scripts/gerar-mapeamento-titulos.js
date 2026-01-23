const fs = require('fs');

// Ler CSV com encoding Latin1
const csv = fs.readFileSync('./scripts/migracao-contratos.csv', 'latin1');
const lines = csv.split('\n');

// Índices
const pastaIdx = 2;
const objetoIdx = 10;
const statusIdx = 5;

// Processar dados
const mapeamento = [];
for (let i = 2; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (!cols[0] || cols[0].trim() === '') continue;
  if (cols[statusIdx] !== 'Ativo') continue;

  const pasta = cols[pastaIdx]?.trim();
  const objeto = cols[objetoIdx]?.trim();

  if (pasta && objeto) {
    mapeamento.push({ descricao: pasta, titulo: objeto });
  }
}

console.log('=== MAPEAMENTO: DESCRICAO → TITULO ===\n');
console.log('Total de contratos para atualizar:', mapeamento.length);
console.log('\n| Descricao (atual) | Titulo (novo) |');
console.log('|-------------------|---------------|');
mapeamento.forEach(m => {
  console.log(`| ${m.descricao} | ${m.titulo} |`);
});

// Salvar JSON para usar no SQL
fs.writeFileSync('./scripts/mapeamento-titulos.json', JSON.stringify(mapeamento, null, 2));
